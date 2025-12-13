# オブジェクトシェル（Object Shell）設計仕様

## 概要

オブジェクトシェルは、DDDのドメインオブジェクトを包む高次デザインパターンです。DPO（Domain Payload Object）パターンを拡張し、以下の機能を統合的に提供します：

1. **複数ドメインオブジェクトの統合的な操作**：ID参照の制約を保ちつつ、複数のドメインオブジェクトをまとめて扱う
2. **履歴管理（History）**：シェルの線形リストによるエンティティレベルの履歴追跡
3. **横断的関心事の分離**：権限確認やView関連付けなどをドメインから分離

## 背景と動機

### DDDの集約制約

DDDでは、集約外のオブジェクトに対してはID参照しかもてないという厳しい制約があります。この制約は以下の利点をもたらします：

- 集約境界の明確化
- トランザクション整合性の保証
- 疎結合な設計の促進

しかし、複数のオブジェクトをまとめて扱いたい場合、オブジェクト同士に直接参照を貼れないという課題があります。

### DPOパターンの限界

実践DDD作者により提唱されたDPO（Domain Payload Object）パターンは、この課題に対する一つの解決策です。しかし、DPOは主にデータ転送に焦点を当てており、以下の機能は含まれていません：

- エンティティの変更履歴の追跡
- 複数のViewへの関連付け
- 権限確認機構
- メタデータ管理

オブジェクトシェルは、これらの機能を統合的に提供する包括的なパターンです。

## 主要概念

### 1. ObjectShell<T>

ドメインオブジェクト`T`を包むシェル構造：

```typescript
interface ObjectShell<T> {
  // コア
  id: string;                    // シェルの一意識別子
  domainObject: T;               // 包まれたドメインオブジェクト

  // メタデータ
  metadata: ShellMetadata;       // View関連、権限などのメタデータ

  // 履歴
  history: ShellHistory<T>;      // このシェルの変更履歴

  // 関連
  relations: ShellRelations;     // 他オブジェクトへのID参照
}
```

### 2. ShellHistory<T>

シェルの線形リストとして実現される履歴：

```typescript
interface ShellHistory<T> {
  // 履歴チェーン
  previous: ObjectShell<T> | null;  // 前のシェル状態へのリンク

  // 変更情報
  timestamp: number;                // 変更時刻
  operation: string;                // 実行された操作名

  //COMMENT: actionオブジェクトにしてくれる？ reduxのような

  userId?: string;                  // 操作を実行したユーザー
}
```

履歴は不変の線形リストとして構築され、各シェルは前の状態への参照を持ちます：

```
Shell(v3) -> Shell(v2) -> Shell(v1) -> null
```

### 3. ShellMetadata

横断的関心事を管理するメタデータ：

```typescript
interface ShellMetadata {
  // View関連付け
  views: ViewReference[];        // このオブジェクトを表示しているView一覧

  // 権限
  permissions: PermissionSet;    // アクセス制御情報

  // その他
  tags?: string[];               // タグやラベル
  annotations?: Record<string, any>;  // 任意のアノテーション
}

interface ViewReference {
  viewId: string;                // View識別子
  viewType: string;              // Viewの種類（例：bubble, modal, panel）
  position?: { x: number; y: number; z: number };  // View内での位置
}

interface PermissionSet {
  owner: string;                 // 所有者ID
  readers: string[];             // 読み取り権限を持つユーザー
  writers: string[];             // 書き込み権限を持つユーザー
  isPublic: boolean;             // 公開フラグ
}
```

### 4. ShellRelations

ID参照による関連管理（DDD集約制約を遵守）：

```typescript
interface ShellRelations {
  // 他オブジェクトへのID参照
  references: RelationReference[];

  // 逆参照（誰がこのオブジェクトを参照しているか）
  referencedBy: string[];
}

interface RelationReference {
  targetId: string;              // 参照先オブジェクトのID
  relationType: string;          // 関連の種類（例：parent, dependency, reference）
  metadata?: Record<string, any>;  // 関連に関する追加情報
}
```

## アーキテクチャ設計

### レイヤー構造

オブジェクトシェルは、既存のDDD 3層アーキテクチャと調和します：

```
feature/           # Redux統合、ShellProvider
  ├─ ShellManager.tsx
  └─ useObjectShell.ts

domain/            # ObjectShell, ShellHistory, ShellMetadata
  ├─ ObjectShell.ts
  ├─ ShellHistory.ts
  ├─ ShellMetadata.ts
  └─ ShellRelations.ts

ui/                # シェル情報を表示するコンポーネント
  ├─ ShellView.tsx
  └─ HistoryView.tsx
```

### ドメインオブジェクトとの関係

オブジェクトシェルは、既存のドメインオブジェクトを**包む**ものであり、置き換えるものではありません：

```typescript
// 既存のドメインオブジェクト（変更不要）
class Counter {
  constructor(readonly value: number) {}
  countUp(): Counter {
    return new Counter(this.value + 1);
  }
}

// シェルでラップ
const shell = new ObjectShell({
  id: 'counter-001',
  domainObject: new Counter(0),
  metadata: { /* ... */ },
  history: { /* ... */ },
  relations: { /* ... */ }
});

// ドメイン操作を実行してシェルを更新
const newShell = shell.updateDomainObject(
  shell.domainObject.countUp(),
  'countUp'
);
```

