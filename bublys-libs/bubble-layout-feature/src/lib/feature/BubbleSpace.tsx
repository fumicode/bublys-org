/**
 * 泡の空間 ── 世界を持ち、`bubble-layout-ui` に描かせ、url を画面にする。
 *
 * 既存 `bubbles-ui` の `BublyApp` ＋ `UniverseView` に当たる層。ただし薄い：
 * **並べ方も操作も domain と ui が持っている**ので、ここがやるのは
 * 「世界を持つ」「url を画面にする」「開く」の3つだけ。
 *
 * ★ 世界の置き場は外から渡せる（`world` / `onChange`）。渡さなければ自前で持つ。
 *   Redux に載せるかは、この検証のあとで決める ── CLAUDE.md の
 *   「スライスは集約のリポジトリに徹する」に沿うなら、載せるのは `WorldState` 丸ごと1つ。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent as ReactDragEvent, ReactNode } from 'react';
import { Bubble, actContext, dragBubble, emptyWorld, fitsParallel, presetView, renumber, reshape, resolveRules, resolveWorld, withAxis, withPreset } from '@bublys-org/bubble-layout';
import type { AxisView, BubbleId, BubbleWorld, ChromeId, LayoutRules, LensId, PlaneAxis, PresetId, View, Viewport } from '@bublys-org/bubble-layout';
import { BubbleField, BubbleShell, FIELD_CSS, MARKS_CSS, useBubbleInput } from '@bublys-org/bubble-layout-ui';
import type { BubbleDraw, ClaimDropInfo } from '@bublys-org/bubble-layout-ui';
import { BubbleSpaceContext, CurrentBubbleContext, ScreenZoomContext, SelectedBubbleContext, ViewChoiceContext, useScreenZoom } from './context.js';
import type { BubbleSpaceApi, ChildrenLayout, ScreenZoom, ViewChoice } from './context.js';
import { matchBubbleRoute, renderRoute, titleOf } from './routing.js';
import { FollowIcon, PinIcon, VIEW_CHOICES } from './ViewIcons.js';
import type { BubbleRoute, RoutedBubble } from './routing.js';
import { hueOf, openAt } from './openAt.js';
import { SPACE_CSS } from './space-css.js';

/** 開いた泡の覚え書き（domain には入れない） */
/** 泡の箱に対する割合（0〜1）で言う、中の一点 */
export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * **押された所を、泡の箱に対する割合で測る。**
 *
 * 中の要素は行き先を名乗っている（`data-url`）ので、開こうとしている url と同じものを
 * その泡の中から探す。見つからなければ null ── 帯は泡の箱ぜんぶから出る。
 *
 * ★ 箱も要素も同じ変換の下にあるので、割合は倍率に依らない（どちらも変換後の矩形で測る）。
 */
/**
 * **要素の矩形。** `display:contents` の要素は自分では箱を持たない（`UrledPlace` がこれ）ので、
 * 直接の子を合わせた矩形で代える ── 旧い海の `getElementRect` と同じ読み。
 */
