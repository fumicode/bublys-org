/**
 * WorldState
 * 世界の現在の状態（各オブジェクトのポインタ集合）
 *
 * 各オブジェクト（type:id）に対して、現在どのバージョン（timestamp）を
 * 指しているかを保持する。
 */
import {
  StateSnapshot,
  snapshotKey,
  createStateSnapshot,
} from './StateSnapshot';

export class WorldState {
  constructor(
    readonly state: {
      /** key = `${type}:${id}`, value = StateSnapshot */
      snapshots: Map<string, StateSnapshot>;
    }
  ) {}

  /**
   * 空の WorldState を作成
   */
  static empty(): WorldState {
    return new WorldState({ snapshots: new Map() });
  }

  /**
   * スナップショット取得
   */
  getSnapshot(type: string, id: string): StateSnapshot | undefined {
    return this.state.snapshots.get(`${type}:${id}`);
  }

  /**
   * スナップショット設定（不変更新）
   */
  setSnapshot(snapshot: StateSnapshot): WorldState {
    const newSnapshots = new Map(this.state.snapshots);
    newSnapshots.set(snapshotKey(snapshot), snapshot);
    return new WorldState({ snapshots: newSnapshots });
  }

  /**
   * 複数のスナップショットを設定
   */
  setSnapshots(snapshots: StateSnapshot[]): WorldState {
    const newSnapshots = new Map(this.state.snapshots);
    snapshots.forEach((s) => newSnapshots.set(snapshotKey(s), s));
    return new WorldState({ snapshots: newSnapshots });
  }

  /**
   * スナップショットを削除
   */
  removeSnapshot(type: string, id: string): WorldState {
    const newSnapshots = new Map(this.state.snapshots);
    newSnapshots.delete(`${type}:${id}`);
    return new WorldState({ snapshots: newSnapshots });
  }

  /**
   * 全スナップショットを取得
   */
  getAllSnapshots(): StateSnapshot[] {
    return Array.from(this.state.snapshots.values());
  }

  /**
   * スナップショット数を取得
   */
  size(): number {
    return this.state.snapshots.size;
  }

  /**
   * 特定のオブジェクトが存在するか
   */
  hasObject(type: string, id: string): boolean {
    return this.state.snapshots.has(`${type}:${id}`);
  }

  /**
   * JSON変換（シリアライズ）
   */
  toJson(): WorldStateJson {
    return {
      snapshots: Array.from(this.state.snapshots.entries()),
    };
  }

  /**
   * JSONから復元（デシリアライズ）
   */
  static fromJson(json: WorldStateJson): WorldState {
    const snapshots = new Map<string, StateSnapshot>();
    if (json.snapshots) {
      for (const [key, value] of json.snapshots) {
        snapshots.set(key, createStateSnapshot(value.type, value.id, value.timestamp));
      }
    }
    return new WorldState({ snapshots });
  }
}

/**
 * WorldState の JSON 表現
 */
export interface WorldStateJson {
  snapshots: [string, StateSnapshot][];
}
