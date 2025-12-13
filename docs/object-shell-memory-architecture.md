# オブジェクトシェル：メモリ管理アーキテクチャ

## 基本方針

**オブジェクトシェルはメモリ上のインスタンスとして管理し、Reduxには参照のみを保存**

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────┐
│ ShellManager (React Context + useState)            │
│ ┌─────────────────────────────────────────────┐   │
│ │ shells: Map<string, ObjectShell<any>>       │   │
│ │                                             │   │
│ │ 'shell-counter-01' → ObjectShell<Counter> {│   │
│ │   history: Node → Node → Node → null       │   │ ← メモリ上のインスタンス
│ │   domainObject: Counter { value: 5 }       │   │
│ │   metadata: { views: [...] }               │   │
│ │ }                                           │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↑
                    ID参照のみ
                        ↓
┌─────────────────────────────────────────────────────┐
│ Redux State (軽量)                                  │
│ ┌─────────────────────────────────────────────┐   │
│ │ bubbles: {                                  │   │
│ │   'bubble-001': {                           │   │
│ │     contentShellId: 'shell-counter-01'      │   │ ← シェルIDだけ
│ │     position: { x: 100, y: 200 }            │   │
│ │   }                                         │   │
│ │ }                                           │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↓
                  必要な時だけ
                        ↓
┌─────────────────────────────────────────────────────┐
│ localStorage (永続化)                                │
│ {                                                   │
│   shells: [                                         │
│     {                                               │
│       id: 'shell-counter-01',                       │
│       domainObject: { value: 5 },                   │
│       history: { nodes: [...] },  ← シリアライズ済み   │
│       metadata: { ... }                             │
│     }                                               │
│   ]                                                 │
│ }                                                   │
└─────────────────────────────────────────────────────┘
```

## 実装

### 1. ShellManager Context

```typescript
// apps/bublys-os/app/object-shell/feature/ShellManager.tsx

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ObjectShell } from '../domain';

interface ShellManagerContextType {
  // シェルの取得
  getShell: <T>(id: string) => ObjectShell<T> | undefined;

  // シェルの追加・更新
  setShell: <T>(id: string, shell: ObjectShell<T>) => void;

  // シェルの削除
  removeShell: (id: string) => void;

  // 全シェルのID一覧
  getAllShellIds: () => string[];

  // 永続化
  saveToStorage: () => void;
  loadFromStorage: () => void;
}

const ShellManagerContext = createContext<ShellManagerContextType | null>(null);

