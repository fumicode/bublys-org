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
import type { AxisView, BubbleId, BubbleWorld, LayoutRules, LensId, PlaneAxis, PresetId, View, Viewport } from '@bublys-org/bubble-layout';
import { BubbleField, BubbleShell, FIELD_CSS, MARKS_CSS, useBubbleInput } from '@bublys-org/bubble-layout-ui';
import type { BubbleDraw, ClaimDropInfo } from '@bublys-org/bubble-layout-ui';
import { BubbleSpaceContext, CurrentBubbleContext, ScreenZoomContext, SelectedBubbleContext, useScreenZoom } from './context.js';
import type { BubbleSpaceApi, ScreenZoom } from './context.js';
import { matchBubbleRoute, renderRoute, titleOf } from './routing.js';
import type { BubbleRoute } from './routing.js';
import { hueOf, openAt } from './openAt.js';
import { SPACE_CSS } from './space-css.js';

/** 開いた泡の覚え書き（domain には入れない） */
interface Opened {
  readonly url: string;
  readonly type: string;
  readonly openerId: BubbleId | null;
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
 * 選んだ札が伸びる高さ ＝ **中身のまわりの余白の差**。
 *
 * 縦に詰める一覧の札は、静かなときは上下 1px（札と札のあいだを限界まで細くするため。
 * space-css の `.bl-packed`）。**選んで泡になったら**、上は装いのぶん 27px、
 * 下は**左右と同じ 7px**（`.bl-grown`）。
 *
 * ★ その差だけ札の背が伸びれば、**中身の高さは変わらない** ── 選び直すたびに札の中が
 *   伸び縮みするのを避けたいので、こうする。伸びたぶんは**並びの後ろがずれて**吸収する。
 * ★ CSS と同じ数。片方だけ変えると中身が伸び縮みする。
 */
const SELECTED_GROW = (27 + 7) - (1 + 1);

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
export const LIST_GAP = 0;

/** View が同じか（プリセットを当て直すかの判定。値はぜんぶ数か文字） */
const sameAxis = (a: AxisView, b: AxisView) =>
  a.dim === b.dim && a.arrange === b.arrange && a.lens === b.lens && a.step === b.step;
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
}

