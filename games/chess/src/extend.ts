import {CanvasRenderingContext2D} from 'canvas'
import {Point} from "./types";

CanvasRenderingContext2D.prototype.drawLine = function (start: Point, end: Point) {
    this.moveTo(start.x, start.y);
    this.lineTo(end.x, end.y);
};
