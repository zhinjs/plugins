import {CampType, PieceType} from "./enum";

export interface Option {
    width?: number
    height?: number
    padding?: number
}

export interface History {
    camp: CampType // 谁的棋子
    txt: string // 输入文本
    piece: PieceType // 哪个棋子
    eat?: PieceType // 吃了哪个棋子
    before: Pos // 行棋前的位置
    after: Pos // 行棋后的位置
}

export interface Point {
    x: number
    y: number
}

/**位置 */
export interface Pos {
    row: number
    col: number
}

declare global {
    interface CanvasRenderingContext2D {
        drawLine(start: Point, end: Point): any
    }
}