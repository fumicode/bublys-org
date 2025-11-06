import { Point2, Size2 } from "./00_Point.js";
import {SmartRect} from "./SmartRect.js";

export type RectJson = {
  x: number;
  y: number;
  width: number;
  height: number;
  parentSize: Size2;
}

export type BubbleProps = {
  id?: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;

  renderedRect?: SmartRect; //内部ではSmartRectを使う

};

export type BubbleJson= {
  id: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;

  renderedRect?: RectJson; //これはシリアライズ可能な型に保つ

};

export type BubbleState = {
  id: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;

  renderedRect?: SmartRect; //内部ではSmartRectを使う

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


  get renderedRect(): SmartRect | undefined {
    return this.state.renderedRect;
  }

  rendered(rect: SmartRect): this {
    return new Bubble({ ...this.state , renderedRect: rect }) as this;
  }

  resizeTo(size: Size2): Bubble {
    return new Bubble({ ...this.state, size });
  }

  toJSON(): BubbleJson {
    const rect = this.state.renderedRect;
    return {
      ...this.state,
      renderedRect: rect ? rect.toJSON() : undefined
    };
  }

  static fromJSON(s: BubbleJson): Bubble {
    const renderedRect = s.renderedRect
      ? SmartRect.fromJSON(s.renderedRect)
      : undefined;
    return new Bubble({ ...s, renderedRect });
  }
}

export const createBubble = (name: string, pos?: Point2): Bubble => {
  const colorHue = getColorHueFromString(name);

  let type = "normal";


  switch (true) {
    case name === "user-groups":
      type = "user-groups";
      break;

    case name.startsWith("user-groups/"):
      type = "user-group";
      break;

    case name === "memos":
      type = "memos";
      break;
      
    case name.startsWith("memos/"):
      type = "memo";
      break;

    default:
      type = "normal";
  }

  return new Bubble({ name, colorHue, type, position: pos });
};


// 文字列から1対1の一意な色を生成。
function getColorHueFromString(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 360);
}
