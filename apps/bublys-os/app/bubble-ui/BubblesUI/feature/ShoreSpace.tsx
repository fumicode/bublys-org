"use client";
/**
 * 岸を持つ器 ── **海 ＋ 岸** を 1 つにまとめたもの。
 *
 * 岸（Showre）は海の外のエリアではなく、**海に重なる層**。海の大きさは 1px も削らない。
 * 縁の近くで離した泡は岸が横取りし、以後は並べ方の外で、画面の座標に貼り付く。
 *
 * ★ **入れ物を選ばない。** `ShowreLayer` も `anchoredRect` も `viewport` を引数で受けるので、
 *   いちばん外の海でも、窓（空間を持つ泡）の中でも同じように使える。
 *   前は岸の一式が `BubblesUINext`（いちばん外）の中に直に書いてあり、窓の枠は
 *   **ネオンを 1 本描くだけ**だった ── 貼れる先が外の海にしか無かった。
 *
 * ★ 窓の岸に貼れるのは、**その窓の中の海から出たもの**だけ。窓の中と外は別の世界なので、
 *   またぐには別の仕掛けが要る（いまは持たない）。
 * ★ 岸に貼った泡から開いたものは、**その岸が載っている海**に出る。
 */
import {
  CSSProperties,
  FC,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BubbleSpace, BubbleSpaceContext, CurrentBubbleContext, matchBubbleRoute, renderRoute, useBubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LayoutRoute, BubbleSpaceApi, TakeOutInfo } from "@bublys-org/bubble-layout-feature";
import { METRICS } from "@bublys-org/bubble-layout";
import type { LensId, PlaneAxis, Viewport } from "@bublys-org/bubble-layout";
import { TUBE_RADIUS, anchoredRect, touchingEdges, type ScreenRect, type TubeJoin } from "@bublys-org/bubbles-ui";
import { ShowreLayer, resolveDock, seaCornerRadius, type Docked } from "./ShowreLayer";

/** 岸に「定位置」を持つもの（ランチャーなど）。居なくなったらここへ戻ってくる */
export type Home = (viewport: { width: number; height: number }) => Docked;

export type ShoreSpaceProps = {
  readonly routes: readonly LayoutRoute[];
  readonly viewport: Viewport;
  /** 岸そのものの地（海と同じ色にする ── 敷いても見た目は変わらず、下を何が通っても透けない） */
  readonly ground: string;
  /** ネオンの通し方（枝分かれ／迂回） */
  readonly join?: TubeJoin;
  /** 自分の枠を描くか（外の岸に貼られているなら、そちらが引くので描かない） */
  readonly frame?: boolean;
  /**
   * **岸を覚えておく名前。** 渡すと、部品が作り直されても岸の中身が戻る。
   *
   * ★ 窓を岸に貼ると、中身は**別の場所で描き直される**（海の泡としてではなく、岸の中身として）
   *   ので React は作り直す ── そのままだと**窓の中の岸が空になる**（実測で踏んだ）。
   *   岸は「窓の中身の一部」なので、部品の一生より長く生きてよい。
   * ★ 名前は url。海にいても岸にいても同じものが取れる（岸は `d.url` から同じ
   *   `RoutedBubble` を作り直す）。**同じ url の窓が 2 つあると岸を分け合う**が、
   *   いまは url ごとに 1 つしか開けない作りなので成り立つ。
   */
  readonly persistKey?: string;
  /** 空のときに最初に開く url */
  readonly initialUrls?: readonly string[];
  /** 定位置に居てほしいもの。窓の岸には渡さない（空の岸で始まる） */
  readonly homes?: readonly Home[];
  /** 定位置を置いてよいか（測り終える前に置くと、端から端までのはずのものが中途半端な丈になる） */
  readonly homesReady?: boolean;
  /** 海の口を外から掴む（ツールバーなどが要るとき） */
  readonly onSpaceReady?: (api: BubbleSpaceApi) => void;
  readonly autoLens?: boolean;
  readonly onLens?: (axis: PlaneAxis, lens: LensId) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** 海の中に置くもの */
  readonly children?: ReactNode;
};

