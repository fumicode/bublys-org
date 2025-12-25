# オブジェクトシェルとBubble URLの統合設計

## 現状の理解

### Bubble.urlの役割

```typescript
// urlはルーティング情報（URL的なパス）
bubble.url = "memos/abc"              // メモabc の詳細
bubble.url = "memos/abc/history"      // メモabc の履歴表示
bubble.url = "users/123"              // ユーザー123 の詳細
bubble.url = "users/123/delete-confirm" // ユーザー123 の削除確認

// パターンマッチングでコンポーネントを決定
{ pattern: /^memos\/[^/]+$/, type: "memo", Component: MemoBubble }
{ pattern: /^memos\/[^/]+\/history$/, type: "world-lines", Component: MemoWorldLinesBubble }

// urlからIDを抽出
const memoId = bubble.url.replace("memos/", "");
const memoId = bubble.url.replace("memos/", "").replace("/history", "");
```

## 課題

### 1. urlとshellIdの関係

```
問題：
  url: 'memos/abc'         → どのshellを参照する？
  url: 'memos/abc/history' → 同じshellを参照すべき？別のshell？
```

### 2. 現状のID抽出ロジック

```typescript
// 各コンポーネントでIDを抽出している
const memoId = bubble.url.replace("memos/", "");
const userId = bubble.url.replace("users/", "").replace("/delete-confirm", "");
```

## 提案：urlとshellIdの分離

### アーキテクチャ

```typescript
interface BubbleState {
  id: string;              // Bubble自身のID
  url: string;             // ルーティング/UI用：'memos/abc/history'
  contentShellId?: string; // データ参照用：'shell-memo-abc'
  // ...
}
```

### 重要な原則

**urlとshellIdは別の責務**

| 項目 | url | contentShellId |
|------|------|----------------|
| 役割 | ルーティング、UI表示の種類を決定 | ドメインオブジェクトへの参照 |
| 例 | `'memos/abc/history'` | `'shell-memo-abc'` |
| 複数性 | 1つのshellに対して複数のurlがあり得る | 1つのshellは複数のBubbleから参照され得る |

### 統合パターン

#### パターンA: urlからshellIdを導出

```typescript
// ヘルパー関数
function extractShellId(url: string): string | undefined {
  // エンティティタイプとIDを抽出
  const memoMatch = url.match(/^memos\/([^/]+)/);
  if (memoMatch) return `shell-memo-${memoMatch[1]}`;

  const userMatch = url.match(/^users\/([^/]+)/);
  if (userMatch) return `shell-user-${userMatch[1]}`;

  return undefined;
}

// 使用例
const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
  const shellId = extractShellId(bubble.url); // 'shell-memo-abc'
  const shell = useShell<Memo>(shellId);

  if (!shell) return <div>Loading...</div>;

  return <MemoEditor memo={shell.domainObject} />;
};
```

**メリット**：
- contentShellIdを保存しなくて良い（導出可能）
- urlとshellIdの対応が明確

**デメリット**：
- urlのフォーマットに依存
- エンティティタイプごとに抽出ロジックが必要

#### パターンB: contentShellIdを明示的に保存（推奨）

```typescript
// Bubble作成時にshellIdを明示
function openMemoBubble(memoId: string, parentBubbleId: string) {
  const { setShell } = useShellManager();
  const dispatch = useAppDispatch();

  // 1. Shellが存在するか確認
  let shellId = `shell-memo-${memoId}`;
  let shell = getShell<Memo>(shellId);

  if (!shell) {
    // Shellが存在しなければ作成
    const memo = loadMemoFromSomewhere(memoId); // 既存のストアから取得など
    shell = wrap(shellId, memo, 'user-001');
    setShell(shellId, shell);
  }

  // 2. Bubbleを作成（urlとshellIdの両方を設定）
  const bubble = new Bubble({
    url: `memos/${memoId}`,
    contentShellId: shellId,  // ← 明示的に設定
    // ...
  });

  dispatch(addBubble(bubble.toJSON()));
}
```

**メリット**：
- urlとshellIdが完全に独立
- 柔軟性が高い（将来的に異なるマッピングも可能）

**デメリット**：
- 若干冗長（urlとshellIdの両方を管理）

### 実装例

```typescript
// apps/bublys-os/app/bubble-ui/BubblesUI/domain/bubbleRoutes.tsx

const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
  // パターンA: urlから導出
  const shellId = extractShellId(bubble.url);

  // または

  // パターンB: 明示的に保存されたshellIdを使用
  const shellId = bubble.contentShellId;

  const shell = useShell<Memo>(shellId);
  const { openBubble } = useContext(BubblesContext);

  if (!shell) return <div>Memoが見つかりません</div>;

  const handleOpenHistory = () => {
    // 履歴Bubbleも同じshellを参照
    openBubble(`memos/${shell.id}/history`, bubble.id);
  };

  return (
    <div>
      <button onClick={handleOpenHistory}>履歴を表示</button>
      <MemoEditor memo={shell.domainObject} />
    </div>
  );
};

const MemoWorldLinesBubble: BubbleContentRenderer = ({ bubble }) => {
  // 同じshellを参照（urlは異なる）
  const shellId = bubble.contentShellId; // 'shell-memo-abc'

  const shell = useShell<Memo>(shellId);

  if (!shell) return <div>Memoが見つかりません</div>;

  const history = getHistoryAsArray(shell.history);

  return (
    <div>
      <h2>履歴: {shell.domainObject.id}</h2>
      <HistoryView history={history} />
    </div>
  );
};
```

### 複数のBubbleが同じShellを参照する例

```
┌─────────────────────┐
│ ShellManager        │
│  shell-memo-abc     │ ← 1つのShell
│    Memo { ... }     │
└─────────────────────┘
         ↑
         │ 参照
    ┌────┴────┬────────────┐
    │         │            │
┌───┴──┐  ┌──┴───┐   ┌───┴────┐
│Bubble│  │Bubble│   │ Bubble │
│url:  │  │url:  │   │ url:   │
│memos/│  │memos/│   │ memos/ │
│abc   │  │abc/  │   │ abc/   │
│      │  │hist  │   │ delete │
└──────┘  └──────┘   └────────┘

すべてのBubbleが同じshell-memo-abcを参照
urlだけが異なる（UI表示の種類を決定）
```

## まとめ

### 推奨設計

**パターンB（明示的なshellId保存）** を推奨：

1. **url**: ルーティング/UI表示の種類を決定
2. **contentShellId**: ドメインオブジェクトへの参照
3. 複数のBubble（異なるurl）が同じshellを参照可能
4. Bubble作成時にshellIdを明示的に設定

### 移行パス

1. 既存のBubble作成ロジックを確認
2. contentShellIdフィールドを追加
3. Bubble作成時にshellを作成/取得してshellIdを設定
4. 各BubbleContentRendererでshellを参照
5. 既存のRedux状態からshellへの移行

次のステップ: ShellのFacadeパターン設計
