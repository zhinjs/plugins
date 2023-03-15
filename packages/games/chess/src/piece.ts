import {CampType, PieceType} from './enum'
import {Pos} from "./types";
import {Canvas, createCanvas} from "canvas";

/**棋子类 */
class Piece {
    private readonly _canvas!: Canvas;
    private readonly _campType!: CampType;
    private readonly _pieceType!: PieceType;
    /**棋子尺寸 */
    private readonly _size!: number;
    /**棋子在棋盘上的位置 */
    private  _pos!: Pos;
    /**标记棋子是否被吃 */
    private _die: boolean = false;
    /**标记棋子是否被选中 */
    private _selected: boolean = false;
    /**用于标记是否是自己的棋子。自己的棋子永远在下方 */
    private readonly _self: boolean = false;

    constructor(campType: CampType, pieceType: PieceType, size: number, pos: Pos, self: boolean = false) {

        this._campType = campType;
        this._pieceType = pieceType;
        this._size = size;
        this._canvas = createCanvas(this._size, this._size);
        this._pos = pos;
        this._self = self;
        this.draw();
    }

    /**绘制棋子 */
    private draw() {
        this._canvas.width = this._canvas.height = this._size;
        let ctx = this._canvas.getContext("2d")!;
        ctx.clearRect(0, 0, this._size, this._size);
        //绘制边框
        ctx.strokeStyle = "#666";
        ctx.beginPath();
        ctx.save();

        let halfSize = this._size * 0.5;
        ctx.arc(halfSize, halfSize, halfSize - 4, 0, Math.PI * 2, false);
        ctx.fillStyle = "#F3AD84";
        ctx.fill();
        ctx.arc(halfSize, halfSize, halfSize - 7, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();

        //绘制文字
        ctx.beginPath();
        ctx.fillStyle = this._campType === CampType.RED ? 'red' : 'blank';
        let fontSize = this._size * 0.45;
        ctx.font = `${fontSize}px 楷体`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._pieceType, halfSize, halfSize - 2);
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

    public get pieceType() {
        return this._pieceType;
    }

    public get campType() {
        return this._campType;
    }

    public get size() {
        return this._size;
    }

    public get self() {
        return this._self;
    }

    public set die(die: boolean) {
        this._die = die;
    }

    public get die() {
        return this._die;
    }

    public set selected(selected: boolean) {
        this._selected = selected;
        this.draw();//重新绘制棋子
    }

    public get selected() {
        return this._selected;
    }

}

export {Piece}