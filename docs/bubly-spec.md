# バブリ仕様（軽量版）

バブリ = 「1 universe バブル ＝ 独立した世界線を持つアプリ境界」。

bublys-os に動的ロードされると、自動で `<name>-bubly` の universe バブルルートが登録され、サイドバーに自分のアイコンが追加され、クリックでその universe を窓として開く。

---

## ファイル構成

```
<my-bubly>-bubly/
  <my-bubly>-app/
    src/
      bubly.ts        ← バブリエントリ。動的ロード用バンドルのソース
      app/app.tsx     ← スタンドアロン実行時のエントリ（vite dev / preview）
    vite.config.bubly.ts  ← bubly.js を作る IIFE バンドル設定
    vite.config.mts        ← スタンドアロン dev サーバー設定（独自ポート）
    public/bubly.js        ← `build:bubly` の出力。`{origin}/bubly.js` で配信
  <my-bubly>-libs/         ← ドメインモデル / UI / slice / routes
  <my-bubly>-model/        ← 不変ドメインクラス
```

bubly がオリジン `http://localhost:NNNN` で配信されるとき、OS は `{origin}/bubly.js` を `<script src=...>` でロードする。

---

## `bubly.ts` の最小骨格

```ts
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import MyIcon from "@mui/icons-material/Whatever";

import { myBubbleRoutes } from "./registration/index.js";

const MyBubly: Bubly = {
  name: "my-bubly",                       // → universe ルートは `my-bubly-bubly`（既に -bubly で終わっていればそのまま）
  version: "0.0.1",
  label: "私のバブリ",                    // サイドバー表示名（省略時 name）
  icon: React.createElement(MyIcon, { color: "primary" }),  // サイドバーアイコン

  initialBubbleUrls: [                    // universe を開いたとき seed されるバブルの url 群
    "my-bubly/foo",
    "my-bubly/bar",
  ],
  backdropColor: "hsl(200, 35%, 22%)",    // universe バブルの「夜空」色（半透明ガラス）

  // 任意: inner bubble への直接ショートカット（root に直接 pop される）
  menuItems: [
    { label: "foo", url: "my-bubly/foo", icon: React.createElement(MyIcon) },
  ],

  register(ctx) {
    ctx.registerBubbleRoutes(myBubbleRoutes);  // inner bubble ルート群を登録
  },

  unregister() {},
};

registerBubly(MyBubly);
export default MyBubly;
```

---

## OS にロードされたときの自動配線

`loadBublyFromOrigin(origin)` が成功すると、`BublyLoader` が次のことを自動でやる:

1. `bubly.register(ctx)` を呼んで、バブリ提供の inner ルートを `BubbleRouteRegistry` に登録。
2. `<name>-bubly` の universe ルートを `makeBublyRoute(...)` で自動登録:
   - `Component`: lib の `BublyUniverseBubble`（中で `useUniverseArrangementWorldLine` + `UniverseView` を起動）
   - `initialBubbleUrls`: `bubly.initialBubbleUrls`
   - `bubbleOptions.fillsContainer = true` / `defaultSize` / `backdropColor`
3. `getAllMenuItems()` が各バブリにつき **2 種類**のエントリを返す:
   - 先頭: 「universe バブルを開く」エントリ（url = `<name>-bubly`、icon = `bubly.icon`、label = `bubly.label`）
   - 後ろ: `bubly.menuItems`（root に inner を直接出すレガシーショートカット）

サイドバーはこのリストを並べるので、バブリ 1 個ロード = 最低 1 個アイコン追加（+ menuItems があればその分も）。

---

## ポート規約

各バブリ app のスタンドアロン dev サーバーは固有ポートで立てる。`vite.config.mts` の `server.port` / `preview.port` に書く。

現在の割り当て:

| port | bubly |
|------|-------|
| 4000 | bublys-os |
| 4001 | gakkai-shift |
| 4002 | ekikyo |
| 4003 | tailor-genie |
| 4004 | sekaisen-igo |
| 4005 | shift-puzzle |

新規バブリは未使用ポートを割り当て、`BublyApp` の `subtitle` にも書いておくと dev 中の自他識別がしやすい。

---

## 確認手順（新規バブリ）

```bash
# 1. libs を全部リアルタイムコンパイル状態にしておく
npx nx dev @bublys-org/<my-bubly>-app    # スタンドアロンが port NNNN で立つ

# 2. バブリバンドルを作る（{origin}/bubly.js のため）
npx nx build:bubly @bublys-org/<my-bubly>-app

# 3. OS（4000）のサイドバー → 「バブリ」セクションに `http://localhost:NNNN` を入力 → ロード
#    → サイドバーに icon が追加されることを確認
#    → クリックして universe バブルが開き、中に initialBubbleUrls が並ぶことを確認
```

`bubly.ts` を編集したら **必ず `build:bubly` を再実行**して、OS 側はサイドバーから再ロード（古い bubly.js はブラウザに残らない）。

---

## 既知の落とし穴

- **vite ポート衝突**: 別のバブリと同じポートを書くと dev サーバーが立たない or 誤配信になる。
- **`initialBubbleUrls` が未指定**: universe を開いても中身が空。menuItems からショートカットは出るが、窓 = メインフローとしては機能しない。
- **State 永続化のせい古い `bubbleOptions`**: 既に開いている universe バブルは作成時の `bubbleOptions` 持ち。`backdropColor` / `defaultSize` を変えても反映されない → 一度閉じて開き直す。
- **`bubly.js` の再ビルド忘れ**: `bubly.ts` のコード変更は `build:bubly` しないと反映されない。dev サーバーは standalone モード（`app/app.tsx`）を出してるだけで、`bubly.js` はビルド成果物。
