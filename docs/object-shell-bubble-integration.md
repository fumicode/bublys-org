# オブジェクトシェルとBubbleUIの統合設計

## 現在の構造

### BubbleUI
- **Bubble**: ドメインオブジェクト（name, colorHue, type, position, size, renderedRect）
- **BubblesProcess**: レイヤー構造でBubble IDを管理
- **Redux State**: 正規化された状態（`bubbles: Record<string, BubbleJson>`）

### オブジェクトシェル
- **ObjectShell<T>**: ドメインオブジェクトを包む
- **ShellMetadata**: View関連付け、権限、タグ
- **ShellHistory**: Reduxライクなアクション履歴
- **ShellRelations**: ID参照による関連管理

## 統合パターンの検討

### パターンA: Bubbleがシェルを内包

```typescript
// Bubbleがコンテンツとしてシェルを持つ
interface BubbleState {
  id: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;

  // ドメインオブジェクトのシェル
  contentShell?: ObjectShell<Counter | Memo | ...>;
}
```

**メリット**:
- Bubbleとコンテンツが密結合
- Bubbleの移動などが自然に記録される

**デメリット**:
- Bubble自体のUI状態とドメインの状態が混在
- Bubbleの責務が複雑になる
- 同じドメインオブジェクトを複数のBubbleで表示できない

---

### パターンB: シェルとBubbleを分離（推奨）

```typescript
// Bubbleはシェルへの参照のみ持つ
interface BubbleState {
  id: string;
  name: string;
  colorHue: number;
  type: string;
  position?: Point2;

  // ドメインオブジェクトのシェルID参照
  contentShellId?: string;
}

// シェルのViewReferenceにBubble情報を記録
interface ViewReference {
  viewId: string;        // Bubble ID
  viewType: 'bubble';
  position?: { x, y, z };
}

// Reduxの構造
interface AppState {
  bubbles: Record<string, BubbleJson>;
  shells: Record<string, SerializedShell>;  // 新規
  // ...
}
```

**データフロー**:
```
1. ドメインオブジェクトをシェルでラップ
   ObjectShell<Counter>

2. Bubbleを作成してシェルIDを参照
   Bubble { contentShellId: 'shell-001' }

3. シェルのメタデータにBubble参照を追加
   shell.updateMetadata({
     views: [{ viewId: 'bubble-123', viewType: 'bubble', position: {...} }]
   })

4. Bubbleが移動したら、シェルのView位置を更新
   dispatch(updateShellViewPosition({ shellId, viewId, position }))

5. Bubbleが削除されたら、シェルからView参照を削除
   dispatch(removeShellView({ shellId, viewId }))
```

**メリット**:
- ✅ DDDの原則に従う（UI状態とドメイン状態の分離）
- ✅ 同じドメインオブジェクトを複数のBubbleで表示可能
- ✅ Bubbleの責務が明確（UI表示のみ）
- ✅ シェルから「どのBubbleで表示されているか」を追跡可能
- ✅ ドメインオブジェクトの永続化が独立

**デメリット**:
- Redux状態が増える（shellsスライス追加）
- 参照の整合性を保つ必要がある

---

### パターンC: Bubbleそのものがシェルのドメインオブジェクト

```typescript
// Bubble自体をシェルでラップ
ObjectShell<Bubble>
```

**メリット**:
- Bubble自体の履歴が記録される

**デメリット**:
- BubbleはUI要素であり、純粋なドメインオブジェクトではない
- DDDの原則から外れる

---

## 推奨パターン：パターンB（分離アーキテクチャ）

### アーキテクチャ図

```
┌─────────────────────────────────────────┐
│ Redux State                             │
├─────────────────────────────────────────┤
│ bubbles: {                              │
│   'bubble-001': {                       │
│     id: 'bubble-001',                   │
│     name: 'Counter Bubble',             │
│     contentShellId: 'shell-counter-01', │← シェルID参照
│     position: { x: 100, y: 200 }        │
│   }                                     │
│ }                                       │
│                                         │
│ shells: {                               │
│   'shell-counter-01': {                 │
│     id: 'shell-counter-01',             │
│     domainObject: { value: 5 },         │← Counterドメイン
│     metadata: {                         │
│       views: [                          │
│         {                               │
│           viewId: 'bubble-001',         │← Bubble参照
│           viewType: 'bubble',           │
│           position: { x: 100, y: 200 }  │
│         }                               │
│       ]                                 │
│     },                                  │
│     history: [...],                     │
│     relations: [...]                    │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘
```

### 実装ステップ

#### Phase 1: Shell Redux統合（基本）

1. **shell-slice.tsの作成**
   ```typescript
   interface ShellState {
     shells: Record<string, SerializedShell>;
   }

   const shellSlice = createSlice({
     name: 'shells',
     initialState,
     reducers: {
       addShell,
       updateShell,
       removeShell,
       updateShellViewPosition,  // Bubble移動時
       addShellView,             // Bubble作成時
       removeShellView,          // Bubble削除時
     }
   });
   ```

2. **型定義の拡張**
   ```typescript
   // BubbleStateにshellId追加
   interface BubbleState {
     // 既存のフィールド
     contentShellId?: string;  // 新規
   }
   ```

