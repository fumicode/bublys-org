# 再帰universe — バブルの「空間」も「時間」も入れ子になる

## このドキュメントの目的

このリポジトリの `bubble-ui` には、いま大きく3つのレイヤーが重なっています：

1. **空間入れ子（再帰universe）** — バブルの中に独立した universe を描く
2. **時間入れ子（ネスト世界線）** — 各 universe は自分の世界線(WorldLineGraph)を持つ
3. **統一アドレス** — どの universe も `universe@<node>` で現在ノードを表し、ネストの動きが親バブルの url 経由で再帰的に root へ伝播する

この3つが噛み合うと、**ユーザーから見ると「ブラウザの戻る/進む」が、全 universe を貫いた1本の線形タイムラインになる**。本ドキュメントはその全体像と、各レイヤーの役割・ファイル地図・設計判断を記録する。

世界線の DAG とノード構造そのものについては [world-line-graph-design.md](world-line-graph-design.md) を参照。

---

## ひと言で言うと

> どの universe も「自分の世界線の現在ノード」を `universe@<node>` という url で表す。  
> **root** はそれをブラウザのアドレスバー（`/universe@<node>`）に書く。  
> **ネスト**はそれを「自分を表示している親バブルの url」（`universe@<node>`）に書く。  
> バブルの url は親 view の一部なので、ネストの移動は親世界線（→ root のブラウザ url `/universe@<node>`）に再帰的に伝播する。

root と nest は**完全に同じ形**（`universe@<node>`）で表される。`<name>@<snapshot>` という1つの読みでブラウザ url と バブル url を貫く統一文法になっている（`@` は git の `HEAD@{N}` / docker の `image@digest` 等と同じ「at this snapshot」イデオム）。

これにより、

- ブラウザの URL は root の `/universe@<node>` 1個のまま（ユーザーから見て複雑にならない）
- ネストの状態は親世界線に commit されるので、ブラウザの戻る/進むで**全 universe の編集履歴を一本の線形タイムラインとして**行き来できる
- 同じ仕組みが任意深さで成り立つ（各階層の universe バブルが子の現在地を運ぶ）

---

## レイヤー1：空間入れ子（再帰universe）

### モデル

- **universe** は座標系を持つ「空間」。バブルはこの空間に位置(`position`)を持って配置される
- バブルの中身が universe であってもよい — それが**再帰universe**
- 各 universe は `universeId` で識別される（root の universeId は `"root"`）

### Redux 形

`bubbleState` は `universeId` → `UniverseState` の Map になっている：

```ts
bubbleState = {
  universes: {
    "root":               UniverseState,   // ブラウザ画面全体の universe
    "root/527a8666-...":  UniverseState,   // root にいる universe バブルの中
    "root/527a8666-.../abc123-...": UniverseState,  // さらにその中
    ...
  },
  // ...
}

UniverseState = {
  bubbles: Record<bubbleId, BubbleJson>;
  bubbleRelations: BubbleRelation[];
  process: { layers: bubbleId[][] };
  globalCoordinateSystem: CoordinateSystemData;
  surfaceLeftTop: Point2;
}
```

`universeId` の文字列は `"<parentUniverseId>/<bubbleId>"` の連結で、ツリー上の位置を一意に表す。

### React 形

```
<UniverseView universeId="root">              // = BubblesUI（apps 側）
  <BubblesLayeredView universeId="root">
    ...
    <Bubble id="527a8666...">                  // type="universe" な窓バブル
      <UniverseView universeId="root/527a8666..." />   // ここから再帰
    </Bubble>
    ...
  </BubblesLayeredView>
</UniverseView>
```

`UniverseView` は「1つの universe を描く自己完結コンポーネント」。バブル中身として再帰的に置くことで「バブルの中の universe」が生まれる。

### 窓モデル（fillsContainer / maximized）

universe バブルは「窓」として親 universe の中に置かれる。窓は次のオプションを持つ：

- `fillsContainer: true` — バブルの中身（= ネスト universe）が、窓のサイズ全体を埋める
- `maximized: true` — 窓自身が可視 viewport いっぱいまで広がる

この2つを組み合わせると、「ネスト universe を全画面で開く」表示が成立する。

---

## レイヤー2：時間入れ子（ネスト世界線）

### モデル

各 universe は**独立した世界線**(`WorldLineGraph`)を持つ。これは `world-line-graph` ライブラリの `useCasScope(scopeId)` で生成され、`scopeId = universeId` で1対1対応する。

