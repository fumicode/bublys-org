"use client";
/**
 * 旧 `bubbles-ui` の画面を、新しい空間（泡のならべかた）の上でそのまま動かす橋。
 *
 * バブリの画面は**1文字も変えない**。渡すものは 4 つだけ:
 *   - 旧 `BubblesContext.openBubble` → 新しい空間の `openBubble`
 *   - 旧 `CurrentBubbleContext` → いま描いている泡の id
 *   - 旧 `KeyboardFocusContext` → いま触られている泡の id
 *   - `BubbleBoxContext` → **中身を描ける箱の大きさ**（ここで測る）
 * 旧 `ObjectView` は前の 2 つを見てダブルクリックで開き、
 * 旧 `useKeyBindings` は残りの 1 つで「キーボードは誰のものか」を決める。
 *
 * ルートの形（pattern / type / Component）は新旧で同じに作られているので、
 * 包むのは中身だけで済む。
 */
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useBubbleSpace, useSelectedBubble } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LayoutRoute, BubbleSpaceApi, RoutedBubble } from "@bublys-org/bubble-layout-feature";
import {
  Bubble,
  BubbleBoxContext,
  BubblesContext,
  CurrentBubbleContext,
  KeyboardFocusContext,
  createBubble,
  parseDragPayload,
} from "@bublys-org/bubbles-ui";
import type { BubbleRoute as LegacyRoute } from "@bublys-org/bubbles-ui";
import { ShoreSpace } from "./ShoreSpace.js";
import { WINDOW_GROUND } from "./ShowreLayer.js";
import { useSpaceView } from "./SpaceViewContext.js";
import type { SpaceView } from "./SpaceViewContext.js";
import { useSpaceViewState } from "./useSpaceViewState.js";

/** 旧の画面 1 枚を、新しい空間の文脈に繋ぐ */
const LegacyScreen: FC<{ bubble: RoutedBubble; Legacy: FC<{ bubble: never }>; children?: ReactNode }> = ({
  bubble,
  Legacy,
}) => {
  const space = useBubbleSpace();
  /**
   * ★ 旧の「キーボードはフォーカス中のバブルが受け取る」を繋ぐ。
   *   旧はこれを `bubbles` スライス（Redux）から読んでいたが、新しい海はそこへ書かない。
   *   繋がないと**どのバブルも一致せず、キー操作が一切効かない**
   *   （囲碁の世界線を ← → ↑ ↓ で辿れなくなっていたのがこれ）。
   */
  const selected = useSelectedBubble();
  const keyboardFocus = useMemo(() => ({ focusedId: selected }), [selected]);

  // 旧の画面は bubbles-ui の Bubble（クラス）を期待する。同じ url から作り、
  // id だけ新しい空間のものに揃える（「どの泡から開いたか」に使われる）
  const legacyBubble = useMemo(
    () => Bubble.fromJSON({ ...createBubble(bubble.url).toJSON(), id: bubble.id }),
    [bubble.id, bubble.url],
  );

  /**
   * **箱の大きさは、ここで 1 回だけ測る。**
   *
   * ★ 中身は自分の大きさを `bubble.size` からは知れない ── すぐ上で url から作り直して
   *   いるので、入っているのは**ルートに書いた既定値**（岸に 60 幅で貼っても 60 とは
   *   言ってくれない）。中身ごとに ResizeObserver を持つのも重複なので、通り道である
   *   ここで測って `BubbleBoxContext` で配る。
   * ★ 測るのは**レイアウトの px**（`offsetWidth`）── 泡に掛かる倍率の影響を受けない側。
   *   画面に写る大きさではなく「中身が使える広さ」なので、こちらが正しい。
   * ★ 測れるまでは配らない（`null`）。読む側は `bubble.size` に落ちればよい
   *   ── 旧の海にはこの口がまだ無く、あちらの `size` は本当の大きさなので。
   */
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setBox((prev) =>
        prev && prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const legacyContext = useMemo(
    () => ({
      openBubble: (url: string, openerBubbleId?: string) => {
        space.openBubble(url, openerBubbleId ?? bubble.id);
      },
      surfaceLeftTop: { x: 0, y: 0 },
    }),
    [space, bubble.id],
  );

  return (
    /* 測る箱。中身と同じ広さで、見た目には何も足さない */
    <div ref={boxRef} style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}>
      <BubblesContext.Provider value={legacyContext as never}>
        <KeyboardFocusContext.Provider value={keyboardFocus}>
          <CurrentBubbleContext.Provider value={bubble.id}>
            <BubbleBoxContext.Provider value={box && box.width > 0 && box.height > 0 ? box : null}>
              <Legacy bubble={legacyBubble as never} />
            </BubbleBoxContext.Provider>
          </CurrentBubbleContext.Provider>
        </KeyboardFocusContext.Provider>
      </BubblesContext.Provider>
    </div>
  );
};

