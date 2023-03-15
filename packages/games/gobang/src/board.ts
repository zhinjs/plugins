import {Option, Point, Pos} from './types'
import {Canvas, createCanvas} from "canvas";

/**棋盘类 */
class Board {

    static COL_COUNT = 15;
    static ROW_COUNT = 15;
    private _canvas!: Canvas;
    /**棋盘 */
    private board!: Canvas;
    /**标记点 */
    private mark!: Canvas;
    /**棋盘起点坐标，即左上角坐标 */
    private boardStartPoint!: Point;
    /**棋盘单元格的宽高 */
    private _cellSize!: number;

    constructor(public options: Option) {
        let {width, height, padding} = options;
        this.board = createCanvas(width, height)
        this._canvas = createCanvas(width, height)

        //计算宽和高，取最小的那个作为单元格的宽高
        this._cellSize = Math.min((width! - 4 * padding!) / (Board.COL_COUNT - 1), (height! - 4 * padding!) / (Board.ROW_COUNT - 1));
        this.boardStartPoint = {x: (width! - 8 * this._cellSize) * 0.5, y: (height! - 9 * this._cellSize) * 0.5};
        this.mark = createCanvas(this._cellSize, this._cellSize);
        this.drawBoard();
    }

    private drawBoard() {
        let {cellSize, boardStartPoint} = this;
        let ctx = this.board.getContext("2d")!;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${this.cellSize * 0.35}px 楷体`;
        const rowCn = new Array(Board.ROW_COUNT).fill(false).map((_,i)=>String.fromCharCode(65+i))
        ctx.beginPath();
        //绘制行
        let xStart = boardStartPoint.x;
        let xEnd = this.pos2point(0, 8).x;
        let y = boardStartPoint.y;
        for (let row = 0; row < Board.ROW_COUNT; row++) {
            ctx.fillStyle = '#000000'
            ctx.fillText(rowCn[row], xEnd + 50, y)
            ctx.moveTo(xStart, y);
            ctx.lineTo(xEnd, y);
            y += cellSize;
        }

        let x = boardStartPoint.x;
        for (let col = 0; col < Board.COL_COUNT; col++) {
            ctx.fillStyle = '#000000'
            ctx.fillText(String(col + 1), xEnd + 50, x)
            ctx.moveTo(xStart, x);
            ctx.lineTo(xEnd, x);
            x += cellSize;
        }

        //绘制棋盘边框
        ctx.beginPath();
        ctx.lineWidth = 3;
        let borderPadding = 5;
        x = boardStartPoint.x - borderPadding;
        y = boardStartPoint.y - 5;
        let w = this.pos2point(0, 8).x + borderPadding - x;
        let h = this.pos2point(9, 0).y + borderPadding - y;
        ctx.rect(x, y, w, h);
        ctx.stroke();
    }



    /**从左上角开始，获取指定行、列序号的坐标位置，序号从0开始 */
    public pos2point(row: number, col: number): Point {
        let {x, y} = this.boardStartPoint!;
        return {x: x + col * this.cellSize, y: y + row * this.cellSize};
    }

    /**根据点击的像素坐标，返回点击的行列，可能会返回null */
    public point2pos(p: Point): Pos | null {
        //指定单元格长度的0.3倍作为判断范围
        let range = this.cellSize * 0.3;
        for (let row = 0; row < Board.ROW_COUNT; row++) {
            for (let col = 0; col < Board.COL_COUNT; col++) {
                let {x, y} = this.pos2point(row, col);
                if (p.x > x - range && p.x < x + range && p.y > y - range && p.y < y + range) {
                    return {row, col};
                }
            }
        }
        return null;
    }

    public get canvas() {
        return this._canvas;
    }

    public get cellSize() {
        return this._cellSize;
    }

}

export {Board}