世界線の中身は、その universe の **arrangement**（= `bubbles + bubbleRelations + process`）。`renderedRect` 等の派生値は除外する（毎フレーム変わるので commit が無限に走ってしまう）。

### commit / rehydrate ループ

各 universe ごとに以下のループが回る：

```
[view 変化]
   ↓ commit effect
WorldLineGraph.grow(stateRef) → 新 apex ノード作成
   ↓ apex 変化
[rehydrate effect]
   ↓ shell.object.toJSON() を replaceBubbleArrangement で Redux に流し込む
[view = apex の中身に追従]
```

無限ループ防止は **`syncedSignatureRef`**：「直近に世界線と合意した view の署名(JSON 文字列)」を持って、commit / rehydrate どちらでも一致したらスキップする。

### root と nest の hook

| 役割 | hook | scope |
|---|---|---|
| 任意 universe の commit/rehydrate **+** （任意）親バブル url との bind | `useUniverseArrangementWorldLine(universeId, link?)` | `universeId` |
| root universe の上記 + ブラウザ url/履歴の追加 bind | `useRootArrangementWorldLine()` | `ROOT_UNIVERSE_ID = "root"` |

**コアは下の汎用 hook 1本**。root 用は単に「`useUniverseArrangementWorldLine(ROOT_UNIVERSE_ID)` を呼んだうえで、その `apexId` と `scope` を使ってブラウザ url/履歴調整を乗せる」薄いラッパー。なので commit/rehydrate ループの実装はリポジトリ全体で 1ヶ所にしか書かれていない。

ネストは `UniverseBubble`（`bubbleRoutes.tsx`）から、自分のルート定義 (`makeSnapshotRoute({ base: "universe", ... })`) に紐付いた SnapshotCodec を `link.snapshot` として汎用 hook に注入する。

---

## レイヤー3：統一アドレス `universe@<node>`

`universe` と `@` は root も nest も同じ形（[`snapshot-url.ts`](../apps/bublys-os/app/bubble-ui/world-line/snapshot-url.ts) に `UNIVERSE_URL_BASE = "universe"` と `AT_PREFIX = "@"` の単一定義あり）。

「`universe`」は名前、「`@<node>`」は「at this snapshot」を表す suffix。git の `HEAD@{N}` / docker の `image@digest` / npm の `pkg@version` と同じイデオム。

### root の場合

ブラウザのアドレスバー：

```
http://.../universe@<rootApexNode>
```

`useRootArrangementWorldLine` が：

- root apex が変わったら `history.pushState("/universe@<新apex>")` でパスを差し替え
- ブラウザの `popstate`（戻る/進む）で URL が変わったら、その node に `moveTo`

ディープリンクと stale URL（過去のセッションのノードIDが残っている場合）にも対応していて、ノードが現グラフに存在しなければ self-heal で URL を現 apex に揃え直す。

Next.js のルートとしては [`app/[[...slug]]/page.tsx`](../apps/bublys-os/app/[[...slug]]/page.tsx)（optional catch-all）が `/` も `/universe@<node>` も同じ SPA で受ける。`/world-line` 等の specific page は Next.js の静的優先で先に当たる。

### ネストの場合

ネスト universe を表示している**親バブルの url**：

```
universe@<nestApexNode>
```

`useUniverseArrangementWorldLine(universeId, link)` の url バインドが：

- **内部ナビ**: nest apex が `syncedNodeRef` から離れたら、`navigateBubble` で親バブルの url を更新
- **外部ナビ**: 親バブルの url の `@<node>` が変わっていて apex と違っていたら、その node に `moveTo`

ここで `navigateBubble` は親 universe に対する dispatch なので、**親 view が変わる → 親世界線が commit → 親の apex 変化** が連鎖する。これが再帰的に root の `/universe@` まで到達する。

### 再帰の絵

```
ネスト universe 内で バブルを開く（view 変化）
   ↓
ネスト世界線 commit（新 apex）
   ↓
url バインド「内部ナビ」: 親バブルの url を universe@<新nest apex> に更新
   ↓
親 universe の view 変化（bubble.url が変わった）
   ↓
親世界線 commit（新 apex）
   ↓
... 再帰 ...
   ↓
root 世界線 commit
   ↓
ブラウザ /universe@<新root apex> に pushState
```

「戻る」を押すと、これと逆向きに rehydrate が伝播する：

```
ブラウザ /universe@<旧root apex> に popstate
   ↓
root 世界線 moveTo → rehydrate（親 view が旧へ）
   ↓
親バブルの url の @<node> が変わる
   ↓
url バインド「外部ナビ」: ネスト世界線 moveTo → rehydrate
   ↓
ネスト universe 内が旧 arrangement に
```

