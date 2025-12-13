# オブジェクトシェル：Facadeパターン設計

## 現状の課題

### 現在の使い方（2行が必要）

```typescript
// ドメインオブジェクトのメソッドを呼ぶ
const newCounter = counterShell.domainObject.countUp();

// Shellを更新
const updatedShell = counterShell.updateDomainObject(
  newCounter,
  'counter/increment',
  undefined,
  'user-001',
  'カウントアップ'
);

// ShellManagerに保存
setShell(shellId, updatedShell);
```

### 理想的な使い方（1行で完結）

```typescript
// Shellがドメインオブジェクトのfacadeとして機能
await counterShell.countUp();
// ↑ 内部で自動的に：
// 1. domainObject.countUp()を実行
// 2. updateDomainObject()を実行
// 3. ShellManagerへの保存（オプション）
```

## 設計目標

1. **透過性**: ShellがドメインオブジェクトのAPIを完全に公開
2. **型安全性**: TypeScriptの型推論が効く
3. **履歴の自動記録**: すべての操作がShellHistoryに記録される
4. **不変性の維持**: 既存のイミュータブルな設計を保つ
5. **柔軟性**: 同期・非同期どちらも対応

## アプローチの比較

### アプローチ1: 手動メソッド実装

```typescript
class CounterShell extends ObjectShell<Counter> {
  countUp(): CounterShell {
    const newCounter = this.domainObject.countUp();
    return this.updateDomainObject(
      newCounter,
      'counter/increment',
      undefined,
      'system',
      'カウントアップ'
    ) as CounterShell;
  }

  countDown(): CounterShell {
    const newCounter = this.domainObject.countDown();
    return this.updateDomainObject(
      newCounter,
      'counter/decrement',
      undefined,
      'system',
      'カウントダウン'
    ) as CounterShell;
  }
}
```

**メリット**:
- ✅ 型安全性が完全
- ✅ IDE補完が効く
- ✅ カスタムロジックを追加しやすい

**デメリット**:
- ❌ ボイラープレートが多い
- ❌ ドメインオブジェクトごとにShellサブクラスが必要
- ❌ メンテナンスコストが高い

---

### アプローチ2: Proxyパターン

```typescript
function createShellProxy<T>(shell: ObjectShell<T>): ObjectShell<T> & T {
  return new Proxy(shell, {
    get(target, prop, receiver) {
      // Shellのプロパティ/メソッドを優先
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      // domainObjectのメソッドをラップ
      const domainValue = Reflect.get(target.domainObject, prop);

      if (typeof domainValue === 'function') {
        return (...args: any[]) => {
          const result = domainValue.apply(target.domainObject, args);

          // 新しいドメインオブジェクトが返されたらShellを更新
          if (result && typeof result === 'object') {
            return target.updateDomainObject(
              result,
              `${String(prop)}`,
              { args },
              'system'
            );
          }

          return result;
        };
      }

      return domainValue;
    }
  }) as ObjectShell<T> & T;
}
```

**メリット**:
- ✅ ボイラープレート不要
- ✅ すべてのドメインオブジェクトで使える
- ✅ 動的にメソッドを転送

**デメリット**:
- ❌ 型推論が複雑（`ObjectShell<T> & T`）
- ❌ TypeScriptの型安全性が弱い
- ❌ ランタイムオーバーヘッド

---

### アプローチ3: ビルダーパターン（推奨）

```typescript
class ObjectShell<T> {
  // 既存のメソッド...

  /**
   * ドメインオブジェクトのメソッドを実行してShellを更新
   */
  execute<R>(
    operation: (domain: T) => R,
    actionType: string,
    userId?: string,
    description?: string
  ): R extends T ? ObjectShell<T> : R {
    const result = operation(this.domainObject);

    // 結果が新しいドメインオブジェクトなら自動更新
    if (this.isDomainObject(result)) {
      return this.updateDomainObject(
        result as T,
        actionType,
        undefined,
        userId,
        description
      ) as any;
    }

    // それ以外はそのまま返す
    return result as any;
  }

  private isDomainObject(value: any): boolean {
    // ドメインオブジェクトかどうかを判定
    // 実装は型によって異なる
    return value?.constructor === this.domainObject.constructor;
  }
}

// 使用例
const updatedShell = counterShell.execute(
  counter => counter.countUp(),
  'counter/increment',
  'user-001',
  'カウントアップ'
);
```

**メリット**:
- ✅ 型安全性が高い
- ✅ ボイラープレート少ない
- ✅ すべてのドメインオブジェクトで使える
- ✅ アクション情報を明示的に渡せる

**デメリット**:
- △ まだ1行ではない（でも2行よりは短い）
- △ ラムダ式が必要

---

### アプローチ4: ドメイン特化型Shell（最も実用的）

アプローチ1とアプローチ3を組み合わせる：

```typescript
// ベースクラスにビルダーパターン
class ObjectShell<T> {
  execute<R>(
    operation: (domain: T) => R,
    actionType: string,
    userId?: string,
    description?: string
  ): R extends T ? ObjectShell<T> : R {
    // ... (アプローチ3と同じ)
  }
}

// ドメイン特化型Shellでショートカットメソッド
class CounterShell extends ObjectShell<Counter> {
  countUp(userId?: string): CounterShell {
    return this.execute(
      c => c.countUp(),
      'counter/increment',
      userId,
      'カウントアップ'
    ) as CounterShell;
  }

  countDown(userId?: string): CounterShell {
    return this.execute(
      c => c.countDown(),
      'counter/decrement',
      userId,
      'カウントダウン'
    ) as CounterShell;
  }
}

// 使用例
const updatedShell = counterShell.countUp('user-001');
```

