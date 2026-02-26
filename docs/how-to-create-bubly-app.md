# Bublyアプリの作り方

このドキュメントでは、bublys-orgモノレポ内でバブルUIウィンドウレイアウトを使用した新しいアプリ（Bublyアプリ）を作成する手順を説明します。

既存の実装（tailor-genie等）を参考モデルとしています。

---

## 目次

1. [全体像](#1-全体像)
2. [ディレクトリ構成を作る](#2-ディレクトリ構成を作る)
3. [Step 1: Model パッケージ（ドメイン層）](#3-step-1-model-パッケージドメイン層)
4. [Step 2: Libs パッケージ（UI + Feature層）](#4-step-2-libs-パッケージui--feature層)
5. [Step 3: App パッケージ（Next.jsアプリ）](#5-step-3-app-パッケージnextjsアプリ)
6. [Step 4: モノレポへの登録](#6-step-4-モノレポへの登録)
7. [Step 5: 起動と確認](#7-step-5-起動と確認)
8. [Step 6: Bublyバンドルとしてビルド（任意）](#8-step-6-bublyバンドルとしてビルド任意)
9. [チェックリスト](#9-チェックリスト)

---

## 1. 全体像

Bublyアプリは **3パッケージ構成** で、DDD（ドメイン駆動設計）の3層に対応します。

```
my-app-bubly/                ← ルートディレクトリ
├── my-app-model/            ← ドメイン層（純粋なTypeScript）
├── my-app-libs/             ← UI層 + Feature層（Reactコンポーネント）
└── my-app-app/              ← Next.jsアプリ（エントリポイント）
```

**依存の向き:**

```
my-app-model   （依存なし — 純粋TS）
      ↑
my-app-libs    （model + bublys共通ライブラリに依存）
      ↑
my-app-app     （libs + model + Next.js に依存）
```

**動作モード:**

| モード | 説明 |
|---|---|
| スタンドアロン | `npx nx dev my-app-app` で独立したNext.jsアプリとして動作 |
| 埋め込み | `build:bubly` でIIFEバンドルを生成し、bublys-osから動的にロード |

---

## 2. ディレクトリ構成を作る

以下の手順で、すべてのディレクトリとファイルを作成します。

> **注意:** 以下の例では `my-app` を新しいアプリの名前として使用します。実際のアプリ名に置き換えてください。

最終的なファイル構成:

```
my-app-bubly/
├── my-app-model/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.lib.json
│   ├── .swcrc
│   └── src/
│       ├── index.ts
│       └── lib/
│           └── MyModel.ts          ← ドメインモデル
│
├── my-app-libs/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.lib.json
│   └── src/
│       ├── index.ts
│       └── lib/
│           ├── view/
│           │   └── MyModelView.tsx  ← プレゼンテーショナルUI
│           ├── feature/
│           │   ├── MyAppProvider.tsx ← Context + ドメインレジストリ
│           │   └── ListFeature.tsx  ← オーケストレーション
│           └── registration/
│               └── bubbleRoutes.tsx ← バブルルート定義
│
└── my-app-app/
    ├── package.json
    ├── next.config.js
    ├── tsconfig.json
    ├── vite.config.bubly.ts         ← IIFEビルド設定
    └── src/
        ├── bubly.ts                  ← Bubly登録エントリ
        └── app/
            ├── layout.tsx
            ├── page.tsx              ← メインページ
            ├── registry.tsx          ← styled-components SSR
            └── global.css
```

---

## 3. Step 1: Model パッケージ（ドメイン層）

ドメインモデルを定義するパッケージです。**ReactやReduxに一切依存しない**、純粋なTypeScriptで書きます。

### 3.1 package.json

```json
{
  "name": "@bublys-org/my-app-model",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "@bublys-org/source": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "nx": {
    "sourceRoot": "my-app-bubly/my-app-model/src",
    "targets": {
      "build": {
        "executor": "@nx/js:swc",
        "outputs": ["{options.outputPath}"],
        "options": {
          "outputPath": "my-app-bubly/my-app-model/dist",
          "main": "my-app-bubly/my-app-model/src/index.ts",
          "tsConfig": "my-app-bubly/my-app-model/tsconfig.lib.json",
          "skipTypeCheck": true,
          "stripLeadingPaths": true
        }
      }
    }
  },
  "dependencies": {
    "@swc/helpers": "~0.5.11"
  }
}
```

### 3.2 tsconfig.lib.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.lib.tsbuildinfo",
    "emitDeclarationOnly": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "references": [],
  "exclude": [
    "jest.config.ts",
    "jest.config.cts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts"
  ]
}
```

### 3.3 .swcrc

```json
{
  "jsc": {
    "target": "es2017",
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "decoratorMetadata": true,
      "legacyDecorator": true
    },
    "keepClassNames": true,
    "externalHelpers": true,
    "loose": true
  },
  "module": {
    "type": "es6"
  },
  "sourceMaps": true,
  "exclude": [
    "jest.config.[ct]s",
    ".*\\.spec.tsx?$",
    ".*\\.test.tsx?$",
    "./src/jest-setup.ts$",
    "./**/jest-setup.ts$",
    ".*.js$"
  ]
}
```

### 3.4 ドメインモデルを書く

**ルール: 不変性（immutability）を守る。`state`オブジェクトを介して状態を管理し、更新時は新しいインスタンスを返す。**

`src/lib/MyModel.ts`:

```typescript
export type MyModelState = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

export class MyModel {
  constructor(readonly state: MyModelState) {}

  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get description(): string { return this.state.description; }

  // 不変更新 — 常に新しいインスタンスを返す
  rename(name: string): MyModel {
    return new MyModel({ ...this.state, name });
  }

  // シリアライズ（Redux / WorldLineGraph 用）
  toJSON(): MyModelState {
    return this.state;
  }

  static fromJSON(json: MyModelState): MyModel {
    return new MyModel(json);
  }
}
```

`src/index.ts`:

```typescript
export { MyModel } from "./lib/MyModel.js";
export type { MyModelState } from "./lib/MyModel.js";
```

---

## 4. Step 2: Libs パッケージ（UI + Feature層）

Reactコンポーネント、Provider、バブルルートを定義するパッケージです。

### 4.1 package.json

```json
{
  "name": "@bublys-org/my-app-libs",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "@bublys-org/source": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {
    "tslib": "^2.3.0",
    "@bublys-org/my-app-model": "*",
    "@bublys-org/bubbles-ui": "*",
    "@bublys-org/state-management": "*",
    "@bublys-org/world-line-graph": "*",
    "@bublys-org/domain-registry": "*"
  },
  "nx": {
    "targets": {
      "dev": { "continuous": true }
    }
  }
}
```

### 4.2 tsconfig.lib.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "lib": ["es2022", "dom", "dom.iterable"],
    "types": [
      "node",
      "@nx/react/typings/cssmodule.d.ts",
      "@nx/react/typings/image.d.ts",
      "vite/client"
    ],
    "rootDir": "src",
    "jsx": "react-jsx",
    "tsBuildInfoFile": "dist/tsconfig.lib.tsbuildinfo"
  },
  "exclude": [
    "out-tsc", "dist",
    "**/*.spec.ts", "**/*.test.ts",
    "**/*.spec.tsx", "**/*.test.tsx",
    "jest.config.ts", "jest.config.cts",
    "eslint.config.js", "eslint.config.cjs", "eslint.config.mjs"
  ],
  "include": ["src/**/*.js", "src/**/*.jsx", "src/**/*.ts", "src/**/*.tsx"],
  "references": [
    { "path": "../../bublys-libs/domain-registry/tsconfig.lib.json" },
    { "path": "../../bublys-libs/world-line-graph/tsconfig.lib.json" },
    { "path": "../my-app-model/tsconfig.lib.json" }
  ]
}
```

### 4.3 Provider（Feature層の核）

`src/lib/feature/MyAppProvider.tsx`:

```typescript
"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import {
  useCasScope,
  ObjectShell,
  createScope as createScopeAction,
  deleteScope as deleteScopeAction,
} from "@bublys-org/world-line-graph";
import { DomainRegistryProvider, defineDomainObjects } from "@bublys-org/domain-registry";
import { useAppDispatch } from "@bublys-org/state-management";
import { MyModel, type MyModelState } from "@bublys-org/my-app-model";

// ── ドメインオブジェクト登録（シリアライズ設定を1箇所で定義） ──

const MY_APP_DOMAIN_OBJECTS = defineDomainObjects({
  "my-model": {
    class: MyModel,
    fromJSON: (json) => MyModel.fromJSON(json as MyModelState),
    toJSON: (obj: MyModel) => obj.toJSON(),
    getId: (obj: MyModel) => obj.id,
  },
});

// ── Context ──

interface MyAppContextValue {
  modelShells: ObjectShell<MyModel>[];
  addModel: (model: MyModel) => void;
  removeModel: (id: string) => void;
}

const MyAppContext = createContext<MyAppContextValue | null>(null);

// ── Inner Provider（DomainRegistryProvider の内側で動作） ──

function MyAppInner({ children }: { children: React.ReactNode }) {
  const scope = useCasScope("my-app");
  const modelShells = scope.shells<MyModel>("my-model");

  const addModel = useCallback(
    (model: MyModel) => scope.addObject(model),
    [scope]
  );

  const removeModel = useCallback(
    (id: string) => scope.removeObject("my-model", id),
    [scope]
  );

  const value = useMemo<MyAppContextValue>(
    () => ({ modelShells, addModel, removeModel }),
    [modelShells, addModel, removeModel]
  );

  return (
    <MyAppContext.Provider value={value}>
      {children}
    </MyAppContext.Provider>
  );
}

// ── Provider（公開） ──

export function MyAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <DomainRegistryProvider registry={MY_APP_DOMAIN_OBJECTS}>
      <MyAppInner>{children}</MyAppInner>
    </DomainRegistryProvider>
  );
}

// ── Hook（公開API） ──

export function useMyApp(): MyAppContextValue {
  const context = useContext(MyAppContext);
  if (!context) {
    throw new Error("useMyApp must be used within a MyAppProvider");
  }
  return context;
}
```

### 4.4 View（UI層 — プレゼンテーショナル）

`src/lib/view/MyModelView.tsx`:

```typescript
"use client";

import { MyModel } from "@bublys-org/my-app-model";

export interface MyModelViewProps {
  model: MyModel;
  onSelect?: (id: string) => void;
}

export function MyModelView({ model, onSelect }: MyModelViewProps) {
  return (
    <div onClick={() => onSelect?.(model.id)}>
      <h4>{model.name}</h4>
      <p>{model.description}</p>
    </div>
  );
}
```

### 4.5 Feature（オーケストレーション — UIとドメインの橋渡し）

`src/lib/feature/ListFeature.tsx`:

```typescript
"use client";

import { useContext } from "react";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useMyApp } from "./MyAppProvider.js";
import { MyModelView } from "../view/MyModelView.js";

export function ListFeature() {
  const { openBubble } = useContext(BubblesContext);
  const { modelShells } = useMyApp();

  const handleSelect = (id: string) => {
    openBubble(`my-app/items/${id}`, "root");
  };

  return (
    <div>
      <h2>アイテム一覧</h2>
      {modelShells.map((shell) => (
        <MyModelView
          key={shell.id}
          model={shell.object}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
```

### 4.6 バブルルート登録

`src/lib/registration/bubbleRoutes.tsx`:

```typescript
"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { MyAppProvider } from "../feature/MyAppProvider.js";
import { ListFeature } from "../feature/ListFeature.js";

export const myAppBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "my-app/list",              // URLパターン
    type: "my-app-list",                 // バブルの種別名
    Component: () => (
      <MyAppProvider>
        <ListFeature />
      </MyAppProvider>
    ),
  },
  {
    pattern: "my-app/items/:itemId",     // :itemId はパラメータ
    type: "my-app-detail",
    Component: ({ bubble }) => (
      <MyAppProvider>
        {/* bubble.params.itemId でパラメータにアクセス */}
        <div>Detail: {bubble.params.itemId}</div>
      </MyAppProvider>
    ),
  },
];

// importされた時点で自動登録
BubbleRouteRegistry.registerRoutes(myAppBubbleRoutes);
```

### 4.7 index.ts（エクスポート）

`src/index.ts`:

```typescript
// バブルルート（importすると自動登録される）
import "./lib/registration/bubbleRoutes.js";
export { myAppBubbleRoutes } from "./lib/registration/bubbleRoutes.js";

// View
export { MyModelView } from "./lib/view/MyModelView.js";
export type { MyModelViewProps } from "./lib/view/MyModelView.js";

// Feature
export { ListFeature } from "./lib/feature/ListFeature.js";

// Provider
export { MyAppProvider, useMyApp } from "./lib/feature/MyAppProvider.js";
```

---

## 5. Step 3: App パッケージ（Next.jsアプリ）

スタンドアロンで動作するNext.jsアプリのエントリポイントです。

### 5.1 package.json

```json
{
  "name": "@bublys-org/my-app-app",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build:bubly": "vite build -c vite.config.bubly.ts"
  },
  "dependencies": {
    "@bublys-org/bubbles-ui": "*",
    "@bublys-org/state-management": "*",
    "@bublys-org/my-app-libs": "*",
    "@bublys-org/my-app-model": "*",
    "@bublys-org/world-line-graph": "*",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@mui/icons-material": "^7.0.0",
    "@mui/material": "^7.0.0",
    "next": "~16.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "nx": {
    "targets": {
      "build:bubly": {
        "dependsOn": ["^build"]
      },
      "dev": {
        "dependsOn": ["^dev"],
        "continuous": true,
        "options": {
          "command": "next dev --port 4005"
        }
      },
      "start": {
        "options": {
          "command": "next start --port 4005"
        }
      }
    }
  }
}
```

> **ポート番号**: 既存アプリと被らないように選ぶ（tailor-genie: 4003, sekaisen-igo: 4004 等）

### 5.2 next.config.js

```javascript
//@ts-check
const { composePlugins, withNx } = require('@nx/next');

/** @type {import('@nx/next/plugins/with-nx').WithNxOptions} */
const nextConfig = {
  nx: {},
  compiler: {
    styledComponents: true,
  },
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);
```

### 5.3 メインページ（page.tsx）

`src/app/page.tsx`:

```typescript
"use client";

import ListIcon from "@mui/icons-material/List";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "@mui/material";
import {
  BublyApp,
  BublyStoreProvider,
  BublyMenuItem,
} from "@bublys-org/bubbles-ui";
import { initWorldLineGraph } from "@bublys-org/world-line-graph";
import { MyAppProvider } from "@bublys-org/my-app-libs";

// worldLineGraph slice を注入
initWorldLineGraph();

const menuItems: BublyMenuItem[] = [
  {
    label: "一覧",
    url: "my-app/list",
    icon: <ListIcon />,
  },
];

const handleClearLocalStorage = () => {
  if (window.confirm("ローカルストレージをクリアしますか？")) {
    localStorage.clear();
    window.location.reload();
  }
};

const sidebarFooter = (
  <Button
    variant="outlined"
    size="small"
    startIcon={<DeleteIcon />}
    onClick={handleClearLocalStorage}
    sx={{
      color: "rgba(255,255,255,0.6)",
      borderColor: "rgba(255,255,255,0.3)",
      fontSize: 12,
      width: "100%",
      "&:hover": {
        borderColor: "rgba(255,255,255,0.5)",
        backgroundColor: "rgba(255,255,255,0.1)",
      },
    }}
  >
    キャッシュクリア
  </Button>
);

function MyApp() {
  return (
    <BublyApp
      title="My App"
      subtitle="アプリの説明"
      menuItems={menuItems}
      sidebarFooter={sidebarFooter}
    />
  );
}

export default function Index() {
  return (
    <BublyStoreProvider
      persistKey="my-app"                       // localStorage のキー（アプリ固有）
      initialBubbleUrls={["my-app/list"]}       // 初期表示するバブルのURL
    >
      <MyAppProvider>
        <MyApp />
      </MyAppProvider>
    </BublyStoreProvider>
  );
}
```

**キーポイント:**
- `BublyStoreProvider` が分離されたReduxストアとPersistGateを提供
- `persistKey` はアプリごとにユニークにする（localStorageの衝突を防ぐ）
- `initialBubbleUrls` で初回起動時に開くバブルを指定
- `BublyApp` がサイドバー + バブル描画エリアのレイアウトを担当

### 5.4 layout.tsx

`src/app/layout.tsx`:

```typescript
import "./global.css";
import { StyledComponentsRegistry } from "./registry";

export const metadata = {
  title: "My App",
  description: "アプリの説明",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
```

### 5.5 registry.tsx（styled-components SSR対応）

`src/app/registry.tsx`:

```typescript
'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    (styledComponentsStyleSheet.instance as any).clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManager>
  );
}
```

### 5.6 global.css

`tailor-genie-app/src/app/global.css` をそのままコピーするか、必要に応じて最小限のリセットCSSを配置します。

### 5.7 bubly.ts（埋め込み用エントリポイント）

`src/bubly.ts`:

```typescript
/**
 * Bubly Entry Point for my-app
 *
 * IIFEバンドルとしてビルドされ、
 * bublys-osから動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import ListIcon from "@mui/icons-material/List";

// Bubble Routes（libsからimportすると自動登録もされる）
import { myAppBubbleRoutes } from "@bublys-org/my-app-libs";

const MyAppBubly: Bubly = {
  name: "my-app",
  version: "0.0.1",

  menuItems: [
    {
      label: "一覧",
      url: "my-app/list",
      icon: React.createElement(ListIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(myAppBubbleRoutes);
  },

  unregister() {
    // クリーンアップ（必要に応じて）
  },
};

registerBubly(MyAppBubly);

export default MyAppBubly;
```

### 5.8 vite.config.bubly.ts（IIFEビルド設定）

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },

  build: {
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/bubly.ts"),
      name: "MyAppBubly",              // グローバル変数名
      fileName: () => "bubly.js",
      formats: ["iife"],
    },
    rollupOptions: {
      external: (id) => {
        // 自分のパッケージはバンドルに含める
        if (
          id === "@bublys-org/my-app-libs" ||
          id.startsWith("@bublys-org/my-app-libs/") ||
          id === "@bublys-org/my-app-model" ||
          id.startsWith("@bublys-org/my-app-model/")
        ) {
          return false;
        }
        // JSX runtimeはバンドルに含める
        if (id === "react/jsx-runtime" || id === "react/jsx-dev-runtime") {
          return false;
        }
        // 共有依存は外部化（ホストアプリから提供）
        if (
          id === "react" || id === "react-dom" ||
          id.startsWith("react/") || id.startsWith("react-dom/") ||
          id === "@reduxjs/toolkit" || id.startsWith("@reduxjs/toolkit/") ||
          id === "react-redux" || id === "styled-components" ||
          id.startsWith("@bublys-org/") ||
          id.startsWith("@mui/") || id.startsWith("@emotion/")
        ) {
          return true;
        }
        return false;
      },
      output: {
        globals: (id) => {
          if (id === "react" || id.startsWith("react/")) return "React";
          if (id === "react-dom" || id.startsWith("react-dom/")) return "ReactDOM";
          if (id === "styled-components") return "styled";
          if (id === "@reduxjs/toolkit" || id.startsWith("@reduxjs/toolkit/"))
            return "window.__BUBLYS_SHARED__.Redux";
          if (id === "react-redux") return "window.__BUBLYS_SHARED__.ReactRedux";
          if (id === "@bublys-org/state-management")
            return "window.__BUBLYS_SHARED__.StateManagement";
          if (id === "@bublys-org/bubbles-ui" || id.startsWith("@bublys-org/bubbles-ui/"))
            return "window.__BUBLYS_SHARED__.BubblesUI";
          if (id === "@bublys-org/world-line-graph" || id.startsWith("@bublys-org/world-line-graph/"))
            return "window.__BUBLYS_SHARED__.WorldLineGraph";
          if (id === "@bublys-org/domain-registry" || id.startsWith("@bublys-org/domain-registry/"))
            return "window.__BUBLYS_SHARED__.DomainRegistry";
          if (id.startsWith("@mui/material")) return "window.__BUBLYS_SHARED__.MuiMaterial";
          if (id.startsWith("@mui/icons-material/")) {
            const iconName = id.replace("@mui/icons-material/", "");
            return `window.__BUBLYS_SHARED__.MuiIcons.${iconName}`;
          }
          if (id === "@mui/icons-material") return "window.__BUBLYS_SHARED__.MuiIcons";
          if (id.startsWith("@mui/")) return "window.__BUBLYS_SHARED__.Mui";
          if (id.startsWith("@emotion/")) return "window.__BUBLYS_SHARED__.Emotion";
          if (id.startsWith("@bublys-org/")) {
            console.warn(`[vite] Unknown @bublys-org package: ${id}`);
            return `window.__BUBLYS_SHARED__["${id}"]`;
          }
          return id;
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
```

---

## 6. Step 4: モノレポへの登録

### 6.1 ルートの tsconfig.json に参照を追加

`tsconfig.json` の `references` 配列に3パッケージを追加:

```json
{
  "references": [
    // ... 既存の参照 ...
    { "path": "./my-app-bubly/my-app-model" },
    { "path": "./my-app-bubly/my-app-libs" },
    { "path": "./my-app-bubly/my-app-app" }
  ]
}
```

### 6.2 npm install を実行

```bash
npm install
```

ワークスペースのシンボリックリンクが自動的に解決されます。

---

## 7. Step 5: 起動と確認

```bash
# 開発サーバーを起動（依存ライブラリも自動ビルド）
npx nx dev my-app-app
```

ブラウザで `http://localhost:4005` を開き、サイドバー付きのバブルUIレイアウトが表示されることを確認します。

---

## 8. Step 6: Bublyバンドルとしてビルド（任意）

bublys-osから動的にロードする場合に使います。

```bash
# IIFEバンドルを生成
npx nx build:bubly my-app-app
# → my-app-app/public/bubly.js が出力される
```

bublys-os側では以下のように読み込みます:

```typescript
// bublys-os内のbubbleRoutes設定で
await loadBublyFromOrigin("http://localhost:4005");
```

---

## 9. チェックリスト

新しいBublyアプリを作成する際の確認項目:

### パッケージ構成
- [ ] `my-app-model/` — 純粋TSのドメインモデル（React/Redux依存なし）
- [ ] `my-app-libs/` — view / feature / registration の3ディレクトリ
- [ ] `my-app-app/` — Next.jsエントリポイント

### ドメイン層（model）
- [ ] ドメインクラスが `readonly state` でイミュータブル
- [ ] 更新メソッドが新しいインスタンスを返す
- [ ] `toJSON()` / `fromJSON()` を実装

### UI + Feature層（libs）
- [ ] `defineDomainObjects()` でドメインオブジェクトを登録
- [ ] Provider が `DomainRegistryProvider` でラップされている
- [ ] バブルルートが `BubbleRouteRegistry.registerRoutes()` で登録される
- [ ] View はプレゼンテーショナル（ドメインモデルのみに依存）
- [ ] Feature は Context フックを通じてドメインにアクセス

### アプリ層（app）
- [ ] `BublyStoreProvider` にユニークな `persistKey` を設定
- [ ] `initWorldLineGraph()` を呼び出し
- [ ] `BublyApp` に `title`, `menuItems` を渡している
- [ ] ポート番号が他アプリと被っていない

### モノレポ統合
- [ ] ルート `tsconfig.json` に3パッケージの参照を追加
- [ ] `npm install` 実行済み
- [ ] `npx nx dev my-app-app` で起動確認

### Bublyバンドル（埋め込み用、任意）
- [ ] `bubly.ts` で `registerBubly()` を呼んでいる
- [ ] `vite.config.bubly.ts` で自パッケージのみバンドル、共有依存は外部化
- [ ] `npx nx build:bubly my-app-app` でビルド成功
