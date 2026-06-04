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

  /** 範囲内の全ブロックに局員を追加（startBlock 以上 endBlock 未満） */
  addUserToRange(startBlock: number, endBlock: number, userId: string): BlockList {
    let result: BlockList = this;
    for (let b = startBlock; b < endBlock; b++) {
      result = result.addUser(b, userId);
    }
    return result;
  }

  /** 範囲内の全ブロックから局員を削除（startBlock 以上 endBlock 未満） */
  removeUserFromRange(startBlock: number, endBlock: number, userId: string): BlockList {
    let result: BlockList = this;
    for (let b = startBlock; b < endBlock; b++) {
      result = result.removeUser(b, userId);
    }
    return result;
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
