import { Point2, Size2 } from "./00_Point.js";

export type SmartRectJson = {
  x: number;
  y: number;
  width: number;
  height: number;
  parentSize: Size2;
};
type Direction = "top" | "right" | "bottom" | "left";
const directions: Direction[] = ["top", "right", "bottom", "left"];

/**
 * SmartRect wraps a DOMRectReadOnly and provides utility getters.
 * Includes serialization support via toJSON() and static fromJSON().
 */
export class SmartRect implements DOMRectReadOnly {
  constructor(readonly domRect: DOMRectReadOnly, readonly parentSize: Size2) {}

  get x() {
    return this.domRect.x;
  }
  get y() {
    return this.domRect.y;
  }
  get position(): Point2 {
    return { x: this.x, y: this.y };
  }
  get width() {
    return this.domRect.width;
  }
  get height() {
    return this.domRect.height;
  }
  get size() : Size2 {
    return { width: this.width, height: this.height };
  }
  get top() {
    return this.domRect.top;
  }
  get right() {
    return this.domRect.right;
  }
  get bottom() {
    return this.domRect.bottom;
  }
  get left() {
    return this.domRect.left;
  }

  get positions(): [number, number, number, number] {
    return [this.top, this.right, this.bottom, this.left];
  }

  get topSpace() {
    return this.domRect.top;
  }

  get leftSpace() {
    return this.domRect.left;
  }

  get rightSpace() {
    return this.parentSize.width - this.domRect.right;
  }

  get bottomSpace() {
    return this.parentSize.height - this.domRect.bottom;
  }

  get spaces(): [number, number, number, number] {
    return [this.topSpace, this.rightSpace, this.bottomSpace, this.leftSpace];
  }

  

  calcSpaceWideDirection(
    openingSize: Size2 = { width: 0, height: 0 }
  ): Direction {

    const spaces = this.spaces.map((space, index) => ({
      original: space,
      subtractedSpace:
        space - (index % 2 === 0 ? openingSize.height : openingSize.width),
    }));

    const maxSpace = Math.max(...spaces.map((space) => space.subtractedSpace));
    const maxIndex = spaces.findIndex(
      (space) => space.subtractedSpace === maxSpace
    );

    return directions[maxIndex];
  }

  calcPositionToOpen(openingSize: Size2): Point2 {
    const direction: Direction = this.calcSpaceWideDirection({width:0, height:0});

    let ret: Point2;

    if (direction === "top") {
      ret = {
        x: this.left,
        y: this.top - openingSize.height,
      };

    } else if (direction === "right") {
      ret ={
        x: this.right,
        y: this.top,
      };

    } else if (direction === "bottom") {
      ret ={
        x: this.left,
        y: this.bottom,
      };

    } else if (direction === "left") {
      ret ={
        x: this.left - openingSize.width ,
        y: this.top,
      };
    }
    else {
      throw new Error("Unexpected direction");
    }

    return ret;
  }

  /**
   * Merge this SmartRect with another, returning the minimal bounding SmartRect.
   */
  merge(other: SmartRect): SmartRect {
    const x = Math.min(this.x, other.x);
    const y = Math.min(this.y, other.y);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    const width = right - x;
    const height = bottom - y;
    const domRect = new DOMRect(x, y, width, height);
    return new SmartRect(domRect, this.parentSize);
  }

  toJSON(): SmartRectJson {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      parentSize: this.parentSize,
    };
  }

  static fromJSON(json: SmartRectJson): SmartRect {
    const domRect = new DOMRect(json.x, json.y, json.width, json.height);
    return new SmartRect(domRect, json.parentSize);
  }
}
