# ベンチ台 —— DOM でどう描くか、5案を同じ台で測る

仕様は `../../v4/RULES.md`（これが正）。解き方はそこから写してある。

> **比べたいのは「描き方」であって「解き方」ではない。**
> だから **解く所（値 → 画面上の配置）は1つ**にして、各案は `render` / `update` **だけ**を書き換える。

---

## あなたがやること（3つだけ）

1. `_template.html` を `<案の名前>.html` に複製する（このフォルダの直下に置く）
2. `render(ps, api)` と `update(ps, api)` を書く。**ほかは1文字も触らない**
3. 走らせる

```bash
node docs/bubble-space-prototype/v5-dom/bench/bench.mjs --case <案の名前>
```

結果は `results/<案の名前>.json` と、画面の写しが `results/shots/<案の名前>-<場面>.png` に出る。

### 触らないファイル

`scene.js`（場面）／`resolve.js`（解き方）／`driver.js`（台）／`bench.mjs`（測る）／`verify.mjs`（台の確かめ）。
`../../v4/` と `../../v3/` は**読むのは自由、編集は不可**。

---

## `render` と `update`

```js
function render(ps, api) { /* 最初の1フレームだけ。要素を作る所 */ }
function update(ps, api) { /* 2フレーム目から毎フレーム。動かす所 */ }
```

`ps` ＝ 泡の配置の配列。**奥から手前の順**（`ps[0]` が一番奥）。

| | |
|---|---|
| `id` `title` `hue` | 泡の id・題名・色相（0..360） |
| `implicit` | ③ 見えない親か |
| `x` `y` `w` `h` | 画面（ステージ座標）の矩形。**もう画面の px** |
| `bw` `bh` | レンズを通す前の箱。`w === bw * scale`、`h === bh * scale` |
| `scale` | 合成した倍率（**深さ n でも数値1つ**） |
| `alpha` | 透明度。0 なら描かない |
| `header` | ヘッダの高さ（箱の座標で 24。見えない親は 0） |
| `depth` `space` `i` | 入れ子の深さ／いる空間の id／描く順（0 が奥） |

`api` ＝ `{ stage, scene, W, H, dpr, colorOf(p), headerH }`。

### 同じ絵を描くこと

比べるためなので、泡1つにつきこれだけを描く（`canvas.html` と `absolute.html` が見本）。

- 角丸 `8*scale` の矩形。地は `hsl(hue 70% 62% / .16)`、枠は 1px の `hsl(hue 70% 62% / .55)`
- 題名を `x+8*scale`, ベースライン `y+16*scale` に。字の大きさ `12*scale`（下限 4px）、色 `hsl(hue 70% 78%)`
- 見えない親（`implicit`）は 地を塗らず、**点線の枠だけ**（`hsl(215 30% 62% / .45)`）
- `alpha <= 0` か `w < 0.5` の泡は描かない

`results/shots/` の png を並べて目で確かめること。

### 守ること

- 泡の要素は `pointer-events:none`（雛形の CSS がそうしてある）。
  **入力は `#stage` が1つで受ける**。当たり判定は `placements` から。案ごとに変えない
- **ネットワークを使わない**。CDN も webfont も読まない
- `window.__lab` と `window.__bench` は `driver.js` が出す。触らない

---

## 場面（`scene.js`。3つとも実測値）

| | 泡 | 画面の中 | 入れ子 | 何が厳しいか |
|---|---|---|---|---|
| **A 勤務表** | 58 | 58 | 3 段 | `v4/lab.html` と**まったく同じ構成**（下の「台の確かめ」参照） |
| **B 大きい** | 521 | 521 | 4 段 | 数。大勤務表 → 週×4 → 日×8 → コマ×15 |
| **C 魚眼** | 202 | 202 | 2 段 | **倍率が泡ごとに全部ちがう**。焦点を動かすと全部の transform が書き換わる |

3つとも **画面の外の泡は 0**（外に出ると描かれず、速く見えてしまう）。`verify.mjs` が毎回数える。

---

## 台本（全案・全場面で同じ。1ステップ ＝ 1フレーム。ページの中から流す）

