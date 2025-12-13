# Object Shell - オブジェクトシェル

オブジェクトシェルは、DDDのドメインオブジェクトを包む高次デザインパターンです。

## 概要

詳細な設計仕様は [/docs/object-shell.md](/docs/object-shell.md) を参照してください。

## 主な機能

- ✅ **履歴管理**: Reduxライクなactionによる操作履歴の記録
- ✅ **メタデータ管理**: View関連付け、権限確認、タグなど
- ✅ **ID参照による関連管理**: DDDの集約制約を遵守
- ✅ **不変性**: 完全にイミュータブルなデータ構造
- ✅ **シリアライゼーション**: JSON形式での永続化サポート

## 基本的な使い方

### 1. ドメインオブジェクトをシェルでラップ

```typescript
import { wrap } from './domain';
import { Counter } from '../world-line/Counter/domain/Counter';

const counter = new Counter(0);
const counterShell = wrap('counter-001', counter, 'user-001');
```

### 2. ドメインオブジェクトを更新

```typescript
// 簡易版：actionTypeとpayloadを指定
const newCounter = counterShell.domainObject.countUp();
const updatedShell = counterShell.updateDomainObject(
  newCounter,
  'counter/countUp',           // action type
  { previousValue: 0 },        // payload (optional)
  'user-001',                  // userId (optional)
  'カウンターを1増やした'      // description (optional)
);

// または、actionオブジェクトを直接指定
const updatedShell2 = counterShell.updateDomainObjectWithAction(
  newCounter,
  {
    type: 'counter/countUp',
    payload: { previousValue: 0 },
    meta: {
      userId: 'user-001',
      description: 'カウンターを1増やした',
    },
  }
);
```

### 3. 履歴を参照

```typescript
import { getHistoryAsArray, findHistoryByActionType } from './domain';

// すべての履歴を取得
const history = getHistoryAsArray(counterShell.history);
history.forEach(node => {
  console.log(node.action.type);        // 'counter/countUp'
  console.log(node.action.payload);     // { previousValue: 0 }
  console.log(node.action.meta);        // { userId: 'user-001', ... }
  console.log(node.timestamp);          // 1234567890
});

// 特定のアクションタイプのみ取得
const countUpHistory = findHistoryByActionType(counterShell.history, 'counter/countUp');
```

### 4. View関連付け

```typescript
import { addViewReference } from './domain';

const metadata = addViewReference(counterShell.metadata, {
  viewId: 'bubble-001',
  viewType: 'bubble',
  position: { x: 100, y: 200, z: 0 },
});

const shellWithView = counterShell.updateMetadata({ views: metadata.views });
```

### 5. オブジェクト間の関連（ID参照）

```typescript
import { addReference } from './domain';

const relations = addReference(counterShell.relations, {
  targetId: 'counter-002',
  relationType: 'dependency',
  metadata: {
    description: 'counter-002に依存している',
  },
});

const shellWithRelation = counterShell.updateRelations(relations);
```

### 6. 権限確認

```typescript
import { canRead, canWrite } from './domain';

if (canRead(counterShell.metadata, 'user-002')) {
  // 読み取り可能
}

if (canWrite(counterShell.metadata, 'user-002')) {
  // 書き込み可能
}
```

### 7. シリアライゼーション

```typescript
// JSON形式に変換
const json = counterShell.toJson(
  (counter: Counter) => counter.toJson(),
  (counter: Counter) => counter.toJson()  // snapshot serializer (optional)
);

// JSONから復元
const restoredShell = ObjectShell.fromJson<Counter>(
  json,
  (data) => Counter.fromJson(data),
  (data) => Counter.fromJson(data)  // snapshot deserializer (optional)
);
```

## アクション構造

履歴はReduxライクなアクション構造を採用しています：

```typescript
interface ShellAction {
  type: string;           // アクションタイプ（例：'counter/countUp'）
  payload?: any;          // ペイロード（オプション）
  meta?: {                // メタデータ（オプション）
    userId?: string;
    description?: string;
    [key: string]: any;
  };
}
```

### アクションタイプの命名規則

Reduxのベストプラクティスに従い、`<domain>/<operation>` の形式を推奨します：

- `counter/increment`
- `counter/decrement`
- `memo/updateContent`
- `memo/addBlock`

## 実装例

詳細な実装例は [examples/CounterShellExample.ts](./examples/CounterShellExample.ts) を参照してください。

```bash
# 例を実行
npx ts-node apps/bublys-os/app/object-shell/examples/CounterShellExample.ts
```

## テスト

```bash
# テストを実行
npx nx test bublys-os --testFile=object-shell/examples/CounterShellExample.test.ts
```

## ディレクトリ構成

```
object-shell/
├── domain/              # ドメイン層（React/Redux不要）
│   ├── ObjectShell.ts   # コアクラス
│   ├── ShellHistory.ts  # 履歴管理
│   ├── ShellMetadata.ts # メタデータ管理
│   ├── ShellRelations.ts # 関連管理
│   └── index.ts         # エクスポート
├── examples/            # 実装例
│   ├── CounterShellExample.ts
│   └── CounterShellExample.test.ts
└── README.md
```

## 次のステップ

1. Redux統合（shell-slice.ts）の実装
2. ShellProvider、useObjectShellフックの実装
3. UI層の実装（履歴表示、メタデータ編集など）

詳細な実装計画は [/docs/object-shell.md](/docs/object-shell.md) の「実装優先順位」セクションを参照してください。
