import {Canvas, createCanvas, registerFont} from "canvas";
import {resolve} from 'path'
import {History, Option, Pos} from "./types";
import './extend'
import {CampType, PieceType} from './enum'
import {Board} from './board'
import {Piece} from './piece'
import {Rule} from './rule';
import {Tip} from "./tip";
import {Zhin, NSession,h} from "zhin";

registerFont(resolve(__dirname,'./fonts/楷体.ttf'),{family:'楷体'})
/**象棋类 */
class Chess {
	private defaults!: Option;
	private options: Option;
	private canvas:Canvas;
	/**棋盘 */
	private board!: Board;
	/**棋子（32颗） */
	private _pieces!: Array<Piece>;
	/**规则 */
	private rule!: Rule;
	/**判断该谁走 */
	private camp: CampType = CampType.RED;
	tips:Tip[]=[]
	history:History[]=[]
	static rooms:Map<number|string,Chess>=new Map<number|string, Chess>()
	public players:Map<number|string,CampType>=new Map<number|string,CampType>()
	constructor(public group_id:number|string,user_id:number|string) {
		if(Chess.rooms.get(group_id)) throw new Error('当前群聊已有对局，请等待对局结束后继续')
		this.initDefaults();
		this.options = { ...this.defaults };
		this.canvas = createCanvas(this.options.width,this.options.height);
		this.board = new Board(this.options);
		this.initPieces();
		this.invalidate();
		this.rule = new Rule(this._pieces, this.board);
		this.players.set(user_id,Math.random()>0.5?CampType.BLACK:CampType.RED)
		Chess.rooms.set(group_id,this)
	}
	// 创建房间
	static createRoom(group_id:number|string,user_id:number|string){
		return new Chess(group_id,user_id)
	}
	// 加入房间
	static joinRoom(group_id:number|string,user_id:number|string){
		const room=Chess.rooms.get(group_id)
		if(!room) throw new Error('当前群聊没有开启象棋对局，无法加入')
		room.join(user_id)
	}
	// 关闭房间
	static closeRoom(group_id:number|string){
		const room=Chess.rooms.get(group_id)
		if(!room) throw new Error('当前群聊没有开启象棋对局，无法结束')
		Chess.rooms.delete(group_id)
	}
	static formatInput(camp:CampType,input:string){
		input=input.trim()
			.replace(/(一)/g, '1')
			.replace(/(二)/g, '2')
			.replace(/(三)/g, '3')
			.replace(/(四)/g, '4')
			.replace(/(五)/g, '5')
			.replace(/(六)/g, '6')
			.replace(/(七)/g, '7')
			.replace(/(八)/g, '8')
			.replace(/(九)/g, '9')
			.replace('後', '后')
			.replace(/^前/,'1')
			.replace(/^中/,'3')
			.replace(/^后/,'5')
		if (camp===CampType.RED) {
			input = input
				.replace(/(車|车)/g, '車')
				.replace(/(馬|马)/g, '馬')
				.replace(/(炮)/g, '炮')
				.replace(/(將|将|帅)/g, '帥')
				.replace(/(士)/g, '仕')
				.replace(/(象)/g, '相')
				.replace(/(卒)/g, '兵')
		} else {
			input = input
				.replace(/(俥|车)/g, '車')
				.replace(/(傌|马)/g, '馬')
				.replace(/(砲)/g, '炮')
				.replace(/(将|帥|帅)/g, '將')
				.replace(/(仕)/g, '士')
				.replace(/(相)/g, '象')
				.replace(/(兵)/g, '卒')
		}
		return input
	}
	static matchInput(input:string,type):[string,string,string,number]{
		if (input === '仙人指路') input = '兵3进1'
		input = Chess.formatInput(type,input)
		let a=input[0]
		let b=input[1]
		let c=input[2]
		let d=parseInt(input[3])
		return [
			([...Object.values(PieceType)].includes(a as PieceType) || ['1','2','3','4','5'].includes(a)) && a,
			([...Object.values(PieceType)].includes(a as PieceType) || /\d+/.test(b)) && b,
			['进','退','平'].includes(c) && c,
			/\d+/.test(b) && Number(d),
		].filter(Boolean) as [string,string,string,number]
	}
	static createPickError(msg:string){
		return new Error('选子错误:'+msg)
	}
	static createToError(msg:string){
		return new Error('落子错误:'+msg)
	}
	// 提示棋子
	static tips(session:NSession<keyof Zhin.Adapters,'message.group'>,input){
		const chess=Chess.rooms.get(session.group_id)
		if(!chess) return '当前没有对局'
		const camp=chess.players.get(session.sender.user_id)
		if(!camp) return '你下棋必被指指点点'
		input=Chess.formatInput(camp,input)
		const piece=chess.pickPiece(camp,input.split(''))
		if(!piece) return '未找到任何棋子'
		return chess.getTips(piece)
	}
	// 获取指定棋子可走位置
	public getTips(piece:Piece){
		const canMovePos=this.rule.getPieceCanMovePos(piece)
		this.tips=canMovePos.map(pos=>new Tip(this.board.cellSize,pos))
		this.invalidate()
		this.tips=[]
		return h('image',{src:this.canvas.toBuffer("image/jpeg")})
	}
	// 解析移动的哪个棋子
	public pickPiece(campType:CampType,input:[string,string]):Piece|undefined{
		const [a,b]=input
		if(['1','2','3','4','5'].includes(a)){
			const idx=parseInt(a)-1
			return this.pieces
				.filter((p)=>p.pieceType===b && p.campType===campType)
				.sort((pieceA,pieceB)=>{
					if(campType===CampType.RED) return pieceA.pos.row-pieceB.pos.row
					return pieceB.pos.row-pieceA.pos.row
				})[idx]
		} else{
			return this.pieces.filter(p=>p.campType===campType).find(p=>{
				return p.pos.col===(campType===CampType.BLACK?9-Number(b):Number(b)-1) && p.pieceType===a
			})
		}
	}
	// 解析棋子移动到哪儿
	public getPieceMovePose(piece:Piece,input:[string,number]):Pos{
		const [c,d]=input
		const {pieceType,pos:{row,col}}=piece
		if(['將','帥','兵','卒'].includes(pieceType)&&d!== 1&&c!=='平')throw Chess.createToError('最多走一步')//这些最多走一步
		if(c==='平'){
			if(['馬','象','士','相','仕'].includes(pieceType))throw Chess.createToError(pieceType+'不能平')//这些不能平
			return {row,col:this.camp===CampType.RED?d-1:9-d}
		} else if(c==='进'){
			if (['象','相'].includes(pieceType)) {
				return {
					col:this.camp===CampType.RED ? d-1 : 9-d,
					row: this.camp===CampType.RED ? row-2 : row+2
				}
			}
			if (['士','仕'].includes(pieceType)) {
				return {
					col:this.camp===CampType.RED ? d-1 : 9-d,
					row: this.camp===CampType.RED ? row-1 : row+1
				}
			}
			if (pieceType==='馬') {
				const nCol = this.camp===CampType.RED ? d-1 : 9-d
				let nRow:number
				let minus = Math.abs(nCol-col)
				if (minus === 1) {
					nRow = this.camp===CampType.RED ? row-2 : row+2
				} else if(minus===2) {
					nRow = this.camp===CampType.RED ? row-1 : row+1
				}else{
					throw Chess.createToError(pieceType+'行日')
				}
				return {
					row:nRow,
					col:nCol
				}
			}
			if (['車','俥','炮','砲','將','帥','兵','卒'].includes(pieceType)) {
				return {
					col,
					row:this.camp===CampType.RED ? row-d : row+d
				}
			}
		} else if (c === '退') {
			if (['兵','卒'].includes(pieceType)) throw Chess.createToError(pieceType+'不能退')//兵不能退
			if (['象','相'].includes(pieceType)) {
				return {
					col:this.camp===CampType.RED?d-1:9-d,
					row:this.camp===CampType.RED?row+2:row-2
				}
			}
			if (['士','仕'].includes(pieceType)) {
				return {
					col:this.camp===CampType.RED?d-1:9-d,
					row:this.camp===CampType.RED?row+1:row-1
				}
			}
			if (['傌','馬'].includes(pieceType)) {
				const nCol = this.camp===CampType.RED ? d-1 : 9-d
				let nRow:number
				let minus = Math.abs(nCol-col)
				if (minus === 1) {
					nRow = this.camp===CampType.RED ? row+2 : row-2
				} else if(minus===2) {
					nRow = this.camp===CampType.RED ? row+1 : row-1
				}else{
					throw Chess.createToError(pieceType+'行日')
				}
				return {
					row:nRow,
					col:nCol
				}
			}
			if (['車','俥','炮','砲','將','帥','兵','卒'].includes(pieceType)) {
				return {
					col,
					row:this.camp===CampType.RED ? row+d : row-d
				}
			}
		}else throw Chess.createToError('不支持的行棋方式')
	}
	static input(message:NSession<'icqq','message.group'>){
		if(!Chess.rooms.get(message.group_id)) return
		if(message.raw_message.length!==4)return
		const chess=Chess.rooms.get(message.group_id)
		const inputArr=Chess.matchInput(message.raw_message,chess.camp)
		if(inputArr.length!==4) return
		if(!chess.isPlayer(message.sender.user_id)){
			if(chess.players.size===1){
				chess.join(message.sender.user_id)
			}else{
				message.reply('你下棋必被指指点点')
			}
		}
		const [a,b,c,d]=inputArr
		const type=chess.players.get(message.sender.user_id)
		if(chess.camp!==type) return message.reply('还没到你呢')
		try{
			// 走哪个
			const pickPiece=chess.pickPiece(type,[a,b])
			if(!pickPiece) throw Chess.createPickError('该位置无棋子')
			if(pickPiece.campType!==chess.camp) throw Chess.createPickError(`该棋子不是${chess.camp}棋子`)
			// 走到哪
			const movePos=chess.getPieceMovePose(pickPiece,[c,d])
			if(movePos.row>=Board.ROW_COUNT||movePos.col>=Board.COL_COUNT || movePos.col<0 || movePos.row<0) throw Chess.createToError('超出棋盘区域')
			// 送將验证
			if(chess.rule.checkCampWillLose(pickPiece,movePos)){
				throw Chess.createToError('你正在送将')
			}
			// 可以走不
			const moveRes=chess.rule.checkPieceMove(pickPiece,movePos)
			// 可以走
			if (moveRes) {
				let msg:string=''
				chess.history.push({
					before:pickPiece.pos,
					after:movePos,
					camp:chess.camp,
					piece:pickPiece.pieceType,
					txt:message.raw_message,
					eat:moveRes instanceof Piece?moveRes.pieceType:undefined
				})
				chess.switch()
				pickPiece.pos=movePos
				// 吃子
				if (moveRes instanceof Piece) {
					msg=`${chess.camp}一招${message.raw_message},吃了${moveRes.campType}的${moveRes.pieceType}`
					moveRes.die=true
					// 吃將/帅 则胜利
					if([PieceType.JIANG,PieceType.SHUAI].includes(moveRes.pieceType)){
						msg+=`\n对局结束,${chess.camp}胜利`
						Chess.rooms.delete(message.group_id)
						return message.reply(msg)
					}
				}
				// 将军提示
				if(chess.rule.checkCampWillWin(chess.camp)){
					msg+=`\n将了${chess.camp}的军`
				}
				// 绝杀验证
				if(chess.rule.checkCampIsLost(chess.rule.getOppositeCamp(chess.camp))){
					msg+=`\n对局结束,${chess.camp}胜利`
					Chess.rooms.delete(message.group_id)
					return message.reply(msg)
				}
				message.reply(chess.output(msg))
			} else {
				message.reply('不能移动到该位置！')
			}
		}catch(err){
			return message.reply(err.message)
		}


	}
	isPlayer(user_id:number){
		return [...this.players.keys()].includes(user_id)
	}
	isCurrentCampPiece(piece:Piece){
		return piece && piece.campType === this.camp
	}
	revert(event:NSession<'icqq','message.group'>){
		if(!this.players.get(event.sender.user_id)) return '你下棋必被指指点点'
		if(!this.history.length) return '棋局未开始'
		if(this.players.get(event.sender.user_id)===this.camp) return '你的操作已被对手覆盖，无法悔棋'
		const history=this.history[this.history.length-1]
		if(history.eat){
			const piece=this._pieces.find(p=>p.die && p.pieceType===history.eat && p.pos.row===history.after.row && p.pos.col===history.after.col)
			if(piece) piece.die=false
			else return '悔棋失败'
		}
		const piece=this.pieces.find(p=>p.pieceType===history.piece && p.pos.row===history.after.row && p.pos.col===history.after.col)
		if(!piece) return '悔棋失败'
		piece.pos={row:history.before.row,col:history.before.col}
		this.switch()
		return this.output()
	}
	output(msg?:string){
		this.invalidate()
		return [
			[
				msg,
				`第${this.history.length+1}手，${this.camp}走`,
				'当前棋局',
			].filter(Boolean).join('\n'),
			h('image',{src:this.canvas.toBuffer("image/jpeg")})
		]
	}
	join(user_id:number|string){
		if(this.players.size>1) throw new Error('该对局棋手已满')
		this.players.set(user_id,[...this.players.values()].find(a=>a===CampType.RED)?CampType.BLACK:CampType.RED)
	}
	/**初始化默认参数 */
	private initDefaults() {
		this.defaults = {
			width: 620,
			height: 680,
			padding: 40,
		};
	}