| | 何をするか | 何が起きるか |
|---|---|---|
| **drag** | いちばん外の泡のヘッダを掴んで、60 フレームで 300px 右へ | **位置だけ**変わる（1つの泡） |
| **wheel** | 背景でホイール。焦点 Z を 30 送って 30 戻す | **全部の泡の倍率**が変わる |
| **resize** | 泡の右下の角を掴んで、60 フレームで +120px | 箱が伸び、**⑤ pin** が外の泡の座標を書き換える |

本物の PointerEvent / WheelEvent を、本物のハンドラへ流している（ハンドラは `resolve.js` の `installInput`）。
台本が本当に効いたかは、毎回 `台本が効いたか：…` の行で出る（値がどれだけ動いたか）。

---

## 測るもの

| 出るもの | 何 |
|---|---|
| `work p50 / p95 / max` | **1フレームの時間**。`requestAnimationFrame` のコールバックに入って出るまで（ms）。★ 主に見るのはここ |
| `解く` / `描く` | その内訳。`resolve.js` の時間 と `update` ＋ style/layout の時間 |
| `間隔p50` | rAF のコールバックに入った時刻の差。**全部込み**（合成・ラスタも遅れれば出る） |
| `落ち` | 間隔が「何もしていないときの 1.5 倍」を超えたフレームの数 |
| `>16.7` | work が 60fps の予算を超えたフレームの数 |
| `script` `style` `layout` `other` | CDP の `Performance.getMetrics` の差分（フェーズ合計の ms）。`other = Task − script − style − layout` |
| `Nodes` `LayoutObjects` `DOM 要素` | 生きている要素の数 |
| `heap` | `JSHeapUsedSize`（MB） |

- **ウォームアップ 60 フレームは測らない。** 各フェーズの最初の 10 フレームも捨てる（JIT）
- **同じ台本を 3 回走らせて、指標ごとに中央値**（GC のゆらぎを吸う）
- 1440×900・`deviceScaleFactor: 1`

### 数字の読み方（先に知っておくこと）

- **`work` は canvas に不利、DOM に有利**。canvas は `fill` や `fillText` の中でラスタまでやるので work に入るが、
  DOM のラスタと合成は**別スレッドで、rAF の外**なので work に入らない。
  `driver.js` は work の終わりにわざと layout を吐かせているので、**style と layout までは**どちらにも入っている
- だから **`work` だけで決めない。`間隔p50` と `落ち` を必ず一緒に読む**。こちらは全部込み
- **headless Chromium は合成の挙動が実機と違う。** rAF の間隔も実測で **8.3ms 前後（≒120fps）** で、
  実機の 60fps vsync ではない。順位の目安にはなるが、絶対値をそのまま実機の数字だと思わないこと

---

## 走らせ方

```bash
# 全案 × 全場面（3回の中央値）。v4 の基準も一緒に測る
node docs/bubble-space-prototype/v5-dom/bench/bench.mjs

# 自分の案だけ
node docs/bubble-space-prototype/v5-dom/bench/bench.mjs --case <案の名前>

# 場面と回数を選ぶ
node docs/bubble-space-prototype/v5-dom/bench/bench.mjs --case <案の名前> --scene C --runs 5

# canvas の基準（v4/lab.html を直に、同じ台本・同じ物差しで）
node docs/bubble-space-prototype/v5-dom/bench/bench.mjs --case v4

# 台が正しいかの確かめ
node docs/bubble-space-prototype/v5-dom/bench/verify.mjs
```

手で開いて見たいときは、`bench.mjs` が使うのと同じ形のサーバを立てる（**ES module なので file:// では開けない**）:

```bash
node -e 'const h=require("http"),f=require("fs"),p=require("path"),r="docs/bubble-space-prototype";
h.createServer((q,s)=>{const x=p.join(r,q.url.split("?")[0]);s.writeHead(200,{"content-type":x.endsWith(".js")?"text/javascript":"text/html"});f.createReadStream(x).pipe(s)}).listen(8777)'
# → http://127.0.0.1:8777/v5-dom/bench/absolute.html?scene=B
```

---

## 基準

| | どう測ったか |
|---|---|
| **`canvas.html`** | **これが物差し。** 同じ場面・同じ台本・同じ台で、canvas に毎フレーム全部描き直す。3場面ぜんぶある |
| **`v4`（`../../v4/lab.html`）** | 本物の v4 を、同じ台本・同じ物差しで測ったもの。場面A だけ（v4 は自前の場面しか持たない）。<br>v4 は右上の一覧や札も描いていて、ステージも 1440×900 ではない（ツールバーぶん低い）。だから **`canvas.html` のほうが公平な基準**、v4 は答え合わせ |

