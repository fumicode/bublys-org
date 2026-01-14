# ObjectShell と 世界線機構 設計整理

## 現状のアーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Bubble    │    │ ShellBubble │    │ WorldLine   │     │
│  │    View     │    │  Renderer   │    │    View     │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     Feature Layer                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Redux     │    │   Shell     │    │  WorldLine  │     │
│  │   Store     │◄───│  Manager    │    │   Manager   │     │
│  │ (bubbles)   │    │ (Context)   │    │  (Redux)    │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Bubble    │    │ ObjectShell │    │  WorldLine  │     │
│  │  (Redux)    │    │  + History  │    │ (DAG/Hash)  │     │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘     │
│                            │                  │             │
│                    ┌───────┴──────────────────┘             │
│                    ▼                                        │
│             ┌─────────────┐                                 │
│             │   Akashic   │                                 │
│             │   Record    │                                 │
│             └──────┬──────┘                                 │
└────────────────────┼────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Persistence Layer                          │
│  ┌─────────────┐    ┌─────────────┐                         │
│  │ localStorage│    │  IndexedDB  │                         │
│  │ (Redux)     │    │ (States/WL) │                         │
│  └─────────────┘    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 論点 1: Redux との統合方針

### 現状の構成

| 責務 | 管理主体 | 永続化先 |
|------|---------|---------|
| Bubble UI状態 | Redux | localStorage |
| ObjectShell | ShellManager (React Context) | localStorage + IndexedDB |
| WorldLine | Redux + AkashicRecord | IndexedDB |
| 状態スナップショット | AkashicRecord | IndexedDB |

### 選択肢

#### A. CAS を Redux に統合する

```
Redux Store
├── bubbles/     (既存)
├── worldLine/   (既存)
├── shells/      (NEW: ObjectShell の状態)
└── cas/         (NEW: Content Addressed Store)
    └── states: Record<hash, SerializedState>
```

**メリット:**
- 単一の状態管理機構で一貫性を保てる
- Redux DevTools でデバッグしやすい
- redux-persist による永続化が統一される
- Time-travel debugging が Redux の機能として使える

**デメリット:**
- Redux の状態が肥大化する
- CAS のようなアドレッシングには不向き（hash → state のルックアップ）
- 大量の履歴を持つと localStorage の容量制限に引っかかる
- Redux の同期的な更新モデルと IndexedDB の非同期モデルの不整合

#### B. ObjectShell を完全に独立させ、Redux を最小化する

```
ObjectShell System (独立)
├── ShellManager (メモリ管理)
├── ShellHistory (履歴チェーン)
├── CAS (IndexedDB)
└── WorldLine (DAG構造)

Redux Store (軽量化)
├── bubbles/     (UI状態のみ)
└── environment/ (環境設定のみ)
```

**メリット:**
- ObjectShell の設計を最大限活かせる
- IndexedDB の非同期・大容量ストレージを活用できる
- CAS の hash アドレッシングが自然に実装できる
- Redux の制約（シリアライズ可能、同期的）に縛られない

**デメリット:**
- 2つの状態管理機構が存在し、複雑性が増す
- Redux DevTools でObjectShell の状態が見えない
- ShellManager と Redux 間の同期ロジックが必要

#### C. ハイブリッド: Redux は「参照」のみ、実体は ObjectShell

```
Redux Store
├── bubbles/
├── shellRefs/   (シェルへの参照IDのみ)
└── worldLineRefs/

ObjectShell System
├── ShellManager (実体管理)
├── CAS (IndexedDB)
└── WorldLine
```

**メリット:**
- Redux の軽量性を維持しつつ、全体像を把握できる
- シェルの存在は Redux で追跡可能
- 実データは効率的に管理できる

**デメリット:**
- 参照と実体の整合性管理が必要
- 二重管理の複雑性は残る

### 推奨: B案（ObjectShell 独立）

**理由:**
1. CAS の本質は「hash → content」のマッピングで、これは IndexedDB が適している
2. 世界線の DAG 構造は Redux の単純な状態ツリーと相性が悪い
3. 将来的に部分世界線いじりを実装する場合、独立した方が柔軟

**次のステップ:**
- ShellManager を CAS のフロントエンドとして再設計
- Redux との連携を「イベント駆動」に統一（現状の ShellEventEmitter を活用）

---

## 論点 2: 状態ID を hash 値に変更

### 現状

```typescript
// StateSnapshot (timestamp ベース)
interface StateSnapshot {
  type: string;      // 'counter'
  id: string;        // 'counter-001'
  timestamp: number; // 1234567890
}

// IndexedDB key: "counter:counter-001:1234567890"
```

### 変更案

```typescript
// StateSnapshot (hash ベース)
interface StateSnapshot {
  type: string;      // 'counter'
  id: string;        // 'counter-001'
  hash: string;      // 'sha256:abc123...' または短縮形
}

// CAS 構造
interface ContentAddressedStore {
  // hash → content (重複排除)
  contents: Map<string, SerializedState>;

  // (type, id, timestamp) → hash (履歴追跡用)
  history: Map<string, { hash: string; timestamp: number }[]>;
}
```