/**
 * 空間を持つ泡（窓）の中身 ── **大元の画面と同じ海**を、この泡の中に持たせる。
 *
 * 窓の中だけ別の動かし方をしていると、同じ泡なのに掴み方も並び方も違ってしまう。
 * 中も外と同じ 5 つの規則で動かす（`BubbleSpace` をそのまま入れ子にする）。
 * 窓は自分の世界を持つので、中の泡が外の海に出てくることはない。
 *
 * 枠（ステータスバーの下から下端まで）はそのまま岸。ユニバースという概念は新しい模型に
 * 無い ── あるのは「空間を持つ泡」だけなので、**その泡の枠そのものを岸として扱う**。
 * 中でもう 1 本ネオンを引くと枠が二重になるので、管はこの層だけが描く。
 */
/**
 * **窓の受け口** ── 外の海が「この窓に入れてくれ」と言うための、窓ごとの入口。
 *
 * ★ 窓の中の海は別の世界（入れ子の `BubbleSpace` が自分の状態で持っている）なので、
 *   外の海から直に書き込めない。窓の側が「入れる口」をここに出しておき、
 *   外はその泡の id を知っているだけで渡せる ── **繋ぐのは id 1 本**。
 * ★ **鍵は url ではなく泡の id。** 同じ url の窓を 2 つ開いたら、中の世界も見え方も
 *   別々でなければならない（「ユニバースは開いただけそれぞれ別」）。
 *   url で覚えていたころは、2 つ目の窓が 1 つ目と**同じ海・同じ岸・同じ口**を分け合い、
 *   種（`initialUrls`）も 2 つ目には蒔かれなかった。
 * ★ 部品の一生より長く置く（岸の記憶 `SHORE_MEMORY` と同じ考え）。
 */
const WINDOW_INBOX = new Map<string, (url: string) => void>();

/**
 * **窓の見え方の口** ── 外の海が「この窓の見え方を触りたい」ときの受け口。
 *
 * ★ 入れる口（`WINDOW_INBOX`）と同じ理屈。窓の中は別の世界なので、外から直に書けない
 *   ── 窓の側が口をここに出し、外は url を知っているだけで触れる。
 * ★ 触ると窓の中の状態が変わるので、**変わったことを知らせる**（口の見た目を合わせるため）。
 */
const WINDOW_VIEW = new Map<string, SpaceView>();
const WINDOW_VIEW_WATCH = new Set<() => void>();
const tellWindowViews = () => { for (const fn of WINDOW_VIEW_WATCH) fn(); };

/** その泡（窓）の見え方（無ければ null）。窓が立ち上がるまでは何も出さない */
export const useWindowView = (windowId: string): SpaceView | null => {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    WINDOW_VIEW_WATCH.add(fn);
    return () => { WINDOW_VIEW_WATCH.delete(fn); };
  }, []);
  return WINDOW_VIEW.get(windowId) ?? null;
};

/** その泡（窓）の中へ入れる。窓でなければ false（外の海は取り上げない） */
export const putIntoWindow = (windowId: string, url: string): boolean => {
  const put = WINDOW_INBOX.get(windowId);
  if (!put) return false;
  put(url);
  return true;
};

/** その泡が「中に入れられる窓」か（`bridgeRoute` の中の `isWindow` は別物 ── あちらはルートの話） */
export const isWindowBubble = (windowId: string): boolean => WINDOW_INBOX.has(windowId);