export function BubbleSpace(props: BubbleSpaceProps) {
  const { routes, viewport, drawMin, rules, className, style, children } = props;
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
  const seq = useRef(0);
  /** レンズの向きが一度でも選ばれたか。選ばれたら `openAt` はレンズに触らない */
  const lensChosen = useRef(false);
  /**
   * ★ **一覧の空間**（`setChildren` で顔ぶれを決めている泡）。
   *   一覧の中の泡から開いたら、**一覧の隣**に開く（中に生やさない）ために覚えておく。
   */
  const listHosts = useRef<Set<BubbleId>>(new Set());

  // url と種類は domain に入れない（「泡に url を持たせるか」は未決）。ここで id との対で持つ
  const [urls, setUrls] = useState<ReadonlyMap<BubbleId, Opened>>(new Map());
  const [ownWorld, setOwnWorld] = useState<BubbleWorld>(() => emptyWorld(presetView(props.rootPreset ?? 'free')));
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
   * ★ **選んだ札だけ、ヘッダのぶん背が伸びる。**
   *
   * 一覧の札は、選んでいないあいだ装いを出さない（`bl-quiet`）ので、中身が
   * ヘッダのぶんまで広がっている。選んだときに中身を縮めて場所を作ると、
   * 選び直すたびに札の中が伸び縮みして落ち着かない ── **札のほうが伸びて、
   * 並びの後ろがそのぶんずれる**ほうが素直。
   *
   * ★ 世界には書かない（② 触っても値は1つも書かない）。1 フレームの measure に
   *   だけ効く `grown` で渡す ── 帯も箱も焦点の約束も、伸びたあとの大きさで揃う。
   */
  const grown = useMemo(() => {
    const b = selectedId ? world.bubble(selectedId) : null;
    if (!b || b.space === 'root' || !listHosts.current.has(b.space)) return undefined;
    /**
     * ★ 伸ばすのは、並びが**そのぶん詰め直す**並べ方のときだけ（縦に並べる）。
     *   奥行きに重ねる並びは軸が「そのまま」なので、伸ばしても後ろは動かず、
     *   **選んだ札だけが自分の箱の中心のぶん動く** ── 触っただけで札がずれて見える。
     *   重ねる並びでは、位置はそのままで装いだけを付ける。
     */
    const v = world.ownViewOf(b.space);
    if (!v || v.y.arrange === 'as-is') return undefined;
    return new Map([[b.id, SELECTED_GROW]]);
  }, [selectedId, world]);

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
    () => resolveWorld(world, viewport, rules, grown, nudge),
    [world, viewport, rules, grown, nudge],
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
      const opener = fb && fb.space !== 'root' && listHosts.current.has(fb.space) ? fb.space : from;
      const r = openAt({
        world, viewport, openerId: opener, newId: id,
        title: titleOf(routes, url, label), size: route.size, hue: route.hue, rules,
        keepLens: lensChosen.current,
        center: openCenter,
        joinWith: mateFor(world, urls, route.type, opener),
      });
      setWorld(r.world);
      setUrls((m) => new Map(m).set(id, { url, type: route.type, openerId: opener, at: seq.current }));
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
      setUrls((m) => new Map(m).set(id, { url, type: route.type, openerId: null, at }));
      return id;
    },
    [routes, world, viewport, rules, setWorld, openCenter],
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
    (hostId: BubbleId, want: readonly string[], preset?: PresetId, itemWidth?: number, reserve?: number) => {
      listHosts.current.add(hostId);
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
      if (missing.length === 0 && extra.length === 0 && !presetChanged && !widthChanged && !shiftChanged) return;
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
        m.set(id, { url, type: route.type, openerId: hostId, at: n });
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
    [world, urls, routes, setWorld],
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
    () => ({ openBubble, closeBubble, urlOf: (id) => urls.get(id)?.url ?? null, canOpen, hasUrl, setLens, setPreset, setChildren, hostOf, sizeOf, takeIn }),
    [openBubble, closeBubble, urls, canOpen, hasUrl, setLens, setPreset, setChildren, hostOf, sizeOf, takeIn],
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
      m.set(id, { url, type: route.type, openerId: null, at: n });
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
    world, setWorld, layout: base, viewport, selectedId, setSelectedId, drawMin, rules, grown,
    layerRef, hasContent, claimDrop, onDragInfo,
    zoom: screen.zoom, setZoom: screen.setZoom, onOverscroll: overscroll,
  });

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
      const inList = !!space && listHosts.current.has(space);
      /**
       * ★ その一覧が**縦に詰めている**か（奥行きに重ねるのではなく）。
       *   詰める並びのときだけ札の上下の余白を薄くする ── 透視は 1px も動かさない。
       */
      const packed = inList && world.ownViewOf(space)?.y.arrange !== 'as-is';
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
               * ★ 一覧の札の中身は**いつも上 7px から**（`bl-tight`）。
               *   背が伸びた札だけ、ヘッダのぶん 27px から始める（`bl-grown`）。
               *   こうしておくと、伸びない並べ方（奥行きに重ねる）で選んでも
               *   中身の大きさも場所も変わらない ── 装いが付くだけになる。
               */
              (inList ? ' bl-tight' : '') +
              (packed ? ' bl-packed' : '') +
              (grown?.has(id) ? ' bl-grown' : '')
            }
          >
            {r
              ? <CurrentBubbleContext.Provider value={id}><r.route.Component bubble={r.bubble} /></CurrentBubbleContext.Provider>
              : <div className="bl-noroute">route が無い<br />{url}</div>}
          </div>
        </>
      );
    },
    [routes, urls, closeBubble, world, grown],
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
    </BubbleSpaceContext.Provider>
  );
}