const boxOf = (el: HTMLElement): DOMRect | null => {
  if (getComputedStyle(el).display !== "contents") return el.getBoundingClientRect();
  const kids = Array.from(el.children, (c) => c.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  if (kids.length === 0) return null;
  const left = Math.min(...kids.map((r) => r.left));
  const top = Math.min(...kids.map((r) => r.top));
  const right = Math.max(...kids.map((r) => r.right));
  const bottom = Math.max(...kids.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
};

/**
 * **押された所を、泡の箱に対する割合で測る。**
 *
 * 中の要素は行き先を名乗っている（`data-url`）ので、開こうとしている url と同じものを
 * その泡の中から探す。見つからなければ null ── 帯は泡の箱ぜんぶから出る。
 *
 * ★ 箱も要素も同じ変換の下にあるので、割合は倍率に依らない（どちらも変換後の矩形で測る）。
 * ★ 世界線つきの url（`<base>@<node>`）は節が進むたびに変わるが、押される側は base で
 *   置かれていることがある ── 見つからなければ base でもう一度探す。
 */
const spotIn = (layer: HTMLElement | null, ownerId: BubbleId | null, url: string): Spot | null => {
  if (!layer || !ownerId || typeof document === "undefined") return null;
  const owner = layer.querySelector<HTMLElement>(`[data-id="${CSS.escape(ownerId)}"]`);
  if (!owner) return null;
  const find = (u: string) => owner.querySelector<HTMLElement>(`[data-url="${CSS.escape(u)}"]`);
  const at = url.indexOf("@");
  const el = find(url) ?? (at > 0 ? find(url.slice(0, at)) : null);
  if (!el) return null;
  const ob = owner.getBoundingClientRect();
  const eb = boxOf(el);
  if (!eb || ob.width <= 0 || ob.height <= 0 || eb.width <= 0 || eb.height <= 0) return null;
  return {
    x: (eb.left - ob.left) / ob.width,
    y: (eb.top - ob.top) / ob.height,
    w: eb.width / ob.width,
    h: eb.height / ob.height,
  };
};

interface Opened {
  readonly url: string;
  readonly type: string;
  readonly openerId: BubbleId | null;
  /**
   * **押されたもの。** 一覧の札から開いたとき、`openerId` は一覧に読み替えられている
   * （置き場所を決めるのは一覧なので）。こちらは読み替える前の**札そのもの**。
   * 帯はここから出る ── 「一覧のどこから開いたか」が見えるように。
   */
  readonly originId: BubbleId | null;
  /**
   * **押されたのが泡の中の一点だったとき**、その場所。泡の箱に対する割合（0〜1）で持つ。
   *
   * ★ 割合で持つのは、レンズが掛かっても追従させるため ── 画素で覚えると、焦点が動いて
   *   泡の大きさが変わった瞬間にずれる。測るのは**開いた 1 回だけ**で、毎フレームは測らない。
   */
  readonly originSpot: Spot | null;
  /** 開いた順（新しいほど大きい） */
  readonly at: number;
}

/**
 * ★ 「同じ種類の兄弟」を探す ── 続けて開いたとき、重ねずに隣へ並べるため。
 *
 * 条件は3つ：**同じ種類**（route の type）／**同じ元の泡から開いた**／
 * **同じ窓にいる**（見えない親に入っていても、窓は同じ）。
 * いちばん最近開いたものを返す。
 */
function mateFor(
  world: BubbleWorld,
  opened: ReadonlyMap<BubbleId, Opened>,
  type: string,
  openerId: BubbleId | null,
): BubbleId | null {
  const target = openerId ? world.windowOf(world.bubble(openerId)?.space ?? 'root') : 'root';
  let best: { id: BubbleId; at: number } | null = null;
  for (const [id, o] of opened) {
    if (o.type !== type || o.openerId !== openerId) continue;
    const b = world.bubble(id);
    if (!b || world.windowOf(b.space) !== target) continue;
    if (!best || o.at > best.at) best = { id, at: o.at };
  }
  return best ? best.id : null;
}


/**
 * 端で行き過ぎる量（軸の 1 刻みに対する割合）と、その山の長さ（ms）。
 *
 * ★ `METRICS.Z_FRONT_KEEP`（0.35）より**小さく**しておく ── 焦点より手前へ出た泡は
 *   レンズが消すので、行き過ぎた瞬間に手前の札が消えてしまう。
 */
const OVERSCROLL = 0.2;
const OVERSCROLL_MS = 260;

/**
 * 一覧の並びの隙間。**0** ── 札と札のあいだは、札が自分で持つ上下の余白だけにする。
 *
 * ★ 見えている隙間は「並びの隙間 ＋ 札の上下の余白 × 2」。前は 4 ＋ 7×2 ＝ **18px** あった。
 *   縦に詰める一覧では札の余白も 1px まで薄くする（`space-css` の `.bl-packed`）ので、
 *   いまは **2px**。
 * ★ 透視（奥行きに重ねる）には掛からない ── そちらは X・Y が「なし・そのまま」なので、
 *   詰める隙間をどう変えても位置は1px も動かない。
 */
export { LIST_GAP } from './listArrange.js';
import { LIST_GAP } from './listArrange.js';

/**
 * **順序 → 行と列。** 何列で折り返すかだけ決めれば、あとは順に詰めるだけ。
 * 並べる側が測った列数を受け取り、泡が持つ `cell` に何を書くかを出す。
 */
const cellsOf = (kids: readonly Bubble[], cols: number) =>
  kids
    .slice()
    .sort((a, b) => a.state.order - b.state.order)
    .map((b, i) => ({ b, cell: { col: i % cols, row: Math.floor(i / cols) } }));

/** View が同じか（プリセットを当て直すかの判定。値はぜんぶ数か文字） */
/**
 * ★ 見るのは**並べ方が決めるもの**（次元・並べ方・レンズ）だけ。
 *   刻み（step）・隙間（gap）・取り分（reserve）は、当てたあとで外から合わせる値なので
 *   ここでは見ない ── 見ると、合わせた途端に「プリセットと違う」になって**当て直しが
 *   止まらなくなる**（実測で踏んだ：coverflow の刻みを札の幅から決めた瞬間に
 *   Maximum update depth）。それぞれの変化は呼ぶ側が別に見ている。
 */
/**
 * **人が決めた並べ方の棚。** url で覚える（泡の id は空間が変わると変わる ── `viewChoice` の註）。
 * 部品が作り直されても、人が決めたことは残る。
 */
const VIEW_CHOICE_MEMORY = new Map<string, { readonly preset?: PresetId; readonly pinned: boolean }>();

/**
 * **名前を付けた海の棚。** 部品が作り直されても、ここから中身が戻る（`memoryKey` の註）。
 * 岸の `SHORE_MEMORY`（ShoreSpace）と対になるもの ── あちらは貼ってあるもの、こちらは海。
 */
const SEA_MEMORY = new Map<
  string,
  { readonly world: BubbleWorld; readonly urls: ReadonlyMap<BubbleId, Opened>; readonly seq: number }
>();

const sameAxis = (a: AxisView, b: AxisView) =>
  a.dim === b.dim && a.arrange === b.arrange && a.lens === b.lens;
const sameView = (a: View | null, b: View) =>
  !!a && sameAxis(a.x, b.x) && sameAxis(a.y, b.y) && sameAxis(a.z, b.z);

/** 離した／ドラッグしている泡の、いまの居場所（どちらも層の座標） */
export interface TakeOutInfo {
  readonly id: BubbleId;
  readonly url: string;
  /** いま画面に写っている矩形（レンズを通したあと）。どこに落ちたかを見るのに使う */
  readonly rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /**
   * 泡が**自分で持っている大きさ**（レンズを通す前）。
   * 岸に貼るときの大きさはこちら ── 縁のほうはレンズで潰れているので、
   * 写った大きさで貼ると端に飲み込まれて消える。
   */
  readonly size: { readonly w: number; readonly h: number };
  readonly pointer: { readonly x: number; readonly y: number };
}

export interface BubbleSpaceProps {
  readonly routes: readonly BubbleRoute[];
  /**
   * どこから開いたかの帯の出し方。既定は `hover`（両端のどちらかに触れたときだけ）。
   * 海ぜんぶの見え方なので、決めるのは海を立てる側。
   */
  readonly bandDisplay?: 'hover' | 'always' | 'none';
  /** 空のときに最初に開く url */
  readonly initialUrls?: readonly string[];
  /**
   * 開くのを**外へ渡す**。渡さなければ今までどおり自分の中に開く。
   * 使うのは「海そのものが一覧になっている」とき（岸に貼った一覧）── 札から開いた詳細が
   * その小さな海の中に生えても仕方がないので、外の海へ回す。
   */
  readonly openOutside?: (url: string, openerId: BubbleId | null) => BubbleId | void;
  readonly viewport: Viewport;
  /** 外の空間の並べ方。既定は「自由に置く」（既存 bubbles-ui の宇宙と同じ） */
  readonly rootPreset?: PresetId;
  /**
   * **レンズをまかせる。** 軸ごとに「平行で置いたら中身が箱に収まるか」を見て、
   * 収まらない軸だけ魚眼にする（収まったら平行へ戻す）。
   * 泡を縦に足していって画面から溢れたら自分で魚眼Yを点ける、という手間を無くすための口。
   */
  readonly autoLens?: boolean;
  /** まかせた結果どちらになったかを知らせる（口の見た目を合わせるのに使う） */
  readonly onLens?: (axis: PlaneAxis, lens: LensId) => void;
  /**
   * **いま見えている口**（画面の座標）。岸が海に食い込んでいるときに渡す。
   *
   * 岸は海の上に重なって描かれるので、渡さないと「窓の真ん中」が岸の下に入り、
   * そこへ開いた泡の半分が岸の地に隠れる。使うのは**開いたものの行き先**だけで、
   * **海の位置も大きさも変えない** ── 変えると触っていない泡まで動いて大きさも変わる。
   */
  readonly openArea?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly drawMin?: number;
  readonly rules?: Partial<LayoutRules>;
  /** 外で世界を持つなら渡す（Redux など）。渡さなければ自前で持つ */
  readonly world?: BubbleWorld;
  readonly onChange?: (next: BubbleWorld) => void;
  /**
   * **この海に名前を付ける。** 付けると、部品が作り直されても**中身がそのまま戻る**。
   *
   * ★ 窓（空間を持つ泡）は、岸に貼り替えたり・魚眼の端で隠れたりするたびに
   *   React の部品としては作り直される。世界（`ownWorld`）と url の対応を
   *   部品の中だけで持っていると、そこで**海に浮いていた泡が丸ごと消える**
   *   （実測：グループの窓を岸に貼ると、中の一覧も札も無くなった）。
   *   岸が `SHORE_MEMORY` で貼ってあるものを覚えているのと同じことを、海にもする。
   * ★ 名前は url。同じ url の窓が 2 つあると海を分け合うが、いまは url ごとに
   *   1 つしか開けない作りなので成り立つ（岸の `persistKey` と同じ前提）。
   */
  readonly memoryKey?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** 泡の外に置くもの（ツールバーなど） */
  readonly children?: ReactNode;
  /**
   * 離したところを、空間の外（岸など）が横取りする口。
   * `true` を返したら**その泡は海から出る** ── 以後どう見せるかは横取りした側の仕事。
   */
  readonly onTakeOut?: (info: TakeOutInfo) => boolean;
  /**
   * ドラッグしている間の居場所。横取りする側が「いま離したらこうなる」を描くために使う。
   * 掴んでいないとき・離したあとは `null`。
   */
  readonly onTakeOutPreview?: (info: TakeOutInfo | null) => void;
  /**
   * **ステータスバーに置くもの**（閉じる口の隣）。泡ごとに呼ばれる。
   *
   * 枠は空間のものなので、泡の**中身**からは触れない ── 中身は自分の箱の中しか描けない。
   * 「その泡そのものをどう扱うか」の口（ロックなど）はここに差す。
   */
  readonly headerTools?: (bubble: RoutedBubble, route: BubbleRoute) => ReactNode;
}

export function BubbleSpace(props: BubbleSpaceProps) {
  const { routes, viewport, drawMin, rules, bandDisplay, className, style, children } = props;
  /**
   * 開くものの行き先 ＝ **いま見えている口**の真ん中。
   * 岸が食い込んでいなければ窓の真ん中で、今までと変わらない。
   */
  const openArea = props.openArea;
  const openCenter = useMemo(
    () => (openArea ? { x: openArea.x + openArea.w / 2, y: openArea.y + openArea.h / 2 } : undefined),
    [openArea],
  );
  const layerRef = useRef<HTMLDivElement | null>(null);
  /** 名前を付けた海の中身を、部品の一生より長く置いておく棚（`memoryKey` の註） */
  const memoryKey = props.memoryKey;
  const remembered = memoryKey ? SEA_MEMORY.get(memoryKey) : undefined;
  /** 新しい泡の番号。**覚えていた続きから**（同じ番号を配ると、戻した泡と衝突する） */
  const seq = useRef(remembered?.seq ?? 0);
  /** レンズの向きが一度でも選ばれたか。選ばれたら `openAt` はレンズに触らない */
  const lensChosen = useRef(false);
  /**
   * ★ **一覧の空間**（`setChildren` で顔ぶれを決めている泡）。
   *   一覧の中の泡から開いたら、**一覧の隣**に開く（中に生やさない）ために覚えておく。
   *   装い（`chrome`）もここを見る ── 一覧の中の札は静かにしている。
   *
   * ★ **覚え書き（ref）ではなく状態で持つ。** ref だと足しても描き直しが起きないので、
   *   装いの表（`chrome` は `world`・`urls` が変わったときだけ作り直す）が**古いまま**残る。
   *   世界が最初から揃っているとき（海の記憶からの復元・岸への貼り替え）は世界が変わらないので、
   *   札が「一覧の中」と見なされず `plain` を着たままになり、**札のあいだに装いのぶん
   *   34px の隙間が空く**（実測で踏んだ）。
   */
  const [listHosts, setListHosts] = useState<ReadonlySet<BubbleId>>(() => new Set());
  /** 一覧の空間として覚える（もう覚えていれば何もしない ── 描き直しの引き金にしない） */
  const noteListHost = useCallback((id: BubbleId) => {
    setListHosts((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  // url と種類は domain に入れない（「泡に url を持たせるか」は未決）。ここで id との対で持つ
  const [urls, setUrls] = useState<ReadonlyMap<BubbleId, Opened>>(() => remembered?.urls ?? new Map());
  const [ownWorld, setOwnWorld] = useState<BubbleWorld>(
    () => remembered?.world ?? emptyWorld(presetView(props.rootPreset ?? 'free')),
  );
  const [selectedId, setSelectedId] = useState<BubbleId | null>(null);

  const world = props.world ?? ownWorld;
  /**
   * ★ 頼るのは **`props.onChange` 1 つだけ**。`props` まるごとを頼りにすると、
   *   描くたびに新しくなる（props は毎回新しい object）ので `setWorld` も新しくなり、
   *   そこから作る開く口（`api`）まで毎回新しくなる。
   *   口を state で持つ側（例: 岸）がそれを見ていると、更新が止まらなくなる。
   */
  const onChange = props.onChange;
  const setWorld = useCallback(
    (next: BubbleWorld) => { if (onChange) onChange(next); else setOwnWorld(next); },
    [onChange],
  );

  /**
   * 名前が付いているなら、変わるたび棚へ写す（作り直されたら、そこから始まる）。
   * ★ 番号（`seq`）も一緒に置く ── 戻したあと同じ番号を配ると、泡の id が衝突する。
   */
  useEffect(() => {
    if (memoryKey) SEA_MEMORY.set(memoryKey, { world: ownWorld, urls, seq: seq.current });
  }, [memoryKey, ownWorld, urls]);

  /**
   * **このフレームの装い** ── どの泡が、どの枠を着ているか。
   *
   * > 箱 ＝ 中身 ＋ 装い（`chrome.ts`）。中身の大きさは泡が持ち、装いはここが決める。
   *
   * ★ 世界には書かない（② 触っても値は1つも書かない）。1 フレームの measure にだけ効く
   *   ── 帯も箱も焦点の約束も、着たあとの大きさで揃う。
   * ★ 前はここが「選んだ札だけ背を伸ばす px」（`SELECTED_GROW = (27+7)−(1+1)`）だった。
   *   伸ばす量は**装いの差そのもの**だったので、装いを渡せば差はひとりでに出る。
   *   一覧の札が装いを出す（選ばれる）と `packed` → `plain` になり、その差だけ箱が伸びる。
   */
  const chrome = useMemo(() => {
    const m = new Map<BubbleId, ChromeId>();
    for (const b of world.bubbles) {
      if (b.state.implicit) continue;                 // ③ 見えない親は体を持たない（模型が bare を返す）
      const url = urls.get(b.id)?.url;
      const r = url ? matchBubbleRoute(routes, url) : null;
      // 窓（中身が自分の宇宙を持つ）は帯だけ。余白は中の器が自分で取る
      if (r?.ground === 'clear') { m.set(b.id, 'bar'); continue; }
      /**
       * ★ **静かなのは「一覧の中に居て、選ばれていないとき」だけ。**
       *   装いは泡が持つ性質ではなく、**置かれた場所と、いま相手にされているか**で決まる
       *   ── 海に浮いていれば装い、岸に着けば装い無し（`bare`）、一覧の中なら静か。
       * ★ 選ばれた札は普通の泡と同じ装いになる（＝ 触れば泡として立ち上がる）。
       *   そのぶん箱は装いの差だけ伸びるので、**並びの後ろの札はそのぶん送られる**
       *   ── 中身の大きさは 1px も変わらない（`chrome.ts`）。
       */
      /**
       * ★ **root を除外しない。** 岸に貼られた一覧は**自分の小さな海**を持ち、そこでは
       *   札の親が `'root'` になる（`ListSpace` の `ShoreMembers` が `setChildren('root', …)`）。
       *   除外していたので岸の札だけ「一覧の中」と見なされず、装いが `plain` になって
       *   札のあいだに 34px（上 27 ＋ 下 7）の隙間が空いていた（実測で踏んだ）。
       *   外の海の root は `setChildren` に渡らないので `listHosts` には入らない ── 見るのはこれ 1 つでよい。
       */
      const inList = listHosts.has(b.space);
      if (!inList || b.id === selectedId) { m.set(b.id, 'plain'); continue; }
      /**
       * ★ 詰める並びのときだけ、札と札のあいだを限界まで細くする（`packed`）。
       *   奥行きに重ねる並びは軸が「そのまま」なので、細くしても後ろは動かず、
       *   触った札だけが自分の箱の中心のぶん動いて見える。
       */
      m.set(b.id, world.ownViewOf(b.space)?.y.arrange !== 'as-is' ? 'packed' : 'quiet');
    }
    return m;
  }, [world, urls, routes, selectedId, listHosts]);

  /**
   * **これ以上いけない**の跳ね返り（オーバースクロール）。
   *
   * 端は模型の決まり（`fitFocus`）なので動かせない。けれど端で回し続けても何も起きないと、
   * 効かないのか端なのか分からない ── **一瞬だけ焦点を端の向こうへ出して戻す**。
   * 山は **1 つだけ**（`sin`）。**世界には1ミリも書かない**ので、離れた所には何も残らない。
   */
  const [nudge, setNudge] = useState<ReadonlyMap<BubbleId, number> | undefined>(undefined);
  const bouncing = useRef(false);
  const overscroll = useCallback((space: BubbleId, dir: -1 | 1, step: number) => {
    if (bouncing.current) return;                      // 鳴っている最中は重ねない
    bouncing.current = true;
    const amount = dir * step * OVERSCROLL;
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / OVERSCROLL_MS;
      if (t >= 1) { setNudge(undefined); bouncing.current = false; return; }
      setNudge(new Map([[space, amount * Math.sin(Math.PI * t)]]));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // 持ち上げる前の配置。触る側（useBubbleInput）が持ち上げを当てて返す
  const base = useMemo(
    () => resolveWorld(world, viewport, rules, chrome, nudge),
    [world, viewport, rules, chrome, nudge],
  );

  /** 海から出す（岸へ渡す）。泡も url の覚えも落とす */
  const takeOut = useCallback(
    (id: BubbleId) => {
      setWorld(world.without(id));
      setUrls((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
    },
    [world, setWorld],
  );

  const claimDrop = useCallback(
    (info: ClaimDropInfo) => {
      const url = urls.get(info.id)?.url;
      if (!url || !props.onTakeOut) return false;
      const taken = props.onTakeOut({ id: info.id, url, rect: info.rect, size: info.size, pointer: info.pointer });
      if (taken) takeOut(info.id);
      return taken;
    },
    [urls, props, takeOut],
  );

  const canOpen = useCallback((url: string) => !!matchBubbleRoute(routes, url), [routes]);
  const hasUrl = useCallback((url: string) => [...urls.values()].some((o) => o.url === url), [urls]);

  const openOutside = props.openOutside;
  /**
   * **どこから開いたか。** `urls` が泡ごとに覚えている `openerId` を、帯を引く側へ渡す形にする。
   * 世界（`world`）には書かない ── 関係は「どう置くか」ではないので、置き方の模型には要らない。
   */
  const openerOf = useMemo(
    () => new Map([...urls].map(([id, u]) => [id, u.openerId ?? null] as const)),
    [urls],
  );

  /**
   * **帯の出どころ。** 押されたものが泡なら（一覧の札はそれ自体が泡）、帯はその泡から出る。
   * 一覧のどの札から開いたかが、そのまま形で見える。
   */
  const originOf = useMemo(
    () => new Map([...urls].map(([id, u]) => [id, u.originId ?? null] as const)),
    [urls],
  );

  /** 押されたのが泡の中の一点だったとき、その場所（箱に対する割合） */
  const originSpotOf = useMemo(
    () => new Map([...urls].flatMap(([id, u]) => (u.originSpot ? [[id, u.originSpot] as const] : []))),
    [urls],
  );

  const openBubble = useCallback(
    (url: string, openerId?: BubbleId | null, label?: string): BubbleId => {
      if (openOutside) return openOutside(url, openerId ?? null) || '';
      const route = matchBubbleRoute(routes, url);
      if (!route) { console.warn('route が無い url:', url); return ''; }
      seq.current += 1;
      const id = `b${seq.current}:${url}`;
      /**
       * ★ **一覧の中の札から開いたら、一覧の隣に開く。**
       *   一覧は顔ぶれが外から決まる空間なので、その中に詳細が生えても次の合わせで消える。
       *   元の泡を**一覧そのもの**に読み替えるだけでよい ── 開き方は1つのまま。
       */
      const from = openerId ?? null;
      const fb = from ? world.bubble(from) : null;
      const opener = fb && listHosts.has(fb.space) ? fb.space : from;
      const r = openAt({
        world, viewport, openerId: opener, newId: id,
        title: titleOf(routes, url, label), size: route.size, hue: route.hue, rules,
        keepLens: lensChosen.current,
        center: openCenter,
        joinWith: mateFor(world, urls, route.type, opener),
      });
      setWorld(r.world);
      const originSpot = spotIn(layerRef.current, from, url);
      setUrls((m) => new Map(m).set(id, { url, type: route.type, openerId: opener, originId: from, originSpot, at: seq.current }));
      setSelectedId(id);
      return id;
    },
    [routes, world, urls, viewport, rules, setWorld, openOutside, openCenter],
  );

  const closeBubble = useCallback(
    (id: BubbleId) => {
      /**
       * ★ 閉じるも **reshape を通す**。直に world.without(id) すると、
       *   ③「並びは2つ以上」が効かず、中身が1つになった見えない親が残る
       *   ── そうなるとその泡は並びの中に閉じこめられて、ヘッダをドラッグしても動かなくなる。
       *   （v6 で踏んだ。値を消すときも、規則の通り道を外れてはいけない）
       */
      const seen = new Map(
        base.order.map((p) => [p.id, { x: p.x, y: p.y, w: p.box.w, h: p.box.h, scale: p.scale }]),
      );
      /**
       * ★ ⑤ 並びの中の泡を閉じたら、**残った先頭の泡を留める**。
       *   reshape は「泡が出ていって縮んだ並び」の先頭を自分で留めるが、見つけ方が
       *   「親が変わった泡」からなので、**消えた泡は数に入らない**（ラボには泡を消す口が無かった）。
       *   留めないと、並びは箱の中心が位置なので、縮んだ幅の半分だけ兄弟がずれる
       *   （v7 で踏んだ：300px の詳細を1つ閉じると、触っていない兄弟が 150px 動いた。旧は動かない）。
       */
      const row = world.rowOf(id);
      const heir = row
        ? world.kidsOf(row.id).filter((b) => b.id !== id).sort((p, q) => p.state.order - q.state.order)[0]?.id
        : undefined;
      let next = reshape(world, actContext(viewport, seen, rules), (w) => ({ world: w.without(id), keep: heir ? [heir] : [] })).world;
      // 面で開いているなら：焦点の面が空になったら、後ろの面が上がってくる（旧の「空のレイヤーは詰まる」）
      setWorld(next);
      setUrls((m) => { const n = new Map(m); n.delete(id); return n; });
      setSelectedId((s) => (s === id ? null : s));
    },
    [world, setWorld, base, viewport, rules],
  );

  /**
   * 外の空間のレンズを変える。書くのは View の 1 つの軸だけ（泡の値は 1 つも書かない）。
   * 一度でも選ばれたら、以後 `openAt` はレンズに触らない（選んだ向きが残る）。
   */
  const setLens = useCallback(
    (axis: PlaneAxis, lens: LensId) => {
      lensChosen.current = true;
      setWorld(withAxis(world, 'root', axis, { lens }));
    },
    [world, setWorld],
  );

  /**
   * 岸から海へ返す。置いたあと、**画面のその矩形に見えるように**動かす
   * ── 動かし方は掴んで動かすのと同じ（`dragBubble`）なので、新しい規則は要らない。
   */
  const takeIn = useCallback(
    (url: string, rect: { x: number; y: number; w: number; h: number }): BubbleId => {
      const route = matchBubbleRoute(routes, url);
      if (!route) { console.warn('route が無い url:', url); return ''; }
      seq.current += 1;
      const id = `b${seq.current}:${url}`;
      const at = seq.current;
      const opened = openAt({
        world, viewport, openerId: null, newId: id, title: titleOf(routes, url),
        size: { w: rect.w, h: rect.h }, hue: route.hue, rules, keepLens: lensChosen.current,
        center: openCenter,
      });
      const L = resolveWorld(opened.world, viewport, rules);
      const p = L.byId.get(id);
      setWorld(
        p
          ? dragBubble(
              opened.world,
              { layout: L, id, space: 'root', want: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }, m: p.m },
              resolveRules(rules),
            )
          : opened.world,
      );
      setUrls((m) => new Map(m).set(id, { url, type: route.type, openerId: null, originId: null, originSpot: null, at }));
      return id;
    },
    [routes, world, viewport, rules, setWorld, openCenter],
  );

  /**
   * **人が選んだ並べ方**（一覧の口から）と、**箱と並べ方が追いかけ合うか**。
   *
   * ```
   * 追いかけ合う（既定）  箱を変えたら → その箱に合う並べ方へ ／ 並べ方を選んだら → その大きさへ
   * 留める                箱をどう変えても並べ方は変わらない
   * ```
   *
   * ★ **覚えるのは url。泡の id ではない。** 同じ一覧でも、海から岸へ貼り替えれば
   *   別の空間で作り直されて id が変わる ── id で覚えていると、**留めたはずの並べ方が
   *   岸化した途端にほどける**（実測で踏んだ）。url なら、海でも岸でも窓の中でも
   *   同じ答えが付いてくる。
   * ★ 部品の一生より長く持つ（`VIEW_CHOICE_MEMORY`）── 作り直されるのは部品であって、
   *   人が決めたことではない。
   * ★ **覚えるだけ。世界には書かない。** 書くのは一覧の `setChildren` 1 か所
   *   ── そこで並べ方と一緒に**隙間・送り幅・折り返す列数・札の幅**がまとめて当たる。
   *   ここで `withPreset` を直に書いていたころは、そのあと `setChildren` が
   *   「もう当たっている」と判断して**隙間が既定の 14 に戻ったまま**だった（実測で踏んだ）。
   */
  const [viewTick, setViewTick] = useState(0);
  /** 覚える名前 ＝ その泡の url（まだ url が分からなければ id で代用） */
  const viewKey = useCallback((hostId: BubbleId) => urls.get(hostId)?.url ?? hostId, [urls]);
  const chooseView = useCallback(
    (hostId: BubbleId, preset: PresetId | null) => {
      const key = viewKey(hostId);
      const now = VIEW_CHOICE_MEMORY.get(key);
      if ((now?.preset ?? null) === preset) return;
      VIEW_CHOICE_MEMORY.set(key, { pinned: !!now?.pinned, preset: preset ?? undefined });
      setViewTick((t) => t + 1);
    },
    [viewKey],
  );
  const toggleFollows = useCallback(
    (hostId: BubbleId) => {
      const key = viewKey(hostId);
      const now = VIEW_CHOICE_MEMORY.get(key);
      const pinned = !now?.pinned;
      // ★ 追いかけ合うほうへ戻したら、留めていた並べ方は**解く** ── でないと
      //   「箱を変えたら並べ方が付いてくる」が、次に箱を変えるまで効かない
      VIEW_CHOICE_MEMORY.set(key, { pinned, preset: pinned ? now?.preset : undefined });
      setViewTick((t) => t + 1);
    },
    [viewKey],
  );
  const viewChoice = useMemo<ViewChoice>(
    () => ({
      chosen: (hostId) => VIEW_CHOICE_MEMORY.get(viewKey(hostId))?.preset,
      choose: chooseView,
      follows: (hostId) => !VIEW_CHOICE_MEMORY.get(viewKey(hostId))?.pinned,
      toggleFollows,
    }),
    // viewTick ── 棚（モジュールの Map）を書き換えたことを、見ている側へ知らせる
    [viewKey, chooseView, toggleFollows, viewTick],
  );

  /** その空間の並べ方を選ぶ。焦点は 0 に戻る（模型の `withPreset` の決まり） */
  const setPreset = useCallback(
    (preset: PresetId, spaceId: BubbleId = 'root') => {
      // ★ レンズの選択を固定するのは**外の海**を選んだときだけ。
      //   一覧が自分の中の並べ方を選んだだけで、外の魚眼まで止めてしまってはいけない
      if (spaceId === 'root') lensChosen.current = true;
      setWorld(withPreset(world, preset, spaceId));
    },
    [world, setWorld],
  );

  /**
   * その泡の**子**を、この url たちに合わせる ── 一覧の空間。
   *
   * ★ 入れ子の海ではなく、**同じ世界の中の子の空間**にする（議事録（版）と同じ形）。
   *   こうすると消失点も子の空間のものになり、奥へ行くほど左上へ退く。
   *   掴んで外へ出す・ホイール・焦点も、ぜんぶ同じ道具がそのまま効く。
   * ★ 顔ぶれが同じなら**何も書かない** ── 書くと次の走りの引き金になって止まらない。
   */
  const setChildren = useCallback(
    (hostId: BubbleId, want: readonly string[], how: ChildrenLayout = {}) => {
      const { preset, itemWidth, reserve, step, cols, grow } = how;
      noteListHost(hostId);
      const kids = world.kidsOf(hostId);
      const urlOfKid = (id: BubbleId) => urls.get(id)?.url;
      const have = new Set(kids.map((k) => urlOfKid(k.id)).filter(Boolean) as string[]);
      const missing = want.filter((url) => !have.has(url));
      const extra = kids.filter((k) => { const u = urlOfKid(k.id); return !u || !want.includes(u); }).map((k) => k.id);
      /**
       * ★ 「もう当ててあるか」は**世界に訊く**。覚え書き（ref）で持つと、
       *   同じ描画で2回走ったとき（React の二度がけ）1回目が覚え書きだけ書き換えて、
       *   まだ state に落ちていない世界へ2回目が走り、**並べ方が当たらないまま**残る
       *   ── 実測で踏んだ（札が5枚とも同じ所に原寸で重なった）。
       */
      const presetChanged = !!preset && !sameView(world.ownViewOf(hostId), presetView(preset));
      /** ★ 幅も見る ── 並べ方が同じでも、透視と詰めるで札の幅が変わることがある */
      const widthChanged = !!itemWidth && kids.some((k) => k.state.size.w !== itemWidth);
      /** ★ 取り分も見る ── 口の大きさは描いてから測るので、後から決まる */
      const shiftChanged = (world.ownViewOf(hostId)?.y.reserve ?? 0) !== (reserve ?? 0);
      /** ★ 送り幅も見る ── coverflow の刻みは**札の大きさから決まる**ので、箱が変われば後から変わる */
      const own = world.ownViewOf(hostId);
      const stepChanged = !!step && (['x', 'y'] as const).some(
        (axis) => step[axis] !== undefined && own?.[axis].step !== step[axis],
      );
      /** ★ 箱が伸びるかも見る（見る側が切り替える） */
      const growChanged = grow !== undefined && ((own?.x.grow ?? true) !== grow || (own?.y.grow ?? true) !== grow);
      /** ★ 折り返す列数も見る ── 箱が広がれば 1 行に入る枚数が変わる */
      const cellsChanged = !!cols && cellsOf(kids, cols).some(({ b, cell }) =>
        b.state.cell.col !== cell.col || b.state.cell.row !== cell.row,
      );
      if (
        missing.length === 0 && extra.length === 0 &&
        !presetChanged && !widthChanged && !shiftChanged && !stepChanged && !cellsChanged && !growChanged
      ) return;
      let w = world;
      let n = seq.current;
      const m = new Map(urls);
      for (const id of extra) { w = w.without(id); m.delete(id); }
      for (const url of missing) {
        const route = matchBubbleRoute(routes, url);
        if (!route) continue;
        n += 1;
        const id = `b${n}:${url}`;
        const size = route.size ?? { w: 280, h: 120 };
        const w0 = itemWidth ?? size.w;
        w = w.add(Bubble.create({
          id, title: titleOf(routes, url), hue: route.hue ?? hueOf(id),
          // 外の海そのものを一覧にすることもある（岸に貼った一覧）。root は親 null
          w: w0, h: size.h, parent: hostId === 'root' ? null : hostId,
          order: w.kidsOf(hostId).length,
        }));
        m.set(id, { url, type: route.type, openerId: hostId, originId: hostId, originSpot: null, at: n });
      }
      /**
       * ★ 順序を 0.. に詰め直す。足すときの順序は「いまの子の数」なので、
       *   **途中の札を消すと穴が空いたまま**になる（0,1,2,3,4 から 0 を消すと 1..4）。
       *   奥行きに重ねる並びは順序がそのまま奥行きなので、穴のぶんだけ
       *   **並び全体が奥に沈んだまま**になり、いちばん手前まで繰っても前へ出てこない。
       *   前後の関係は変えない（いまの順序で並べ直すだけ）。
       */
      w = renumber(
        w,
        w.kidsOf(hostId).slice().sort((a, b) => a.state.order - b.state.order).map((b) => b.id),
      );
      /**
       * ★ 並べ方も**この同じ1回**で当てる（別の書き込みにすると片方が握り潰される）。
       *   隙間は既定（14）より詰める ── 札は自分で上下 7px の余白を持っているので、
       *   既定のままだと札と札のあいだが 28px も開いて一覧がすかすかになる。
       */
      if (preset && presetChanged) {
        w = withPreset(w, preset, hostId);
        for (const axis of ['x', 'y'] as const) w = withAxis(w, hostId, axis, { gap: LIST_GAP });
      }
      // 口の場所は並びの始端に空けておく（ListSpace の註）。口は描いてから測るので、
      // 並べ方が変わっていなくても後から決まることがある
      if (shiftChanged) w = withAxis(w, hostId, 'y', { reserve: reserve ?? 0 });
      /**
       * 「等間隔」の刻み ── coverflow の送り幅。**札の幅に対する割合**で決まる（`listArrange`）ので、
       * プリセットが持っている値（ラボの写真の 68）では札に対して狭すぎる。ここで当て直す。
       */
      if (grow !== undefined && (presetChanged || growChanged)) {
        for (const axis of ['x', 'y'] as const) w = withAxis(w, hostId, axis, { grow });
      }
      if (step) {
        for (const axis of ['x', 'y'] as const) {
          const v = step[axis];
          if (v !== undefined) w = withAxis(w, hostId, axis, { step: v });
        }
      }
      /**
       * **折り返し** ── 順序から行と列を書く。
       *
       * ★ 折り返す幅（何列か）は**箱の話**なので、View ではなく渡す側が決める。
       *   軸に刺さっているのは「列」と「行」で、そこに**どんな値が入っているか**は
       *   泡が持つ（`cell`）── 並べ方は読むだけ、という形を崩さない。
       */
      if (cols) {
        for (const { b, cell } of cellsOf(w.kidsOf(hostId), cols)) {
          if (b.state.cell.col !== cell.col || b.state.cell.row !== cell.row) w = w.withBubble(b.withCell(cell));
        }
      }
      /**
       * ★ 札の幅も**この同じ1回**で当てる。並べ方で変わる ── 詰める並びは箱いっぱい、
       *   透視は細くして後ろの札の肩を出す（`ListSpace` の `LIST_DEPTH_INSET`）。
       */
      if (itemWidth) {
        for (const k of w.kidsOf(hostId))
          if (k.state.size.w !== itemWidth) w = w.withBubble(k.withSize({ w: itemWidth, h: k.state.size.h }));
      }
      seq.current = n;
      setUrls(m);
      setWorld(w);
    },
    [world, urls, routes, setWorld, noteListHost],
  );

  /** その泡が入っている空間（＝ 親の泡）。子から「外へ開く」ときに要る */
  const hostOf = useCallback(
    (id: BubbleId) => { const b = world.bubble(id); return b && b.space !== 'root' ? b.space : null; },
    [world],
  );

  /** その泡が自分で持っている大きさ（中身で伸びる前の値） */
  const sizeOf = useCallback(
    (id: BubbleId) => world.bubble(id)?.state.size ?? null,
    [world],
  );

  /**
   * その泡の自前の大きさを書く。**並べ方に合う大きさへ**（`follows`）だけが呼ぶ。
   * 同じ値なら何も書かない ── 書くと次の走りの引き金になる。
   */
  const setSize = useCallback(
    (id: BubbleId, size: { w: number; h: number }) => {
      const b = world.bubble(id);
      if (!b) return;
      const now = b.state.size;
      if (Math.abs(now.w - size.w) < 0.5 && Math.abs(now.h - size.h) < 0.5) return;
      setWorld(world.withBubble(b.withSize({ w: Math.round(size.w), h: Math.round(size.h) })));
    },
    [world, setWorld],
  );

  /**
   * その泡が置ける広さ ── 入っている空間の中身の大きさ。いちばん外なら画面そのもの。
   * 「その並べ方に合う大きさ」の頭打ちに使う（海より大きい箱は置けない）。
   */
  const roomOf = useCallback(
    (id: BubbleId) => {
      const host = hostOf(id);
      const own = host ? world.bubble(host)?.state.size : null;
      return own ?? { w: viewport.w, h: viewport.h };
    },
    [world, hostOf, viewport],
  );


  /**
   * ★ **レンズをまかせる。**
   *
   *   見るのは「**平行に置いたら**収まるか」（`fitsParallel`）── いまのレンズは見ない。
   *   魚眼は必ず収めてしまうので、それで判ると点けた途端に「収まった」ことになり、
   *   点けたり消したりが止まらない。平行のときの広がりはレンズを変えても動かないので、
   *   書いた結果で判定が裏返ることがない ＝ ここで落ち着く。
   */
  const autoLens = props.autoLens;
  const onLens = props.onLens;
  useEffect(() => {
    if (!autoLens) return;
    const L = base.spaces.get('root');
    if (!L) return;
    for (const axis of ['x', 'y'] as const) {
      const want: LensId = fitsParallel(L, axis) ? 'parallel' : 'fisheye';
      // 口の見た目は**いつも**合わせる（変えたときだけだと、点けた瞬間の姿がずれる）
      onLens?.(axis, want);
      if (L.view[axis].lens !== want) setLens(axis, want);
    }
  }, [autoLens, base, setLens, onLens]);

  const api: BubbleSpaceApi = useMemo(
    () => ({ openBubble, closeBubble, urlOf: (id) => urls.get(id)?.url ?? null, canOpen, hasUrl, setLens, setPreset, setChildren, hostOf, sizeOf, setSize, roomOf, takeIn }),
    [openBubble, closeBubble, urls, canOpen, hasUrl, setLens, setPreset, setChildren, hostOf, sizeOf, setSize, roomOf, takeIn],
  );

  /**
   * 空なら最初の url を開く（1回だけ）。
   *
   * ★ **描いている最中に書かない。** 前はここを render の中でやっていて、
   *   「別のコンポーネントを描いている最中にこのコンポーネントを更新した」と React に叱られていた
   *   （入れ子の海だと、外の海を描いている最中に中の海が種を撒くので必ず起きる）。
   *   置いたあとに 1 回だけ撒く ── 最初の一瞬だけ海が空になるが、値は同じところへ落ちる。
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || world.bubbles.length > 0 || !props.initialUrls?.length) return;
    seeded.current = true;
    let w = world;
    let n = seq.current;
    const m = new Map(urls);
    for (const url of props.initialUrls) {
      const route = matchBubbleRoute(routes, url);
      if (!route) continue;
      n += 1;
      const id = `b${n}:${url}`;
      w = openAt({ world: w, viewport, openerId: null, newId: id,
                   title: titleOf(routes, url), size: route.size, hue: route.hue, rules, keepLens: lensChosen.current }).world;
      m.set(id, { url, type: route.type, openerId: null, originId: null, originSpot: null, at: n });
    }
    seq.current = n;
    setUrls(m);
    setWorld(w);
    // 撒くのは置いたあと 1 回だけ。以後は開く／閉じるが世界を進める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 中身を持つ泡は、ヘッダでだけ掴める（本文は中身のもの。既存 bubbles-ui と同じ）
  const hasContent = useCallback((id: BubbleId) => urls.has(id), [urls]);
  const onDragInfo = useCallback(
    (info: ClaimDropInfo | null) => {
      if (!props.onTakeOutPreview) return;
      if (!info) { props.onTakeOutPreview(null); return; }
      const url = urls.get(info.id)?.url;
      props.onTakeOutPreview(url ? { id: info.id, url, rect: info.rect, size: info.size, pointer: info.pointer } : null);
    },
    [props, urls],
  );

  /**
   * **画面2はいちばん外のひとつきり。**
   *
   * 入れ子の海（窓の中・岸に貼った一覧）は、自分では寄りを持たず、外の画面へ渡す
   * ── 海ごとに持つと掛け算になる（実測：窓の中で1回まわすと 2 倍 × 2 倍 ＝ 4 倍に写った）。
   * 外に画面が無ければ、自分がいちばん外 ＝ 自分の世界が寄りを持つ。
   */
  const outerScreen = useScreenZoom();
  const screen: ScreenZoom = useMemo(
    () => outerScreen ?? { zoom: world.zoom, setZoom: (z: number) => setWorld(world.withZoom(z)) },
    [outerScreen, world, setWorld],
  );

  const input = useBubbleInput({
    world, setWorld, layout: base, viewport, selectedId, setSelectedId, drawMin, rules, chrome,
    layerRef, hasContent, claimDrop, onDragInfo,
    zoom: screen.zoom, setZoom: screen.setZoom, onOverscroll: overscroll,
  });

  const headerTools = props.headerTools;
  const renderBubble = useCallback(
    (id: BubbleId, draw: BubbleDraw) => {
      const url = urls.get(id)?.url;
      /**
       * ★ url を持たない泡＝**見えない親（並び）**。ここで `null` を返すと、
       *   点線の枠も札も、掴むための縁（外周12px）も描かれず、
       *   **兄弟たちをまとめて動かせなくなる**（v6 で踏んだ）。
       *   ラボと同じ見本（`BubbleShell`）に任せる ── ③ 見えない親は外周でしか掴めない。
       */
      if (!url) return <BubbleShell draw={draw} />;
      const r = renderRoute(routes, id, url);
      /**
       * ★ **一覧の中の札は、選んでいるものだけ url を出す。**
       *   一覧は「どれを選ぶか」を見る画面なので、札ごとに uuid が並ぶと中身が読めない。
       *   消すのではなく**選んだものにだけ出す**ので、どこの何かは要るときに分かる。
       *   出し分けは CSS（`.bub.sel` が付いている）に任せる ── 選び直しのたびに
       *   描き直さなくて済む。
       */
      const space = world.bubble(id)?.space;
      const inList = !!space && listHosts.has(space);
      /**
       * ★ その一覧が**縦に詰めている**か（奥行きに重ねるのではなく）。
       *   詰める並びのときだけ札の上下の余白を薄くする ── 透視は 1px も動かさない。
       */
      const packed = inList && world.ownViewOf(space)?.y.arrange !== 'as-is';
      /**
       * ★ **奥行きに重ねた札は、中を送らない。**
       *   透視の札は後ろの肩を出すために**わざと細くしてある**（`LIST_DEPTH_INSET`）ので、
       *   中身が枠に入らない ── そのままだと札 1 枚ずつに送り棒（スクロールバー）が出て、
       *   字が縦に折り返す（実測の姿）。ここで送りたいのは**重なりの奥行き**であって
       *   札の中身ではないので、入らないぶんは切る。
       */
      const deep = inList && !packed;
      return (
        <>
          <div className="hd" />
          {/*
            ★ 枠に出すのは **url**（題名ではない）。既存 bubbles-ui の泡と同じ。
              中身は自分の題名を自分で出すので、枠にも題名を出すと二重になる
              ── v6 の検証で最初に見つかったのがこれ。
          */}
          <div className={'ttl bl-url' + (inList ? ' bl-quiet' : '')}>
            {url.split("/").map((seg, i) => (
              <span key={i} className="bl-seg">
                {i > 0 && <span className="bl-sep">/</span>}
                {seg}
              </span>
            ))}
          </div>
          {/*
            ★ **一覧の泡には、並べ方の口を枠の上に出す**（仮の置き場所）。
              一覧かどうかは「自分で子を並べているか」で分かる（`setChildren` を呼んだ泡）。
              ステータスバーの中はもう url と閉じるとロックで埋まっているので、
              7 つ並べる場所が無い ── まずは外に出して形を見る。
          */}
          {listHosts.has(id) && (
            <div className="bl-view" onPointerDown={(e) => e.stopPropagation()}>
              {VIEW_CHOICES.map((v) => (
                <button
                  key={v.id}
                  className={'bl-view-pick' + (v.gapBefore ? ' bl-view-gap' : '')}
                  title={v.label}
                  aria-pressed={sameView(world.ownViewOf(id), presetView(v.id))}
                  onPointerDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onClick={() => chooseView(id, v.id)}
                >
                  <v.Icon />
                </button>
              ))}
              {/*
                ★ **箱と並べ方が追いかけ合うか。**

                  点いている（追いかけ合う）  箱を変えたら → その箱に合う並べ方へ
                                              並べ方を選んだら → その並べ方に合う大きさへ
                  消えている（留める）        箱をどう変えても並べ方は変わらない

                ★ **どちらでも箱は人のもの。** 追いかけ合う側も「箱を変えたら並べ方が付いてくる」
                  であって、箱の大きさを人から取り上げるのではない。
                  （前はここが「箱を中身に合わせて広げる」の切り替えになっていて、
                  点けていると**中身より小さくできない箱**になっていた。）
                ★ 並べ方の 7 つと同じで、**点いている＝それが効いている**。
              */}
              <button
                className="bl-view-pick bl-view-apart"
                title={
                  !viewChoice.follows(id)
                    ? '並べ方を留める ── 箱を変えても切り替わらない（押すと 追いかけ合う）'
                    : '箱と並べ方が追いかけ合う ── 箱を変えたら並べ方が、並べ方を選んだら大きさが変わる（押すと 留める）'
                }
                aria-pressed={viewChoice.follows(id)}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onClick={() => toggleFollows(id)}
              >
                {viewChoice.follows(id) ? <FollowIcon /> : <PinIcon />}
              </button>
            </div>
          )}
          {r && headerTools?.(r.bubble, r.route)}
          <button
            className="bl-close"
            title="閉じる"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => closeBubble(id)}
          >×</button>
          <div
            className={
              'bl-body' +
              (r?.route.ground === 'clear' ? ' bl-clear' : r?.route.ground === 'none' ? ' bl-none' : '') +
              /**
               * ★ 一覧の札の中身は、静かなあいだは上 7px から（`bl-tight`）、
               *   縦に詰める並びなら 1px（`bl-packed`）。**装いを出した札**だけ、
               *   帯のぶん 27px から始める（`bl-grown`）── 中身の大きさは変わらない。
               */
              (inList ? ' bl-tight' : '') +
              (packed ? ' bl-packed' : '') +
              (deep ? ' bl-cut' : '') +
              (inList && chrome.get(id) === 'plain' ? ' bl-grown' : '')
            }
          >
            {r
              ? <CurrentBubbleContext.Provider value={id}><r.route.Component bubble={r.bubble} /></CurrentBubbleContext.Provider>
              : <div className="bl-noroute">route が無い<br />{url}</div>}
          </div>
        </>
      );
    },
    [routes, urls, closeBubble, world, chrome, headerTools, viewChoice, listHosts],
  );

  /** 宇宙に落とす ── ダブルクリックと同じ道（`openBubble` の元が違うだけ） */
  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      const url = e.dataTransfer.getData('application/x-bubble-url') || e.dataTransfer.getData('text/uri-list');
      if (!url || !canOpen(url)) return;
      e.preventDefault();
      const opener = e.dataTransfer.getData('application/x-bubble-opener') || null;
      openBubble(url, opener);
    },
    [canOpen, openBubble],
  );

  return (
    <BubbleSpaceContext.Provider value={api}>
      <ViewChoiceContext.Provider value={viewChoice}>
      <ScreenZoomContext.Provider value={screen}>
      <SelectedBubbleContext.Provider value={selectedId}>
      <style>{FIELD_CSS + MARKS_CSS + SPACE_CSS}</style>
      <div
        className={'bl-space' + (className ? ' ' + className : '')}
        style={{ position: 'relative', width: viewport.w, height: viewport.h, overflow: 'hidden', ...style }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-bubble-url')) e.preventDefault(); }}
        onDrop={onDrop}
      >
        <BubbleField
          bandDisplay={bandDisplay}
          openerOf={openerOf}
          originOf={originOf}
          originSpotOf={originSpotOf}
          world={world}
          layout={input.layout}
          viewport={viewport}
          drawMin={drawMin}
          selectedId={selectedId}
          skipGrab={input.skipGrab}
          dragging={input.dragging}
          marks={input.marks}
          layerRef={layerRef}
          renderBubble={renderBubble}
          {...input.handlers}
        />
        {children}
      </div>
      </SelectedBubbleContext.Provider>
      </ScreenZoomContext.Provider>
      </ViewChoiceContext.Provider>
    </BubbleSpaceContext.Provider>
  );
}
