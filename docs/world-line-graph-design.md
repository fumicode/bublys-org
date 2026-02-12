# WorldLineGraph 設計ドキュメント

## 背景と動機

### 既存の2つの世界線システム

| | world-line（シンプル版） | hash-world-line（高度版） |
|---|---|---|
| 状態保存先 | Redux (redux-persist → localStorage) | IndexedDB（独自実装） |
| 対象 | 1オブジェクト = 1世界線 | 複数オブジェクトを1つの世界線で管理 |
| バージョン識別 | UUID | timestamp → hash（object-shell-completionブランチ） |
| 履歴構造 | `Map<worldId, World>` + parentWorldId → DAG | `WorldHistoryNode[]` + parentId → DAG |
| 良い点 | シンプル、導入が簡単、Redux統合 | 複数オブジェクト対応、CASパターン、状態復元が強力 |
| 課題 | 1オブジェクトしか追えない | IndexedDB密結合、独自実装過多、追いにくい |

### 新システムの目標

hash-world-lineの良いところ（複数オブジェクト対応、CASパターン）を取りながら、依存が少なくシンプルな汎用ライブラリを作る。

---

## 用語と git との対応

| git | 世界線システム | 説明 |
|-----|---------------|------|
| HEAD | apex | 今いるノード / 成長点。ここから次の変更が伸びる |
| branch | worldLine | 成長の方向を示す線 |
| commit | WorldNode | ある時点の世界の状態 |
| repository | WorldLineGraph | DAG全体 + 現在位置 |

---

## ドメインモデル

### エンティティの前提条件

WorldLineGraphが追跡できるオブジェクトは以下を満たす：

1. **idを持つ**（`DomainEntity` インターフェース）
2. **JSON化可能な状態を持つ**（`Serializable` / `toJSON()`）

```typescript
interface DomainEntity {
  readonly id: string;
}
```

### コアとなる3つの型

```typescript
// ① 状態への参照（CASのキー）
interface StateRef {
  type: string;    // "conversation", "speaker" など
  id: string;      // エンティティのID
  hash: string;    // 状態のFNV-1aハッシュ（= バージョン識別子）
}

// ② DAGのノード（ある時点の「世界」= git commit）
interface WorldNode {
  id: string;                  // ノードID (UUID)
  parentId: string | null;     // 親ノード（nullならルート）
  timestamp: number;           // 作成日時（表示用）
  changedRefs: StateRef[];     // このノードで変わったオブジェクトたち
  worldLineId: string;         // どのworldLine（ブランチ）上にいるか
}

// ③ DAG全体（= git repository）
class WorldLineGraph {
  constructor(readonly state: {
    nodes: Record<string, WorldNode>;
    apexNodeId: string | null;   // HEAD = 今いるノード / 成長点
    rootNodeId: string | null;
  }) {}

  // 新ノード追加（commit）
  grow(changedRefs: StateRef[]): WorldLineGraph

  // 指定ノードへ移動（checkout）
  moveTo(nodeId: string): WorldLineGraph

  // 親へ移動（undo）
  moveBack(): WorldLineGraph

  // 同worldLineの子へ移動（redo）
  moveForward(): WorldLineGraph

  // あるノード時点での全オブジェクトのStateRefを取得
  getStateRefsAt(nodeId: string): StateRef[]

  // 現在ノードのStateRefs
  getCurrentStateRefs(): StateRef[]

  // 親子関係マップ（可視化用）
  getChildrenMap(): Record<string, string[]>
}
```

### worldLineId と分岐

`worldLineId` はgitのブランチに相当し、redoのときに「同じ成長線の子」を辿るために使う。

```
Node A (worldLineId = "wl-1")
├── Node B1 (worldLineId = "wl-1")  ← Aと同じ → redoで辿れる
└── Node B2 (worldLineId = "wl-2")  ← 新しいworldLineが分岐した

apex = A のとき:
  redo → B1 に進む（同じworldLineIdだから）
```

Aにいる状態でgrow()すると、Aに既に子がいるかどうかで挙動が変わる：
- 子がいない → 同じworldLineIdで伸びる
- 子がいる → 新しいworldLineIdで分岐する

### getStateRefsAt の動作

rootから指定ノードまでのパスを辿り、各オブジェクトの最新のStateRefを収集する。

```
getStateRefsAt("node-2"):
  root → node-1 → node-2 のパスを辿る

  node-1: conv-1:hash-a, sp-1:hash-x
  node-2: conv-1:hash-b           ← conv-1はnode-2で上書き

  結果: [
    { type: "conversation", id: "conv-1", hash: "hash-b" },  // node-2版
    { type: "speaker",      id: "sp-1",   hash: "hash-x" },  // node-1版（変更なし）
  ]
```

---

## メモリアーキテクチャ（じゃがいもモデル）

### 基本的な考え方

人間の脳には短期記憶と長期記憶がある。短期記憶は高速だが容量が限られ、長期記憶は大容量だが取り出すのに時間がかかる。世界線システムのメモリアーキテクチャもこれと同じ構造を採る。

