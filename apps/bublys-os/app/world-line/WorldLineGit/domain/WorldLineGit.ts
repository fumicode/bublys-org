import { World } from './World';

/**
 * WorldLineGit クラス（ジェネリック版）
 * 任意の型のWorldStateを持つWorldを管理する汎用バージョン管理システム
 */
export class WorldLineGit<TWorldState = any> {
  public readonly worlds: Map<string, World<TWorldState>>;
  public readonly headWorldId: string | null;
  public readonly rootWorldId: string | null;

  constructor(
    worlds: Map<string, World<TWorldState>> = new Map(),
    headWorldId: string | null = null,
    rootWorldId: string | null = null
  ) {
    this.worlds = worlds;
    this.headWorldId = headWorldId;
    this.rootWorldId = rootWorldId;
  }

  /**
   * 新しい世界を追加
   */
  public addWorld(world: World<TWorldState>): WorldLineGit<TWorldState> {
    const newWorlds = new Map(this.worlds);
    newWorlds.set(world.worldId, world);
    
    return new WorldLineGit<TWorldState>(
      newWorlds,
      world.worldId,
      this.rootWorldId || world.worldId
    );
  }

  /**
   * 現在のHEAD世界を取得
   */
  public getHeadWorld(): World<TWorldState> | null {
    if (!this.headWorldId) return null;
    return this.worlds.get(this.headWorldId) || null;
  }

  /**
   * 指定された世界IDの世界を取得
   */
  public getWorld(worldId: string): World<TWorldState> | null {
    return this.worlds.get(worldId) || null;
  }

  /**
   * 世界の親子関係を辿って履歴を取得
   */
  public getWorldHistory(worldId: string): World<TWorldState>[] {
    const history: World<TWorldState>[] = [];
    let currentWorld = this.getWorld(worldId);
    
    while (currentWorld) {
      history.push(currentWorld);
      currentWorld = currentWorld.parentWorldId 
        ? this.getWorld(currentWorld.parentWorldId)
        : null;
    }
    
    return history;
  }

  /**
   * 指定された世界にHEADを移動（undo用 - 世界線IDを変更しない）
   */
  public checkoutForUndo(worldId: string): WorldLineGit<TWorldState> {
    if (!this.worlds.has(worldId)) {
      throw new Error(`World ${worldId} not found`);
    }
    
    return new WorldLineGit<TWorldState>(
      this.worlds,
      worldId,
      this.rootWorldId
    );
  }

  /**
   * 指定された世界にHEADを移動（新しい世界線IDを生成）
   */
  public checkout(worldId: string): WorldLineGit<TWorldState> {
    if (!this.worlds.has(worldId)) {
      throw new Error(`World ${worldId} not found`);
    }
    
    return new WorldLineGit<TWorldState>(
      this.worlds,
      worldId,
      this.rootWorldId
    );
  }

  /**
   * 新しいブランチを作成（指定された世界から）
   */
  public createBranch(fromWorldId: string): WorldLineGit<TWorldState> {
    if (!this.worlds.has(fromWorldId)) {
      throw new Error(`World ${fromWorldId} not found`);
    }
    
    return new WorldLineGit<TWorldState>(
      this.worlds,
      fromWorldId,
      this.rootWorldId
    );
  }

  /**
   * 全ての世界を取得
   */
  public getAllWorlds(): World<TWorldState>[] {
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
   * 指定された世界線IDを持つ世界を取得
   */
  public getWorldsByWorldLineId(worldLineId: string): World<TWorldState>[] {
    return Array.from(this.worlds.values()).filter(world => 
      world.currentWorldLineId === worldLineId
    );
  }

  /**
   * JSON形式に変換
   */
  public toJson(worldStateSerializer?: (state: TWorldState) => any): object {
    return {
      worlds: Array.from(this.worlds.entries()).map(([id, world]) => ({
        id,
        world: world.toJson(worldStateSerializer)
      })),
      headWorldId: this.headWorldId,
      rootWorldId: this.rootWorldId,
    };
  }

  /**
   * JSONからWorldLineGitインスタンスを作成
   */
  public static fromJson<TWorldState>(
    json: any,
    worldStateDeserializer?: (data: any) => TWorldState
  ): WorldLineGit<TWorldState> {
    const worlds = new Map<string, World<TWorldState>>();
    
    if (json.worlds) {
      for (const { id, world } of json.worlds) {
        worlds.set(id, World.fromJson<TWorldState>(world, worldStateDeserializer));
      }
    } else if (json.commits) {
      // 後方互換性のためcommitsもサポート
      for (const { id, commit } of json.commits) {
        worlds.set(id, World.fromJson<TWorldState>(commit, worldStateDeserializer));
      }
    }
    
    return new WorldLineGit<TWorldState>(
      worlds,
      json.headWorldId || json.headCommitId || null,
      json.rootWorldId || json.rootCommitId || null
    );
  }
}
