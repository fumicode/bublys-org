"use client";
/**
 * デモの海を、泡のならべかた（5つの規則）の上に載せたもの。
 *
 * 決めた形 ── **Z を使わない**:
 *   - 重なりを作るのは並べ方。開いた泡は直前に開いたものの右下へずらして**重ねる**
 *   - 大きさは X の魚眼。焦点に近いほど大きい
 *   - 前後は「大きく写るものが手前」。触ると焦点が寄って入れ替わる（値は書かない）
 *
 * 旧 {@link BubblesUI} は残してある ── 岸と世界線をこちらへ戻すまでの見本として。
 *
 * まだ載っていないもの（順に戻す）:
 *   1. 岸（Showre）とネオン … 旧 `BubblesLayeredView` の中にある
 *   2. 世界線 … このリポジトリ独自の作りがあるので、それを読んでから繋ぐ
 */
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { BubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { PresetId } from "@bublys-org/bubble-layout";
import { TUBE_RADIUS, TUBE_THICKNESS, anchoredRect, type ScreenRect, type TubeJoin } from "@bublys-org/bubbles-ui";
import { BubbleSpaceContext, matchBubbleRoute, renderRoute, useBubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { BubbleSpaceApi, TakeOutInfo } from "@bublys-org/bubble-layout-feature";
import { bubbleRoutes } from "../domain/bubbleRoutes";
import { SEA_GROUND, ShowreLayer, resolveDock, seaCornerRadius, type Docked } from "./ShowreLayer";
import { bridgeRoutes } from "./legacyRouteBridge";
import { SpaceViewContext, type SpaceView } from "./SpaceViewContext";
import { LayoutRoutesProvider } from "@bublys-org/bubble-layout-feature";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";

const LAUNCHER_URL = "launchers/main";
/** ランチャーの幅（アイコンだけ） */
const LAUNCHER_WIDTH = 60;

/**
 * ルール: **ランチャーは必ず居る。**
 * 最初は左の岸に、アイコンだけの幅で、端から端まで。
 * 海へ引き出して閉じてしまっても、**ここへ戻ってくる**（定位置）。
 */
const launcherDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${LAUNCHER_URL}#dock`,
  url: LAUNCHER_URL,
  // 左と上に着いているので、置き場所（at）は使われない（角に吸い付く）
  dock: { edges: ["left", "top"], at: { x: 0, y: 0 } },
  size: { width: LAUNCHER_WIDTH, height: viewport.height },
  ground: "light",
});


const POCKET_URL = "pocket";

/**
 * ポケットの定位置 ── **右下の岸に、アイコンだけの大きさで**。
 *
 * 旧の「画面の右下に常設した面」を、岸の上の**普通の泡**として置き直したもの
 * ── 専用の仕掛けは 1 つも要らない。広げたければ辺を掴んで引けばよいし、
 * 要らなければ引き剥がせば海へ返る。
 */
const pocketDock = (): Docked => ({
  key: `${POCKET_URL}#dock`,
  url: POCKET_URL,
  // 2 辺に着いているので、置き場所（at）は使われない（角に吸い付く）
  dock: { edges: ["bottom", "right"], at: { x: 0, y: 0 } },
  size: { width: 48, height: 48 },
  // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
  ground: "none",
});
const SPACE_VIEW_URL = "space-view";

/**
 * 見え方の口の定位置 ── **左上の岸**。ランチャーのすぐ右どなりに、管が 1 本になるよう重ねて置く。
 */
const spaceViewDock = (): Docked => ({
  key: `${SPACE_VIEW_URL}#dock`,
  url: SPACE_VIEW_URL,
  dock: { edges: ["top"], at: { x: LAUNCHER_WIDTH - TUBE_THICKNESS, y: 0 } },
  size: { width: 480, height: 44 },
  // 地は敷かない ── ボタンが空間の上に浮いて見える
  ground: "none",
});

/**
 * **定位置に居てほしいもの。** 居なくなったら、ここへ戻ってくる。
 * 岸に貼ってある間は閉じる口が無いので、消えるのは海へ出して閉じたときだけ。
 */
const HOMES: readonly ((viewport: { width: number; height: number }) => Docked)[] = [
  launcherDock,
  spaceViewDock,
  pocketDock,
];