#### Phase 2: Bubbleとの連携

1. **Bubble作成時**
   ```typescript
   function createBubbleWithDomain(domainObject: Counter) {
     // 1. シェルを作成
     const shell = wrap('shell-counter', domainObject, userId);
     dispatch(addShell(shell.toJson(...)));

     // 2. Bubbleを作成
     const bubble = new Bubble({
       name: 'Counter',
       contentShellId: shell.id,
       // ...
     });
     dispatch(addBubble(bubble.toJSON()));

     // 3. シェルにView参照を追加
     const metadata = addViewReference(shell.metadata, {
       viewId: bubble.id,
       viewType: 'bubble',
       position: bubble.position,
     });
     dispatch(updateShellMetadata({ shellId: shell.id, metadata }));
   }
   ```

2. **Bubble移動時**
   ```typescript
   function onBubbleMove(bubbleId: string, newPosition: Point2) {
     const bubble = selectBubble(bubbleId);
     if (bubble.contentShellId) {
       dispatch(updateShellViewPosition({
         shellId: bubble.contentShellId,
         viewId: bubbleId,
         position: newPosition,
       }));
     }
   }
   ```

3. **Bubble削除時**
   ```typescript
   function onBubbleRemove(bubbleId: string) {
     const bubble = selectBubble(bubbleId);
     if (bubble.contentShellId) {
       dispatch(removeShellView({
         shellId: bubble.contentShellId,
         viewId: bubbleId,
       }));

       // シェルが他のViewで使われていない場合は削除
       const shell = selectShell(bubble.contentShellId);
       if (shell.metadata.views.length === 0) {
         dispatch(removeShell(bubble.contentShellId));
       }
     }
     dispatch(removeBubble(bubbleId));
   }
   ```

#### Phase 3: コンテンツレンダリング

```typescript
function BubbleContentRenderer({ bubble }: { bubble: Bubble }) {
  const shell = useAppSelector(state =>
    selectShell(bubble.contentShellId)(state)
  );

  if (!shell) return <div>Loading...</div>;

  // シェルからドメインオブジェクトを取得
  const domainObject = shell.domainObject;

  // タイプに応じてレンダリング
  if (domainObject.type === 'counter') {
    return <CounterView counter={Counter.fromJson(domainObject)} />;
  }
  if (domainObject.type === 'memo') {
    return <MemoView memo={Memo.fromJson(domainObject)} />;
  }

  return null;
}
```

### ユースケース

#### 1. 同じCounterを複数のBubbleで表示

```typescript
// 1つのシェル
const shell = wrap('shell-counter', new Counter(0), 'user-001');

// 複数のBubble
const bubble1 = new Bubble({ name: 'Counter View 1', contentShellId: shell.id });
const bubble2 = new Bubble({ name: 'Counter View 2', contentShellId: shell.id });

// シェルには2つのView参照
shell.metadata.views = [
  { viewId: bubble1.id, viewType: 'bubble', position: { x: 100, y: 100 } },
  { viewId: bubble2.id, viewType: 'bubble', position: { x: 300, y: 100 } },
];

// どちらかのBubbleでカウントアップすると、両方に反映される
```

#### 2. Bubbleからモーダルを開く

```typescript
// Bubbleで表示中
const bubble = { contentShellId: 'shell-memo' };

// モーダルを開く
function openMemoModal(shellId: string) {
  const modal = createModal({ type: 'memo-detail' });

  // 同じシェルIDを参照
  modal.contentShellId = shellId;

  // シェルにView参照を追加
  dispatch(addShellView({
    shellId,
    view: { viewId: modal.id, viewType: 'modal' }
  }));
}

// Bubbleとモーダルで同じMemoを同期表示
```

#### 3. 履歴の追跡

```typescript
// Bubble上でドメインオブジェクトを操作
function handleCountUp(shellId: string) {
  const shell = selectShell(shellId);
  const counter = Counter.fromJson(shell.domainObject);

  const newCounter = counter.countUp();
  const newShell = shell.updateDomainObject(
    newCounter,
    'counter/increment',
    { from: shell.metadata.views[0].viewId },  // どのBubbleから操作されたか
    'user-001',
    'Bubble上でカウントアップ'
  );

  dispatch(updateShell(newShell.toJson(...)));
}

// 履歴を確認すると、どのBubbleから操作されたかがわかる
const history = getHistoryAsArray(shell.history);
// [{
//   action: {
//     type: 'counter/increment',
//     payload: { from: 'bubble-001' },
//     meta: { description: 'Bubble上でカウントアップ' }
//   }
// }]
```

## まとめ

**パターンB（分離アーキテクチャ）**を採用することで：

1. ✅ **DDDの原則を遵守**：UI状態とドメイン状態を分離
2. ✅ **柔軟な表示**：同じドメインオブジェクトを複数のViewで表示
3. ✅ **追跡可能**：シェルから「どこで使われているか」を確認
4. ✅ **履歴管理**：どのViewからどんな操作が行われたかを記録
5. ✅ **権限管理**：シェルレベルで権限を一元管理

次のステップは、shell-slice.tsの実装とBubbleへの統合です。