### 駆動方向の判定（綱引き防止）

初期実装では「apex → url」と「url → apex」を別エフェクトで書いていたが、seed/settle 中に綱引きで無限ループになった。現実装は**単一エフェクト**で、`syncedNodeRef` という「最後に合意したノード」から**どちらが先に離れたか**で駆動方向を決める：

- apex が動いた → 内部ナビとして url を追従
- url が動いた（apex とまだ違う）→ 外部ナビとして apex を追従

---

## 全体データフロー

開いている universe バブルの中で `田中太郎` のリンクをクリックしたとき：

```
[ネスト universe 内]
1. dispatch(addBubble),  relateBubbles,  popChildInProcess
2. async listener が calcPositionToOpen で位置を計算 → updateBubble
3. ネスト view 変化 → ネスト世界線 commit（新 nest apex）
4. nest url バインド: navigateBubble で「親バブル(universe@<新nest apex>)」を dispatch

[親 universe（仮に root とする）]
5. root view 変化（universe バブルの url が変わった）
6. root 世界線 commit（新 root apex）
7. root の useRootArrangementWorldLine: history.pushState("/universe@<新root apex>")

[ブラウザ]
   アドレスバーが新しい root apex を指す。
   ブラウザの「戻る」を押せば、popstate でこの逆向きが再帰的に走る。
```

ネストが2段、3段と深くなっても、各階層の url バインドが連鎖するだけで同じ仕組みが成り立つ。

---

## ファイル地図

### アプリ側（`apps/bublys-os/app/`）

| ファイル | 役割 |
|---|---|
| [`[[...slug]]/page.tsx`](../apps/bublys-os/app/[[...slug]]/page.tsx) | Next.js optional catch-all。`/` と `/universe@<node>` を同じ SPA に流す |
| [`bubble-ui/world-line/snapshot-url.ts`](../apps/bublys-os/app/bubble-ui/world-line/snapshot-url.ts) | root のブラウザ url 専用 `SnapshotCodec`（`rootBrowserSnapshotCodec`）の定義 |
| [`bubble-ui/world-line/bubbleArrangementDomain.ts`](../apps/bublys-os/app/bubble-ui/world-line/bubbleArrangementDomain.ts) | `BubbleArrangement` を world-line に乗せるための型登録 |
| [`bubble-ui/world-line/useUniverseArrangementWorldLine.ts`](../apps/bublys-os/app/bubble-ui/world-line/useUniverseArrangementWorldLine.ts) | **コア hook**：任意 universe の commit/rehydrate + （任意）親バブル url との双方向バインド |
| [`bubble-ui/world-line/useRootArrangementWorldLine.ts`](../apps/bublys-os/app/bubble-ui/world-line/useRootArrangementWorldLine.ts) | root 用ラッパー：コア hook を `ROOT_UNIVERSE_ID` で呼んだうえに、ブラウザ url/履歴調整（stale self-heal、popstate→moveTo、apex→pushState、訪問trail）を被せる |
| [`bubble-ui/world-line/BubbleArrangementWorldLineControls.tsx`](../apps/bublys-os/app/bubble-ui/world-line/BubbleArrangementWorldLineControls.tsx) | undo/redo ボタンと世界線 DAG ビュー（ドラッグできるフローティングパネル） |
| [`bubble-ui/world-line/BubbleArrangementInspector.tsx`](../apps/bublys-os/app/bubble-ui/world-line/BubbleArrangementInspector.tsx) | 現 view の JSON を左下に表示する開発用パネル |
| [`bubble-ui/BubblesUI/domain/bubbleRoutes.tsx`](../apps/bublys-os/app/bubble-ui/BubblesUI/domain/bubbleRoutes.tsx) | バブル url → 中身のルーティング。`universe` ルートで `UniverseBubble`（`UniverseView` + `useUniverseArrangementWorldLine`）を返す |

### ライブラリ側（`bublys-libs/`）

