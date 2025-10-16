import { Point2, Size2 } from "./00_Point.js";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BubbleProps = {
  id?: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;

  renderedRect?: Rect; //簡易的な定義。そのうちにSmartRectにしたい

};

export type BubbleState = {
  id: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;

  renderedRect?: Rect; //簡易的な定義。そのうちにSmartRectにしたい

};


// Domain Bubble class
export class Bubble {
  private state: BubbleState;
  constructor(props: BubbleProps) {
    this.state = {
      ...props,
      id: props.id || crypto.randomUUID(),
    };
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  updateName(name: string): Bubble {
    return new Bubble({ ...this.state, name });
  }

  get colorHue(): number {
    return this.state.colorHue;
  }

  get type(): string {
    return this.state.type;
  }

  get position(): Point2 {
    return this.state.position || { x: 0, y: 0 };
  }




  moveTo(pos: Point2): Bubble {
    return new Bubble({ ...this.state, position: pos });
  }

  get size(): Size2 | undefined {
    return this.state.size;
  }

  rename(newName: string): Bubble {
    return new Bubble({ ...this.state, name: newName });
  }


  get renderedRect(): Rect | undefined {
    return this.state.renderedRect;
  }

  rendered(rect: Rect): this {
    return new Bubble({ ...this.state , renderedRect: rect }) as this;
  }

  resizeTo(size: Size2): Bubble {
    return new Bubble({ ...this.state, size });
  }

  toJSON(): BubbleState {
    return { ...this.state,
      renderedRect: Object.assign({}, this.state.renderedRect)
    };
  }

  static fromJSON(s: BubbleState): Bubble {
    return new Bubble(s);
  }
}