- **Redux（短期記憶）** = 今アクティブに使っているデータ。高速にアクセスでき、UIがリアクティブに反応する
- **IndexedDB（長期記憶）** = すべてのデータの永続的な保存先。容量制限がゆるく、大量の履歴を保持できる

この2つは**シームレスに連携**する。一方的な同期ではなく、状況に応じて双方向にデータが移動する。

じゃがいもに例えると：
- **Redux = 地上**。今まさに調理に使っている芋が並んでいる
- **IndexedDB = 地中**。これまで育てたすべての芋が埋まっている
- 新しい芋ができたら、地上に置きつつ地中にも埋める（両方に書き込む）
- 普段は地上の芋（最新の状態）だけ見えていればいい
- 過去を振り返りたくなったら、必要な芋を地中から掘り起こす（遅延ロード）
- 地上がまっさらになっても（Reduxが消えても）、地中から復元できる

### Redux上に載るもの

Reduxには2種類のデータが載る。

**① DAGの地図（常にメモリ上にある）**

DAGのノード構造は軽量なので、常にRedux上に保持する。これは「どこにどの芋が埋まっているか」を示す地図であり、実際の芋（状態データ）ではない。

**② ロード済みの状態データ（必要に応じて増減する）**

現在のapex（HEAD）ノードで必要な状態データは必ずRedux上にある。過去のノードのデータは、世界線ビュー（Ctrl+Z）で閲覧するときに初めてロードされる。不要になればReduxから降ろしてもよい（IndexedDBには残っている）。

```typescript
interface WorldLineSliceState {
  graphs: Record<string, {  // スコープIDごとに独立
    // ① DAGの地図（軽い、常にメモリ上）
    graph: {
      nodes: Record<string, WorldNode>;
      apexNodeId: string | null;
      rootNodeId: string | null;
    };
    // ② 掘り起こされた芋たち（ロード済みの実データ）
    // CASなのでキーはhashだけ（同じ内容 = 同じhash）
    loadedStates: Record<string, unknown>;
  }>;
}
```

### IndexedDB上に載るもの

IndexedDBは全データの**源泉（source of truth）**。Reduxが完全に消えても、ここからすべてを復元できる。

```
stateStore（CAS = Content Addressable Storage）:
  hash → 状態データ（JSON）
  ※ 同じ内容は同じhashになるので、重複した状態の保存を自然に防ぐ

graphStore（DAGのバックアップ）:
  scopeId → { nodes, apexNodeId, rootNodeId }
```

### 具体例: 会話2ターン分の状態

ユーザーが会話を2ターン進めた時点でのデータの姿。

**Redux（地上）:**
```javascript
{
  graph: {
    nodes: {
      "node-1": {
        parentId: null,
        changedRefs: [
          { type: "conversation", id: "conv-1", hash: "a1b2c3" },
          { type: "speaker",      id: "sp-1",   hash: "ff0011" },
        ]
      },
      "node-2": {
        parentId: "node-1",
        changedRefs: [
          { type: "conversation", id: "conv-1", hash: "d4e5f6" },
          // sp-1 は変わってないので含まない
        ]
      }
    },
    apexNodeId: "node-2",
    rootNodeId: "node-1",
  },

  loadedStates: {
    // 今使っているもの（apexノードで必要なデータ）
    "d4e5f6": {
      id: "conv-1",
      turns: [
        { speakerId: "sp-1", text: "こんにちは" },
        { speakerId: "sp-1", text: "今日の予定は？" }
      ]
    },
    "ff0011": {
      id: "sp-1", name: "Alice", role: "user"
    },

    // node-1 時点の会話データ "a1b2c3" はここにはない。
    // まだ掘り起こしていないので、IndexedDBにだけ存在する。
  }
}
```

**IndexedDB（地中）:**
```
stateStore:
  "a1b2c3" → { id: "conv-1", turns: [{ speakerId: "sp-1", text: "こんにちは" }] }
  "d4e5f6" → { id: "conv-1", turns: [... 2ターン分] }
  "ff0011" → { id: "sp-1", name: "Alice", role: "user" }

graphStore:
  "scope-conv-1" → { nodes: {...}, apexNodeId: "node-2", rootNodeId: "node-1" }
```

IndexedDBには "a1b2c3"（1ターン目だけの会話状態）も含め、すべてのバージョンが保存されている。

### データフロー: 3つのシナリオ

**シナリオ1: 通常操作（ターン3を入力する）**

```
1. 新しい会話状態の hash を計算 → "x7y8z9"
2. Redux: loadedStates["x7y8z9"] = { turns: [... 3ターン分] }
3. Redux: DAG に node-3 を追加、apex を node-3 に更新
4. バックグラウンド: IndexedDB にも "x7y8z9" → 状態データ を書き込み
```

ユーザーの操作を止めない。Reduxへの書き込みは同期的で即座に反映され、IndexedDBへの書き込みはバックグラウンドで行われる。

**シナリオ2: 過去に戻る（Ctrl+Z → 世界線ビュー → node-1を選択）**