/**
 * ドラッグの知らせを、岸が読む形にする。
 *
 * ★ 知らせ（`pointer` と `rect`）は**海の層の座標**で来る。岸は器の座標で考えるので、
 *   本来はそのぶん直す必要がある。**いまは海を器の左上にそのまま置いている**ので
 *   2 つは同じ ── 直す量は 0 だが、「別の座標だ」という境目はここに残しておく
 *   （前に海を口へ寄せたとき、ここを通さなかったせいで**反対側の縁へ貼れなかった**）。
 */
const toShore = (info: TakeOutInfo) => ({
  x: info.rect.x,
  y: info.rect.y,
  pointer: info.pointer,
});

/**
 * **岸と海では、同じ「大きさ」が違うものを指す。**
 *
 * 海に浮いている泡には**バブルUI（ヘッダ）が付く**が、岸に貼ったものには付かない
 * （岸は管と中身だけ）。だから泡の大きさをそのまま渡すと、貼った瞬間に中身が
 * ヘッダのぶん広がり、剥がすと逆に**ヘッダに食われて縮む**。
 *
 * 揃えるのは**中身の大きさ**なので、渡すときに飾りのぶんを引き、返すときに足す。
 * 「剥がしたら同じ大きさ」は中の要素の話で、ヘッダを含んだ泡全体のことではない
 * ── バブルUIが付くぶん、泡そのものは大きくなる。
 */
const CHROME_H = METRICS.HEADER;
/** 泡の大きさ → 岸に貼る大きさ */
const toDockSize = (size: { readonly w: number; readonly h: number }) => ({
  width: size.w,
  height: Math.max(1, size.h - CHROME_H),
});
/** 岸の大きさ → 海へ返す泡の大きさ */
const toBubbleSize = (rect: { readonly width: number; readonly height: number }) => ({
  w: rect.width,
  h: rect.height + CHROME_H,
});

/**
 * **この中身は岸の上にいる。** 岸に貼られた泡の中身にだけ true が届く。
 *
 * 読むのは「自分の枠を描くか」を決めるため（{@link ShowreLayer} の `frame` を見よ）。
 */
export const OnShoreContext = createContext(false);
export const useOnShore = (): boolean => useContext(OnShoreContext);

/** 名前を付けた岸の中身を、部品の一生より長く置いておく棚（上の `persistKey` を見よ） */
const SHORE_MEMORY = new Map<string, readonly Docked[]>();
/**
 * **種をもうまいた名前。**
 *
 * ★ 窓を岸に貼ると中身は作り直される。そのとき `initialUrls` の種が**もう一度まかれて**、
 *   同じ url の泡が 2 つ目として生える（実測で踏んだ：一覧が別にもう 1 つ出た）。
 *   種は「空の窓を開いたとき 1 回」のものなので、名前ごとに 1 回だけにする。
 * ★ **窓の海そのものはまだ覚えられていない。** 覚えているのは岸だけなので、
 *   貼り直すと海に浮いていた泡は消える（岸に貼ってあったものは残る）。
 *   海まで覚えるには `BubbleSpace` の世界と url の対応表を外へ出す必要がある ── 宿題。
 */
const SHORE_SEEDED = new Set<string>();

/** 海の口を外から掴むための小物（`BubbleSpace` の中でしか使えないので、子として置く） */
const SpaceHandle: FC<{ onReady: (api: BubbleSpaceApi) => void }> = ({ onReady }) => {
  const space = useBubbleSpace();
  useEffect(() => onReady(space), [space, onReady]);
  return null;
};

