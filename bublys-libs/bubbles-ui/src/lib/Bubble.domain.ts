import { Point2, Size2, SmartRect } from "@bublys-org/bubbles-ui-util";

export type BubbleOptions = {
  contentBackground?: string;
  /**
   * 中身が固有サイズを持たず、常にバブルいっぱいに広がる「窓」型コンテンツ
   * （例: 再帰 universe）。true のとき fit-content 状態を持たず、
   * 常に明示サイズの窓として扱う（最大化解除 = 既定の窓サイズに戻る）。
   */
  fillsContainer?: boolean;
  /** fillsContainer のとき、生成時／最大化解除時に使う既定の窓サイズ。 */
  defaultSize?: Size2;
};

/** fillsContainer なバブルの既定の窓サイズ（route が defaultSize を指定しない場合のフォールバック）。 */
export const DEFAULT_WINDOW_SIZE: Size2 = { width: 520, height: 400 };

// パスパラメータの型
export type BubbleParams = Record<string, string>;

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
  params?: BubbleParams;
  position?: Point2;
  size?: Size2;
  maximized?: boolean;
  bubbleOptions?: BubbleOptions;

  renderedRect?: SmartRect; //内部ではSmartRectを使う

};

export type BubbleJson= {
  id: string;
  url: string;
  colorHue: number;
  type: string;
  params?: BubbleParams;
  position?: Point2;
  size?: Size2;
  maximized?: boolean;
  bubbleOptions?: BubbleOptions;

  renderedRect?: RectJson; //これはシリアライズ可能な型に保つ

};

export type BubbleState = {
  id: string;
  url: string;
  colorHue: number;
  type: string;
  params: BubbleParams;
  position?: Point2;
  size?: Size2;
  maximized?: boolean;
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
      params: props.params || {},
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

  get params(): BubbleParams {
    return this.state.params;
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

  /** 中身が固有サイズを持たない窓型コンテンツか（常に明示サイズの窓として扱う）。 */
  get fillsContainer(): boolean {
    return this.state.bubbleOptions?.fillsContainer ?? false;
  }

  /** fillsContainer のときの既定の窓サイズ。 */
  get defaultSize(): Size2 {
    return this.state.bubbleOptions?.defaultSize ?? DEFAULT_WINDOW_SIZE;
  }

  /**
   * 最大化中か。明示フラグを優先し、無ければ「明示サイズを持つか」で判定（後方互換）。
   * fillsContainer な窓は既定サイズ時 maximized=false を明示的に持つので、
   * サイズがあっても最大化扱いにならない。
   */
  get isMaximized(): boolean {
    return this.state.maximized ?? !!this.state.size;
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

  /** 最大化する（明示サイズ + maximized=true）。 */
  maximizeTo(size: Size2): Bubble {
    return new Bubble({ ...this.state, size, maximized: true });
  }

  /**
   * 最大化を解除する。
   * fillsContainer な窓は固有サイズが無いので既定の窓サイズに戻す（サイズ維持）。
   * 通常のバブルはサイズ無し（fit-content）に戻す。
   */
  restore(): Bubble {
    const size = this.fillsContainer ? this.defaultSize : undefined;
    return new Bubble({ ...this.state, size, maximized: false });
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
  params?: BubbleParams;
  bubbleOptions?: BubbleOptions;
};

type BubblePropsResolver = (url: string) => BubbleResolvedProps | undefined;
const bubblePropsResolvers: BubblePropsResolver[] = [];

/**
 * バブルプロパティリゾルバーを登録
 * 複数のリゾルバーを登録可能。順番に試行され、最初にマッチしたものが使用される。
 */
export const registerBubblePropsResolver = (resolver: BubblePropsResolver) => {
  bubblePropsResolvers.push(resolver);
};

// 後方互換性のため維持
type BubbleTypeResolver = (url: string) => string | undefined;
let customBubbleTypeResolver: BubbleTypeResolver | undefined;

export const registerBubbleTypeResolver = (resolver: BubbleTypeResolver) => {
  customBubbleTypeResolver = resolver;
};

export const createBubble = (url: string, pos?: Point2): Bubble => {
  const colorHue = getColorHueFromString(url);

  // 登録されたリゾルバーを順に試す
  let resolvedProps: BubbleResolvedProps | undefined;
  for (const resolver of bubblePropsResolvers) {
    resolvedProps = resolver(url);
    if (resolvedProps) break;
  }

  const resolvedType = resolvedProps?.type ?? customBubbleTypeResolver?.(url);
  const type = resolvedType ?? "normal";
  const params = resolvedProps?.params;
  const bubbleOptions = resolvedProps?.bubbleOptions;

  // fillsContainer な窓は固有サイズが無いため、生成時から既定の窓サイズを持つ
  // （maximized=false を明示し、最大化扱いにならないようにする）。
  const fillsContainer = bubbleOptions?.fillsContainer ?? false;
  const size = fillsContainer
    ? bubbleOptions?.defaultSize ?? DEFAULT_WINDOW_SIZE
    : undefined;
  const maximized = fillsContainer ? false : undefined;

  return new Bubble({ url, colorHue, type, params, position: pos, bubbleOptions, size, maximized });
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