const WindowSpace: FC<{
  routes: () => LayoutRoute[];
  seeds: readonly string[];
  /** **その窓の泡の id。** 中の海・岸・見え方の鍵はこれ（url ではない ── 上の註） */
  id: string;
}> = ({ routes, seeds, id }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /**
   * ★ **ネオンの通し方（迂回／枝分かれ）は、窓の岸にも同じものが効く。**
   *   見え方の口は 1 つしかないのに、窓の中だけ既定の「枝分かれ」に固定されていて、
   *   外の海と中の窓で管の通り方が食い違っていた。見ているのは同じ場所（`SpaceViewContext`）。
   */
  const { join, setJoin } = useSpaceView();
  /**
   * ★ **窓の中の海も、自分の見え方を持つ。** 持ち方は大元の海と同じ見本（`useSpaceViewState`）
   *   ── 外の口で中の海を変えることはできない（別の世界なので）。
   *   ネオンの通し方（`join`）だけは画面ぜんぶで 1 つなので、外のものをそのまま使う。
   */
  const innerRef = useRef<BubbleSpaceApi | null>(null);
  const { view, onLens, autoLens, bandDisplay } = useSpaceViewState(innerRef, join, setJoin);
  /**
   * 中の海の口。**外から入れてもらう**のに要る（`WINDOW_INBOX`）。
   * 海は作り直されることがあるので、口が変わるたび登録し直す。
   */
  const [inner, setInner] = useState<BubbleSpaceApi | null>(null);
  useEffect(() => {
    if (!inner) return;
    innerRef.current = inner;
    WINDOW_INBOX.set(id, (u) => inner.openBubble(u, null));
    return () => {
      if (WINDOW_INBOX.get(id)) WINDOW_INBOX.delete(id);
    };
  }, [id, inner]);
  /** 見え方が変わるたび、棚を置き換えて外へ知らせる（外の口がこれを映す） */
  useEffect(() => {
    WINDOW_VIEW.set(id, view);
    tellWindowViews();
    return () => {
      if (WINDOW_VIEW.get(id) === view) WINDOW_VIEW.delete(id);
      tellWindowViews();
    };
  }, [id, view]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ★ 大きさは **レイアウトの px**（offsetWidth）で測る。
    //   getBoundingClientRect は泡に掛かった transform:scale ごとの、**画面の px** を返す。
    //   中の海も管も泡の中＝倍率が掛かる前の座標に居るので、画面の px で測ると
    //   奥にある泡（scale<1）では中身がその倍率のぶん小さくなり、端まで届かない。
    //   測る座標と描く座標は同じでなければならない。
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      /**
       * ★ **0 は「大きさが 0」ではなく「いま測れない」。** 覚えない。
       *
       *   窓が隠れると（魚眼の端で描く下限を切った・岸へ貼り替えている最中）
       *   `offsetWidth` は 0 になる。それを覚えると下の `size.width > 0` が偽になり、
       *   **中の海ごとアンマウントされる** ── 海の世界は入れ子の `BubbleSpace` が
       *   React の状態で持っているので、そこに開いていたものが**丸ごと消える**。
       *   戻ってきても種（`initialUrls`）だけの空の海になる（実測で踏んだ：
       *   グループの窓を魚眼の端へ送って戻すと、中の一覧も札も消えていた）。
       *   隠れているあいだは**最後に測れた大きさのまま**でいる ── どうせ写っていない。
       */
      if (width === 0 || height === 0) return;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      /**
       * ★ **ポケットや札からの引きずり落としも受ける。** あちらは HTML の drag
       *   （海のポインタのドラッグとは別の道）なので、ここで別に受け口を出す。
       *   運ばれてくるのは url 1 本 ── 受けたらこの窓で開く。
       */
      onDragOver={(e) => {
        if (!inner) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        if (!inner) return;
        const dropped = parseDragPayload(e)?.url ?? e.dataTransfer.getData("text/plain");
        if (!dropped) return;
        e.preventDefault();
        e.stopPropagation();
        inner.openBubble(dropped, null);
      }}
    >
      {size.width > 0 && (
        /**
         * ★ **枠そのものが岸。** 前はここでネオンを 1 本描くだけで、貼る機能は無かった
         *   ── 貼れる先が外の海にしか無かった。器（`ShoreSpace`）に差し替えて、
         *   外の海と同じ岸を窓の中にも持たせる。管もその岸が引く（枠が二重にならない）。
         * ★ 定位置（ランチャー・ポケット・見え方）は渡さない ── あれらは外の岸のもの。
         *   窓の岸は**空で始まり**、中の海から引き出したものだけが貼り付く。
         */
        <ShoreSpace
          routes={routes()}
          initialUrls={seeds}
          onSpaceReady={setInner}
          viewport={{ w: size.width, h: size.height }}
          ground={WINDOW_GROUND}
          join={join}
          autoLens={autoLens}
          bandDisplay={bandDisplay}
          onLens={onLens}
          // 岸に貼ると中身が描き直されるので、岸の中身は**その窓の id**で覚えておく
          persistKey={id}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
      )}
    </div>
  );
};

