import {CampType} from './enum'
import {Board} from './board'
import {Piece} from './piece'
import {Pos} from "./types";
import {is, remove} from "zhin";

/**规则类 */
class Rule {

    /**棋盘 */
    private board!: Board;
    private _pieces!: Array<Piece>;

    constructor(pieces: Array<Piece>, board: Board) {
        this.board = board;
        this._pieces = pieces;
    }

    private get pieces() {
        return this._pieces;
    }

    checkByStep(camp: CampType, pos: Pos, xdiff: number, ydiff: number) {
        let cnt = 0;
        for (let i = 1; i < 5; i++) {
            const piece = this.getPieceOfPos({row: pos.row - xdiff * i, col: pos.col - ydiff * i})
            if (!piece || piece.campType !== camp) break
            cnt++
        }
        for (let i = -1; i > -5; i--) {
            const piece = this.getPieceOfPos({row: pos.row - xdiff * i, col: pos.col - ydiff * i})
            if (!piece || piece.campType !== camp) break
            cnt++
        }
        if (cnt >= 4)
            return true;
        return false;
    }

    // 检查某一阵营是否赢了
    checkCampIsWin(camp: CampType, pos: Pos) {
        return this.checkByStep(camp, pos, 0, 1) ||
            this.checkByStep(camp, pos, 1, 0) ||
            this.checkByStep(camp, pos, 1, 1) ||
            this.checkByStep(camp, pos, -1, 1)
    }
    // 检车某一阵营是否输了
    checkCampIsLose(camp:CampType){
        const oppositeCamp=this.getOppositeCamp(camp)
        return this.getAllFreePos().every(piecePos=>{
            const piece=new Piece(oppositeCamp,piecePos,this.board.cellSize)
            this.pieces.push(piece)
            const willWin=this.getAllFreePos().some(willPos=>this.checkCampIsWin(oppositeCamp,willPos))
            remove(this.pieces,piece)
            return willWin
        })
    }
    // 获取所有空闲位置
    getAllFreePos():Pos[]{
        return new Array(Board.ROW_COUNT).fill(false).map((_,row)=>{
            return new Array(Board.COL_COUNT).fill(false).map((_,col)=>{
                return {
                    row,
                    col
                }
            })
        })
            .flat()
            .filter(p=>{
                return !this.getPieceOfPos(p)
            })
    }
    // 检查下这一步会不会送死
    checkCampWillLose(camp:CampType,pos:Pos){
        const tempPiece=new Piece(camp,pos,this.board.cellSize)
        this.pieces.push(tempPiece)
        const willWin=this.getAllFreePos().some(p=>this.checkCampIsWin(this.getOppositeCamp(camp),p))
        remove(this.pieces,tempPiece)
        return willWin
    }

    // 获取敌对阵营
    getOppositeCamp(camp: CampType) {
        return camp === CampType.BLACK ? CampType.White : CampType.BLACK
    }


    // 根据位置获取棋子
    public getPieceOfPos(pos: Pos): Piece {
        return this.pieces.find(piece => {
            const {row, col} = piece.pos
            const {row: nRow, col: nCol} = pos
            return row === nRow && col === nCol
        })
    }

    // 检查棋子是否可以走到指定位置
    public checkPiecePut(camp: CampType, pos: Pos): boolean {
        let {row, col} = pos;
        return !this.pieces.find(p => p.pos.row === row && p.pos.col === col)
    }
}

export {Rule}