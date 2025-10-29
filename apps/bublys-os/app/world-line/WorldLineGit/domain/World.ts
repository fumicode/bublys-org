/**
 * World クラス（ジェネリック版）
 * 世界の状態を表現し、世界線の概念を含む
 * 任意の型のWorldStateを管理可能
 */
export class World<TWorldState = any> {
  public readonly worldId: string;
  public readonly parentWorldId: string | null;
  public readonly worldState: TWorldState;
  public readonly currentWorldLineId: string;

  constructor(
    worldId: string,
    parentWorldId: string | null,
    worldState: TWorldState,
    currentWorldLineId: string
  ) {
    this.worldId = worldId;
    this.parentWorldId = parentWorldId;
    this.worldState = worldState;
    this.currentWorldLineId = currentWorldLineId || worldId;
  }

  /**
   * WorldStateを更新した新しい世界を作成
   */
  public updateWorldState(newWorldState: TWorldState): World<TWorldState> {
    return new World<TWorldState>(
      crypto.randomUUID(),
      this.worldId,
      newWorldState,
      this.currentWorldLineId
    );
  }

  /**
   * 現在の世界線IDを更新した新しい世界を作成
   */
  public updateCurrentWorldLineId(newWorldLineId: string): World<TWorldState> {
    return new World<TWorldState>(
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
  public toJson(worldStateSerializer?: (state: TWorldState) => any): object {
    return {
      worldId: this.worldId,
      parentWorldId: this.parentWorldId,
      worldState: worldStateSerializer ? worldStateSerializer(this.worldState) : this.worldState,
      currentWorldLineId: this.currentWorldLineId,
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
    const worldState = worldStateDeserializer 
      ? worldStateDeserializer(json.worldState || json.worldObject) 
      : (json.worldState || json.worldObject);
    
    return new World<TWorldState>(
      json.worldId || json.commitId || '',
      json.parentWorldId || json.parentCommitId || null,
      worldState,
      json.currentWorldLineId || json.worldId || json.commitId || ''
    );
  }
}
