import { Counter } from './Counter';

/**
 * World クラス
 * 世界の状態を表現し、世界線の概念を含む
 */
export class World {
  public readonly worldId: string;
  public readonly parentWorldId: string | null;
  public readonly counter: Counter;
  public readonly apexWorldLineId: string;

  constructor(
    worldId: string,
    parentWorldId: string | null = null,
    counter: Counter = new Counter(),
    apexWorldLineId: string = ''
  ) {
    this.worldId = worldId;
    this.parentWorldId = parentWorldId;
    this.counter = counter;
    this.apexWorldLineId = apexWorldLineId || worldId; // デフォルトは自身のID
  }

  /**
   * カウンターを更新した新しい世界を作成
   */
  public updateCounter(newCounter: Counter): World {
    return new World(
      crypto.randomUUID(),
      this.worldId,
      newCounter,
      this.apexWorldLineId
    );
  }

  /**
   * 現在の世界線IDを更新した新しい世界を作成
   */
  public updateCurrentWorldLineId(newWorldLineId: string): World {
    return new World(
      this.worldId,
      this.parentWorldId,
      this.counter,
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
      counter: this.counter.toJson(),
      apexWorldLineId: this.apexWorldLineId,
    };
  }

  /**
   * JSONからWorldインスタンスを作成
   */
  public static fromJson(json: any): World {
    return new World(
      json.worldId || json.commitId || '', // 後方互換性のためcommitIdもサポート
      json.parentWorldId || json.parentCommitId || null,
      Counter.fromJson(json.counter || {}),
      json.apexWorldLineId || json.worldId || json.commitId || ''
    );
  }
}
