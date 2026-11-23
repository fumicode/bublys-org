/**
 * EmojiTag — 人に付ける絵文字タグ（#236）
 *
 * Discord のリアクションのように、人にいくつでもペタペタ貼れる。
 * 分類や辞書は置かず、フリーフォームで付ける。
 *
 * - emoji: Unicode 1文字（絵文字）
 * - label: 任意のラベル（ツールチップなどで意味を補足）
 *
 * 順序あり（並び順 = 表示順）、重複なし（同じ emoji は1つだけ）。不変。
 */

export type EmojiTagState = {
  emoji: string;
  label?: string;
};

export type EmojiTagPlain = EmojiTagState;

export class EmojiTag {
  constructor(readonly state: EmojiTagState) {}

  get emoji(): string {
    return this.state.emoji;
  }

  get label(): string | undefined {
    return this.state.label || undefined;
  }

  /** ラベルを変えた新しいタグを返す。空文字はラベルなし。変わらなければ自分自身。 */
  withLabel(label: string | undefined): EmojiTag {
    const next = label || undefined;
    if (next === this.label) return this;
    return new EmojiTag({ emoji: this.state.emoji, ...(next ? { label: next } : {}) });
  }

  /** 同じ絵文字か（ラベルは見ない。重複判定に使う） */
  sameEmoji(other: EmojiTag): boolean {
    return this.state.emoji === other.state.emoji;
  }

  toPlain(): EmojiTagPlain {
    const plain: EmojiTagPlain = { emoji: this.state.emoji };
    if (this.state.label) plain.label = this.state.label;
    return plain;
  }

  static fromPlain(plain: EmojiTagPlain): EmojiTag {
    return new EmojiTag({ ...plain });
  }
}

/** 絵文字タグの配列操作（不変） */
export const EmojiTags = {
  /** タグを末尾に追加。同じ絵文字が既にあれば何もしない */
  add(tags: readonly EmojiTag[], tag: EmojiTag): EmojiTag[] {
    if (tags.some((t) => t.sameEmoji(tag))) return [...tags];
    return [...tags, tag];
  },

  /** 指定の絵文字のタグを外す */
  remove(tags: readonly EmojiTag[], emoji: string): EmojiTag[] {
    return tags.filter((t) => t.emoji !== emoji);
  },

  /** 指定の絵文字のタグのラベルを変える */
  updateLabel(tags: readonly EmojiTag[], emoji: string, label: string | undefined): EmojiTag[] {
    return tags.map((t) => (t.emoji === emoji ? t.withLabel(label) : t));
  },

  toPlain(tags: readonly EmojiTag[]): EmojiTagPlain[] {
    return tags.map((t) => t.toPlain());
  },

  fromPlain(plain: readonly EmojiTagPlain[] | undefined): EmojiTag[] {
    return plain?.map(EmojiTag.fromPlain) ?? [];
  },
} as const;
