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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BubbleSpace, BubbleSpaceContext, CurrentBubbleContext, matchBubbleRoute, renderRoute, useBubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LayoutRoute, BubbleSpaceApi, TakeOutInfo } from "@bublys-org/bubble-layout-feature";
import type { LensId, PlaneAxis, Viewport } from "@bublys-org/bubble-layout";
import { TUBE_RADIUS, anchoredRect, type ScreenRect, type TubeJoin } from "@bublys-org/bubbles-ui";
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
 * ドラッグの知らせを、**海の座標から器の座標へ**直す。
 *
 * ★ 知らせ（`pointer` と `rect`）は**海の層の座標**で来る。岸は器の座標で考えるので、
 *   海が「開いている口」へ寄っているぶんを足す ── 前は層が器の左上に重なっていて
 *   同じだったが、口へ寄せてからは **(左, 上) ぶんずれた**まま渡っていた。
 *   そのせいで右の縁へ持っていっても手前だと思われ、**反対側へ貼れなかった**（実測で踏んだ）。
 */
const toShore = (info: TakeOutInfo, open: { readonly x: number; readonly y: number }) => ({
  x: info.rect.x + open.x,
  y: info.rect.y + open.y,
  pointer: { x: info.pointer.x + open.x, y: info.pointer.y + open.y },
});

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
  const [docked, setDocked] = useState<readonly Docked[]>([]);
  /** 「いま離したらここに着く」の予告 */
  const [preview, setPreview] = useState<ScreenRect | null>(null);
  /**
   * ★ 大きさは**数から作り直す**。親が `{ w, h }` をその場で作って渡してくると
   *   （窓がそうしている）、毎回新しい object になって下の海も作り直され、
   *   口が変わる → 描き直す → また新しい object … と**止まらなくなる**（実測で踏んだ）。
   */
  const vp = useMemo(() => ({ width: viewport.w, height: viewport.h }), [viewport.w, viewport.h]);

  /**
   * **海をどこに置くか。** いまは動かさない ── 窓の左上にそのまま置く。
   *
   * ★ ここで「岸が食い込んでいるぶん、口の中心へ寄せる」を一度やって、**取り消した**。
   *   海は `left` / `top` の平行移動で動くので、中心を寄せると**中身が丸ごと同じだけずれる**。
   *   窓（幅 560）を左の岸に貼ると海が 280 右へ動き、右側にいた泡が画面の外へ出た
   *   （実測で踏んだ：残った一覧が @-221 まで飛んだ）。狭くなったのは**見えている所**なので、
   *   海を動かして合わせにいくと、見えていた所まで一緒に連れて行ってしまう。
   *
   * ★ そのため「岸で狭まったときに魚眼の中心を口に合わせる」は**まだ出来ていない**。
   *   やるならレンズの箱（`H`）の中心を動かす口が要る ── 海の位置では解けない。
   *   箱ごと口に縮めるのも駄目で、海が 151 しか残らず魚眼が中身を潰した
   *   （実測：倍率 6e-05 で、描く下限を切って消えた）。
   */
  const open = useMemo(() => ({ x: 0, y: 0 }), []);
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
      const at = toShore(info, open);
      const hit = resolveDock(
        { x: at.x, y: at.y, width: info.size.w, height: info.size.h },
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
    [docked, vp, routes, open],
  );

  /** ドラッグ中 ── 縁の近くなら、着いたあとの矩形を予告する（大きさは貼るときと同じ規則） */
  const previewTakeOut = useCallback(
    (info: TakeOutInfo | null) => {
      if (!info) { setPreview(null); return; }
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const at = toShore(info, open);
      const hit = resolveDock(
        { x: at.x, y: at.y, width: info.size.w, height: info.size.h },
        at.pointer,
        vp,
        others,
      );
      setPreview(hit ? anchoredRect(hit.dock, hit.size, vp) : null);
    },
    [docked, vp, open],
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
          <BubbleSpaceContext.Provider value={shoreSpace}>
            <r.route.Component bubble={r.bubble} />
          </BubbleSpaceContext.Provider>
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
        initialUrls={initialUrls}
        autoLens={autoLens}
        onLens={onLens}
        onTakeOut={takeOut}
        onTakeOutPreview={previewTakeOut}
        /**
         * ★ 海は**開いている口**に置く（上の `open`）。
         * ★ `overflow` は切らない ── 狭めた箱で切ると、**岸が覆っていない所まで切れる**
         *   （見え方の帯は幅 480 で、その右は空いている）。はみ出したぶんは、
         *   この器が窓の縁で切り、岸の地が上から隠す。
         */
        style={{ position: "absolute", left: open.x, top: open.y, overflow: "visible" }}
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
        onUpdate={(key, next) =>
          setDocked((list) => list.map((d) => (d.key === key ? { ...d, ...next } : d)))
        }
        onUndock={(key, rect) => {
          const d = docked.find((x) => x.key === key);
          setDocked((list) => list.filter((x) => x.key !== key));
          // 剥がした所にそのまま浮かべる（岸へ貼るときと同じで、見えている矩形が正）
          // ★ 海は「開いている口」に寄っているので、器の座標から海の座標へ戻して渡す
          if (d)
            spaceRef.current?.takeIn(d.url, {
              x: rect.x - open.x, y: rect.y - open.y, w: rect.width, h: rect.height,
            });
        }}
      />
    </div>
  );
};
