/**
 * IndexedDBStore
 * ハッシュ世界線の永続化ストア
 *
 * 2つの ObjectStore を管理:
 * 1. stateStore: `${type}:${id}:${stateHash}` → state (JSON)
 * 2. worldLineStore: `worldLineId` → HashWorldLine (JSON)
 */
import { HashWorldLine, HashWorldLineJson } from '../domain/HashWorldLine';
import { fullSnapshotKey, StateSnapshot } from '../domain/StateSnapshot';

const DB_NAME = 'hash-world-line-db';
const DB_VERSION = 1;
const STATE_STORE = 'stateStore';
const WORLD_LINE_STORE = 'worldLineStore';

/**
 * データベース接続を取得
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // stateStore: オブジェクトの状態を保存
      // key = `${type}:${id}:${stateHash}`
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }

      // worldLineStore: 世界線を保存
      // key = worldLineId
      if (!db.objectStoreNames.contains(WORLD_LINE_STORE)) {
        db.createObjectStore(WORLD_LINE_STORE);
      }
    };
  });
}

/**
 * 状態データを保存（CAS パターン）
 *
 * 同一 hash が既に存在する場合は保存をスキップする。
 * これにより同一状態の重複保存を防ぎ、ストレージを節約する。
 *
 * @param snapshot 状態のスナップショット（ポインタ）
 * @param stateData 実際の状態データ
 * @returns 保存されたかどうか（既存なら false）
 */
export async function saveState(
  snapshot: StateSnapshot,
  stateData: unknown
): Promise<boolean> {
  const db = await openDatabase();
  const key = fullSnapshotKey(snapshot);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    const store = tx.objectStore(STATE_STORE);

    // 既存チェック
    const getRequest = store.getKey(key);

    getRequest.onsuccess = () => {
      if (getRequest.result !== undefined) {
        // 既存のためスキップ
        db.close();
        resolve(false);
        return;
      }

      // 保存
      const putRequest = store.put(stateData, key);
      putRequest.onerror = () => {
        reject(new Error(`Failed to save state: ${putRequest.error?.message}`));
      };
    };

    getRequest.onerror = () => {
      reject(new Error(`Failed to check state: ${getRequest.error?.message}`));
    };

    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
  });
}

/**
 * 状態データを取得
 * @param snapshot 状態のスナップショット（ポインタ）
 * @returns 状態データ、存在しない場合は undefined
 */
export async function loadState<T = unknown>(
  snapshot: StateSnapshot
): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const store = tx.objectStore(STATE_STORE);
    const key = fullSnapshotKey(snapshot);

    const request = store.get(key);

    request.onerror = () => {
      reject(new Error(`Failed to load state: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      db.close();
      resolve(request.result as T | undefined);
    };
  });
}

/**
 * 状態データが存在するか確認
 */
export async function hasState(snapshot: StateSnapshot): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const store = tx.objectStore(STATE_STORE);
    const key = fullSnapshotKey(snapshot);

    const request = store.getKey(key);

    request.onerror = () => {
      reject(new Error(`Failed to check state: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      db.close();
      resolve(request.result !== undefined);
    };
  });
}

/**
 * 状態データを削除
 */
export async function deleteState(snapshot: StateSnapshot): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    const store = tx.objectStore(STATE_STORE);
    const key = fullSnapshotKey(snapshot);

    const request = store.delete(key);

    request.onerror = () => {
      reject(new Error(`Failed to delete state: ${request.error?.message}`));
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * 世界線を保存
 */
export async function saveWorldLine(worldLine: HashWorldLine): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORLD_LINE_STORE, 'readwrite');
    const store = tx.objectStore(WORLD_LINE_STORE);
    const json = worldLine.toJson();

    const request = store.put(json, worldLine.state.id);

    request.onerror = () => {
      reject(new Error(`Failed to save world line: ${request.error?.message}`));
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * 世界線を取得
 */
export async function loadWorldLine(
  id: string
): Promise<HashWorldLine | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORLD_LINE_STORE, 'readonly');
    const store = tx.objectStore(WORLD_LINE_STORE);

    const request = store.get(id);

    request.onerror = () => {
      reject(new Error(`Failed to load world line: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      db.close();
      if (request.result) {
        resolve(HashWorldLine.fromJson(request.result as HashWorldLineJson));
      } else {
        resolve(undefined);
      }
    };
  });
}

/**
 * 全世界線のIDと名前を取得
 */
export async function listWorldLines(): Promise<
  Array<{ id: string; name: string }>
> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORLD_LINE_STORE, 'readonly');
    const store = tx.objectStore(WORLD_LINE_STORE);

    const request = store.getAll();

    request.onerror = () => {
      reject(
        new Error(`Failed to list world lines: ${request.error?.message}`)
      );
    };

    request.onsuccess = () => {
      db.close();
      const results = (request.result as HashWorldLineJson[]).map((json) => ({
        id: json.id,
        name: json.name,
      }));
      resolve(results);
    };
  });
}

/**
 * 世界線を削除
 */
export async function deleteWorldLine(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORLD_LINE_STORE, 'readwrite');
    const store = tx.objectStore(WORLD_LINE_STORE);

    const request = store.delete(id);

    request.onerror = () => {
      reject(
        new Error(`Failed to delete world line: ${request.error?.message}`)
      );
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * 複数の状態データを一括保存
 */
export async function saveStates(
  entries: Array<{ snapshot: StateSnapshot; stateData: unknown }>
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    const store = tx.objectStore(STATE_STORE);

    for (const { snapshot, stateData } of entries) {
      const key = fullSnapshotKey(snapshot);
      store.put(stateData, key);
    }

    tx.onerror = () => {
      reject(new Error(`Failed to save states: ${tx.error?.message}`));
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * 複数の状態データを一括取得
 */
export async function loadStates<T = unknown>(
  snapshots: StateSnapshot[]
): Promise<Map<string, T>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const store = tx.objectStore(STATE_STORE);
    const results = new Map<string, T>();
    let pending = snapshots.length;

    if (pending === 0) {
      db.close();
      resolve(results);
      return;
    }

    for (const snapshot of snapshots) {
      const key = fullSnapshotKey(snapshot);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result !== undefined) {
          results.set(key, request.result as T);
        }
        pending--;
        if (pending === 0) {
          db.close();
          resolve(results);
        }
      };

      request.onerror = () => {
        pending--;
        if (pending === 0) {
          db.close();
          resolve(results);
        }
      };
    }
  });
}