### メリット

1. **メモリ効率**: 同一状態の重複を排除できる
2. **整合性**: 状態の同一性が hash で保証される
3. **理論的正しさ**: timestamp の衝突可能性を排除

### 実装アプローチ

```typescript
// hash 生成関数
function computeStateHash(state: SerializedState): string {
  const json = JSON.stringify(state, Object.keys(state).sort());
  return sha256(json).slice(0, 16); // 短縮形で十分
}

// 状態保存
async function saveState(state: SerializedState): Promise<string> {
  const hash = computeStateHash(state);

  // 既に存在すれば保存不要（CAS の本質）
  if (await cas.has(hash)) {
    return hash;
  }

  await cas.set(hash, state);
  return hash;
}
```

### 次のステップ

1. `StateSnapshot` の `timestamp` を `hash` に変更
2. `AkashicRecord` の保存ロジックを CAS パターンに変更
3. 履歴追跡用に timestamp は別途保持（操作ログとして）

---

## 論点 3: 部分世界線いじり（Partial WorldLine）

### 要件

- 選択した一部のオブジェクトだけ時間を進めたり巻き戻したりしたい
- 例: Counter A を 3 ステップ前に戻しつつ、Counter B は現在のまま

### 必要な関係性モデル

#### 依存関係の種類

```typescript
interface ShellRelation {
  type: RelationType;
  sourceId: string;
  targetId: string;
  metadata?: RelationMetadata;
}

type RelationType =
  | 'owns'        // 所有関係（親子）
  | 'references'  // 参照関係（弱い依存）
  | 'derives'     // 派生関係（計算値の元）
  | 'synchronizes' // 同期関係（同時に変更されるべき）
```

#### 依存グラフ

```
┌────────────┐     references    ┌────────────┐
│ Counter A  │ ─────────────────►│ Counter B  │
└────────────┘                   └────────────┘
      │                                │
      │ owns                           │ owns
      ▼                                ▼
┌────────────┐                   ┌────────────┐
│  Label A   │                   │  Label B   │
└────────────┘                   └────────────┘
```

#### 部分世界線操作のルール

```typescript
interface PartialWorldLineOperation {
  // 戻したいオブジェクトのID
  targetIds: string[];

  // 戻す先の状態（hash または timestamp）
  targetState: StateReference;

  // 依存解決戦略
  dependencyStrategy:
    | 'cascade'      // 依存するものも一緒に戻す
    | 'isolate'      // 対象のみ戻す（参照整合性は保証しない）
    | 'prompt'       // ユーザーに確認
    ;
}
```

### 設計案

```typescript
// ShellRelations を拡張
class ShellRelations {
  private relations: ShellRelation[] = [];

  // 関連追加
  addRelation(relation: ShellRelation): void;

  // 関連取得
  getRelatedIds(id: string, type?: RelationType): string[];

  // 依存グラフ全体を取得
  getDependencyGraph(): DependencyGraph;

  // 部分世界線操作の影響範囲を計算
  computeAffectedIds(
    targetIds: string[],
    strategy: DependencyStrategy
  ): string[];
}
```

### 次のステップ

1. 関係性の種類と意味を確定する
2. `ShellRelations` の設計を拡張
3. 部分世界線操作の UI/UX を検討

---

## 論点 4: LLM による ObjectShell 操作

### 目標

```
┌─────────────────────────────────────────────────┐
│                   同じメンタルモデル              │
│                                                 │
│   ユーザー ──► UI ──► ObjectShell ──► Domain    │
│                                                 │
│   LLM ──────► ObjectShell ──────────► Domain    │
│                       ↑                         │
│                  権限チェック                    │
│                  操作制限                        │
└─────────────────────────────────────────────────┘
```

### 設計案: Permission Layer

```typescript
interface ShellPermission {
  // 許可されたメソッド
  allowedMethods: string[];

  // メソッドごとの制約
  constraints: Record<string, MethodConstraint>;

  // 操作主体
  principal: 'user' | 'llm' | 'system';
}

interface MethodConstraint {
  // 引数の制約
  parameterConstraints?: Record<string, ValueConstraint>;

  // 呼び出し回数制限
  rateLimit?: { count: number; windowMs: number };

  // 確認が必要か
  requiresConfirmation?: boolean;
}
```

### LLM 用の ObjectShell ラッパー

```typescript
class LLMShellProxy<T extends DomainEntity> {
  constructor(
    private shell: ObjectShell<T>,
    private permissions: ShellPermission
  ) {}

  // メソッド呼び出しをインターセプト
  invoke(methodName: string, args: unknown[]): Result<T, PermissionError> {
    // 1. 許可チェック
    if (!this.permissions.allowedMethods.includes(methodName)) {
      return Err(new PermissionError(`Method ${methodName} not allowed`));
    }

    // 2. 制約チェック
    const constraint = this.permissions.constraints[methodName];
    if (constraint && !this.checkConstraints(constraint, args)) {
      return Err(new ConstraintError(...));
    }

    // 3. 確認が必要なら保留
    if (constraint?.requiresConfirmation) {
      return Pending(new ConfirmationRequest(methodName, args));
    }

    // 4. 実行
    return Ok(this.shell[methodName](...args));
  }
}
```

