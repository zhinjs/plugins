import {CampType, PieceType} from './enum'
import {Board} from './board'
import {Piece} from './piece'
import {Point, Pos} from "./types";

/**规则类 */
class Rule {

	/**棋盘 */
	private board!: Board;
	/**棋子（32颗） */
	private _pieces!: Array<Piece>;

	constructor(pieces: Array<Piece>, board: Board) {
		this.board = board;
		this._pieces = pieces;
	}

	/**只要非死亡的棋子 */
	private get pieces() {
		return this._pieces.filter(p => !p.die);
	}

	/**判断某个点是否落在某颗棋子上，若有落在某颗棋子上，则返回该棋子 */
	public pointInPieces(p: Point): Piece | null {
		for (let piece of this.pieces) {
			if (!piece.self) continue;
			let { x, y } = this.board.pos2point(piece.pos.row, piece.pos.col);
			let halfSize = piece.size * 0.5;
			if (p.x > x - halfSize && p.x < x + halfSize && p.y > y - halfSize && p.y < y + halfSize) {
				return piece;
			}
		}
		return null;
	}

	/**检查某颗棋子距离某个位置隔了几颗棋子,仅在横竖方向有效，斜方向返回-1 */
	public pieceDistancePos(piece: Piece, pos: Pos): number {
		let { row, col } = piece.pos;
		if (row == pos.row) {//说明是在横方向上
			let path: Array<Pos> = [];
			let start = col > pos.col ? pos.col + 1 : col + 1;
			let end = col > pos.col ? col : pos.col;
			for (let i = start; i < end; i++) {
				path.push({ row, col: i });
			}
			return this.pieces.filter(p => {
				for (let pos of path) {
					if (p.pos.row == pos.row && p.pos.col == pos.col) return true;
				}
				return false;
			}).length;
		} else if (col == pos.col) {//说明是在竖方向上
			let path: Array<Pos> = [];
			let start = row > pos.row ? pos.row + 1 : row + 1;
			let end = row > pos.row ? row : pos.row;
			for (let i = start; i < end; i++) {
				path.push({ col, row: i });
			}
			return this.pieces.filter(p => {
				for (let pos of path) {
					if (p.pos.row == pos.row && p.pos.col == pos.col) return true;
				}
				return false;
			}).length;
		}
		return -1;
	}
	// 获取指定棋子可以吃的棋子
	pieceCanEatPieces(piece:Piece):Piece[]{
		return this.pieces.filter(p=>p.campType!==piece.campType).filter(p=>{
			try{
				return !!this.checkPieceMove(piece,p.pos)
			}catch {
				return false
			}
		})
	}
	// 获取指定阵营棋子可以走的所有位置
	getPieceCanMovePos(piece:Piece):Pos[]{
		const result:Pos[]=[]
		const {row,col}=piece.pos
		switch (piece.pieceType){
			case PieceType.ZU:
			case PieceType.BING://兵可以走的所有位置
				result.push(
					{row:piece.pos.row,col:piece.pos.col-1},// 平
					{row:piece.pos.row,col:piece.pos.col+1},// 平
					{row:piece.campType===CampType.BLACK?piece.pos.row+1:piece.pos.row-1,col:piece.pos.col} //进
				)
				break;
			case PieceType.BSHI:
			case PieceType.RSHI:
				result.push(
					{row:row+1,col:col+1},
					{row:row-1,col:col+1},
					{row:row+1,col:col-1},
					{row:row-1,col:col-1}
				)
				break;
			case PieceType.BXIANG:
			case PieceType.RXIANG:
				result.push(
					{row:row+2,col:col+2},
					{row:row-2,col:col+2},
					{row:row+2,col:col-2},
					{row:row-2,col:col-2}
				)
				break;
			case PieceType.SHUAI:
			case PieceType.JIANG:
				result.push(
					{row:row+1,col},
					{row:row-1,col},
					{row,col:col-1},
					{row,col:col-1}
				)
				break;
			case PieceType.MA:
				result.push(
					{row:row+1,col:col+2},
					{row:row+1,col:col-2},
					{row:row-1,col:col-2},
					{row:row-1,col:col+2},
					{row:row-2,col:col-1},
					{row:row-2,col:col+1},
					{row:row+2,col:col-1},
					{row:row+2,col:col+1},
				)
				break;
			case PieceType.JU:
			case PieceType.PAO:
				result.push(
					...new Array(Board.COL_COUNT).fill(false).map((_,nCol)=>({row,col:nCol})),
					...new Array(Board.ROW_COUNT).fill(false).map((_,nRow)=>({row:nRow,col}))
				)
		}
		return result.filter(pos=>{
			try{
				return !!this.checkPieceMove(piece,pos)
			}catch{
				return false
			}
		})
	}
	// 判断是否将军了
	checkCampWillWin(camp:CampType):boolean{
		const mainPiece=this.pieces.filter(p=>[PieceType.JIANG,PieceType.SHUAI].includes(p.pieceType))
			.find(p=>p.campType!==camp)
		return this.pieces.filter(p=>p.campType===camp)
			.some(p=>this.pieceCanEatPieces(p).includes(mainPiece))
	}
	// 获取敌对阵营
	getOppositeCamp(camp:CampType){
		return camp===CampType.BLACK?CampType.RED:CampType.BLACK
	}
	// 获取敌对阵营主帅
	getOppositeMain(camp:CampType){
		return this._pieces.filter(p=>p.campType===this.getOppositeCamp(camp))
			.find(p=>[PieceType.JIANG,PieceType.SHUAI].includes(p.pieceType))
	}
	checkCampIsWin(camp:CampType){
		return this.getOppositeMain(camp).die || this.checkCampIsLost(this.getOppositeCamp(camp))
	}
	// 检查某一阵营是否输了
	checkCampIsLost(camp:CampType):boolean{
		return this.pieces
			// 筛选指定阵营所有棋子
			.filter(p=>p.campType===camp)
			.every(p=>{
				// 每个棋子可走的所有位置都会送将
				return this.getPieceCanMovePos(p).every(pos=>this.checkCampWillLose(p,pos))
			})
	}
	// 检查走到指定位置是否在送将
	public checkCampWillLose(piece:Piece,pos:Pos){
		const prePos=piece.pos
		const mainPiece=this.pieces
			.find(p=>p.campType===piece.campType && [PieceType.JIANG,PieceType.SHUAI].includes(p.pieceType))
		piece.pos=pos
		// 找到敌方阵营可以吃掉当前阵营的所有棋子
		const canEatOpponentPieces=this.pieces
			// 过滤所有地方棋子
			.filter(p=>p.campType!==piece.campType)
			// 获取敌方阵营个棋子可以吃掉的棋子
			.map(piece=>this.pieceCanEatPieces(piece))
			.flat()
		// 检查可吃棋子中是否有将/帅，如果有，则上一步在送将
		if(canEatOpponentPieces.includes(mainPiece)){
			piece.pos=prePos
			return true
		}
		piece.pos=prePos
		return false
	}
	public getPieceOfPos(pos:Pos):Piece|undefined{
		return this.pieces.find(piece=>{
			const {row,col}=piece.pos
			const {row:nRow,col:nCol}=pos
			return row===nRow && col===nCol
		})
	}
	// 检查棋子是否可以走到指定位置
	public checkPieceMove(piece: Piece, pos: Pos): boolean | Piece {
		let { row, col } = pos;
		if(row>=Board.ROW_COUNT || row<0 || col>=Board.COL_COUNT || col<0) throw new Error('超出棋盘边界')
		let pieceOfPos = this.pieces.find(p => p.pos.col == pos.col && p.pos.row == pos.row);
		//若要移动的地方有棋子，并且该棋子的阵营与要移动的棋子阵营一样，则不用验证了，肯定是不能移动
		if (pieceOfPos && pieceOfPos.campType == piece.campType) throw new Error('位置已有己方棋子');
		let res:true;
		//检查棋子距离终点隔的棋子数，仅横竖方向,斜方向返回-1
		let count = this.pieceDistancePos(piece, pos);
		let rowDiff = row-piece.pos.row;
		let colDiff = col-piece.pos.col;
		switch (piece.pieceType) {
			case PieceType.JU://車
				//说明该棋子是在横竖方向移动，并且移动的终点距离棋子间没有其他棋子
				if (count == 0) res = true;
				else throw new Error(piece.pieceType+'不能移动到该位置')
				break;
			case PieceType.PAO://炮
				//若终点和棋子间隔了一个棋子，并且终点又是敌方棋子，或终点没有任何棋子并且中间也没有任何棋子阻拦
				if ((pieceOfPos && count == 1) || (!pieceOfPos && count == 0)) res = true;
				else throw new Error(piece.pieceType+'不能移动到该位置')
				break;
			case PieceType.MA://馬行日
				//马在某一个点最多可走8个位置,检查要移动的地方距离棋子的横、竖距离是否构成一个“日”字
				if (Math.abs(rowDiff) == 1 && Math.abs(colDiff) == 2 || Math.abs(rowDiff) == 2 && Math.abs(colDiff) == 1) {
					//寻找马的别脚点（要移动方向的别脚点）
					let stopRow = piece.pos.row, stopCol = piece.pos.col;
					Math.abs(rowDiff) > Math.abs(colDiff) ? stopRow += (rowDiff > 0 ? 1 : -1) : stopCol += (colDiff > 0 ? 1 : -1);
					//只有别脚点没有棋子，马才能移动
					if (!this.pieces.find(p => p.pos.row == stopRow && p.pos.col == stopCol)) res = true;
					else throw new Error(piece.pieceType+'脚被别了')
				}
				break;
			case PieceType.BXIANG://相
			case PieceType.RXIANG://象行田 不能越界
				//判断象要移动的位置是否越界。（自己的棋子阵营永远在下方）
				if ((piece.campType===CampType.RED && row < 5) || (piece.campType===CampType.BLACK && row) > 4) throw new Error(piece.pieceType+'不能过河');
				//象在某一个点最多可走4个位置,检查要移动的地方距离棋子的横、竖距离是否构成一个“田”字
				if (Math.abs(rowDiff) == 2 && Math.abs(colDiff) == 2) {
					//寻找象心（要移动方向的象心）
					let stopRow = row + (rowDiff > 0 ? 1 : -1);
					let stopCol = col + (colDiff > 0 ? 1 : -1);
					//只有象心没有棋子，才能移动
					if (!this.pieces.find(p => p.pos.row == stopRow && p.pos.col == stopCol)) res = true;
					else throw new Error(piece.pieceType+'心被堵了')
				}
				break;
			case PieceType.RSHI://仕
			case PieceType.BSHI://士
				//判断士要移动的位置是否会超出九宫格(要注意敌方棋子还是我方棋子)
				if (pos.col < 3 || pos.col > 5 || (piece.campType===CampType.RED && pos.row < 7) || (piece.campType===CampType.BLACK && pos.row > 2)) throw new Error(piece.pieceType+'只能在米字格内移动');
				if (Math.abs(rowDiff) == 1 && Math.abs(colDiff) == 1) res = true;
				else throw new Error(piece.pieceType+'只能斜行一步')
				break;
			case PieceType.BING://兵
			case PieceType.ZU://卒 只能前进，不可后退，且过河才能左右移动，每次只能移动一格
				//若不满足只走一格，肯定不对，直接结束吧
				if (!((Math.abs(rowDiff) == 1 && Math.abs(colDiff) == 0) || (Math.abs(rowDiff) == 0 && Math.abs(colDiff) == 1))) throw new Error(piece.pieceType+'只能走一步');
				if (piece.campType===CampType.RED && rowDiff <= 0) {//我方棋子向上走
					//过了河才能左右走
					if (Math.abs(colDiff) > 0 && piece.pos.row <= 4 || rowDiff < 0) res = true;
					else throw new Error(piece.pieceType+'未过河不能平')
				} else if (piece.campType===CampType.BLACK && rowDiff >= 0) {//敌方棋子向下走
					if (Math.abs(colDiff) > 0 && piece.pos.row >= 5 || rowDiff > 0) res = true;
					else throw new Error(piece.pieceType+'未过河不能平')
				}else{
					throw new Error(piece.pieceType+'不能移动到该位置')
				}
				break;
			case PieceType.JIANG://將
			case PieceType.SHUAI://帥
				//判断將或帅是否会移出九宫格
				if ((pos.col < 3 || pos.col > 5) || (piece.campType===CampType.RED && pos.row < 7) || (piece.campType===CampType.BLACK && pos.row > 2)) throw new Error(piece.pieceType+'只能在米字格内移动');
				//只要是走的1格，就是对的
				if (Math.abs(rowDiff) == 1 && Math.abs(colDiff) == 0 || Math.abs(rowDiff) == 0 && Math.abs(colDiff) == 1) res = true;
				else throw new Error(piece.pieceType+'只能走一步')
				break;
		}
		return res ? pieceOfPos || res : res;
	}
}

export { Rule }