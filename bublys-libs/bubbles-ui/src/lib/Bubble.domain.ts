import { Point2, Size2 } from "./00_Point.js";
import {SmartRect} from "./SmartRect.js";

export type BubbleOptions = {
  contentBackground?: string;
};

export type RectJson = {
  x: number;
  y: number;
  width: number;
  height: number;
  parentSize: Size2;
}

export type BubbleProps = {
  id?: string;
  url: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;
  bubbleOptions?: BubbleOptions;

  renderedRect?: SmartRect; //内部ではSmartRectを使う

};

export type BubbleJson= {
  id: string;
  url: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;
  bubbleOptions?: BubbleOptions;

  renderedRect?: RectJson; //これはシリアライズ可能な型に保つ

};

export type BubbleState = {
  id: string;
  url: string;
  colorHue: number;
  type: string;
  position?: Point2;
  size?: Size2;
  bubbleOptions?: BubbleOptions;

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

  get url(): string {
    return this.state.url;
  }

  updateUrl(url: string): Bubble {
    return new Bubble({ ...this.state, url });
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

  get contentBackground(): string | undefined {
    return this.state.bubbleOptions?.contentBackground;
  }

  get bubbleOptions(): BubbleOptions | undefined {
    return this.state.bubbleOptions;
  }

  // 後方互換性のため rename を残す
  rename(newUrl: string): Bubble {
    return new Bubble({ ...this.state, url: newUrl });
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

type BubbleResolvedProps = {
  type?: string;
  bubbleOptions?: BubbleOptions;
};

type BubblePropsResolver = (url: string) => BubbleResolvedProps | undefined;
let customBubblePropsResolver: BubblePropsResolver | undefined;

export const registerBubblePropsResolver = (resolver: BubblePropsResolver) => {
  customBubblePropsResolver = resolver;
};

// 後方互換性のため維持
type BubbleTypeResolver = (url: string) => string | undefined;
let customBubbleTypeResolver: BubbleTypeResolver | undefined;

export const registerBubbleTypeResolver = (resolver: BubbleTypeResolver) => {
  customBubbleTypeResolver = resolver;
};

export const createBubble = (url: string, pos?: Point2): Bubble => {
  const colorHue = getColorHueFromString(url);

  // 新しい resolver を優先
  const resolvedProps = customBubblePropsResolver?.(url);
  const resolvedType = resolvedProps?.type ?? customBubbleTypeResolver?.(url);
  const type = resolvedType ?? "normal";
  const bubbleOptions = resolvedProps?.bubbleOptions;

  return new Bubble({ url, colorHue, type, position: pos, bubbleOptions });
};


// 文字列から1対1の一意な色を生成。
function getColorHueFromString(url: string): number {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 360);
}
