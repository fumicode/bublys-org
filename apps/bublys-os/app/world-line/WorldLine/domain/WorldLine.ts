import { World } from './World';

/**
 * WorldLine クラス
 * 世界線を管理し、親子関係を表現する
 */
export class WorldLine {
  public readonly parentWorldId: string;
  public readonly worldLineId: string;
  public readonly worlds: World[];

  constructor(
    parentWorldId: string,
    worldLineId: string,
    worlds: World[] = []
  ) {
    this.parentWorldId = parentWorldId;
    this.worldLineId = worldLineId;
    this.worlds = worlds;
  }

  /**
   * 新しいWorldを追加したWorldLineを作成
   */
  public addWorld(world: World): WorldLine {
    return new WorldLine(
      this.parentWorldId,
      this.worldLineId,
      [...this.worlds, world]
    );
  }

  /**
   * 指定されたWorldを更新したWorldLineを作成
   */
  public updateWorld(worldId: string, updatedWorld: World): WorldLine {
    const updatedWorlds = this.worlds.map(world =>
      world.worldId === worldId ? updatedWorld : world
    );
    return new WorldLine(
      this.parentWorldId,
      this.worldLineId,
      updatedWorlds
    );
  }

  /**
   * 指定されたIDのWorldを取得
   */
  public getWorld(worldId: string): World | undefined {
    return this.worlds.find(world => world.worldId === worldId);
  }

  /**
   * JSON形式に変換
   */
  public toJson(): object {
    return {
      parentWorldId: this.parentWorldId,
      worldLineId: this.worldLineId,
      worlds: this.worlds.map(world => world.toJson()),
    };
  }

  /**
   * JSONからWorldLineインスタンスを作成
   */
  public static fromJson(json: any): WorldLine {
    return new WorldLine(
      json.parentWorldId || '',
      json.worldLineId || '',
      (json.worlds || []).map((worldJson: any) => World.fromJson(worldJson))
    );
  }
}