export const ShoreSpace: FC<ShoreSpaceProps> = ({
  routes,
  viewport,
  ground,
  join = "detour",
  initialUrls,
  homes,
  homesReady = true,
  onSpaceReady,
  autoLens,
  frame,
  persistKey,
  onLens,
  className,
  style,
  children,
}) => {
  const spaceRef = useRef<BubbleSpaceApi | null>(null);
  /** 海の口。**世界が変わるたびに新しくなる**ので、泡が居なくなったことに気づける */
  const [space, setSpace] = useState<BubbleSpaceApi | null>(null);
  const onReady = useCallback(
    (api: BubbleSpaceApi) => {
      spaceRef.current = api;
      setSpace(api);
      onSpaceReady?.(api);
    },
    [onSpaceReady],
  );

  /** 岸に着いているもの。海の泡ではないので、世界（WorldState）には居ない */
  const [docked, setDocked] = useState<readonly Docked[]>(
    () => (persistKey && SHORE_MEMORY.get(persistKey)) || [],
  );
  // 名前が付いているなら、変わるたび棚へ写す（作り直されたら、そこから始まる）
  useEffect(() => {
    if (persistKey) SHORE_MEMORY.set(persistKey, docked);
  }, [persistKey, docked]);
  /** 種は名前ごとに 1 回だけ。貼り直しでまき直さない（上の `SHORE_SEEDED` を見よ） */
  const seeds = useMemo(() => {
    if (!persistKey) return initialUrls;
    if (SHORE_SEEDED.has(persistKey)) return undefined;
    SHORE_SEEDED.add(persistKey);
    return initialUrls;
  }, [persistKey, initialUrls]);
  /** 「いま離したらここに着く」の予告 */
  const [preview, setPreview] = useState<ScreenRect | null>(null);
  /**
   * ★ 大きさは**数から作り直す**。親が `{ w, h }` をその場で作って渡してくると
   *   （窓がそうしている）、毎回新しい object になって下の海も作り直され、
   *   口が変わる → 描き直す → また新しい object … と**止まらなくなる**（実測で踏んだ）。
   */
  const vp = useMemo(() => ({ width: viewport.w, height: viewport.h }), [viewport.w, viewport.h]);

  /**
   * **海の「開いている口」。** 岸が食い込んでいるぶんを、辺ごとに引いた矩形。
   *
   * 使うのは**開いたものの行き先**だけ（下の `inner` の註を見よ）。海の位置も大きさも、
   * これでは変えない。
   *
   * ★ 引くのは「その辺にいちばん深く食い込んでいるもの」のぶん。
   *   角の小物（ポケット 48×48）も辺ぜんぶを取るが、**規則が短く言える**ほうを採った。
   * ★ **向かい合う 2 辺の両方に接しているものは、その向きには効かせない。**
   *   もう一方の軸に沿った**帯**なので、その向きは狭めていない ── ランチャーは
   *   高さいっぱいなので上にも下にも接しており、これが無いと上下から 832 引いて
   *   **口が潰れる**（実測で踏んだ：663x1 になった）。
   */
  const openArea = useMemo(() => {
    let l = 0, t = 0, r = 0, b = 0;
    for (const d of docked) {
      const rect = anchoredRect(d.dock, d.size, vp);
      const e = touchingEdges(rect, vp);
      const spansX = e.includes("left") && e.includes("right");
      const spansY = e.includes("top") && e.includes("bottom");
      if (!spansX && e.includes("left")) l = Math.max(l, rect.x + rect.width);
      if (!spansX && e.includes("right")) r = Math.max(r, vp.width - rect.x);
      if (!spansY && e.includes("top")) t = Math.max(t, rect.y + rect.height);
      if (!spansY && e.includes("bottom")) b = Math.max(b, vp.height - rect.y);
    }
    return { x: l, y: t, w: Math.max(1, vp.width - l - r), h: Math.max(1, vp.height - t - b) };
  }, [docked, vp]);
  /**
   * **海の箱は窓いっぱい。岸が食い込んでも変えない。**
   *
   * ★ 一度**箱そのものを口にした**が、取り消した。岸のくっつき方が変わるたびに箱が変わり、
   *   **触っていない泡が画面の上で動いて、大きさまで変わる**（実測：箱 1285→1915 で
   *   泡が 343→644、倍率 0.923→0.963）。動いた先が岸の下だと消えて見える
   *   ── 岸の地は不透明なので。⑤「触っていない泡は画面の上で動かない」に反するうえ、
   *   「**自分で狭めたのなら、残りに小さく全部見せるより、前と同じ大きさで見切れる方がいい**」
   *   にも反していた（箱が縮めば中身も縮む ＝ 小さく全部見せに行く）。
   * ★ だから口が効くのは**開いたものの行き先**だけ（`BubbleSpace` の `openArea`）。
   *   岸の下に入ったものは**見切れているだけ** ── 海をドラッグすれば見に行ける。
   */
  const inner = useMemo<Viewport>(() => ({ w: viewport.w, h: viewport.h }), [viewport.w, viewport.h]);

  /**
   * 離したところが縁の近くなら、岸が横取りする。
   *
   * ★ 貼る大きさは **泡が自分で持っている大きさ**（`info.size`）。写っている大きさではない。
   *   魚眼の掛かった向きでは縁へ寄るほど像が潰れるので、写った大きさで貼ると
   *   端に飲み込まれた薄い帯になる。どの辺に着くかはカーソルだけが決める。
   */
  const takeOut = useCallback(
    (info: TakeOutInfo) => {
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const at = toShore(info);
      const want = toDockSize(info.size);
      const hit = resolveDock(
        { x: at.x, y: at.y, width: want.width, height: want.height },
        at.pointer,
        vp,
        others,
      );
      if (!hit) return false;
      // 地は海に浮いているときと同じもの（窓は自分の夜空を持っている）
      const g = matchBubbleRoute(routes, info.url)?.ground ?? "light";
      setDocked((list) => [...list, { key: `${info.url}#${Date.now()}`, url: info.url, ground: g, ...hit }]);
      return true;
    },
    [docked, vp, routes],
  );

  /** ドラッグ中 ── 縁の近くなら、着いたあとの矩形を予告する（大きさは貼るときと同じ規則） */
  const previewTakeOut = useCallback(
    (info: TakeOutInfo | null) => {
      if (!info) { setPreview(null); return; }
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const at = toShore(info);
      const want = toDockSize(info.size);
      const hit = resolveDock(
        { x: at.x, y: at.y, width: want.width, height: want.height },
        at.pointer,
        vp,
        others,
      );
      setPreview(hit ? anchoredRect(hit.dock, hit.size, vp) : null);
    },
    [docked, vp],
  );

  /**
   * 岸に着いた泡から海を開く口。
   *
   * 岸は `BubbleSpace` の**外**にある層なので、そのままでは開く口（Context）が届かない
   * ── これが「ランチャーから何も開かない」の正体だった。ここで繋ぎ直す。
   * ただし**開く元（opener）は渡さない** ── 岸の泡は海の泡ではないので、
   * 隣に開きようがない。開いた泡は**この岸が載っている海**の新入りとして置かれる。
   */
  const shoreSpace = useMemo<BubbleSpaceApi>(
    () => ({
      openBubble: (url) => spaceRef.current?.openBubble(url, null) ?? "",
      closeBubble: (id) => spaceRef.current?.closeBubble(id),
      urlOf: (id) => spaceRef.current?.urlOf(id) ?? null,
      canOpen: (url) => spaceRef.current?.canOpen(url) ?? false,
      hasUrl: (url) => spaceRef.current?.hasUrl(url) ?? false,
      setLens: (axis, lens) => spaceRef.current?.setLens(axis, lens),
      setPreset: (p) => spaceRef.current?.setPreset(p),
      /**
       * 岸には世界が無い ── 岸に貼られた泡は海から出ているので、
       * 中身・親・自前の大きさを訊かれても答えられない。
       * 一覧を岸に貼ったときは、一覧のほうが自分で小さな海を持つ（ListSpace）。
       */
      setChildren: () => undefined,
      hostOf: () => null,
      sizeOf: () => null,
      takeIn: (url, rect) => spaceRef.current?.takeIn(url, rect) ?? "",
    }),
    [],
  );

  /** 定位置に居てほしいものが居なければ、そこへ戻す（最初に置くのも、これ 1 つで済む） */
  useEffect(() => {
    if (!homes?.length || !homesReady) return;
    // ★ 海に居るかは **いまの口**（ref）で見る。state の口は「世界が変わった」の合図としてだけ。
    //   岸から剥がした直後は、まだ state の口が古く、海に出したばかりの泡が見えない
    //   ── 見えないと「居ない」と判断して、定位置にもう 1 つ生やしてしまう
    const missing = homes.map((home) => home(vp)).filter((home) => !spaceRef.current?.hasUrl(home.url));
    if (missing.length === 0) return;
    // ★ 重なりを消すのは**書き込むとき**に。ここは 2 度走りうる（開発時の二重呼び出し）ので、
    //   外で数えた結果を信じると同じものが 2 つ並ぶ。
    // ★ 足すものが無いなら**同じ配列をそのまま返す**。新しい配列を返すと、
    //   それが次の走りの引き金になって止まらなくなる
    setDocked((list) => {
      const add = missing.filter((h) => !list.some((d) => d.url === h.url));
      return add.length === 0 ? list : [...list, ...add];
    });
  }, [docked, space, vp, homes, homesReady]);

  const renderDockedContent = useCallback(
    (d: Docked) => {
      const r = renderRoute(routes, d.key, d.url);
      if (!r) return null;
      return (
        /**
         * ★ **「いまどの泡の中か」を切る。**
         *   岸に貼った泡は海から出ているので、どの泡の中でもない。
         *   ところが窓の岸は、窓そのものが外の海の泡として描かれている**中**に居るので、
         *   そのままだと貼った中身が**窓の id を自分の id だと思う** ── 一覧なら
         *   「自分は海の中の泡だ」と判断して、岸用の小さな海を作らずに**空のまま**になる
         *   （実測で踏んだ）。ここで切れば、外の岸に貼ったときと同じになる。
         */
        <CurrentBubbleContext.Provider value={null}>
          <OnShoreContext.Provider value={true}>
            <BubbleSpaceContext.Provider value={shoreSpace}>
              <r.route.Component bubble={r.bubble} />
            </BubbleSpaceContext.Provider>
          </OnShoreContext.Provider>
        </CurrentBubbleContext.Provider>
      );
    },
    [routes, shoreSpace],
  );

  return (
    <div
      /**
       * ★ 管（ネオン）は**1 つの枠に 1 本**。入れ子の窓が自分の枠を描けるように印を付ける
       *   ── `BubblesUINext` の `<style>` が、この印の中の管だけを通す。
       */
      data-frame-shore=""
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: ground,
        // 角に貼り付いた泡が居る角だけ、丸みを外す（中身が角丸に削られないように）
        ...seaCornerRadius(docked, vp, join, TUBE_RADIUS),
        ...style,
      }}
    >
      <BubbleSpace
        routes={routes}
        viewport={inner}
        initialUrls={seeds}
        autoLens={autoLens}
        openArea={openArea}
        onLens={onLens}
        onTakeOut={takeOut}
        onTakeOutPreview={previewTakeOut}
        /**
         * ★ 海は**器の左上にそのまま**置く（大きさも窓いっぱい）。岸で狭まるのは
         *   見えている所だけで、海そのものではない。
         * ★ `overflow` は切らない ── 口で切ると、**岸が覆っていない所まで切れる**
         *   （見え方の帯は幅 480 で、その右は空いている）。はみ出したぶんは、
         *   この器が窓の縁で切り、岸の地が上から隠す ＝ それが「見切れる」。
         */
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
      >
        <SpaceHandle onReady={onReady} />
        {children}
      </BubbleSpace>

      {/* 岸 ── 海の縁。バブルが貼り付く先であり、「ここが端だ」の目印でもある。
          海には重なるだけで、大きさは 1px も削らない */}
      <ShowreLayer
        viewport={vp}
        docked={docked}
        renderContent={renderDockedContent}
        preview={preview}
        join={join}
        frame={frame}
        onUpdate={(key, next) =>
          setDocked((list) => list.map((d) => (d.key === key ? { ...d, ...next } : d)))
        }
        onUndock={(key, rect) => {
          const d = docked.find((x) => x.key === key);
          setDocked((list) => list.filter((x) => x.key !== key));
          // 剥がした所にそのまま浮かべる（岸へ貼るときと同じで、見えている矩形が正）
          // ★ 大きさは**中身**を揃える ── バブルUI が付くぶん、泡そのものは大きくなる
          if (d) spaceRef.current?.takeIn(d.url, { x: rect.x, y: rect.y, ...toBubbleSize(rect) });
        }}
      />
    </div>
  );
};
