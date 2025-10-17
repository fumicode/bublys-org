import { Counter } from './Counter';

/**
 * WorldObject 型定義
 * 世界の中に存在するすべてのコンポーネントを含む
 * 将来的には bubblesUI などのコンポーネントも追加可能
 */
export interface WorldObject {
  counters: Map<string, Counter>;
  // 将来の拡張用
  // bubblesUI?: BubblesUI;
  // otherComponent?: OtherComponent;
}

/**
 * World クラス
 * 世界の状態を表現し、世界線の概念を含む
 * worldObjectを通じて複数のコンポーネントを管理する
 */
export class World {
  public readonly worldId: string;
  public readonly parentWorldId: string | null;
  public readonly worldObject: WorldObject; // 世界内のすべてのコンポーネント
  public readonly currentWorldLineId: string;

  constructor(
    worldId: string,
    parentWorldId: string | null = null,
    worldObject: WorldObject = { counters: new Map() },
    currentWorldLineId: string = ''
  ) {
    this.worldId = worldId;
    this.parentWorldId = parentWorldId;
    this.worldObject = worldObject;
    this.currentWorldLineId = currentWorldLineId || worldId; // デフォルトは自身のID
  }

  /**
   * 特定のカウンターを更新した新しい世界を作成
   */
  public updateCounter(counterId: string, newCounter: Counter): World {
    const newCounters = new Map(this.worldObject.counters);
    newCounters.set(counterId, newCounter);
    
    return new World(
      crypto.randomUUID(),
      this.worldId,
      {
        ...this.worldObject,
        counters: newCounters,
      },
      this.currentWorldLineId
    );
  }

  /**
   * 新しいカウンターを追加した新しい世界を作成
   */
  public addCounter(counterId: string, counter: Counter = new Counter()): World {
    const newCounters = new Map(this.worldObject.counters);
    newCounters.set(counterId, counter);
    
    return new World(
      crypto.randomUUID(),
      this.worldId,
      {
        ...this.worldObject,
        counters: newCounters,
      },
      this.currentWorldLineId
    );
  }

  /**
   * カウンターを削除した新しい世界を作成
   */
  public removeCounter(counterId: string): World {
    const newCounters = new Map(this.worldObject.counters);
    newCounters.delete(counterId);
    
    return new World(
      crypto.randomUUID(),
      this.worldId,
      {
        ...this.worldObject,
        counters: newCounters,
      },
      this.currentWorldLineId
    );
  }

  /**
   * 現在の世界線IDを更新した新しい世界を作成
   */
  public updateCurrentWorldLineId(newWorldLineId: string): World {
    return new World(
      this.worldId,
      this.parentWorldId,
      this.worldObject,
      newWorldLineId
    );
  }

  /**
   * JSON形式に変換
   */
  public toJson(): object {
    return {
      worldId: this.worldId,
      parentWorldId: this.parentWorldId,
      worldObject: {
        counters: Array.from(this.worldObject.counters.entries()).map(([id, counter]) => ({
          id,
          counter: counter.toJson()
        })),
      },
      currentWorldLineId: this.currentWorldLineId,
    };
  }

  /**
   * JSONからWorldインスタンスを作成
   */
  public static fromJson(json: any): World {
    const counters = new Map<string, Counter>();
    
    // 新しい形式（worldObject.counters）
    if (json.worldObject?.counters && Array.isArray(json.worldObject.counters)) {
      for (const { id, counter } of json.worldObject.counters) {
        counters.set(id, Counter.fromJson(counter));
      }
    }
    // 中間形式（直接counters）- 後方互換性
    else if (json.counters && Array.isArray(json.counters)) {
      for (const { id, counter } of json.counters) {
        counters.set(id, Counter.fromJson(counter));
      }
    }
    // 旧形式（単一counter）- 後方互換性
    else if (json.counter) {
      counters.set('counter-0', Counter.fromJson(json.counter));
    }
    
    const worldObject: WorldObject = {
      counters,
    };
    
    return new World(
      json.worldId || json.commitId || '', // 後方互換性のためcommitIdもサポート
      json.parentWorldId || json.parentCommitId || null,
      worldObject,
      json.currentWorldLineId || json.worldId || json.commitId || ''
    );
  }
}