export function ShellManagerProvider({ children }: { children: ReactNode }) {
  // メモリ上のシェルを管理
  const [shells, setShells] = useState<Map<string, ObjectShell<any>>>(new Map());

  const getShell = useCallback(<T,>(id: string): ObjectShell<T> | undefined => {
    return shells.get(id) as ObjectShell<T> | undefined;
  }, [shells]);

  const setShell = useCallback(<T,>(id: string, shell: ObjectShell<T>) => {
    setShells(prev => {
      const newMap = new Map(prev);
      newMap.set(id, shell);
      return newMap;
    });
  }, []);

  const removeShell = useCallback((id: string) => {
    setShells(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const getAllShellIds = useCallback(() => {
    return Array.from(shells.keys());
  }, [shells]);

  // 永続化（必要な時だけ呼ぶ）
  const saveToStorage = useCallback(() => {
    const serialized = Array.from(shells.entries()).map(([id, shell]) => ({
      id,
      data: shell.toJson(
        (obj) => obj.toJson ? obj.toJson() : obj,
        (obj) => obj.toJson ? obj.toJson() : obj
      ),
    }));
    localStorage.setItem('object-shells', JSON.stringify(serialized));
  }, [shells]);

  const loadFromStorage = useCallback(() => {
    const stored = localStorage.getItem('object-shells');
    if (!stored) return;

    const serialized = JSON.parse(stored);
    const newShells = new Map<string, ObjectShell<any>>();

    serialized.forEach(({ id, data }: any) => {
      // ここでデシリアライザを適切に選択する必要がある
      // 実際の実装では、typeフィールドなどで判別
      const shell = ObjectShell.fromJson(
        data,
        (obj) => obj,  // 実際には適切なデシリアライザ
        (obj) => obj
      );
      newShells.set(id, shell);
    });

    setShells(newShells);
  }, []);

  return (
    <ShellManagerContext.Provider
      value={{
        getShell,
        setShell,
        removeShell,
        getAllShellIds,
        saveToStorage,
        loadFromStorage,
      }}
    >
      {children}
    </ShellManagerContext.Provider>
  );
}

export function useShellManager() {
  const context = useContext(ShellManagerContext);
  if (!context) {
    throw new Error('useShellManager must be used within ShellManagerProvider');
  }
  return context;
}

// 特定のシェルを取得するフック
export function useShell<T>(shellId: string | undefined): ObjectShell<T> | undefined {
  const { getShell } = useShellManager();
  return shellId ? getShell<T>(shellId) : undefined;
}
```

### 2. Bubbleとの統合

```typescript
// BubbleContentRenderer.tsx

function BubbleContentRenderer({ bubble }: { bubble: Bubble }) {
  const shell = useShell<Counter>(bubble.contentShellId);
  const { setShell } = useShellManager();

  if (!shell) return <div>Loading...</div>;

  const handleCountUp = () => {
    const newCounter = shell.domainObject.countUp();
    const newShell = shell.updateDomainObject(
      newCounter,
      'counter/increment',
      { bubbleId: bubble.id },
      'user-001',
      'Bubbleからカウントアップ'
    );

    // メモリ上のシェルを直接更新
    setShell(shell.id, newShell);
  };

  return <CounterView counter={shell.domainObject} onIncrement={handleCountUp} />;
}
```

### 3. アプリケーションルート

```typescript
// apps/bublys-os/app/layout.tsx または page.tsx

export default function RootLayout({ children }) {
  return (
    <ShellManagerProvider>
      <ReduxProvider>
        {children}
      </ReduxProvider>
    </ShellManagerProvider>
  );
}
```

### 4. 永続化のタイミング

```typescript
// 手動保存
function SaveButton() {
  const { saveToStorage } = useShellManager();
  return <button onClick={saveToStorage}>保存</button>;
}

// 自動保存（定期的）
function AutoSave() {
  const { saveToStorage } = useShellManager();

  useEffect(() => {
    const interval = setInterval(saveToStorage, 30000); // 30秒ごと
    return () => clearInterval(interval);
  }, [saveToStorage]);

  return null;
}

// ページアンロード時
function AutoSaveOnUnload() {
  const { saveToStorage } = useShellManager();

  useEffect(() => {
    const handler = () => saveToStorage();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveToStorage]);

  return null;
}
```

## データフロー

### Bubble作成時

```typescript
function createBubbleWithCounter() {
  const { setShell } = useShellManager();
  const dispatch = useAppDispatch();

  // 1. ドメインオブジェクトを作成
  const counter = new Counter(0);

  // 2. シェルでラップ（メモリ上）
  const shell = wrap('shell-counter-' + Date.now(), counter, 'user-001');
  setShell(shell.id, shell);

  // 3. Bubbleを作成（ReduxにはIDだけ）
  const bubble = new Bubble({
    name: 'Counter',
    contentShellId: shell.id,
    // ...
  });
  dispatch(addBubble(bubble.toJSON()));

  // 4. シェルにView参照を追加（メモリ上）
  const metadata = addViewReference(shell.metadata, {
    viewId: bubble.id,
    viewType: 'bubble',
    position: bubble.position,
  });
  const updatedShell = shell.updateMetadata({ views: metadata.views });
  setShell(shell.id, updatedShell);
}
```

### ドメイン操作時

```typescript
function handleCountUp(shellId: string) {
  const { getShell, setShell } = useShellManager();

  // メモリから直接取得
  const shell = getShell<Counter>(shellId);
  if (!shell) return;

  // ドメイン操作
  const newCounter = shell.domainObject.countUp();

  // 新しいシェルを作成（不変性）
  const newShell = shell.updateDomainObject(
    newCounter,
    'counter/increment',
    undefined,
    'user-001'
  );

  // メモリ上のシェルを更新
  setShell(shellId, newShell);

  // Reduxには何も送らない（Bubbleの位置などUI状態のみRedux）
}
```

## メリット
1. ✅ **パフォーマンス**：シリアライズ/デシリアライズのオーバーヘッドがない
2. ✅ **シンプル**：メモリ上のインスタンスを直接操作
3. ✅ **柔軟性**：履歴チェーンなどの複雑なデータ構造をそのまま扱える
4. ✅ **Reactと相性が良い**：useStateの再レンダリング機構を活用
5. ✅ **Redux負荷軽減**：UIの位置情報などのみReduxで管理

## 永続化戦略

### オプション1：手動保存
- ユーザーが明示的に「保存」ボタンを押す
- 確実だが、保存し忘れのリスク

### オプション2：自動保存（定期的）
- 30秒〜1分ごとに自動保存
- バランスが良い

### オプション3：操作ごと
- シェルの更新のたびに保存
- 確実だが、パフォーマンスに影響

### オプション4：ページアンロード時
- `beforeunload`イベントで保存
- ブラウザクラッシュには対応できない

### 推奨：オプション2 + オプション4の組み合わせ

## まとめ

**オブジェクトシェルをメモリ管理にすることで：**

- Reduxの複雑さを回避
- パフォーマンス向上
- 設計の本質（メモリ上のドメインモデル）に忠実
- 必要な時だけ永続化

次のステップ：ShellManagerProviderの実装
