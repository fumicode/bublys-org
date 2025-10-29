/**
 * World クラス(ジェネリック版)
 * 世界の状態を表現し、世界線の概念を含む
 */
export class World<TWorldState> {
  public readonly worldId: string;
  public readonly parentWorldId: string | null;
  public readonly worldState: TWorldState;
  public readonly apexWorldLineId: string;

  constructor(
    worldId: string,
    parentWorldId: string | null,
    worldState: TWorldState,
    apexWorldLineId: string = ''
  ) {
    this.worldId = worldId;
    this.parentWorldId = parentWorldId;
    this.worldState = worldState;
    this.apexWorldLineId = apexWorldLineId || worldId; // デフォルトは自身のID
  }

  /**
   * WorldStateを更新した新しい世界を作成
   */
  public updateWorldState(newWorldState: TWorldState): World<TWorldState> {
    return new World(
      crypto.randomUUID(),
      this.worldId,
      newWorldState,
      this.apexWorldLineId
    );
  }

  /**
   * 現在の世界線IDを更新した新しい世界を作成
   */
  public updateCurrentWorldLineId(newWorldLineId: string): World<TWorldState> {
    return new World(
      this.worldId,
      this.parentWorldId,
      this.worldState,
      newWorldLineId
    );
  }

  /**
   * JSON形式に変換
   * worldStateのシリアライズは呼び出し側の責任
   */
  public toJson(worldStateSerializer: (state: TWorldState) => any): object {
    return {
      worldId: this.worldId,
      parentWorldId: this.parentWorldId,
      worldState: worldStateSerializer ? worldStateSerializer(this.worldState) : this.worldState,
      apexWorldLineId: this.apexWorldLineId,
    };
  }

  /**
   * JSONからWorldインスタンスを作成
   * worldStateのデシリアライズは呼び出し側の責任
   */
  public static fromJson<TWorldState>(
    json: any,
    worldStateDeserializer?: (data: any) => TWorldState
  ): World<TWorldState> {
    const worldState = worldStateDeserializer ? worldStateDeserializer(json.worldState) : json.worldState;
    return new World<TWorldState>(
      json.worldId || '',
      json.parentWorldId || null,
      worldState,
      json.apexWorldLineId || json.worldId || ''
    );
  }
}