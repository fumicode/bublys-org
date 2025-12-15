# ハッシュ世界線 実装タスク

## 概要

複数の世界線を管理できる「世界線いじり」機能を実装中。

### 設計の要点

1. **各 Shell の状態にハッシュ値を付与**
   - 状態を改行・空白なしでJSON化した文字列のSHA-256ハッシュ
   - IndexedDB に `(type, id, stateHash)` をキーとして状態を保存
   - これにより Entity は DAG（有向非巡回グラフ）を持つ

2. **世界線オブジェクト**
   - 管理範囲のオブジェクトの履歴を持つ世界の DAG
   - 各オブジェクトの現在の状態への参照（ポインタ）を持つ
   - 管理しているオブジェクトの `(type, id, hash)` を保持

3. **メモリ + 永続化のハイブリッド**
   - Shell の history：メモリ上に展開 + IndexedDB に永続化
   - ハッシュ世界線：メモリ上に展開 + IndexedDB に永続化
   - 状態は `(type, id, stateHash)` で IndexedDB に保存

4. **複数世界線の切り替え**
   - 例：「メイン世界線」「実験世界線」
   - 世界線を切り替えると、管理下の全オブジェクトの状態が切り替わる

5. **既存コードへの影響**
   - 既存の `WorldLine` は壊さない
   - 新しい `hash-world-line` ディレクトリを作成

## ディレクトリ構造

```
apps/bublys-os/app/hash-world-line/
  ├─ domain/
  │   ├─ hashUtils.ts                  # ✅ 完了：JSON正規化 + ハッシュ計算
  │   ├─ StateSnapshot.ts              # ✅ 完了：状態へのポインタ
  │   ├─ WorldState.ts                 # ✅ 完了：世界の現在状態
  │   ├─ HashWorldLine.ts              # ✅ 完了：世界線ドメインモデル
  │   └─ index.ts                      # ✅ 完了：ドメイン層エクスポート
  ├─ feature/
  │   ├─ IndexedDBStore.ts             # ✅ 完了：IndexedDB永続化
  │   ├─ HashWorldLineManager.tsx      # ✅ 完了：Context Provider + hooks
  │   ├─ HashWorldLineShellBridge.tsx  # ✅ 完了：Shell統合ブリッジ
  │   └─ index.ts                      # ✅ 完了：フィーチャー層エクスポート
  ├─ ui/
  │   ├─ HashWorldLineViewer.tsx       # ✅ 完了：世界線表示UI
  │   └─ index.ts                      # ✅ 完了：UI層エクスポート
  └─ index.ts                          # ✅ 完了：全体エクスポート
```

## 実装ステップ

### ✅ Step 1-1: hashUtils.ts（完了）

**ファイル**: `domain/hashUtils.ts`

実装済みの機能：
- `normalizeJson(obj)`: オブジェクトをソート済み改行なしJSON文字列に変換
- `computeHash(data)`: SHA-256ハッシュを計算（async）
- `computeObjectHash(obj)`: オブジェクトから直接ハッシュ計算
- `computeHashSync(data)`: 同期版（テスト用）

### ✅ Step 1-2: StateSnapshot.ts（完了）

**ファイル**: `domain/StateSnapshot.ts`

実装済みの機能：
- `StateSnapshot` インターフェース（type, id, stateHash）
- `createStateSnapshot()`: スナップショットを作成
- `snapshotKey()`: オブジェクトを識別するキー（type:id）
- `fullSnapshotKey()`: 特定のバージョンを識別するフルキー（type:id:stateHash）
- `parseFullSnapshotKey()`: フルキーからスナップショットを復元
- `isSameObject()`: 同じオブジェクトか判定
- `isSameSnapshot()`: 完全に同じスナップショットか判定

### ✅ Step 1-3: WorldState.ts（完了）

**ファイル**: `domain/WorldState.ts`

実装済みの機能：
- `WorldState.empty()`: 空の WorldState を作成
- `getSnapshot()`: スナップショットを取得
- `setSnapshot()`: スナップショットを設定（不変更新）
- `setSnapshots()`: 複数のスナップショットを設定
- `removeSnapshot()`: スナップショットを削除
- `getAllSnapshots()`: 全スナップショットを取得
- `size()`: スナップショット数を取得
- `hasObject()`: 特定のオブジェクトが存在するか
- `toJson()` / `fromJson()`: JSON変換

### ✅ Step 1-4: HashWorldLine.ts（完了）

**ファイル**: `domain/HashWorldLine.ts`

実装済みの機能：
- `WorldHistoryNode` インターフェース（履歴ノード）
- `HashWorldLine.create()`: 新しい世界線を作成
- `getCurrentState()`: 現在の世界状態を取得
- `getHistory()`: 履歴を取得
- `getLatestHistoryNode()`: 最新の履歴ノードを取得
- `updateObjectState()`: オブジェクトの状態を更新
- `updateObjectStates()`: 複数オブジェクトの状態を一度に更新
- `rewindTo()`: 世界線を特定の状態に巻き戻す
- `getHistoryNode()`: 特定の履歴ノードを取得
- `rename()`: 名前を変更
- `toJson()` / `fromJson()`: JSON変換
- `computeWorldStateHash()`: 世界全体の状態のハッシュを計算

### ✅ Step 2: IndexedDBStore.ts（完了）

**ファイル**: `feature/IndexedDBStore.ts`