	/**只要非死亡的棋子 */
	private get pieces() {
		return this._pieces.filter(p => !p.die);
	}

	/**初始化棋子 */
	private initPieces() {
		let size = this.board.cellSize;
		this._pieces = [
			//红方
			new Piece(CampType.RED, PieceType.BING, size, { row: 6, col: 0 }, true),
			new Piece(CampType.RED, PieceType.BING, size, { row: 6, col: 2 }, true),
			new Piece(CampType.RED, PieceType.BING, size, { row: 6, col: 4 }, true),
			new Piece(CampType.RED, PieceType.BING, size, { row: 6, col: 6 }, true),
			new Piece(CampType.RED, PieceType.BING, size, { row: 6, col: 8 }, true),
			new Piece(CampType.RED, PieceType.PAO, size, { row: 7, col: 1 }, true),
			new Piece(CampType.RED, PieceType.PAO, size, { row: 7, col: 7 }, true),
			new Piece(CampType.RED, PieceType.JU, size, { row: 9, col: 0 }, true),
			new Piece(CampType.RED, PieceType.JU, size, { row: 9, col: 8 }, true),
			new Piece(CampType.RED, PieceType.MA, size, { row: 9, col: 1 }, true),
			new Piece(CampType.RED, PieceType.MA, size, { row: 9, col: 7 }, true),
			new Piece(CampType.RED, PieceType.RXIANG, size, { row: 9, col: 2 }, true),
			new Piece(CampType.RED, PieceType.RXIANG, size, { row: 9, col: 6 }, true),
			new Piece(CampType.RED, PieceType.RSHI, size, { row: 9, col: 3 }, true),
			new Piece(CampType.RED, PieceType.RSHI, size, { row: 9, col: 5 }, true),
			new Piece(CampType.RED, PieceType.SHUAI, size, { row: 9, col: 4 }, true),
			//黑方
			new Piece(CampType.BLACK, PieceType.ZU, size, { row: 3, col: 0 }),
			new Piece(CampType.BLACK, PieceType.ZU, size, { row: 3, col: 2 }),
			new Piece(CampType.BLACK, PieceType.ZU, size, { row: 3, col: 4 }),
			new Piece(CampType.BLACK, PieceType.ZU, size, { row: 3, col: 6 }),
			new Piece(CampType.BLACK, PieceType.ZU, size, { row: 3, col: 8 }),
			new Piece(CampType.BLACK, PieceType.PAO, size, { row: 2, col: 1 }),
			new Piece(CampType.BLACK, PieceType.PAO, size, { row: 2, col: 7 }),
			new Piece(CampType.BLACK, PieceType.JU, size, { row: 0, col: 0 }),
			new Piece(CampType.BLACK, PieceType.JU, size, { row: 0, col: 8 }),
			new Piece(CampType.BLACK, PieceType.MA, size, { row: 0, col: 1 }),
			new Piece(CampType.BLACK, PieceType.MA, size, { row: 0, col: 7 }),
			new Piece(CampType.BLACK, PieceType.BXIANG, size, { row: 0, col: 2 }),
			new Piece(CampType.BLACK, PieceType.BXIANG, size, { row: 0, col: 6 }),
			new Piece(CampType.BLACK, PieceType.BSHI, size, { row: 0, col: 3 }),
			new Piece(CampType.BLACK, PieceType.BSHI, size, { row: 0, col: 5 }),
			new Piece(CampType.BLACK, PieceType.JIANG, size, { row: 0, col: 4 }),
		];
	}