**メリット**:
- ✅ 型安全性が完全
- ✅ 1行で実行可能
- ✅ IDE補完が効く
- ✅ execute()でカスタム操作も可能

**デメリット**:
- △ ドメインごとにShellサブクラスが必要（でもシンプル）

---

## 推奨アプローチ：アプローチ4

**理由**:
1. 型安全性とDX（Developer Experience）のバランスが最良
2. 頻繁に使うメソッドは簡潔に、カスタム操作はexecute()で柔軟に
3. 段階的な移行が可能（まずexecute()を実装、後で特化型Shellを追加）

## 実装計画

### Phase 1: ObjectShell.execute()を実装

```typescript
// apps/bublys-os/app/object-shell/domain/ObjectShell.ts

export class ObjectShell<T> {
  // 既存のメソッド...

  /**
   * ドメインオブジェクトのメソッドを実行してShellを更新
   *
   * @param operation - ドメインオブジェクトに対する操作
   * @param actionType - アクションタイプ（例: 'counter/increment'）
   * @param userId - 実行ユーザーID
   * @param description - 操作の説明
   * @returns 新しいドメインオブジェクトならShell、それ以外はそのまま
   */
  execute<R>(
    operation: (domain: T) => R,
    actionType: string,
    userId?: string,
    description?: string
  ): R extends T ? ObjectShell<T> : R {
    const result = operation(this.domainObject);

    // 結果が新しいドメインオブジェクトなら自動更新
    if (this.isDomainObject(result)) {
      return this.updateDomainObject(
        result as T,
        actionType,
        undefined,
        userId,
        description
      ) as any;
    }

    // プリミティブや他の値はそのまま返す
    return result as any;
  }

  private isDomainObject(value: any): boolean {
    // 同じコンストラクタを持つオブジェクトかチェック
    return (
      value !== null &&
      typeof value === 'object' &&
      value.constructor === this.domainObject.constructor
    );
  }
}
```

### Phase 2: CounterShellを実装

```typescript
// apps/bublys-os/app/object-shell/domain/CounterShell.ts

import { ObjectShell } from './ObjectShell';
import { Counter } from '../../world-line/Counter/domain/Counter';

export class CounterShell extends ObjectShell<Counter> {
  countUp(userId?: string): CounterShell {
    return this.execute(
      c => c.countUp(),
      'counter/increment',
      userId,
      'カウントアップ'
    ) as CounterShell;
  }

  countDown(userId?: string): CounterShell {
    return this.execute(
      c => c.countDown(),
      'counter/decrement',
      userId,
      'カウントダウン'
    ) as CounterShell;
  }

  reset(userId?: string): CounterShell {
    return this.execute(
      c => new Counter(0),
      'counter/reset',
      userId,
      'リセット'
    ) as CounterShell;
  }

  // 値取得（Shellを返さない）
  get value(): number {
    return this.domainObject.value;
  }
}
```

### Phase 3: wrap関数を拡張

```typescript
// apps/bublys-os/app/object-shell/domain/index.ts

import { CounterShell } from './CounterShell';
import { Counter } from '../../world-line/Counter/domain/Counter';

// オーバーロードで型推論を改善
export function wrap(id: string, domain: Counter, userId: string): CounterShell;
export function wrap<T>(id: string, domain: T, userId: string): ObjectShell<T>;
export function wrap<T>(id: string, domain: T, userId: string): ObjectShell<T> {
  const metadata = createInitialMetadata(userId);
  const historyNode = createInitialHistory('init', userId, 'オブジェクトシェル作成');

  // Counterの場合はCounterShellを返す
  if (domain instanceof Counter) {
    return new CounterShell(id, domain, metadata, historyNode, { references: [], referencedBy: [] });
  }

  // それ以外は通常のObjectShell
  return new ObjectShell(id, domain, metadata, historyNode, { references: [], referencedBy: [] });
}
```

## 使用例

### Before（2行）

```typescript
const newCounter = counterShell.domainObject.countUp();
const updatedShell = counterShell.updateDomainObject(newCounter, 'counter/increment', undefined, 'user-001');
setShell(shellId, updatedShell);
```

### After（execute使用）

```typescript
const updatedShell = counterShell.execute(
  c => c.countUp(),
  'counter/increment',
  'user-001'
);
setShell(shellId, updatedShell);
```

### After（CounterShell使用）

```typescript
const updatedShell = counterShell.countUp('user-001');
setShell(shellId, updatedShell);
```

### ShellManagerとの統合

```typescript
function CounterComponent({ shellId }: { shellId: string }) {
  const shell = useShell<Counter>(shellId);
  const updateShell = useShellUpdater<Counter>(shellId);

  if (!shell) return <div>Loading...</div>;

  const handleIncrement = () => {
    updateShell(current => (current as CounterShell).countUp('user-001'));
  };

  return (
    <div>
      <h2>Counter: {shell.domainObject.value}</h2>
      <button onClick={handleIncrement}>+</button>
    </div>
  );
}
```

## 次のステップ

1. `ObjectShell.execute()` を実装
2. `CounterShell` を実装
3. `wrap()` 関数を拡張
4. デモページで動作確認
5. 他のドメインオブジェクト（Memo等）にも展開
