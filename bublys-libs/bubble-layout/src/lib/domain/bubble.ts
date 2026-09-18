/**
 * 泡ひとつ。状態は `state` オブジェクトで持ち、更新は新しいインスタンスを返す（CLAUDE.md）。
 *
 * 元：lab.html 419-441 行（add が作る泡）と RULES.md「泡が持つもの」。
 * 持たないもの：関係（含む・隣り合う）／アンカー／置いた順／レイヤー。
 * 含む＝親になる。隣り合う＝見えない親の並び。手前＝ Z 軸に書く。
 */
import { ROOT_SPACE } from './types.js';
import type { BubbleId, Cell, Focus, SpaceId, Size, Vec3 } from './types.js';
import type { View } from './view.js';

export interface BubbleState {
  readonly id: BubbleId;
  readonly title: string;
  /** 色相。見えない親は持つが体を描かない */
  readonly hue: number | null;
  /** 自前の大きさ。'equal'・'pack' の軸では、箱は中身が収まるまで伸びる（④） */
  readonly size: Size;
  /** 親の泡の id。null ＝ いちばん外の空間 */
  readonly parent: BubbleId | null;
  /** 「自由」次元が読む */
  readonly free: Vec3;
  /** 「順序」次元が読む */
  readonly order: number;
  /** 「列」「行」次元が読む */
  readonly cell: Cell;
  /** 「履歴」次元が読む */
  readonly hist: number;
  readonly branch: number;
  /** 中に泡を入れているなら、その並べ方。null なら外から継ぐ */
  readonly view: View | null;
  /** ③ スナップで生まれた見えない親か */
  readonly implicit: boolean;
  /** この泡が空間を持つとき、その空間の「いまどこを見ているか」。View には入れない（継がない） */
  readonly focus: Focus;
}

/** add() に渡す形。足りない所は既定で埋める（lab.html 424-440 行） */
export interface BubbleInit {
  readonly id: BubbleId;
  readonly title: string;
  readonly hue?: number | null;
  readonly w: number;
  readonly h: number;
  readonly parent?: BubbleId | null;
  readonly free?: Partial<Vec3>;
  readonly order?: number;
  readonly cell?: Partial<Cell>;
  readonly hist?: number;
  readonly branch?: number;
  readonly view?: View | null;
  readonly implicit?: boolean;
}

/**
 * 泡ひとつ。`state` を読むだけのクラスで、更新は必ず新しいインスタンスを返す。
 * lab.html 424-440 行の add が作っていた形をそのまま持っている。
 */
export class Bubble {
  constructor(readonly state: BubbleState) {}

  /** lab.html 424-440 行 add。足りない所を既定で埋める */
  static create(init: BubbleInit): Bubble {
    return new Bubble({
      id: init.id,
      title: init.title,
      hue: init.hue ?? null,
      size: { w: init.w, h: init.h },
      parent: init.parent ?? null,
      free: { x: 0, y: 0, z: 0, ...init.free },
      order: init.order ?? 0,
      cell: { col: 0, row: 0, ...init.cell },
      hist: init.hist ?? 0,
      branch: init.branch ?? 0,
      view: init.view ?? null,
      implicit: !!init.implicit,
      focus: { x: 0, y: 0, z: 0 },
    });
  }

  get id(): BubbleId {
    return this.state.id;
  }

  /** 親の空間の id。parent が null なら 'root'（lab.html 468 行の `b.parent ?? "root"`） */
  get space(): SpaceId {
    return this.state.parent ?? ROOT_SPACE;
  }

  with(patch: Partial<BubbleState>): Bubble {
    return new Bubble({ ...this.state, ...patch });
  }

  withFree(key: keyof Vec3, value: number): Bubble {
    return this.with({ free: { ...this.state.free, [key]: value } });
  }

  withCell(patch: Partial<Cell>): Bubble {
    return this.with({ cell: { ...this.state.cell, ...patch } });
  }

  withOrder(order: number): Bubble {
    return this.with({ order });
  }

  withParent(parent: BubbleId | null): Bubble {
    return this.with({ parent });
  }

  withSize(size: Size): Bubble {
    return this.with({ size });
  }

  withView(view: View | null): Bubble {
    return this.with({ view });
  }

  withFocus(focus: Partial<Focus>): Bubble {
    return this.with({ focus: { ...this.state.focus, ...focus } });
  }

  /** Redux に置く形（＝ state そのもの）。リポジトリのスライスはこれを丸ごと保存する */
  toPlain(): BubbleState {
    return this.state;
  }

  static fromPlain(plain: BubbleState): Bubble {
    return new Bubble(plain);
  }
}