```
1. node-1 の changedRefs を確認 → hash "a1b2c3" と "ff0011" が必要
2. "ff0011" は loadedStates にある → OK
3. "a1b2c3" は loadedStates にない → IndexedDB から読み込む（掘り起こし）
4. Redux: loadedStates["a1b2c3"] = { turns: [... 1ターン分] }
5. Redux: apex を node-1 に移動
6. UIが再レンダリング → 1ターン目だけの会話が表示される
```

必要なデータだけをIndexedDBから取り出す。全履歴をメモリに載せる必要はない。

**シナリオ3: アプリ再起動（ブラウザを閉じて開き直した）**

```
1. IndexedDB の graphStore から DAG 構造を復元 → Redux に載せる
2. apex = "node-2" なので、node-2 で必要な hash を特定
   → getStateRefsAt("node-2") = ["d4e5f6", "ff0011"]
3. IndexedDB の stateStore から "d4e5f6" と "ff0011" を読み込む
4. Redux: loadedStates にセット
5. 復元完了 → 前回の続きから表示される
```

最新ノードに必要なデータだけ読み込むので、起動が速い。過去の履歴データは必要になるまで地中に眠ったまま。

### なぜ Redux + IndexedDB の二層構造か

**「全部Reduxでいいのでは？」** → ReduxはlocalStorageに永続化される（redux-persist）。localStorageは容量制限が5-10MBで、大量の履歴を持つと溢れる。また、全データを毎回シリアライズ/デシリアライズするのでパフォーマンスに影響する。

**「全部IndexedDBでいいのでは？」** → IndexedDBのアクセスは非同期。UIをリアクティブに更新するには、同期的にアクセスできるRedux上にデータがある必要がある。また、Redux DevToolsでデバッグできる利点も大きい。

二層構造にすることで、**Reduxの高速性・リアクティブ性**と**IndexedDBの大容量・永続性**の両方を活かせる。

### CASパターンの利点

バージョン識別にFNV-1aハッシュを使用する（object-shell-completionブランチの `StateHash.ts` を踏襲）。

- 同じ状態内容なら同じhash → IndexedDBへの重複保存が不要
- hashの比較だけで状態の同一性を判定できる
- 過去に戻って同じ状態に戻ったら、新しいデータを保存する必要がない

---

## スコーピング（世界線バブル）

### 考え方

WorldLineGraphは「世界全体で1つ」ではなく、オブジェクトのかたまりごとに作る。これにより、特定のオブジェクト群だけを巻き戻せる。

```
┌─ 世界線バブルA ──────────────────┐
│  conv-1  [mutable]               │
│  context-1 [mutable]             │  ← このかたまりだけ戻せる
│  sp-1    [sealed]                │
│  WorldLineGraph { apex: node-3 } │
└───────────────────────────────────┘

┌─ 世界線バブルB ──────────────────┐
│  conv-2  [mutable]               │
│  WorldLineGraph { apex: node-1 } │  ← こっちは独立
└───────────────────────────────────┘
```

### sealed オブジェクト

スコープに含まれるが、そのスコープ内では変更されないオブジェクト。参照として見えるが `changedRefs` には載らないため、巻き戻しの影響を受けない。

例：話者（Speaker）をsealed状態にして、会話の世界線の中では変更しないようにする。

---

## 再帰的 WorldLineGraph

### WorldLineGraph自体をオブジェクトとして追跡

WorldLineGraphは以下を満たす：
- `id` を持てる → `DomainEntity`
- `state` はJSON化可能 → hashが計算できる → `StateRef` として追跡可能

したがって、WorldLineGraph自体を別のWorldLineGraphの追跡対象にできる。

```
親 WorldLineGraph（アプリ全体）:
  node-1: { WLG-convA: hash-wlg-1, WLG-convB: hash-wlg-2 }
  node-2: { WLG-convA: hash-wlg-3 }

子 WorldLineGraph-convA (hash-wlg-3の中身):
  内部DAG: node-a1 → node-a2 → node-a3 (apex)
  追跡対象: [conv-1, context-1]
```

親を巻き戻すと、子WorldLineGraph自体（DAG構造を含む）が過去のバージョンに戻る。**子の履歴ごと巻き戻る**。

### 制約

- **木構造のみ**: 循環参照や自己参照を禁止する
- WorldLineGraphは自分自身や自分の祖先を含むことができない
- grow時のバリデーションで弾く

---

## 技術スタック

- **ドメイン層**: 純粋TypeScript（React/Redux依存なし）
- **ハッシュ計算**: FNV-1a 64bit（`StateHash.ts` を踏襲）
- **Redux**: DAG構造 + ロード済み状態データの管理
- **IndexedDB**: 全データの永続化（CAS + DAGバックアップ）
- **ライブラリ配置**: Nxモノレポ内の汎用ライブラリとして作成

---

## 今後の検討事項

- **ObjectShellとの関係整理**: ShellHistoryは線形履歴、WorldLineGraphはDAG履歴。棲み分けまたは統合の方針
- **sealed以外のオブジェクト属性**: 同一オブジェクトが複数スコープに属する場合の扱い
- **履歴の圧縮/ガベージコレクション**: 古い状態データをIndexedDBから削除する戦略
- **世界線ビューのUI**: DAGの可視化コンポーネント（既存のWorldLineViewを参考に）
