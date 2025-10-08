import { WorldLine } from './WorldLine';

/**
 * AkashicRecord クラス
 * 全ての世界線を管理する中央リポジトリ
 */
export class AkashicRecord {
  public readonly worldLines: WorldLine[];

  constructor(worldLines: WorldLine[] = []) {
    this.worldLines = worldLines;
  }

  /**
   * 新しいWorldLineを追加したAkashicRecordを作成
   */
  public addWorldLine(worldLine: WorldLine): AkashicRecord {
    return new AkashicRecord([...this.worldLines, worldLine]);
  }

  /**
   * 指定されたIDのWorldLineを更新したAkashicRecordを作成
   */
  public updateWorldLine(worldLineId: string, updatedWorldLine: WorldLine): AkashicRecord {
    const updatedWorldLines = this.worldLines.map(worldLine =>
      worldLine.worldLineId === worldLineId ? updatedWorldLine : worldLine
    );
    return new AkashicRecord(updatedWorldLines);
  }

  /**
   * 指定されたIDのWorldLineを取得
   */
  public getWorldLine(worldLineId: string): WorldLine | undefined {
    return this.worldLines.find(worldLine => worldLine.worldLineId === worldLineId);
  }

  /**
   * 現在の世界から次の世界の選択肢を取得
   */
  public getNextWorldChoices(currentWorldId: string): WorldLine[] {
    return this.worldLines.filter(worldLine => 
      worldLine.parentWorldId === currentWorldId
    );
  }

  /**
   * 世界IDから世界を探す
   */
  public findWorldByWorldId(worldId: string): { worldLine: WorldLine; world: any } | null {
    for (const worldLine of this.worldLines) {
      const world = worldLine.getWorld(worldId);
      if (world) {
        return { worldLine, world };
      }
    }
    return null;
  }

  /**
   * JSON形式に変換
   */
  public toJson(): object {
    return {
      worldLines: this.worldLines.map(worldLine => worldLine.toJson()),
    };
  }

  /**
   * JSONからAkashicRecordインスタンスを作成
   */
  public static fromJson(json: any): AkashicRecord {
    return new AkashicRecord(
      (json.worldLines || []).map((worldLineJson: any) => 
        WorldLine.fromJson(worldLineJson)
      )
    );
  }
}