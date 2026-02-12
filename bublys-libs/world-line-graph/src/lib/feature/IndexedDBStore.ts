/**
 * IndexedDBStore
 * world-line-graph の永続化ストア
 *
 * 2つの ObjectStore を管理:
 * 1. stateStore: hash → state data (JSON)
 * 2. graphStore: scopeId → WorldLineGraphJson
 */
import type { WorldLineGraphJson } from '../domain/WorldLineGraph';

const DB_NAME = 'world-line-graph-db';
const DB_VERSION = 1;
const STATE_STORE = 'stateStore';
const GRAPH_STORE = 'graphStore';

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

      // stateStore: ハッシュをキーとして状態データを保存
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }

      // graphStore: scopeId をキーとしてグラフDAGを保存
      if (!db.objectStoreNames.contains(GRAPH_STORE)) {
        db.createObjectStore(GRAPH_STORE);
      }
    };
  });
}

/**
 * 状態データをハッシュで保存 (CAS)
 */
export async function saveStateToIDB(
  hash: string,
  data: unknown
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    const store = tx.objectStore(STATE_STORE);

    const request = store.put(data, hash);

    request.onerror = () => {
      reject(new Error(`Failed to save state: ${request.error?.message}`));
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * 状態データをハッシュで取得
 */
export async function loadStateFromIDB<T = unknown>(
  hash: string
): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const store = tx.objectStore(STATE_STORE);

    const request = store.get(hash);

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
 * グラフDAGを保存
 */
export async function saveGraphToIDB(
  scopeId: string,
  graphJson: WorldLineGraphJson
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GRAPH_STORE, 'readwrite');
    const store = tx.objectStore(GRAPH_STORE);

    const request = store.put(graphJson, scopeId);

    request.onerror = () => {
      reject(new Error(`Failed to save graph: ${request.error?.message}`));
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * グラフDAGを取得
 */
export async function loadGraphFromIDB(
  scopeId: string
): Promise<WorldLineGraphJson | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GRAPH_STORE, 'readonly');
    const store = tx.objectStore(GRAPH_STORE);

    const request = store.get(scopeId);

    request.onerror = () => {
      reject(new Error(`Failed to load graph: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      db.close();
      resolve(request.result as WorldLineGraphJson | undefined);
    };
  });
}

/**
 * 複数の状態データを一括保存
 */
export async function saveStatesToIDB(
  entries: Array<{ hash: string; data: unknown }>
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    const store = tx.objectStore(STATE_STORE);

    for (const { hash, data } of entries) {
      store.put(data, hash);
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
export async function loadStatesFromIDB<T = unknown>(
  hashes: string[]
): Promise<Map<string, T>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const store = tx.objectStore(STATE_STORE);
    const results = new Map<string, T>();
    let pending = hashes.length;

    if (pending === 0) {
      db.close();
      resolve(results);
      return;
    }

    for (const hash of hashes) {
      const request = store.get(hash);

      request.onsuccess = () => {
        if (request.result !== undefined) {
          results.set(hash, request.result as T);
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
