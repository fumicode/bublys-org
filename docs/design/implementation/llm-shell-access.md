# 設計: LLM による ObjectShell 操作

## 目的

ユーザーと LLM が**同じメンタルモデル**でシステムを操作できるようにする。

```
ユーザー ──► UI ──────────► ObjectShell ──► Domain
LLM ──────► ObjectShell ──► Domain
                ↑
           Permission Layer
           （権限チェック・操作制限）
```

---

## 要件

1. **安全性**: LLM が許可された操作のみ実行できる
2. **透明性**: 何が許可されているか明確
3. **一貫性**: UI 操作と同じドメインロジックを使う
4. **監査可能**: 誰が何をしたか記録できる

---

## 設計案

### 1. Permission Model

```typescript
interface ShellPermission {
  /** 許可されたメソッド名 */
  allowedMethods: string[];

  /** メソッドごとの制約 */
  constraints?: Record<string, MethodConstraint>;

  /** 読み取り専用モード */
  readOnly?: boolean;
}

interface MethodConstraint {
  /** 引数の制約（例: 最大値、許可された値のリスト） */
  parameterConstraints?: Record<string, unknown>;

  /** 呼び出し回数制限 */
  rateLimit?: { count: number; windowMs: number };

  /** ユーザー確認が必要 */
  requiresConfirmation?: boolean;
}
```

### 2. LLMShellProxy

ObjectShell をラップし、権限チェックを行うプロキシ。

```typescript
class LLMShellProxy<T extends DomainEntity> {
  constructor(
    private shell: ObjectShell<T>,
    private permissions: ShellPermission,
    private principal: string // 'llm-assistant', 'user-123' など
  ) {}

  /**
   * メソッドを呼び出す（権限チェック付き）
   */
  invoke(methodName: string, args: unknown[]): InvokeResult<T> {
    // 1. 許可チェック
    if (!this.isAllowed(methodName)) {
      return { ok: false, error: 'method_not_allowed', methodName };
    }

    // 2. 制約チェック
    const constraint = this.permissions.constraints?.[methodName];
    if (constraint && !this.checkConstraints(constraint, args)) {
      return { ok: false, error: 'constraint_violation', methodName, args };
    }

    // 3. 確認が必要な場合
    if (constraint?.requiresConfirmation) {
      return { ok: false, error: 'confirmation_required', methodName, args };
    }

    // 4. 実行
    const method = (this.shell as unknown as Record<string, Function>)[methodName];
    if (typeof method !== 'function') {
      return { ok: false, error: 'method_not_found', methodName };
    }

    const result = method.call(this.shell, ...args);
    return { ok: true, result };
  }

  /**
   * 利用可能なメソッド一覧
   */
  getAvailableMethods(): string[] {
    return this.permissions.allowedMethods;
  }

  /**
   * 現在の状態を読み取る
   */
  getState(): T {
    return this.shell.dangerouslyGetDomainObject();
  }

  private isAllowed(methodName: string): boolean {
    return this.permissions.allowedMethods.includes(methodName);
  }

  private checkConstraints(constraint: MethodConstraint, args: unknown[]): boolean {
    // TODO: 制約チェックの実装
    return true;
  }
}

type InvokeResult<T> =
  | { ok: true; result: T }
  | { ok: false; error: string; methodName: string; args?: unknown[] };
```

### 3. ShellAccessManager

LLM にシェルへのアクセスを提供するマネージャー。

```typescript
class ShellAccessManager {
  constructor(
    private shellManager: ShellManager,
    private defaultPermissions: Record<string, ShellPermission>
  ) {}

  /**
   * LLM 用のシェルプロキシを取得
   */
  getProxy<T extends DomainEntity>(
    shellId: string,
    principal: string
  ): LLMShellProxy<T> | undefined {
    const shell = this.shellManager.get(shellId);
    if (!shell) return undefined;

    const shellType = this.getShellType(shell);
    const permissions = this.defaultPermissions[shellType] ?? { allowedMethods: [] };

    return new LLMShellProxy(shell as ObjectShell<T>, permissions, principal);
  }

  /**
   * 全シェルの一覧を取得（メタ情報のみ）
   */
  listShells(): ShellInfo[] {
    return Array.from(this.shellManager.shells.entries()).map(([id, shell]) => ({
      id,
      type: this.getShellType(shell),
      // 権限によってはここに状態のサマリも
    }));
  }

  private getShellType(shell: ObjectShell<unknown>): string {
    // TODO: 型レジストリから取得
    return 'unknown';
  }
}

interface ShellInfo {
  id: string;
  type: string;
}
```