実装済みの機能：
- `openDatabase()`: IndexedDB接続を取得
- `saveState()` / `loadState()`: 状態データの保存/取得
- `hasState()` / `deleteState()`: 状態データの存在確認/削除
- `saveWorldLine()` / `loadWorldLine()`: 世界線の保存/取得
- `listWorldLines()`: 全世界線一覧を取得
- `deleteWorldLine()`: 世界線を削除
- `saveStates()` / `loadStates()`: 複数状態の一括保存/取得

2つの ObjectStore:
1. **`stateStore`**: `${type}:${id}:${stateHash}` → state (JSON)
2. **`worldLineStore`**: `worldLineId` → HashWorldLine (JSON)

### ✅ Step 3: HashWorldLineManager.tsx（完了）

**ファイル**: `feature/HashWorldLineManager.tsx`

実装済みの機能：
- `HashWorldLineProvider`: Context Provider コンポーネント
- `useHashWorldLine()`: 世界線管理フック
- `createWorldLine()`: 世界線を作成
- `loadWorldLineById()`: 世界線を読み込み
- `setActiveWorldLine()`: アクティブな世界線を設定
- `deleteWorldLine()`: 世界線を削除
- `updateObjectState()`: オブジェクトの状態を更新
- `getObjectState()`: オブジェクトの状態を取得
- `rewindWorldLine()`: 世界線を巻き戻す
- `renameWorldLine()`: 世界線の名前を変更
- `refreshWorldLineList()`: 世界線一覧を再読み込み

### ✅ Step 4: Shell との統合（完了）

**ファイル**: `feature/HashWorldLineShellBridge.tsx`

実装済みの機能：
- `HashWorldLineShellBridgeProvider`: Shell統合用Context Provider
- `useHashWorldLineShellBridge()`: Shell統合フック
- `syncShellToWorldLine()`: Shellの状態を世界線に同期
- `restoreShellFromWorldLine()`: 世界線からShellの状態を復元
- `registerForAutoSync()`: 自動同期を有効にするShellを登録
- `unregisterFromAutoSync()`: 自動同期の登録を解除
- `useShellWorldLineSync()`: 特定のShellを世界線に自動同期するフック

設計:
- **非侵襲的**: 既存の ShellManager / ShellProxy は変更しない
- **オプトイン**: HashWorldLineShellBridgeProvider をマウントした場合のみ有効

### ✅ Step 5: UI（完了）

**ファイル**: `ui/HashWorldLineViewer.tsx`

実装済みの機能：
- 世界線一覧表示
- 新規世界線作成
- アクティブ世界線の切り替え
- 世界線の履歴表示
- 状態の復元（巻き戻し）

## 現在の進捗

### ✅ 完了
- hashUtils.ts の作成
- StateSnapshot.ts の作成
- WorldState.ts の作成
- HashWorldLine.ts の作成
- IndexedDBStore.ts の作成
- HashWorldLineManager.tsx の作成
- HashWorldLineShellBridge.tsx の作成
- HashWorldLineViewer.tsx の作成
- 各層の index.ts エクスポート

### 🔄 次のタスク
- 実際のアプリケーションへの組み込み
- 動作テスト

### 📋 残りのタスク（優先順位順）
1. デモページの作成（Counter + HashWorldLine）
2. 世界線の分岐機能（将来実装）

## 重要な設計決定

1. **既存 WorldLine は壊さない**: 新しいディレクトリで独立して実装
2. **非同期ハッシュ計算**: SubtleCrypto API を使用（SHA-256）
3. **不変データ構造**: ドメインモデルは全て不変
4. **DAG構造**: 世界線の履歴は有向非巡回グラフ
5. **ハイブリッド永続化**: メモリ + IndexedDB
6. **非侵襲的Shell統合**: 既存のShellManager/ShellProxyを変更せず、Bridge層で統合

## 使用方法

```tsx
// 1. Providerをセットアップ
import {
  HashWorldLineProvider,
  HashWorldLineShellBridgeProvider,
  HashWorldLineViewer,
} from './hash-world-line';

function App() {
  return (
    <ShellManagerProvider>
      <HashWorldLineProvider>
        <HashWorldLineShellBridgeProvider>
          <MyComponent />
          <HashWorldLineViewer />
        </HashWorldLineShellBridgeProvider>
      </HashWorldLineProvider>
    </ShellManagerProvider>
  );
}

// 2. Shellの状態を世界線に同期
import { useShellWorldLineSync } from './hash-world-line';

function CounterComponent({ shellId }: { shellId: string }) {
  // 自動同期を有効化
  const { syncNow } = useShellWorldLineSync(shellId, 'counter');

  // 手動で同期したい場合
  const handleSync = () => {
    syncNow('Counter updated manually');
  };

  return <button onClick={handleSync}>Sync</button>;
}

// 3. 世界線を巻き戻す
import { useHashWorldLine } from './hash-world-line';

function RewindButton() {
  const { rewindWorldLine, activeWorldLine } = useHashWorldLine();

  const handleRewind = async () => {
    const history = activeWorldLine?.getHistory();
    if (history && history.length > 1) {
      await rewindWorldLine(history[history.length - 2].worldStateHash);
    }
  };

  return <button onClick={handleRewind}>Undo</button>;
}
```

---

**最終更新**: 2025-12-15
**ステータス**: 基本実装完了、アプリケーション組み込み待ち
