/**
 * Memo クラス
 * メモの内容を管理し、不変性を保つ
 */
export type MemoBlock = {
  id: string;
  type: string;
  content: string;
};

export type RawMemo = {
  id: string;
  blocks: {
    [key: string]: MemoBlock;
  };
  lines: string[];
  authorId?: string | null;
};

export class Memo {
  readonly state: RawMemo;
  
  constructor(state: RawMemo) {
    this.state = { id: state.id, blocks: { ...state.blocks }, lines: [...state.lines], authorId: state.authorId ?? null };
  }

  get id(): string {
    return this.state.id;
  }
  
  get blocks(): Record<string, MemoBlock> {
    return this.state.blocks;
  }
  
  get lines(): string[] {
    return this.state.lines;
  }

  get authorId(): string | null | undefined {
    return this.state.authorId;
  }

  getNextBlockId(currentId: string): string | undefined {
    const idx = this.state.lines.findIndex((id) => id === currentId);
    return idx >= 0 && idx < this.state.lines.length - 1
      ? this.state.lines[idx + 1]
      : undefined;
  }

  getPrevBlockId(currentId: string): string | undefined {
    const idx = this.state.lines.findIndex((id) => id === currentId);
    return idx > 0 ? this.state.lines[idx - 1] : undefined;
  }

  mergeWithPrevious(blockId: string): Memo {
    return this.mergeBlock(blockId);
  }

  insertTextBlockAfter(afterId: string, type: string, content = ""): { memo: Memo; newBlockId: string } {
    const newBlockId = crypto.randomUUID();
    const newBlock: MemoBlock = { id: newBlockId, type, content };
    const { id, blocks, lines } = this.state;
    const newBlocks = { ...blocks, [newBlockId]: newBlock };
    const newLines = [...lines];
    const idx = newLines.findIndex((bid) => bid === afterId);
    newLines.splice(idx + 1, 0, newBlockId);
    const newMemo = new Memo({ id, blocks: newBlocks, lines: newLines });
    return { memo: newMemo, newBlockId };
  }

  updateBlockContent(blockId: string, content: string): Memo {
    const { id, blocks, lines } = this.state;
    const newBlocks = { ...blocks };
    if (newBlocks[blockId]) {
      newBlocks[blockId] = { ...newBlocks[blockId], content };
    }
    return new Memo({ id, blocks: newBlocks, lines: [...lines], authorId: this.state.authorId });
  }

  mergeBlock(blockId: string): Memo {
    const { id, blocks, lines } = this.state;
    const newBlocks = { ...blocks };
    const newLines = [...lines];
    const idx = newLines.findIndex((bid) => bid === blockId);
    if (idx <= 0) return this;
    const prevId = newLines[idx - 1];
    newBlocks[prevId] = { ...newBlocks[prevId], content: newBlocks[prevId].content + newBlocks[blockId].content };
    delete newBlocks[blockId];
    newLines.splice(idx, 1);
    return new Memo({ id, blocks: newBlocks, lines: newLines, authorId: this.state.authorId });
  }

  setAuthor(userId: string | null): Memo {
    return new Memo({ ...this.state, authorId: userId });
  }

  /**
   * JSON形式に変換
   */
  toJson(): RawMemo {
    return { ...this.state };
  }

  /**
   * JSONからMemoインスタンスを作成
   */
  static fromJson(json: any): Memo {
    return new Memo(json);
  }

  /**
   * 新しいMemoインスタンスを作成
   */
  static create(): Memo {
    const memoId = crypto.randomUUID();
    const firstLineId = crypto.randomUUID();
    const raw: RawMemo = {
      id: memoId,
      blocks: {
        [firstLineId]: {
          id: firstLineId,
          type: "text",
          content: "新しいメモの内容です。",
        },
      },
      lines: [firstLineId],
      authorId: null,
    };
    return Memo.fromJson(raw);
  }
}