### 世界線システムとの関係

オブジェクトシェルは、世界線システムとは**独立したレイヤー**として実装されます：

```
┌─────────────────────────────────────┐
│ Application Layer                   │
├─────────────────────────────────────┤
│ Object Shell Layer                  │  ← 新規
│ - History管理（線形リスト）          │
│ - Metadata管理                       │
│ - Relations管理                      │
├─────────────────────────────────────┤
│ World Line System                   │  ← 既存
│ - 世界のバージョン管理               │
│ - タイムトラベル                     │
├─────────────────────────────────────┤
│ Domain Objects                      │
│ - Counter, Memo, etc.               │
└─────────────────────────────────────┘
```

**相互作用：**
- 世界線システム：アプリケーション全体の状態スナップショットを管理
- オブジェクトシェル：個々のエンティティレベルでの履歴とメタデータを管理

両者は異なる粒度で履歴を管理し、補完的に機能します。

## 不変性とデータフロー

### 不変性の原則

オブジェクトシェルは完全に不変です：

```typescript
class ObjectShell<T> {
  // すべてのフィールドはreadonly
  constructor(
    readonly id: string,
    readonly domainObject: T,
    readonly metadata: ShellMetadata,
    readonly history: ShellHistory<T> | null,
    readonly relations: ShellRelations
  ) {}

  // 更新は新しいインスタンスを返す
  updateDomainObject(newDomainObject: T, operation: string): ObjectShell<T> {
    return new ObjectShell(
      this.id,
      newDomainObject,
      this.metadata,
      {
        previous: this,  // 履歴チェーンに現在のシェルを追加
        timestamp: Date.now(),
        operation,
      },
      this.relations
    );
  }
}
```

### データフロー

```
1. ユーザー操作
   ↓
2. UI層：イベント発火
   ↓
3. Feature層：useObjectShell hookから現在のShellを取得
   ↓
4. Domain層：domainObject.operation() を実行
   ↓
5. Feature層：shell.updateDomainObject() で新しいShellを作成
   ↓
6. Redux：新しいShellをstoreに保存
   ↓
7. UI層：再レンダリング
```

## Redux統合

### Shell Slice構造

```typescript
interface ShellState {
  // objectIdをキーとしてShellを管理
  shells: { [objectId: string]: SerializedShell };
}

interface SerializedShell {
  id: string;
  domainObject: any;  // JSON serializable
  metadata: ShellMetadata;
  // 履歴は別途管理（メモリ効率のため）
  historyIds: string[];  // 履歴チェーンのID一覧
  relations: ShellRelations;
}
```

### Feature層実装パターン

```typescript
// ShellProvider.tsx
export function ShellProvider<T>({
  objectId,
  children
}: {
  objectId: string;
  children: ReactNode
}) {
  const shell = useAppSelector(state => selectShell<T>(objectId)(state));
  const dispatch = useAppDispatch();

  const updateShell = (newShell: ObjectShell<T>) => {
    dispatch(updateShellAction({
      objectId,
      shell: serializeShell(newShell)
    }));
  };

  return (
    <ShellContext.Provider value={{ shell, updateShell }}>
      {children}
    </ShellContext.Provider>
  );
}

// useObjectShell.ts
export function useObjectShell<T>() {
  const context = useContext(ShellContext<T>);
  if (!context) throw new Error('Must be used within ShellProvider');
  return context;
}
```

## 実装優先順位

### Phase 1: コア構造（最優先）

1. `ObjectShell<T>` 基本実装
2. `ShellHistory<T>` 履歴管理
3. `ShellMetadata` 基本構造
4. `ShellRelations` ID参照管理

### Phase 2: Redux統合

1. shell-slice.ts 実装
2. ShellProvider, useObjectShell実装
3. serialize/deserialize機構

### Phase 3: 高度な機能

1. 権限確認機構の実装
2. View関連付けの実装
3. 履歴の可視化UI

### Phase 4: 既存機能との統合

1. Counter, Memoへの適用
2. 世界線システムとの連携
3. パフォーマンス最適化

## 設計上の考慮事項

### メモリ効率

履歴チェーンは無限に成長する可能性があるため、以下の戦略を検討：

1. **履歴の圧縮**：古い履歴を定期的にアーカイブ
2. **履歴の切り捨て**：一定数以上は破棄
3. **遅延ロード**：必要な時だけ履歴を読み込む

### シリアライゼーション

Redux Persistとの互換性のため、すべてのデータはJSON serializableである必要があります。

### パフォーマンス

大量のオブジェクトを扱う場合、以下を考慮：

1. **セレクターのメモ化**
2. **仮想スクロール**による履歴表示
3. **インデックス**による高速検索

## まとめ

オブジェクトシェルは、DDDの原則を守りつつ、実用的な機能を追加する高次パターンです：

- ✅ DDD集約制約を遵守（ID参照のみ）
- ✅ 既存ドメインオブジェクトを変更不要
- ✅ 不変性を保持
- ✅ 世界線システムと独立して動作
- ✅ 横断的関心事を分離

次のステップは、TypeScriptの型定義と具体的な実装です。
