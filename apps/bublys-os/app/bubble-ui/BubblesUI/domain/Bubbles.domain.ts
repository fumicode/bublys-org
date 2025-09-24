import { Point2, Size2 } from "../../01_Utils/00_Point";



export type BubblesProcess = Bubble[][];

export type BubbleProps = {
  id?: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;
};

export type BubbleState = {
  id: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;
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

  resizeTo(size: Size2): Bubble {
    return new Bubble({ ...this.state, size });
  }

  toJSON(): BubbleState {
    return { ...this.state };
  }

  static fromJSON(s: BubbleState): Bubble {
    return new Bubble(s);
  }
}
