import { BaseBubly, BublyRegistry } from './BaseBubly';

/**
 * 複数のバブリ（Counter、Timerなど）を含むWorld状態
 * バブリの種類に依存しない汎用的な設計
 */
export class BublyWorld {
  public readonly bublies: Map<string, BaseBubly>;

  constructor(bublies: Map<string, BaseBubly> = new Map()) {
    this.bublies = bublies;
  }

  /**
   * バブリを追加または更新
   */
  setBubly(id: string, bubly: BaseBubly): BublyWorld {
    const newBublies = new Map(this.bublies);
    newBublies.set(id, bubly);
    return new BublyWorld(newBublies);
  }

  /**
   * バブリを取得
   */
  getBubly(id: string): BaseBubly | undefined {
    return this.bublies.get(id);
  }

  /**
   * 特定のタイプのバブリを取得
   */
  getBublyAs<T extends BaseBubly>(id: string): T | undefined {
    return this.bublies.get(id) as T | undefined;
  }

  /**
   * バブリを削除
   */
  removeBubly(id: string): BublyWorld {
    const newBublies = new Map(this.bublies);
    newBublies.delete(id);
    return new BublyWorld(newBublies);
  }

  /**
   * すべてのバブリのIDを取得
   */
  getBublyIds(): string[] {
    return Array.from(this.bublies.keys());
  }

  /**
   * すべてのバブリを取得
   */
  getAllBublies(): BaseBubly[] {
    return Array.from(this.bublies.values());
  }

  /**
   * 特定のタイプのバブリを全て取得
   */
  getBubliesByType(type: string): BaseBubly[] {
    return Array.from(this.bublies.values()).filter(bubly => bubly.type === type);
  }

  /**
   * JSON形式に変換
   */
  toJson(): any {
    const bubliesArray = Array.from(this.bublies.values()).map(bubly => bubly.toJson());
    return {
      bublies: bubliesArray,
    };
  }

  /**
   * JSONからBublyWorldインスタンスを作成
   */
  static fromJson(json: any): BublyWorld {
    const bubliesMap = new Map<string, BaseBubly>();
    if (json.bublies && Array.isArray(json.bublies)) {
      json.bublies.forEach((bublyData: any) => {
        const bubly = BublyRegistry.fromJson(bublyData);
        bubliesMap.set(bubly.id, bubly);
      });
    }
    return new BublyWorld(bubliesMap);
  }
}

