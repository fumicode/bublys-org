# @bublys-org/bubble-layout-ui

泡のならべかたを **React で描く**。模型は [`@bublys-org/bubble-layout`](../bubble-layout)（domain）。

正：[`docs/bubble-space-prototype/v4/RULES.md`](../../docs/bubble-space-prototype/v4/RULES.md)
決めた経緯：[`docs/bubble-space-prototype/DECISIONS.md`](../../docs/bubble-space-prototype/DECISIONS.md)

```tsx
import { resolveWorld } from '@bublys-org/bubble-layout';
import { BubbleField, FIELD_CSS } from '@bublys-org/bubble-layout-ui';

const layout = useMemo(() => resolveWorld(world, viewport), [world, viewport]);

<style>{FIELD_CSS}</style>
<BubbleField world={world} layout={layout} viewport={viewport} selectedId={selectedId} />
```

## 受け入れ条件 ── ラボと px で差 0

`node docs/bubble-space-prototype/v5-dom/_check/react.mjs`

headless Chromium で **ラボ（v5-dom/lab.html）と React 版を同時に開き、同じ操作を同じ順で当てて**、
泡ひとつひとつを突き合わせる。12 場面・**6264 個の数**：

| | いちばん大きい差 |
|---|---|
| 模型（placements。x y w h scale local alpha vis depth） | **5.68e-14**（倍精度の粒） |
| 本物の DOM の矩形（`getBoundingClientRect`） | **0.00px** |

描かなかった泡（`display:none`）は矩形が 0 になるので、**顔ぶれを突き合わせてから**
描いたものだけ px で比べている。

## ここにあるもの

| | |
|---|---|
| `draw.ts` | 配置 → DOM の属性（**純関数**。React も DOM も要らない）。ラボが書く文字列を1字ずつ同じに作る |
| `field-css.ts` | 泡の見た目（ラボの `<style>` の泡の所だけ） |
| `BubbleField.tsx` | 1枚の層の兄弟として平らに並べる |
| `measure-text.ts` | 題名・印の幅を測る（ラボの `measEl` と同じやり方） |
| `demo/` | ラボと突き合わせるための見本ページ（`build.mjs` で1枚の HTML に焼く。`dist/` は残さない） |

## なぜ平らな DOM か

`transform` を持つ div は stacking context を作るので、**中の泡が「親の兄弟」より手前に出られない**。
入れ子の DOM で試したときは 688 画素ぶん食い違った（`_check/flat.mjs`）。
だから**木は domain だけが持ち、DOM は平ら**。

同じ理由で `<Bubble><Bubble/></Bubble>` と書けるようにはしない ── 木が React と domain の2箇所にできる。
泡の中身は `renderBubble(id, draw) => ReactNode` で外から渡す（DECISIONS.md）。

## ★ 描く下限は、ここ（ui）にある

短辺が `drawMin`（既定 5.0px）を切った泡は描かない。**domain には入れていない** ──
`resolveWorld` の答えは下限を動かしても1バイトも変わらない（`draw.spec.ts` で見張っている）。

**いくつにするかは未決。** DECISIONS.md を参照。

## まだ無いもの




## 触れる

```tsx
const base = resolveWorld(world, viewport);          // 持ち上げる前
const input = useBubbleInput({ world, setWorld, layout: base, viewport,
                               selectedId, setSelectedId, layerRef });

<BubbleField layout={input.layout} skipGrab={input.skipGrab} marks={input.marks}
             layerRef={layerRef} {...input.handlers} ... />
```

掴む・引く・離す・ホイール・大きさの角・**②「引かずに離す＝触る」**まで入っている。
値を書くのは domain の動詞（`dragBubble` `dragFocus` `wheelZ` `resizeBubble` `commitDrop` `focusOn`）で、
ui がやるのは「何を掴んだか」を決めて**画面の量を模型の言葉に噛み砕く**ところまで。

### 受け入れ条件 ── 同じ触り方なら同じ値

`node docs/bubble-space-prototype/v5-dom/_check/react-drag.mjs`

ラボと React を **本物のマウスで、同じ座標で、同じ順に触って**、58 個の泡の値
（`size parent free order cell hist branch implicit focus`）と外の空間の焦点を突き合わせる。

| 触り方 | 何が変わったか（両方で同じ） |
|---|---|
| 自由に置く空間で引く | `memo3.free` |
| 並べ替え | `row0.order` `row1.order` |
| マス移動 | `d3.cell` `d12.cell` |
| 視点が動く空間で引く | `fish.focus` |
| **なしの空間で引く** | **何も起きない** |
| 背景を引く | `root.focus` |
| **引かずに離す（＝触る）** | `cover.focus`（値は1つも書かない） |
| ホイール | `root.focus` |
| 大きさの角 | `memo1.size` `memo1.free`（⑤ pin） |

**引いている途中の見え**（持ち上げ）も別に見ている ── 56 枚の矩形が **0.0px 差**、
描く順の食い違い 0、一番手前の泡も同じ。

### ★ ラボとの違いが1つある

ラボは引いているあいだ「解き直す → DOM に写す → DOM で当てる」を1フレームでやるが、
React は書き換えが次のフレームなので、**引いているあいだの落とし先は模型で当てる**（`hitModelAt`）。
押した瞬間だけは DOM で当てる（`pickAt`）。
上の突き合わせでは、これによる差は出ていない。

## まだ無いもの

`feature`（Redux の配線・世界線・ObjectView・`openAt`）。
補間（CSS transition）も入れていない ── 決めてはある（DECISIONS.md）が、まだ書いていない。
