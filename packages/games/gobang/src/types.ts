import {CampType} from "./enum";

export interface Option {
    width?: number
    height?: number
    padding?: number
}

export interface History {
    camp: CampType // 谁的棋子
    txt: string // 输入文本
    pos:Pos
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