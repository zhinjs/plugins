import {Pos} from "./types";
import {Canvas, createCanvas} from "canvas";

/**棋子类 */
class Tip {
    private _canvas!: Canvas;
    /**提示尺寸 */
    private _size!: number;
    /**提示在棋盘上的位置 */
    private _pos!: Pos;

    constructor(size: number, pos: Pos) {
        this._size = size;
        this._canvas = createCanvas(this._size, this._size);
        this._pos = pos;
        this.draw();
    }

    /**绘制提示 */
    private draw() {
        this._canvas.width = this._canvas.height = this._size;
        let ctx = this._canvas.getContext("2d")!;
        ctx.clearRect(0, 0, this._size, this._size);
        //绘制边框
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.save();
        let halfSize = this._size * 0.5;
        ctx.arc(halfSize, halfSize, halfSize - 4, 0, Math.PI * 2, false);
        ctx.fillStyle = "#F35555";
        ctx.fill();
        ctx.arc(halfSize, halfSize, halfSize - 7, 0, Math.PI * 2, true);
        ctx.fill();
    }

    public set pos(pos: Pos) {
        this._pos = pos;
    }

    public get pos() {
        return this._pos;
    }

    public get canvas() {
        return this._canvas;
    }

    public get size() {
        return this._size;
    }

}

export {Tip}