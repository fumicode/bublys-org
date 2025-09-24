export interface Size2 {
  readonly width: number;
  readonly height: number;
}

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export class Vec2 implements Point2 {
  private state: Point2;

  constructor(props: Point2) {
    this.state = { x: props.x, y: props.y };
  }

  get x(): number {
    return this.state.x;
  }

  get y(): number {
    return this.state.y;
  }

  add(other: Point2): Vec2 {
    return new Vec2({ x: this.x + other.x, y: this.y + other.y });
  }

  subtract(other: Point2): Vec2 {
    return new Vec2({ x: this.x - other.x, y: this.y - other.y });
  }

  multiply(scalar: number): Vec2 {
    return new Vec2({ x: this.x * scalar, y: this.y * scalar });
  }

  toString(): string {
    return `Vec2(${this.x}, ${this.y})`;
  }
}