---

## MCP Tool 統合

Claude Code や他の MCP クライアントから使えるツールとして公開。

```typescript
// MCP Tool 定義
const objectShellTools = {
  // シェル一覧を取得
  list_shells: {
    description: 'List all available object shells',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return shellAccessManager.listShells();
    },
  },

  // シェルの状態を取得
  get_shell_state: {
    description: 'Get the current state of an object shell',
    inputSchema: {
      type: 'object',
      properties: {
        shellId: { type: 'string', description: 'The shell ID' },
      },
      required: ['shellId'],
    },
    handler: async ({ shellId }: { shellId: string }) => {
      const proxy = shellAccessManager.getProxy(shellId, 'mcp-client');
      if (!proxy) return { error: 'shell_not_found' };
      return { state: proxy.getState() };
    },
  },

  // シェルのメソッドを呼び出す
  invoke_shell_method: {
    description: 'Invoke a method on an object shell',
    inputSchema: {
      type: 'object',
      properties: {
        shellId: { type: 'string' },
        method: { type: 'string' },
        args: { type: 'array', items: {} },
      },
      required: ['shellId', 'method'],
    },
    handler: async ({ shellId, method, args = [] }: {
      shellId: string;
      method: string;
      args?: unknown[];
    }) => {
      const proxy = shellAccessManager.getProxy(shellId, 'mcp-client');
      if (!proxy) return { error: 'shell_not_found' };
      return proxy.invoke(method, args);
    },
  },

  // 利用可能なメソッド一覧
  get_available_methods: {
    description: 'Get available methods for a shell',
    inputSchema: {
      type: 'object',
      properties: {
        shellId: { type: 'string' },
      },
      required: ['shellId'],
    },
    handler: async ({ shellId }: { shellId: string }) => {
      const proxy = shellAccessManager.getProxy(shellId, 'mcp-client');
      if (!proxy) return { error: 'shell_not_found' };
      return { methods: proxy.getAvailableMethods() };
    },
  },
};
```

---

## 使用例

### Counter の権限設定

```typescript
const counterPermissions: ShellPermission = {
  allowedMethods: ['countUp', 'countDown', 'reset'],
  constraints: {
    countUp: {
      rateLimit: { count: 100, windowMs: 60000 }, // 1分間に100回まで
    },
    reset: {
      requiresConfirmation: true, // リセットは確認が必要
    },
  },
};
```

### LLM からの操作

```
User: カウンターを5増やして
LLM:
  1. list_shells() → [{ id: 'counter-001', type: 'counter' }]
  2. get_available_methods('counter-001') → ['countUp', 'countDown', 'reset']
  3. for (5回) invoke_shell_method('counter-001', 'countUp', [])
  4. get_shell_state('counter-001') → { value: 5 }
```

---

## 検討事項

### Q1: 権限はどこで定義する？

**選択肢:**
- A) コードにハードコード（型ごとにデフォルト）
- B) 設定ファイル（JSON/YAML）
- C) UI から動的に設定
- D) ドメインオブジェクト自身が宣言

**推奨: A + D のハイブリッド**
- デフォルト権限はコードで定義
- ドメインオブジェクトが `getAllowedMethods()` を実装可能

### Q2: 確認フローはどう実装する？

**選択肢:**
- A) MCP の confirmation 機能を使う
- B) 独自の確認キューを実装
- C) Bubble UI にダイアログを表示

### Q3: 監査ログはどこに記録する？

**選択肢:**
- A) ShellHistory に記録（既存の仕組み）
- B) 別の監査ログストア
- C) WorldLine の履歴として記録

**推奨: A（ShellHistory）**
- 既に `userId` と `description` を記録できる
- LLM の操作も同じ形式で記録

---

## 実装順序

1. [ ] `LLMShellProxy` クラスを実装
2. [ ] `ShellAccessManager` クラスを実装
3. [ ] Counter の権限設定を追加
4. [ ] MCP Tool として公開（オプション）
5. [ ] テストを追加

---

## 次のステップ

- 上記の設計で合意を取る
- 検討事項 Q1〜Q3 について方針を決める
