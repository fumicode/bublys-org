# 宇宙はドロップの最後の受け手

> **誰も受け止めなかったドロップは、宇宙が落ちた場所で受け止める。**

ObjectView はドラッグできる。受け入れ先（責任者ルール図、ポケット、ガントの行 …）に落とせば
その相手が受け取る。どこにも受け取られなかったとき、いままでは何も起きなかった。
今は宇宙が受け止めて、**落とした場所にそのオブジェクトのバブルを開く**。

ダブルクリックが「開いて」だとすれば、ドロップは「ここに開いて」。同じことを、場所の指定付きで
言っているだけなので、位置指定の値が1つ増えただけで済んでいる（`OpeningPosition` の
`dropped-place`）。

---

## 「誰も受け止めなかった」をどう知るか

列挙しない。HTML5 ドラッグ＆ドロップに元からある作法をそのまま判定に使う。

> **受け取った側は `preventDefault()` を呼ぶ。**

これは宇宙のために作った決まりではなく、ブラウザの仕様上そうしないとドロップが成立しない、
という元々の作法。だから宇宙側は「内側のハンドラが走り終わった時点で `defaultPrevented` が
立っていなければ、誰も取らなかった」と読むだけでよい。受け入れ先の一覧を持つ必要も、
新しい受け入れ先ができるたびに宇宙を直す必要もない。

```
落とす
 ├─ 内側の誰かが preventDefault した → その人のもの。宇宙は引き下がる
 └─ 誰も preventDefault しなかった   → 宇宙のもの。落ちた場所にバブルを開く
```

### 受け入れ先を書くときの約束

新しくドロップを受け取る場所を作るときは、次の2つを守る。守らないと、受け取ったつもりでも
宇宙が横から同じドロップに反応する（バブルが余計に開く）。

1. **受け取るときは `dragover` と `drop` の両方で `preventDefault()` する。**
   `drop` だけだと、ドラッグ中のカーソル表示を宇宙が上書きしてしまう。
2. **`dragover` の時点で中身を読もうとしない。**
   ブラウザは `dragover` の間 `dataTransfer.getData()` に空文字しか返さない（保護モード）。
   読めるのは `drop` のときだけ。受け入れ可否は `dataTransfer.types` だけで判定する。
   ユーティリティなら `hasDragPayload(e)`（`utils/drag-types.ts`）を使う。
   ここを間違えると `preventDefault()` に到達せず、**その受け入れ先自体が一切動かなくなる**。

```tsx
// 受け入れ先の型
const onDragOver = (e: React.DragEvent) => {
  if (!hasDragPayload(e, { acceptTypes })) return; // types だけ見る
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
};
const onDrop = (e: React.DragEvent) => {
  const payload = parseDragPayload(e, { acceptTypes }); // ここでは中身が読める
  if (!payload) return;
  e.preventDefault();
  ...
};
```

---

## 落ちた場所の求め方

ドロップイベントが持っているのは画面（viewport）座標。バブルの `position` は surface レイヤーの
layer-local 座標。あいだに universe 座標があるので、2段で直す。

```
clientX/clientY            画面座標
  │  Viewport.screenToUniverse()      … utils/drop-point.ts
  ▼                                      （スクロール量と親の CSS scale を吸収）
universe 座標                          ← ここが action に載る（droppedAt）
  │  new Layer(0, surfaceLeftTop, vanishingPoint).locate()
  ▼                                      … state/bubbles-listener.ts
layer-local 座標                       ← bubble.position
```

前半（画面→universe）はドロップの瞬間にしか測れないので、ドロップハンドラで済ませて
`droppedAt` として action に載せる。後半（universe→layer-local）は他の位置指定とまったく同じ
変換なので、listener に任せる。**この境界が、既存の位置指定と揃えられる一番深いところ**
（`origin-side` も、DOM から矩形を取ったあとは同じ変換に合流する）。

`droppedAt` を action の payload に載せているのは、他の位置指定と違って**どこからも再計算
できない**から。`origin-side` の基準矩形は DOM を見ればいつでも測り直せるが、ドロップ位置は
起きてしまった出来事で、残しておかないと失われる。

---

## 入れ子の宇宙

入れ子の universe は普段 `pointer-events: none` で、空白領域は奥へ貫通する。
このままだと、入れ子の宇宙の空白に落としたのにイベントが親へ抜けて、**親の宇宙に、親の座標で**
バブルが出てしまう＝落とした場所と違う。

そこで**ドラッグしている間だけ**入れ子の viewport を触れるようにする
（`utils/drag-session.ts` が `document.body` にクラスを付け、CSS で `pointer-events` を戻す）。
ドラッグが終われば元の貫通する挙動に戻る。

---

## 開かないとき

| 状況 | どうなるか |
|---|---|
| 受け入れ先が受け取った | 何も開かない（その受け入れ先の処理だけ） |
| ルートに載っていない URL | 何も開かない。大雑把な操作なので「Unknown bubble type」を散らかさない |
| 知らない荷物（外部ファイル等） | 何も起きない。`dragover` で受け取らないのでカーソルも拒否になる |
| ドラッグ元のバブルが別文書のもの | 開くが、opener 無し（リボンは繋がらない）。バブルIDはその文書内でしか意味を持たない |

## 誰が opener になるか

ドラッグ元のバブルがこの universe に実在すればそれが opener になり、ダブルクリックで開いた
ときと同じくリボンが繋がる。実在しなければ opener 無し（`"root"`）で、`relateBubbles` は
それを関係として記録しない。「自分で置いたバブルは誰にも繋がらない」という素直な状態になる。

## 関連ファイル

| 役割 | ファイル |
|---|---|
| 位置指定の値 | `bublys-libs/bubbles-ui/src/lib/state/bubbles-slice.ts`（`OpeningPosition` / `PopChildPayload.droppedAt`） |
| 位置決め | `bublys-libs/bubbles-ui/src/lib/state/bubbles-listener.ts`（`popChildInProcess` の listener） |
| ドロップの受け口 | `bublys-libs/bubbles-ui/src/lib/hooks/useUniverseDropZone.ts` |
| 座標変換 | `bublys-libs/bubbles-ui/src/lib/utils/drop-point.ts` |
| 入れ子の一時解放 | `bublys-libs/bubbles-ui/src/lib/utils/drag-session.ts` |
| 荷物の型判定 | `bublys-libs/bubbles-ui/src/lib/utils/drag-types.ts`（`hasDragPayload` / `parseDragPayload`） |
| テスト | `bublys-libs/bubbles-ui/src/lib/state/bubbles-dropped-place.test.ts` |