/**
 * 旧のルート 1 本を、新しい空間のルートにする。
 *
 * @param all 窓の中の海に渡すルート一覧。窓は自分の中でも同じ url を開けるので
 *   一覧が自分自身を含む ── 作り終わってから読めるよう関数で受ける
 */
const bridgeRoute = (route: LegacyRoute, all: () => LayoutRoute[]): LayoutRoute => {
  const Legacy = route.Component as FC<{ bubble: never }>;
  const size = route.bubbleOptions?.defaultSize;
  // 旧は「窓（universe / fillsContainer）」と「普通の中身」を区別していた。同じ区別を渡す
  // ── 窓は自分で背景を持つので、こちらで明るい地を敷くと中身が白く霞む
  const isWindow = !!(route.bubbleOptions?.universe || route.bubbleOptions?.fillsContainer);
  // 窓が開いたときに最初から居る泡（旧 `UniverseView.initialBubbleUrls` と同じ種）
  const seeds = route.initialBubbleUrls ?? [];
  return {
    pattern: route.pattern,
    type: route.type,
    Component: ({ bubble }) =>
      isWindow ? (
        <WindowSpace routes={all} seeds={seeds} id={bubble.id} />
      ) : (
        <LegacyScreen bubble={bubble} Legacy={Legacy} />
      ),
    /**
     * 中身が「地は自分で持つ」と言っていれば敷かない（空間がそのまま透ける）。
     *
     * ★ 見るのは **`contentBackground` があるかどうか** ── 値が何かではない。
     *   旧の世界では「その色で塗って」の意味だったが、新しい海では地を敷くかどうかしか
     *   無い。`'transparent'` だけを見ていたので、世界線（`rgba(15,18,28,0.3)`）のように
     *   **自分で色を決めていた泡が、いちばん明るい白地に落ちて**いた。
     *   色を指しているのは「まわりに任せない」という意思表示なので、敷かないほうへ寄せる。
     */
    ground: isWindow
      ? ('clear' as const)
      : route.bubbleOptions?.contentBackground
        ? ('none' as const)
        : ('light' as const),
    ...(size ? { size: { w: size.width, h: size.height } } : {}),
  };
};

/**
 * **一度架けた橋は、架け直さない。**
 *
 * ★ `bridgeRoute` は呼ぶたびに新しい `Component` を作る。バブリを 1 つロードして
 *   一覧が作り直されると、React には**ぜんぶが別の部品**に見えて、開いていた泡が
 *   まるごと描き直される（中身の状態が消える）。旧ルートを鍵に控えておき、
 *   増えたぶんだけ新しく架ける。
 * ★ 鍵は旧ルートそのもの（弱い鍵）── ルートが捨てられれば控えも一緒に消える。
 */
const bridged = new WeakMap<LegacyRoute, LayoutRoute>();

/**
 * **窓の中の海に渡す一覧は、いつも最新のもの。**
 *
 * ★ 架け直さないので、控えてある橋が覚えている「一覧を読む口」は**架けたときのもの**。
 *   そのときの一覧を直に覚えていると、あとからバブリをロードしても
 *   **窓の中だけ古い一覧のまま**になる（外では開けるのに、窓の中では開けない）。
 *   読む先を 1 つに寄せて、架け直しのたびにここを差し替える。
 */
let latest: LayoutRoute[] = [];
const all = () => latest;

/** 旧のルート一覧をまとめて。窓の中の海にも、同じ一覧をそのまま渡す */
export const bridgeRoutes = (routes: readonly LegacyRoute[]): LayoutRoute[] => {
  const list: LayoutRoute[] = [];
  for (const route of routes) {
    const already = bridged.get(route);
    if (already) {
      list.push(already);
      continue;
    }
    const made = bridgeRoute(route, all);
    bridged.set(route, made);
    list.push(made);
  }
  latest = list;
  return list;
};