/** 海の口を外から掴むための小物（`BubbleSpace` の中でしか使えないので、子として置く） */
const SpaceHandle: FC<{ onReady: (api: BubbleSpaceApi) => void }> = ({ onReady }) => {
  const space = useBubbleSpace();
  useEffect(() => onReady(space), [space, onReady]);
  return null;
};

export const BubblesUINext = () => {
  /** 並べ方（View のプリセット）。開き方は 1 つしかないので、見え方が変わるのはここだけ */
  const [preset, setPresetState] = useState<PresetId>("free");
  /** 岸に着いた泡の所で、ネオンをどう通すか（見た目だけ。挙動は同じ）。既定は迂回 */
  const [join, setJoin] = useState<TubeJoin>("detour");
  /**
   * 魚眼をどちらの向きに掛けるか。**レンズは軸ごとに持つもの**なので、X と Y は別々に決まる
   * （両方掛けても、どちらも平行にしてもよい）。既定は X ── 隣に開いたときに点くのがこれ。
   */
  const [fisheye, setFisheye] = useState({ x: true, y: false });
  const [viewport, setViewport] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ランチャー集約（呼び出しの中身）は Redux にある。泡として出すのは海の仕事
  useEnsureMainLauncherEntity();

  const routes = useMemo(() => bridgeRoutes(bubbleRoutes), []);
  const spaceRef = useRef<BubbleSpaceApi | null>(null);
  /** 海の口。**世界が変わるたびに新しくなる**ので、泡が居なくなったことに気づける */
  const [space, setSpace] = useState<BubbleSpaceApi | null>(null);
  const onSpaceReady = useCallback((api: BubbleSpaceApi) => {
    spaceRef.current = api;
    setSpace(api);
  }, []);

  /** 岸に着いているもの。海の泡ではないので、世界（WorldState）には居ない */
  const [docked, setDocked] = useState<readonly Docked[]>([]);
  /** 「いま離したらここに着く」の予告 */
  const [preview, setPreview] = useState<ScreenRect | null>(null);
  const vp = useMemo(() => ({ width: viewport.w, height: viewport.h }), [viewport]);

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
      const hit = resolveDock(
        { x: info.rect.x, y: info.rect.y, width: info.size.w, height: info.size.h },
        info.pointer,
        vp,
        others,
      );
      if (!hit) return false;
      // 地は海に浮いているときと同じもの（窓は自分の夜空を持っている）
      const ground = matchBubbleRoute(routes, info.url)?.ground ?? "light";
      setDocked((list) => [...list, { key: `${info.url}#${Date.now()}`, url: info.url, ground, ...hit }]);
      return true;
    },
    [docked, vp, routes],
  );

  /** ドラッグ中 ── 縁の近くなら、着いたあとの矩形を予告する（大きさは貼るときと同じ規則） */
  const previewTakeOut = useCallback(
    (info: TakeOutInfo | null) => {
      if (!info) { setPreview(null); return; }
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const hit = resolveDock(
        { x: info.rect.x, y: info.rect.y, width: info.size.w, height: info.size.h },
        info.pointer,
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
   * 隣に開きようがない。開いた泡は海の新入りとして置かれる。
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
    // ★ 画面の大きさを**測り終えてから**置く。測る前の仮の値で置くと、
    //   端から端までのはずのものが中途半端な丈になる
    if (vp.width !== window.innerWidth || vp.height !== window.innerHeight) return;
    // ★ 海に居るかは **いまの口**（ref）で見る。state の口は「世界が変わった」の合図としてだけ。
    //   岸から剥がした直後は、まだ state の口が古く、海に出したばかりの泡が見えない
    //   ── 見えないと「居ない」と判断して、定位置にもう 1 つ生やしてしまう
    const missing = HOMES.map((home) => home(vp)).filter((home) => !spaceRef.current?.hasUrl(home.url));
    if (missing.length === 0) return;
    // ★ 重なりを消すのは**書き込むとき**に。ここは 2 度走りうる（開発時の二重呼び出し）ので、
    //   外で数えた結果を信じると同じものが 2 つ並ぶ。
    // ★ 足すものが無いなら**同じ配列をそのまま返す**。新しい配列を返すと、
    //   それが次の走りの引き金になって止まらなくなる
    setDocked((list) => {
      const add = missing.filter((h) => !list.some((d) => d.url === h.url));
      return add.length === 0 ? list : [...list, ...add];
    });
  }, [docked, space, vp]);

  /**
   * 軸のレンズを切り替える。世界に書くのは View の 1 つの軸だけ。
   * ★ `setFisheye` の更新関数の中で海に書いてはいけない ──
   *   更新関数はレンダリング中に呼ばれるので、別のコンポーネントを更新することになる。
   */
  const toggleFisheye = useCallback(
    (axis: "x" | "y") => {
      const on = !fisheye[axis];
      setFisheye((f) => ({ ...f, [axis]: on }));
      spaceRef.current?.setLens(axis, on ? "fisheye" : "parallel");
    },
    [fisheye],
  );

  const renderDockedContent = useCallback(
    (d: Docked) => {
      const r = renderRoute(routes, d.key, d.url);
      if (!r) return null;
      return (
        <BubbleSpaceContext.Provider value={shoreSpace}>
          <r.route.Component bubble={r.bubble} />
        </BubbleSpaceContext.Provider>
      );
    },
    [routes, shoreSpace],
  );

  /**
   * レンズをまかせるか。まかせているあいだ、軸ごとのレンズは海が自分で決める
   * ── 口の見た目（魚眼X/Y が点いているか）は、決まった結果を受け取って合わせる。
   */
  const [autoLens, setAutoLens] = useState(false);
  const onLens = useCallback((axis: "x" | "y", lens: string) => {
    setFisheye((f) => (f[axis] === (lens === "fisheye") ? f : { ...f, [axis]: lens === "fisheye" }));
  }, []);

  /** 見え方の口に渡す値（泡は海の中で描かれるので、文脈で渡す） */
  const setPreset = useCallback((next: PresetId) => {
    setPresetState(next);
    spaceRef.current?.setPreset(next);
  }, []);

  const spaceView = useMemo<SpaceView>(
    () => ({ preset, setPreset, join, setJoin, fisheye, toggleFisheye, autoLens, setAutoLens }),
    [preset, setPreset, join, fisheye, toggleFisheye, autoLens],
  );

  return (
    <SpaceViewContext.Provider value={spaceView}>
    {/* ルート一覧は、どの泡からでも引けるように配る（一覧の空間が中の海を作るのに要る） */}
    <LayoutRoutesProvider routes={routes}>
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        // 海の地。岸にも同じものを敷く（ShowreLayer の SEA_GROUND）ので、1 つの定義から引く
        background: SEA_GROUND,
        // 角に貼り付いた泡が居る角だけ、丸みを外す（中身が角丸に削られないように）
        ...seaCornerRadius(docked, vp, join, TUBE_RADIUS),
      }}
    >
      {/* 管は**1 つの枠に 1 本**。二重になるところを 2 つ消してある:
            ・窓の中にもう 1 本（その窓の枠は FrameShore が引き受ける）
            ・岸に着いた窓の中にもう 1 本（そちらは岸の管が引き受ける）
          どちらも「中に入れ子の窓が居るなら、その窓の枠は描く」を後の行で戻している */}
      <style>{`.bl-body [data-showre-tubes]{display:none}
.bl-body [data-frame-shore] [data-showre-tubes]{display:block}
[data-docked-url] [data-frame-shore] [data-showre-tubes]{display:none}
[data-docked-url] .bl-body [data-frame-shore] [data-showre-tubes]{display:block}`}</style>

      <BubbleSpace
        routes={routes}
        viewport={viewport}
        autoLens={autoLens}
        onLens={onLens}
        onTakeOut={takeOut}
        onTakeOutPreview={previewTakeOut}
        style={{ position: "absolute", inset: 0 }}
      >
        <SpaceHandle onReady={onSpaceReady} />
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
          if (d) spaceRef.current?.takeIn(d.url, { x: rect.x, y: rect.y, w: rect.width, h: rect.height });
        }}
      />

    </Box>
    </LayoutRoutesProvider>
    </SpaceViewContext.Provider>
  );
};
