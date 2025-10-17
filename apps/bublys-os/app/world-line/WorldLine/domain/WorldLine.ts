import { World } from './World';

/**
 * WorldLine クラス
 */
export class WorldLine {
  public readonly worlds: Map<string, World>;
  public readonly apexWorldId: string | null;
  public readonly rootWorldId: string | null;

  constructor(
    worlds: Map<string, World> = new Map(),
    apexWorldId: string | null = null,
    rootWorldId: string | null = null
  ) {
    this.worlds = worlds;
    this.apexWorldId = apexWorldId;
    this.rootWorldId = rootWorldId;
  }

  /**
   * 新しい世界を追加（grow: commit相当）
   */
  public grow(world: World): WorldLine {
    const newWorlds = new Map(this.worlds);
    newWorlds.set(world.worldId, world);
    
    return new WorldLine(
      newWorlds,
      world.worldId,
      this.rootWorldId || world.worldId
    );
  }

  /**
   * 指定された世界IDの世界を取得
   */
  public getWorld(worldId: string): World | null {
    return this.worlds.get(worldId) || null;
  }

  /**
   * 指定された世界にAPEXを移動（regrow用 - 世界線IDを変更しない）
   */
  public setApexForRegrow(worldId: string): WorldLine {
    if (!this.worlds.has(worldId)) {
      throw new Error(`World ${worldId} not found`);
    }
    
    return new WorldLine(
      this.worlds,
      worldId,
      this.rootWorldId
    );
  }

  /**
   * 指定された世界にAPEXを移動（setApex: checkout相当）
   */
  public setApex(worldId: string): WorldLine {
    if (!this.worlds.has(worldId)) {
      throw new Error(`World ${worldId} not found`);
    }
    
    return new WorldLine(
      this.worlds,
      worldId,
      this.rootWorldId
    );
  }

  /**
   * 全ての世界を取得
   */
  public getAllWorlds(): World[] {
    return Array.from(this.worlds.values());
  }

  /**
   * 世界ツリーの構造を取得（親子関係）
   */
  public getWorldTree(): { [worldId: string]: string[] } {
    const tree: { [worldId: string]: string[] } = {};
    
    for (const world of this.worlds.values()) {
      if (world.parentWorldId) {
        if (!tree[world.parentWorldId]) {
          tree[world.parentWorldId] = [];
        }
        tree[world.parentWorldId].push(world.worldId);
      }
    }
    
    return tree;
  }

  /**
   * JSON形式に変換
   */
  public toJson(): object {
    return {
      worlds: Array.from(this.worlds.entries()).map(([id, world]) => ({
        id,
        world: world.toJson()
      })),
      apexWorldId: this.apexWorldId,
      rootWorldId: this.rootWorldId,
    };
  }

  /**
   * JSONからWorldLineインスタンスを作成
   */
  public static fromJson(json: any): WorldLine {
    const worlds = new Map<string, World>();
    
    if (json.worlds) {
      for (const { id, world } of json.worlds) {
        worlds.set(id, World.fromJson(world));
      }
    } else if (json.commits) {
      // 後方互換性のためcommitsもサポート
      for (const { id, commit } of json.commits) {
        worlds.set(id, World.fromJson(commit));
      }
    }
    
    return new WorldLine(
      worlds,
      json.apexWorldId || json.apexWorldLineId || null,
      json.rootWorldId || json.rootWorldLineId || null
    );
  }
}