`absolute.html` は台の動作確認に置いた**いちばん素朴な案**（`left/top/width/height` を毎フレーム書く）。案の1つとして読んでよい。

---

## 台の確かめ（`verify.mjs` の実測）

- **`resolve.js` の答えは `v4/lab.html` と一致する。** 場面A の泡 58 個ぜんぶで、いちばんのずれ **0.0000px**
  （v4 はツールバーぶん stage が低いので、stage が 1440×900 になる高さで開き、空間の中心をそろえて比べる）
- 3場面とも **画面の外の泡 0**

---

## canvas の基準値（実測。3回の中央値・1440×900・Chromium 145.0.7632.6 headless）

`work p50 / p95 / max`（ms・1フレーム）と、`間隔p50`（ms）・`落ち`（フレーム数）。

### `canvas.html` —— **これと比べる**

| 場面 | drag | wheel | resize | 間隔p50（drag/wheel/resize） | 落ち | DOM 要素 |
|---|---|---|---|---|---|---|
| **A** 58 | **0.6** / 1.0 / 1.1 | **4.4** / 5.2 / 5.5 | **0.7** / 0.9 / 1.0 | 8.3 / 8.1 / 8.3 | 0 / 2 / 0 | 9 |
| **B** 521 | **2.1** / 2.3 / 2.5 | **2.8** / 3.2 / 3.4 | **2.1** / 2.3 / 2.6 | 8.3 / 8.3 / 9.0 | 1 / 0 / 3 | 9 |
| **C** 202 | **1.7** / 1.9 / 2.1 | **13.3** / 19.9 / 26.9 | **1.5** / 2.0 / 2.3 | 10.1 / 17.8 / 8.4 | 7 / 41 / 6 | 9 |

`style` と `layout` は3場面とも **0.00ms**（DOM を触らないので当然）。
`解く`（`resolve.js`）は A 0.2〜0.3ms／B 1.2〜1.4ms／C 0.3〜0.4ms。**これは全案に共通の下駄。**

### `v4/lab.html`（本物・場面A だけ・答え合わせ）

| | drag | wheel | resize |
|---|---|---|---|
| work p50 / p95 / max | 0.7 / 0.8 / 1.0 | 7.0 / 8.4 / 10.9 | 0.7 / 1.0 / 1.2 |
| 間隔p50・落ち | 9.6・0 | 17.6・49 | 10.2・0 |

`canvas.html` より wheel が重い（7.0 対 4.4）。v4 は右上の一覧や札やヒントも一緒に描き、
ステージも 1440×900 ではない（ツールバー 91px ぶん低い）。だから**物差しは `canvas.html`**。

### いちばん素朴な DOM（`absolute.html`。`left/top/width/height` を毎フレーム書く）

| 場面 | drag | wheel | resize | wheel の layout | wheel の落ち |
|---|---|---|---|---|---|
| **A** 58 | 0.7 | 4.3 | 0.8 | 236ms | 1 |
| **B** 521 | 2.2 | 5.6 | 2.5 | 120ms | 4 |
| **C** 202 | 1.7 | **11.9** | 1.3 | **720ms** | 41 |

**ここまでで見えていること**（数字が言っていることだけ）

- **重いのは wheel。** 全部の泡の倍率が変わるフェーズだけが canvas でも DOM でも跳ねる。
  drag（1つの泡だけ動く）と resize は、どの案でも 1〜3ms に収まっている
- **場面C（魚眼）では、素朴な DOM のほうが canvas より速い**（11.9 対 13.3）。
  canvas は `fill` と `fillText` をフレームの中で 202 回やるので work に全部乗る。
  ただし DOM 側は wheel の 60 フレームで **layout に 720ms**（＝ 12ms/フレーム）払っていて、
  これは work に入りきっていない（`driver.js` が吐かせた layout ぶんだけ入っている）
- **場面B（521個）では canvas が倍速い**（wheel 2.8 対 5.6）。数が増えると DOM の style と layout が効いてくる
- **DOM 要素の数**：素朴な案は 泡1つに div+span で、521 個の場面で 1050 要素・LayoutObjects 1567