### MCP (Model Context Protocol) との統合

```typescript
// MCP Tool として公開
const shellTool: MCPTool = {
  name: 'object_shell',
  description: 'Interact with domain objects safely',

  inputSchema: {
    type: 'object',
    properties: {
      shellId: { type: 'string' },
      method: { type: 'string' },
      args: { type: 'array' }
    }
  },

  handler: async (input) => {
    const shell = shellManager.get(input.shellId);
    const proxy = new LLMShellProxy(shell, getLLMPermissions(shell));

    return proxy.invoke(input.method, input.args);
  }
};
```

### 次のステップ

1. Permission モデルの詳細設計
2. LLMShellProxy の実装
3. MCP Tool としての公開インターフェース設計

---

## 論点 5: ObjectShell と Bubble の宣言的対応

### 現状（イベント駆動）

```
1. setShellWithBubble() が呼ばれる
2. ShellManager が pendingBubbleCreations に追加
3. useEffect で pendingBubbleCreations を監視
4. Redux dispatch で bubbles/requestBubbleCreation
5. Bubble が生成される
```

### 理想（宣言的）

```
1. ObjectShell のプール（ShellManager）
       ↓ 参照
2. Bubble のプール（BubbleManager）
       ↓ レンダリング
3. BubbleView（UI）
```

### 設計案

```typescript
// URL スキームの正規化
type ShellURL = `object-shells/${string}/${string}`;

// BubbleManager が ShellManager を参照
class BubbleManager {
  // シェルID → バブルID のマッピング
  private shellToBubble: Map<string, string> = new Map();

  // バブルを開く（宣言的）
  openBubble(url: ShellURL, options?: OpenOptions): Bubble {
    const [, shellType, shellId] = url.match(/object-shells\/(.+)\/(.+)/)!;

    // シェルが存在しなければ生成
    if (!shellManager.has(shellId)) {
      shellManager.createShell(shellType, shellId);
    }

    // バブルを生成（既存なら再利用）
    const existingBubbleId = this.shellToBubble.get(shellId);
    if (existingBubbleId) {
      return bubbleManager.get(existingBubbleId);
    }

    const bubble = this.createBubble(url, options);
    this.shellToBubble.set(shellId, bubble.id);
    return bubble;
  }
}
```

### データフロー（理想形）

```
┌─────────────────────────────────────────────────────────┐
│                    宣言的データフロー                     │
│                                                         │
│  openBubble("object-shells/counter/001")               │
│        │                                               │
│        ▼                                               │
│  ┌─────────────────────────────────────────┐           │
│  │ ShellManager                             │           │
│  │   shells: Map<id, ObjectShell>           │           │
│  │   ├── counter-001: CounterShell          │ ← 生成   │
│  │   └── ...                                │           │
│  └─────────────────────────────────────────┘           │
│        │ 参照                                          │
│        ▼                                               │
│  ┌─────────────────────────────────────────┐           │
│  │ BubbleManager (Redux)                    │           │
│  │   bubbles: Map<id, Bubble>               │           │
│  │   ├── bubble-001: { url, shellRef }     │ ← 生成   │
│  │   └── ...                                │           │
│  └─────────────────────────────────────────┘           │
│        │ レンダリング                                   │
│        ▼                                               │
│  ┌─────────────────────────────────────────┐           │
│  │ BubbleView                               │           │
│  │   <ShellBubble shell={counterShell} />   │ ← 表示   │
│  └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### 次のステップ

1. `openBubble` の単一エントリポイントを設計
2. ShellManager と BubbleManager の責務を明確化
3. 既存のイベント駆動コードを宣言的に置き換え

---

## 優先順位と次のアクション

### Phase 1: 基盤整理（このセッション）

1. **状態ID を hash に変更**
   - 影響範囲が限定的
   - CAS の基盤として必要
   - リスク: 低

2. **Redux 統合方針を確定**
   - B案（ObjectShell 独立）で進める
   - 設計ドキュメントを更新

### Phase 2: ObjectShell / Bubble 関係の宣言化

3. **openBubble の設計**
   - 単一エントリポイント
   - ShellManager との統合

### Phase 3: 部分世界線と LLM 対応

4. **関係性モデルの設計**
   - `ShellRelations` の拡張

5. **LLM Permission Layer**
   - MCP 統合を視野に

---

## 合意済み事項

1. **Redux 統合方針**: B案（ObjectShell 独立）で進める ✅
2. **最初のタスク**: hash 化から着手 ✅

---

## 実装詳細

以下の実装詳細は別ファイルに分離:

- **状態ID の hash 化**: [`implementation/state-hash-migration.md`](./implementation/state-hash-migration.md)