| パッケージ / ファイル | 役割 |
|---|---|
| [`world-line-graph/`](../bublys-libs/world-line-graph/) | DAG + CAS の汎用世界線ライブラリ。`useCasScope(scopeId)` で scope（= universe）ごとに独立した世界線を切り出せる |
| [`bubbles-ui/src/lib/state/bubbles-slice.ts`](../bublys-libs/bubbles-ui/src/lib/state/bubbles-slice.ts) | universeId キーで束ねた bubbleState スライス。`navigateBubble`（バブルの url 遷移）、`replaceBubbleArrangement`（rehydrate 出口）など |
| [`bubbles-ui/src/lib/ui/UniverseView.tsx`](../bublys-libs/bubbles-ui/src/lib/ui/UniverseView.tsx) | 1つの universe を描く自己完結コンポーネント。バブル中身として再帰的に置くことで再帰universeになる |
| [`bubbles-ui/src/lib/ui/BubblesLayeredView.tsx`](../bublys-libs/bubbles-ui/src/lib/ui/BubblesLayeredView.tsx) | universeId に束ねた描画。`StyledUniverse` に `data-bubble-universe` を付けて、子 React コンポーネントから最寄りの universe DOM を辿れるようにしている |
| [`bubbles-ui-util/src/lib/Viewport.ts`](../bublys-libs/bubbles-ui-util/src/lib/Viewport.ts) | screen ⇄ universe 変換の純粋値オブジェクト。`parentScale` を持ち、奥のレイヤーで CSS scale された universe DOM 内でも universe 単位を返す |
| [`bubbles-ui/src/lib/utils/measure-viewport.ts`](../bublys-libs/bubbles-ui/src/lib/utils/measure-viewport.ts) | DOM 計測して `Viewport` を構築する単一の出口。`bbcr.width / offsetWidth` で親 CSS scale を推定 |

---

## 設計判断と裏話

### なぜ「root の URL を合成しない」のか

最初は「root の `/universe@` に root + 各ネストの apex を全部詰め込む」案を実装した（`#wl=root.../nest1.../nest2...` のように）。これは却下。

理由：

- ブラウザの URL が**入れ子の深さに応じて伸びていく**のがブラウザの戻る/進むの体験として直感的でない
- root の `/universe@` を見て「これは root の状態」と読めない（実は深い入れ子の状態も入っている）
- ネスト universe が独立した状態として扱えなくなる（root の URL に依存する）

代わりに「**ネストの現在地は親バブルの url に書く**」とした。

- root の `/universe@` は従来どおり root apex 1個だけ
- ネストの状態は**親 view の一部**になるので、自然と親世界線に流れ込む
- 「バブルの url 遷移」という汎用プリミティブ(`navigateBubble`)を1つ用意すれば、再帰的に解決する

この方向転換で「再帰universe + ネスト世界線 + ブラウザ履歴」が綺麗に1つの絵に収まった。

### `selectBubbleArrangement` で `renderedRect` を剥がす理由

`renderedRect` は計測由来の派生値で毎フレーム更新される。これを世界線に含めると **rect 計測のたびに commit が走ってしまう**。

復元（rehydrate）後はレンダリングで再計測されるので、保存していなくても問題ない。

### `updateBubble` / `renderBubble` reducer の「存在しないバブルへの dispatch は無視」

