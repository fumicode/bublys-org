# 実装: StateSnapshot の hash 化

## 概要

StateSnapshot の状態ID を `timestamp` から `hash` に変更する。

**関連設計**: `../object-shell-worldline-design.md`

---

## 変更サマリ

```typescript
// Before
interface StateSnapshot {
  type: string;
  id: string;
  timestamp: number;  // ← 削除
}

// After
interface StateSnapshot {
  type: string;
  id: string;
  hash: string;       // ← 追加
}
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `StateHash.ts` | **新規** hash 生成ユーティリティ |
| `StateSnapshot.ts` | interface と関数の変更 |
| `IndexedDBStore.ts` | CAS パターン追加 |
| `AkashicRecord.ts` | hash 生成呼び出し |
| `AkashicRecordProvider.tsx` | hash 生成呼び出し |
| `WorldState.ts` | fromJson の修正 |
| `HashWorldLineManager.tsx` | hash 生成呼び出し |

---

## 1. StateHash.ts（新規）

パス: `bublys-libs/hash-world-line/src/lib/domain/StateHash.ts`

```typescript
/**
 * StateHash
 * 状態データから一意なハッシュを生成するユーティリティ
 *
 * アルゴリズム: djb2 hash
 * - 高速（同期実行）
 * - ブラウザ/Node.js 両対応
 * - 衝突確率は実用上無視できる（32bit = 約40億通り）
 */

/**
 * 状態データから hash を生成（同期版）
 *
 * @param stateData シリアライズ済みの状態データ
 * @returns 8文字の16進数 hash 文字列
 */
export function computeStateHash(stateData: unknown): string {
  // JSON を正規化（キーをソートして一意に）
  const normalized = normalizeJson(stateData);

  // djb2 hash
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
  }

  // 符号なし32bit整数として16進数文字列に変換
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * JSON を正規化（キーをソート）
 */
function normalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(normalizeJson).join(',') + ']';
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (key) => `${JSON.stringify(key)}:${normalizeJson((obj as Record<string, unknown>)[key])}`
  );
  return '{' + pairs.join(',') + '}';
}
```

---

## 2. StateSnapshot.ts（変更）

パス: `bublys-libs/hash-world-line/src/lib/domain/StateSnapshot.ts`

### 変更点

1. `timestamp: number` → `hash: string`
2. `createStateSnapshot` の引数変更
3. `fullSnapshotKey` のフォーマット変更

### 変更後のコード

```typescript
/**
 * StateSnapshot
 * オブジェクトの状態への参照（type, id, hash）
 *
 * これは「状態の内容」ではなく「状態へのポインタ」を表す。
 * 実際の状態データは IndexedDB に `${type}:${id}:${hash}` をキーとして保存される。
 */
export interface StateSnapshot {
  readonly type: string;
  readonly id: string;
  readonly hash: string;
}

export function createStateSnapshot(
  type: string,
  id: string,
  hash: string
): StateSnapshot {
  return { type, id, hash };
}

export function fullSnapshotKey(snapshot: StateSnapshot): string {
  return `${snapshot.type}:${snapshot.id}:${snapshot.hash}`;
}

export function parseFullSnapshotKey(key: string): StateSnapshot | undefined {
  const parts = key.split(':');
  if (parts.length !== 3) return undefined;

  const [type, id, hash] = parts;
  if (!type || !id || !hash) return undefined;

  return { type, id, hash };
}
```

---

## 3. IndexedDBStore.ts（変更）

パス: `bublys-libs/hash-world-line/src/lib/feature/IndexedDBStore.ts`

### 変更点

`saveState` に CAS（Content Addressed Storage）パターンを追加。
同一 hash が既に存在する場合は保存をスキップ。

```typescript
export async function saveState(
  snapshot: StateSnapshot,
  stateData: unknown
): Promise<boolean> {
  // 既存チェック → 存在すれば false を返してスキップ
  // 新規なら保存して true を返す
}
```

---

## 4. AkashicRecord.ts / AkashicRecordProvider.tsx（変更）

### 変更点

`record` メソッドで hash を生成するように変更。

```typescript
const stateData = serializeDomainObject(domainObject);
const hash = computeStateHash(stateData);
const snapshot = createStateSnapshot(shellType, shell.id, hash);
```

---

## テスト

```typescript
describe('computeStateHash', () => {
  it('同じオブジェクトは同じ hash を返す', () => { ... });
  it('キーの順序が違っても同じ hash を返す', () => { ... });
  it('異なるオブジェクトは異なる hash を返す', () => { ... });
  it('8文字の16進数を返す', () => { ... });
});
```

---

## 実装順序

- [x] `StateHash.ts` を作成
- [x] `StateSnapshot.ts` を変更
- [x] `IndexedDBStore.ts` を変更
- [x] `AkashicRecord.ts` を変更
- [x] `AkashicRecordProvider.tsx` を変更
- [x] export を追加
- [x] テストを追加
- [x] 動作確認
