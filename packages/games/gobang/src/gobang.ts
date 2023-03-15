import {Canvas, createCanvas, registerFont} from "canvas";
import {resolve} from 'path'
import {History, Option} from "./types";
import './extend'
import {CampType} from './enum'
import {Board} from './board'
import {Piece} from './piece'
import {Rule} from './rule';
import { NSession, h, remove} from "zhin";

registerFont(resolve(__dirname, './fonts/楷体.ttf'), {family: '楷体'})

/**五子棋类 */
class Gobang {
    private defaults!: Option;
    private options: Option;
    private canvas: Canvas;
    /**棋盘 */
    private board!: Board;
    private _pieces!: Array<Piece>;
    /**规则 */
    private rule!: Rule;
    /**判断该谁走 */
    private camp: CampType = CampType.White;
    history: History[] = []
    static rooms: Map<number | string, Gobang> = new Map<number | string, Gobang>()
    public players: Map<number | string, CampType> = new Map<number | string, CampType>()

    constructor(public group_id: number | string, user_id: number | string) {
        if (Gobang.rooms.get(group_id)) throw new Error('当前群聊已有对局，请等待对局结束后继续')
        this.initDefaults();
        this.options = {...this.defaults};
        this.canvas = createCanvas(this.options.width, this.options.height);
        this.board = new Board(this.options);
        this.initPieces();
        this.refresh();
        this.rule = new Rule(this._pieces, this.board);
        this.players.set(user_id, Math.random() > 0.5 ? CampType.BLACK : CampType.White)
        Gobang.rooms.set(group_id, this)
    }

    // 创建房间
    static createRoom(group_id: number | string, user_id: number | string) {
        return new Gobang(group_id, user_id)
    }

    // 加入房间
    static joinRoom(group_id: number | string, user_id: number | string) {
        const room = Gobang.rooms.get(group_id)
        if (!room) throw new Error('当前群聊没有开启象棋对局，无法加入')
        room.join(user_id)
    }

    // 关闭房间
    static closeRoom(group_id: number | string) {
        const room = Gobang.rooms.get(group_id)
        if (!room) throw new Error('当前群聊没有开启象棋对局，无法结束')
        Gobang.rooms.delete(group_id)
    }

    static matchInput(input: string): [number, number] {
        const arr=input.match(/([a-pA-P])([1-9]|1[0-5])/)
        if(!arr) return [-1,-1]
        return [String(arr[0]).toUpperCase().charCodeAt(0)-64,Number(arr[1])+1]
    }

    static createPickError(msg: string) {
        return new Error('选子错误:' + msg)
    }

    static createToError(msg: string) {
        return new Error('落子错误:' + msg)
    }
    posHasChess(row,col){
        return !!this.pieces.find(p=>p.pos.col===col && p.pos.row===row)
    }


    static input(message: NSession<'icqq', 'message.group'>) {
        if (!Gobang.rooms.get(message.group_id)) return
        if (message.raw_message.length !== 4) return
        const chess = Gobang.rooms.get(message.group_id)
        const inputArr = Gobang.matchInput(message.raw_message)
        if (inputArr.length !== 2 || inputArr.some(s=>s<1)) return
        if (!chess.isPlayer(message.sender.user_id)) {
            if (chess.players.size === 1) {
                chess.join(message.sender.user_id)
            } else {
                message.reply('你下棋必被指指点点')
            }
        }
        const [row,col] = inputArr
        const type = chess.players.get(message.sender.user_id)
        if (chess.camp !== type) return message.reply('还没到你呢')
        try {
            if (chess.posHasChess(row,col)) return message.reply('该位置已有棋子')
            // 送將验证
            if (chess.rule.checkCampWillLose(type,{row,col})) {
                throw Gobang.createToError('你正在送死')
            }
            // 可以走不
            const canMove = chess.rule.checkPiecePut(type, {row,col})
            // 可以走
            if (canMove) {
                let msg: string = ''
                chess.history.push({
                    pos: {row,col},
                    camp: chess.camp,
                    txt: message.raw_message,
                })
                chess.pieces.push(new Piece(type,{row,col},chess.board.cellSize))
                chess.switch()
                if(chess.rule.checkCampIsWin(type,{row,col})){
                    msg += `\n对局结束,${chess.camp}胜利`
                    Gobang.rooms.delete(message.group_id)
                    message.reply(msg)
                }else{
                    message.reply(chess.output(msg))
                }
            } else {
                message.reply('不能落子到该位置！')
            }
        } catch (err) {
            return message.reply(err.message)
        }


    }

    // 是否是棋局中的棋手
    isPlayer(user_id: number) {
        return [...this.players.keys()].includes(user_id)
    }

    // 是否当前阵营的棋子
    isCurrentCampPiece(piece: Piece) {
        return piece && piece.campType === this.camp
    }

    // 指定用户悔棋
    revert(event: NSession<'icqq', 'message.group'>) {
        if (!this.players.get(event.sender.user_id)) return '你下棋必被指指点点'
        if (!this.history.length) return '棋局未开始'
        if (this.players.get(event.sender.user_id) === this.camp) return '你的操作已被对手覆盖，无法悔棋'
        const history = this.history[this.history.length - 1]
        const piece=this.pieces.find(p=>p.pos.row===history.pos.row && p.pos.col===history.pos.col)
        if (!piece) return '悔棋失败'
        remove(this.pieces,piece)
        this.switch()
        remove(this.history, history)
        return this.output()
    }

    /**    输出棋盘 */
    output(msg?: string) {
        this.refresh()
        return [
            [
                msg,
                `第${this.history.length + 1}手，${this.camp}走`,
                '当前棋局',
            ].filter(Boolean).join('\n'),
            h('image', {src: this.canvas.toBuffer("image/jpeg")})
        ]
    }

    /** 加入对局 */
    join(user_id: number | string) {
        if (this.players.size > 1) throw new Error('该对局棋手已满')
        this.players.set(user_id, [...this.players.values()].find(a => a === CampType.White) ? CampType.BLACK : CampType.White)
    }

    /**初始化默认参数 */
    private initDefaults() {
        this.defaults = {
            width: 800,
            height: 800,
            padding: 40,
        };
    }


    /**只要非死亡的棋子 */
    private get pieces() {
        return this._pieces;
    }

    /**初始化棋子 */
    private initPieces() {
        this._pieces = [];
    }

    /**摆放棋子 */
    private putPiece() {
        const ctx = this.canvas.getContext('2d')
        for (let piece of this.pieces) {
            let point = this.board.pos2point(piece.pos.row, piece.pos.col);
            let halfSize = piece.size * 0.5;
            ctx.drawImage(piece.canvas, point.x - halfSize, point.y - halfSize);
        }
    }


    /**切换该谁落子 */
    private switch() {
        this.camp = this.camp === CampType.White ? CampType.BLACK : CampType.White
    }


    /**刷新界面 */
    public refresh() {
        let ctx = this.canvas.getContext("2d")!;
        let {width, height} = this.options;
        ctx.clearRect(0, 0, width!, height!);
        ctx.save()
        // 画白色棋盘
        ctx.fillStyle = '#dbc77c';
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
        ctx.drawImage(this.board.canvas, 0, 0);
        this.putPiece();
    }
}

export {Gobang}