これは2026-06-03 に入れた fix（[2b380ac6](#)）。

`popChildInProcess` の async listener が `await listenerApi.take(renderBubble)` で待機しているとき、ブラウザの「戻る」で rehydrate が走るとそのバブルは state から消える。直後に renderBubble が遅れて発火 → stale listener が起き上がって updateBubble を投げる → reducer が問答無用で `u.bubbles[id] = payload` していたため、**削除済みバブルが復活して view が別物に変わってしまっていた**。

reducer 側で「存在しないバブルへの dispatch は何もしない」と一行入れることで、async listener が rehydrate 後に stale で発火しても**世界線の履歴トレイルを汚染しない**ように防げる。

### Viewport が `parentScale` を吸収する理由

universe バブル自身が root の奥のレイヤー（z >= 1）に置かれていると、universe の DOM は CSS `transform: scale()` で縮小される。

これまで `Viewport` は `getBoundingClientRect` の screen pixel 値をそのまま universe 単位として扱っていたため、**内側で popChild したバブルや、opener⇄openee を結ぶリンクバブル(SVGコネクタ)が、親 scale 分だけずれた位置に置かれていた**（外側に飛び出す、リンクが詰まる等）。

`Viewport.parentScale` を導入し、screen⇄universe 変換と `size`/`scroll` をスケール込みで計算する。スケールは universe DOM の `bbcr.width / offsetWidth` から推定（ネスト時は最も内側の universe に対する直接の親 scale が取れる）。

### なぜブラウザ url を hash でなくパスにしたか

最初の実装ではブラウザのアドレスバーを `#wl=<node>` で持っていた。SPA で「サーバーに送られない / フルリロードが起きない」という性質が hash の便利ポイントなのと、初期の実装が一番楽だったから。

ただ `#` は W3C 的には**同一ドキュメント内のアンカー**を指す記号で、アプリ状態の保管庫として使うのは記号本来の意味とズレる。Next.js が使えるなら**パス**で表現するのが意味的に正直。

そこで `app/[[...slug]]/page.tsx` を1つ置いて、`/` と `/universe@<node>` を同じ SPA に流すようにした。`/world-line` 等の specific page は Next.js の静的優先で先に当たるので、catch-all と共存する。

### なぜ `wl=` でなく `@` 構文にしたか

初期は `universe?wl=<node>` / `#wl=<node>` だった。これは「クエリ文字列」と「キー名 `wl`」の組み合わせ。これを `universe@<node>` / `/universe@<node>` に揃えた理由：

- **`?key=val` は「複数キーを扱う一般装置」の構文。今アタッチしているのは1個（node）だけなので過剰**。`<name>@<val>` は「1つだけ付ける」のための慣用句として既にある
- **`wl`（world line）は一般名詞すぎる**。重要なのは「**この universe をこのスナップショットで**見ている」という関係。`@<node>` がそのまま読み下せる
- git の `HEAD@{N}` / docker の `image@digest` / npm の `pkg@version` / メール `user@host` と同じ「at this point」イデオムに無料で乗れる
- 他のバブル url（`users/<id>`, `memos/<id>/history`）の**パス語彙とぶつからない**サフィックスとして読める

将来 `users/<id>@<node>` 等で他オブジェクトに「at this snapshot」を付けたくなったときも、同じ `<name>@<node>` 文法で揃う（文法予約。コードはまだ無い）。`memos/<id>/history`（DAG ビューを開く別バブル）と `memos/<id>@<node>`（特定 snapshot を pin）は orthogonal な機能。

---

## 既知の不是・未解決論点

ドキュメント化の過程で気になった「美しくない」点と、設計上残っている論点をここに集約する。**まだ手をつけていない**。

### A. `selectBubbleArrangement` に「孤児バブル」が貯まる — **解消**

`selectBubbleArrangement` / `makeSelectBubbleArrangementForUniverse` の出口で
`process.layers` に居ない bubble を落とし、両端のどちらかが死んでいる
`bubbleRelations` も同時に捨てるよう変更（`projectArrangement` ヘルパー）。

理由：消えた bubble は他の世界線ノードに戻れば必ずそこに残っているので、
**「今いる世界の `bubbles`」には現に表示されているものだけ居ればよい**。
セレクタが「見えているものだけ」を返すようになったので、

  - 世界線への commit は孤児を含まない（節約）
  - rehydrate で `replaceBubbleArrangement` が綺麗な状態を書き戻すので、
    in-memory state も同じ形に収束する
  - インスペクタが返す view JSON もそのまま「見えているもの」と一致する

インバリアントは「`bubbles` のキー集合 = `process.layers` の ID 集合」
かつ「`bubbleRelations` の両端が `bubbles` に存在」。

### B. universe ルート名 `"universe"` が依然 app 内に固定 — **解消**

ライブラリ側に [`SnapshotCodec`](../bublys-libs/bubbles-ui/src/lib/bubble-routing/SnapshotCodec.ts) 型と [`makeSnapshotRoute`](../bublys-libs/bubbles-ui/src/lib/bubble-routing/makeSnapshotRoute.ts) ヘルパーを導入して、

- `BubbleRoute` に optional `snapshot: SnapshotCodec` フィールドを生やし
- `makeSnapshotRoute({ base: "universe", ... })` という1行で url パターン・encode・decode が同じ `base` から派生する
- ネスト側 hook `useUniverseArrangementWorldLine` は `UniverseLink.snapshot` 経由で codec を受け取り、"universe" のような具体名を一切知らない

を達成。`bubbleRoutes.tsx` の universe ルートは `makeSnapshotRoute` で 1 か所だけ。

同じ仕組みで `world@<node>` / `room@<node>` 等、別の base を持つ「snapshot pointer 型ルート」を増やしても、`useUniverseArrangementWorldLine` を改変せずに使い回せる（URL 文法層では）。データ層は `makeSelectBubbleArrangementForUniverse` などを通じて依然「universe というドメイン概念」上に立っているので、hook 名の `Universe` は単なる base 名ではなくドメイン上の事実として残してある。

root のブラウザ url (`/universe@<node>`) はバブルルートを経由しないので、別 codec `rootBrowserSnapshotCodec` を `snapshot-url.ts` に独立して定義してある。同じ `<base>@<node>` 文法ながら層が違う、というのを明示している。

これは既存課題の「bubbleRoute の domain-registry 統合」と同じ系統。

### C. root（ブラウザ履歴）と nest（DAG）で undo/redo の判断軸が違う — **設計意図として明記**

root は `useRootArrangementWorldLine` の自前 `trailRef`（ブラウザ履歴をミラーしたもの）で `canUndo/canRedo` を判断し、ボタンを押すと `history.back/forward` する。  
nest は `useUniverseArrangementWorldLine` の `scope.canUndo/canRedo`（apex に parent/child が居るか）で判断し、ボタンを押すと DAG の `scope.moveBack/moveForward` を呼ぶ。

**ズレるシナリオ**：A → B を開いて B から「戻る」、それから C を開くと、

- ブラウザ履歴: `[root, A, C]`（B 方向は前方切り捨てで消える）
- DAG: A の子は **B と C の両方** 残る

このとき A から「forward」を押したとき：

- root: ブラウザ history.forward → C（履歴の順）
- nest: scope.moveForward → 同 worldLineId の子優先 → B（DAG の順）

これは**意図した非対称**：

- root はブラウザの戻る/進むボタンと同じ場所に行くべきで（in-app の戻ると見た目の戻るが食い違うと混乱する）、ブラウザ履歴モデルが正
- nest はそもそもブラウザ履歴が無い（バブルの中なので）。DAG の枝分かれを直接辿るのが自然
- `trailRef` はブラウザ API が **現在位置を直接教えてくれない**ためのミラー。撤去できない

両者は同じ「universe arrangement の世界線」を扱うが、**外部 URL の媒体（ブラウザ vs 親バブル）が違うので、navigability モデルも違う**、と読むのが正しい。

### D. `popChildInProcess` の async listener は2経路に分かれている

`bubbles-listener.ts` の `popChildInProcess` ハンドラは、

- **即時パス**: opener の `renderedRect` がすでにあれば、その場で `calcPositionToOpen` → `updateBubble`
- **フォールバック**: `await listenerApi.take(renderBubble)` で opener/openee のレンダリングを待つ

最近の世界線まわりのバグ（履歴汚染）は主にこのフォールバックの stale 発火だった。reducer 側でガードを入れて緩和したが、根本的には**「listener が rehydrate を跨いで生き残る」こと自体が一貫した世界線体験と相性が悪い**。

選択肢：

1. listener 内で「自分が初動した時の universeId/bubbleId がまだ生きているか」を再チェックしてから dispatch
2. async wait の代わりに、useMyRect の `onRectChanged` で「自分が opener なら listener に通知」する形に inversion
3. そもそも `popChildInProcess` で位置をその場では決めず、レンダリング後の `onRectChanged` で初めて位置を入れる（state を1段遅延させる）

### E. `BubbleArrangement` クラスは薄すぎる

`BubbleArrangement` は `state: BubbleArrangementState` をそのまま包むだけのラッパー。

- `domain-registry` に乗せるために class が必要 → だから存在する
- でも振る舞いを持っていない → ドメインオブジェクトとして意味のある何かを持たせる余地がある

最低限「`bubbleCount`」「`hasUniverse(universeBubbleId)`」のような問い合わせメソッドはあってもよさそう。世界線ノードのラベル（`summarizeNode`）が `Object.keys(v.bubbles ?? {}).length` を直書きしているのも、ここに寄せれば綺麗になる。

### F. `conversation-meta` の `instanceof` 問題（既存課題）

`scope.addObject("conversation-meta", obj)` が型文字列指定で残っている。`useCasScope` の `addObject(obj)` 版は内部で `instanceof config.class` で型解決するが、`conversation-meta` は plain object なのでこの経路に乗らない。

専用クラスを作るか、`domain-registry` 側で「class を持たない型でも何らかの discriminator で解決する」ようにするか。

---

## まとめ

このブランチの本質は次の1文に集約できる：

> **どの universe も `universe@<node>` で自分の現在地を表し、ネストの `@` は親バブルの url に乗せる。**

この再帰ルールひとつで、空間入れ子（再帰universe）と時間入れ子（ネスト世界線）が綺麗に組み合わさり、ユーザーから見た体験は「ブラウザの戻る/進むがどこを編集していても効く」という非常にシンプルな姿になる。

「不是」セクションは合意のうえで順次潰していく予定。
