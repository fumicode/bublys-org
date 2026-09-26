/**
 * BlockList — プリミティブUIのデータ基盤
 *
 * 15分解像度のセル単位で局員の配置を保持する2次元配列。
 * blockIndex 0 = TimeSchedule.startMinute から15分ごと。
 * 表示粒度（15/30/60分）とは独立して常に15分単位で保存。
 */

// ========== 型定義 ==========

export interface BlockListState {
  /**
   * blocks[blockIndex] = userId[]
   * blockIndex 0 = TimeSchedule.startMinute から15分ごと
   */
  readonly blocks: readonly (readonly string[])[];
}

// ========== BlockList クラス ==========

/** startBlock 以上 endBlock 未満のブロック番号を並べる */
const blocksIn = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);

export class BlockList {
  constructor(readonly state: BlockListState) {}

  /** 指定ブロックに局員を追加 */
  addUser(blockIndex: number, userId: string): BlockList {
    if (blockIndex < 0 || blockIndex >= this.state.blocks.length) return this;
    if (this.hasUser(blockIndex, userId)) return this;
    const newBlocks = this.state.blocks.map((users, i) =>
      i === blockIndex ? [...users, userId] : users
    );
    return new BlockList({ blocks: newBlocks });
  }

  /** 指定ブロックから局員を削除 */
  removeUser(blockIndex: number, userId: string): BlockList {
    if (blockIndex < 0 || blockIndex >= this.state.blocks.length) return this;
    const newBlocks = this.state.blocks.map((users, i) =>
      i === blockIndex ? users.filter((u) => u !== userId) : users
    );
    return new BlockList({ blocks: newBlocks });
  }

  /** 指定ブロックに局員が含まれるか */
  hasUser(blockIndex: number, userId: string): boolean {
    if (blockIndex < 0 || blockIndex >= this.state.blocks.length) return false;
    return this.state.blocks[blockIndex].includes(userId);
  }

  /** 指定ブロックの局員一覧を取得 */
  getUsersAt(blockIndex: number): readonly string[] {
    if (blockIndex < 0 || blockIndex >= this.state.blocks.length) return [];
    return this.state.blocks[blockIndex];
  }

  /** 指定局員が含まれるブロックインデックス一覧を取得 */
  getBlocksForUser(userId: string): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.state.blocks.length; i++) {
      if (this.state.blocks[i].includes(userId)) {
        result.push(i);
      }
    }
    return result;
  }

  /**
   * 範囲内の全ブロックに局員を追加（startBlock 以上 endBlock 未満）。
   *
   * ★ **自分を変数に取り置かない。** `let result = this` と置くと、以降は「いまの自分」と
   *   「積み上げた結果」が同じ名前で混ざる ── 畳み込みなら、始まりとして渡すだけで済む。
   */
  addUserToRange(startBlock: number, endBlock: number, userId: string): BlockList {
    return blocksIn(startBlock, endBlock).reduce<BlockList>(
      (list, b) => list.addUser(b, userId),
      this,
    );
  }

  /** 範囲内の全ブロックから局員を削除（startBlock 以上 endBlock 未満） */
  removeUserFromRange(startBlock: number, endBlock: number, userId: string): BlockList {
    return blocksIn(startBlock, endBlock).reduce<BlockList>(
      (list, b) => list.removeUser(b, userId),
      this,
    );
  }

  /** 全ブロックから指定局員を削除 */
  removeUserFromAll(userId: string): BlockList {
    const newBlocks = this.state.blocks.map((users) =>
      users.filter((u) => u !== userId)
    );
    return new BlockList({ blocks: newBlocks });
  }

  /** 総ブロック数 */
  get totalBlocks(): number {
    return this.state.blocks.length;
  }

  /** 空のBlockListを作成 */
  static createEmpty(totalBlocks: number): BlockList {
    const blocks: readonly string[][] = Array.from({ length: totalBlocks }, () => []);
    return new BlockList({ blocks });
  }
}
