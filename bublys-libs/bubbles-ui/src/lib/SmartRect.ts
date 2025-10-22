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
    const direction: Direction = this.calcSpaceWideDirection(openingSize);

    if (direction === "top") {
      return {
        x: this.left,
        y: this.top - openingSize.height * 1.2,
      };
    } else if (direction === "right") {
      return {
        x: this.right + openingSize.width * 0.2,
        y: this.top,
      };
    } else if (direction === "bottom") {
      return {
        x: this.left,
        y: this.bottom + openingSize.height * 0.2,
      };
    } else if (direction === "left") {
      return {
        x: this.left - openingSize.width * 1.2,
        y: this.top,
      };
    }

    throw new Error("Unexpected direction");
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
