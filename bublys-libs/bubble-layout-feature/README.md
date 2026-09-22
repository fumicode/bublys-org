# @bublys-org/bubble-layout-feature

> **はじめて触る人へ：** 全体像・進み具合・残課題は [`docs/bubble-layout/index.html`](../../docs/bubble-layout/index.html)（ブラウザで開く1枚の引き継ぎノート）。

泡のならべかたを、**url とオブジェクトにつなぐ**層。
模型は [`@bublys-org/bubble-layout`](../bubble-layout)、描く・触るは [`@bublys-org/bubble-layout-ui`](../bubble-layout-ui)。

```tsx
<BubbleSpace routes={routes} initialUrls={['csv-importer/sheets']} viewport={{ w, h }} />

// 泡の中で
<ObjectView url={`csv-importer/sheets/${id}/objects/${rowId}`} label={name}>…</ObjectView>
```

## 置き換えに要る口は4つだった

バブリ6つ（hotel-shift-puzzle / gakkai-shift / csv-importer / object-transformer / sekaisen-igo / ekikyo）が
`bubbles-ui` に触れている所を数えた：

```
ObjectView   223     ← 本丸
BubbleRoute   65     どのオブジェクトにどの画面を出すか
openBubble    37     開く
BublyApp 系   36     外枠（Provider・メニュー）
```

この4つに当てて作ってある。

## ★ 旧 bubbles-ui との違いは1つだけ ── `openingPosition` を落とした

| 旧 | ここ |
|---|---|
| `openingPosition`（どこに置くか） | **無い。** 親の View が決める（規則①④） |
| `canOpenBubble`（url ＋ 位置指定 or 型登録） | **url が route に当たるかどうかだけ** |
| 膜を出す条件に位置指定が混ざる | **掴めるか・開けるかだけ** |

移行のため、`ObjectView` は `openingPosition` を**受け取って無視する**。
これがあるので**バブリの画面を1文字も編集せずに載せ替えられる**
（検証：[`docs/bubble-space-prototype/v6-bubly`](../../docs/bubble-space-prototype/v6-bubly)）。

## 開く ＝ 「この空間の、この泡の隣に」

`openAt` が domain に頼むのはこれだけ。やることは3つ：

1. **元の泡の兄弟**として、すぐ後ろの順序に割り込む
2. **X のレンズを魚眼にする**（次元は変えない）── これだけで
   「一覧は小さく、詳細が手前」が出る。masa さんが残したいと言った見え方
3. **そこへ視点が寄る**（泡の値は1つも書かない）

隙間は `METRICS.SNAP_EDGE × 2`。**くっつく距離より広くないといけない** ──
同じにしていたら、開いた直後の2つが少しドラッグしただけで並びになった（v6 で踏んだ）。

## ★ 試している ── 奥行きを「面」で付ける（`depth="plane"`）

既定は上の魚眼のまま。`<BubbleSpace depth="plane">` にすると、旧 `bubbles-ui` の `process.layers` を Z で書いた開き方になる：
別の種類を開くと1段手前に新しい面（元の泡は 0.90 に下がる）、同じ種類は同じ面に並ぶ（全員 1.00）、
面が空になると後ろが上がってくる。**規則は足していない**（外の空間は最初から `Z＝自由Z·そのまま·透視`）。

なぜ試すか・実測・masa さんに決めてほしいこと：[`docs/bubble-space-prototype/v7-convergence/FINDINGS.md`](../../docs/bubble-space-prototype/v7-convergence/FINDINGS.md)。
見張り：`node docs/bubble-space-prototype/v5-dom/_check/plane.mjs`（`all.mjs` の20本目）

## 受け入れ条件

`node docs/bubble-space-prototype/v5-dom/_check/bubly.mjs`（`all.mjs` の19本目・16件）

本物のバブリ（`csv-importer`）の画面ファイルを**1文字も編集せずに**載せて、
headless Chromium で本物のマウスで触る。いちばん大きいのは：

```
一覧だけ         一覧 倍率 0.982
詳細を開いた後   一覧 倍率 0.773   詳細 倍率 0.986（右・手前）
```

## まだ無いもの

**Redux**（`world` / `onChange` の口は開けてある。どこに載せるかは未決）、
**世界線**（カメラをノードに紐づける枝）、**補間**（CSS transition）、
**「落とした点に開く」**（いまは落としても「隣に開く」と同じ道）、
**ポップアップで開く**（`OpenAs` は `'beside'` だけ）。
