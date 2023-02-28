import {Option, Point, Pos} from './types'
import {Canvas, createCanvas} from "canvas";

/**棋盘类 */
class Board {

    static COL_COUNT = 9;
    static ROW_COUNT = 10;
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
        this.drawMark();
        this.markPos();
    }

    private drawBoard() {
        let {cellSize, boardStartPoint} = this;
        let ctx = this.board.getContext("2d")!;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${this.cellSize * 0.35}px 楷体`;
        const rowCn = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
        ctx.beginPath();
        //绘制行
        let xStart = boardStartPoint.x;
        let xEnd = this.pos2point(0, 8).x;
        let y = boardStartPoint.y;
        for (let row = 0; row < Board.ROW_COUNT; row++) {
            ctx.fillStyle = 'red'
            ctx.fillText(rowCn[Board.ROW_COUNT - row - 1], xStart - 50, y)
            ctx.fillStyle = '#000000'
            ctx.fillText(rowCn[row], xEnd + 50, y)
            ctx.moveTo(xStart, y);
            ctx.lineTo(xEnd, y);
            y += cellSize;
        }

        //绘制列
        let yAboveStart = boardStartPoint.y;//上半部分
        let yAboveEnd = this.pos2point(4, 0).y;//上半部分
        let yBelowStart = this.pos2point(5, 0).y;//下半部分
        let yBelowEnd = this.pos2point(9, 0).y;//下半部分
        let x = boardStartPoint.x;
        for (let col = 0; col < Board.COL_COUNT; col++) {
            ctx.fillStyle = 'red'
            ctx.fillText(String(col + 1), x, yBelowEnd + 50)
            ctx.fillStyle = '#000000'
            ctx.fillText(String(Board.COL_COUNT - col), x, yAboveStart - 50)
            if (col == 0 || col == Board.COL_COUNT - 1) {
                //绘制最外面的两列
                ctx.moveTo(x, yAboveStart);
                ctx.lineTo(x, yBelowEnd);
            } else {
                //绘制里面的列
                ctx.moveTo(x, yAboveStart);
                ctx.lineTo(x, yAboveEnd);
                ctx.moveTo(x, yBelowStart);
                ctx.lineTo(x, yBelowEnd);
            }
            x += cellSize;
        }

        //绘制米字格
        ctx.drawLine(this.pos2point(0, 3), this.pos2point(2, 5));
        ctx.drawLine(this.pos2point(2, 3), this.pos2point(0, 5));
        ctx.drawLine(this.pos2point(7, 3), this.pos2point(9, 5));
        ctx.drawLine(this.pos2point(9, 3), this.pos2point(7, 5));

        ctx.stroke();

        //绘制兵、炮位置函数
        let draw = (point: Point) => {
            let padding = 5;
            let len = this.cellSize / 5;
            ctx.beginPath();
            ctx.save();
            ctx.lineWidth = 2;
            if (point.x != this.boardStartPoint.x) {//最左边不画左边部分
                //左上
                let leftTop = {x: point.x - padding, y: point.y - padding};
                ctx.drawLine(leftTop, {x: leftTop.x, y: leftTop.y - len});
                ctx.drawLine(leftTop, {x: leftTop.x - len, y: leftTop.y});
                //左下
                let leftBottom = {x: point.x - padding, y: point.y + padding};
                ctx.drawLine(leftBottom, {x: leftBottom.x, y: leftBottom.y + len});
                ctx.drawLine(leftBottom, {x: leftBottom.x - len, y: leftBottom.y});
            }
            if (point.x != this.pos2point(0, 8).x) {//最右边不画右边部分
                //右上
                let rightTop = {x: point.x + padding, y: point.y - padding};
                ctx.drawLine(rightTop, {x: rightTop.x, y: rightTop.y - len});
                ctx.drawLine(rightTop, {x: rightTop.x + len, y: rightTop.y});
                //右下
                let rightBottom = {x: point.x + padding, y: point.y + padding};
                ctx.drawLine(rightBottom, {x: rightBottom.x, y: rightBottom.y + len});
                ctx.drawLine(rightBottom, {x: rightBottom.x + len, y: rightBottom.y});
            }
            ctx.stroke();
            ctx.restore();

        }
        //炮位置
        draw(this.pos2point(2, 1));
        draw(this.pos2point(2, 7));
        draw(this.pos2point(7, 1));
        draw(this.pos2point(7, 7));
        //兵、卒位置
        draw(this.pos2point(3, 0));
        draw(this.pos2point(3, 2));
        draw(this.pos2point(3, 4));
        draw(this.pos2point(3, 6));
        draw(this.pos2point(3, 8));
        draw(this.pos2point(6, 0));
        draw(this.pos2point(6, 2));
        draw(this.pos2point(6, 4));
        draw(this.pos2point(6, 6));
        draw(this.pos2point(6, 8));

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

    private drawMark() {
        let ctx = this.mark.getContext("2d")!;
        //绘制选中效果
        ctx.strokeStyle = "#969696";
        ctx.lineWidth = 6;
        let len = 10;
        ctx.drawLine({x: 0, y: 0}, {x: len, y: 0});
        ctx.drawLine({x: 0, y: 0}, {x: 0, y: len});
        ctx.drawLine({x: this.cellSize, y: 0}, {x: this.cellSize - len, y: 0});
        ctx.drawLine({x: this.cellSize, y: 0}, {x: this.cellSize, y: len});
        ctx.drawLine({x: 0, y: this.cellSize}, {x: 0, y: this.cellSize - len});
        ctx.drawLine({x: 0, y: this.cellSize}, {x: len, y: this.cellSize});
        ctx.drawLine({x: this.cellSize, y: this.cellSize}, {x: this.cellSize, y: this.cellSize - len});
        ctx.drawLine({x: this.cellSize, y: this.cellSize}, {x: this.cellSize - len, y: this.cellSize});
        ctx.stroke();
    }

    /**标记某个位置 */
    public markPos(p?: Pos) {
        const ctx = this.canvas.getContext("2d")!;
        let {width, height} = this.options;
        ctx.clearRect(0, 0, width!, height!);
        ctx.drawImage(this.board, 0, 0);
        if (p) {
            let point = this.pos2point(p.row, p.col);
            let halfSize = this.cellSize * 0.5;
            ctx.drawImage(this.mark, point.x - halfSize, point.y - halfSize);
        }
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