	/**摆放棋子 */
	private putPiece() {
		const ctx=this.canvas.getContext('2d')
		for (let piece of this.pieces) {
			let point = this.board.pos2point(piece.pos.row, piece.pos.col);
			let halfSize = piece.size * 0.5;
			ctx.drawImage(piece.canvas, point.x - halfSize, point.y - halfSize);
		}
	}
	private putTips(){
		const ctx=this.canvas.getContext('2d')
		for(let tip of this.tips){
			let point=this.board.pos2point(tip.pos.row,tip.pos.col)
			let halfSize = tip.size * 0.5;
			ctx.drawImage(tip.canvas, point.x - halfSize, point.y - halfSize);
		}
	}
	/**切换该谁落子 */
	private switch() {
		this.camp=this.camp===CampType.RED?CampType.BLACK:CampType.RED
	}


	/**刷新界面 */
	public invalidate() {
		let ctx = this.canvas.getContext("2d")!;
		let { width, height } = this.options;
		ctx.clearRect(0, 0, width!, height!);
		ctx.save()
		// 画白色棋盘
		ctx.fillStyle='#FFFFFF';
		ctx.fillRect(0,0,width,height)
		ctx.restore()
		ctx.drawImage(this.board.canvas, 0, 0);
		this.putPiece();
		this.putTips();
	}
}

export { Chess }