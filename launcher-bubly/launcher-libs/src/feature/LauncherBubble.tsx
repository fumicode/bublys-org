"use client";
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AppsIcon from "@mui/icons-material/Apps";
import { BubbleContentRenderer, BubblesContext, useBubbleBox } from "@bublys-org/bubbles-ui";
import { launcherLayout } from "@bublys-org/launcher-model";
import { LauncherView, type LauncherViewEntry } from "../ui/LauncherView.js";
import { resolveLaunchTarget } from "../registration/launchTargets.js";
import { useLauncher } from "./useLauncher.js";
import { ResetStorageConfirm } from "./ResetStorageConfirm.js";

/** バブルの枠（余白 + 縁）。**旧の海**で外側から内側を出すのにだけ使う（下の註） */
const CHROME = 26;

/**
 * まとまったときに浮かぶ一覧 ── アイコンを横に 4 つずつ。
 *
 * ★ 幅は**中身が 4 つ並ぶ内側**から逆算する。自分の余白（8×2）だけでなく、
 *   一覧自身の余白（`LauncherView` の `px: 0.5` ＝ 4×2）と縁（1×2）も足す
 *   ── 2px 足りないだけで 3 つずつに折り返し、縦に 1 行伸びる（実測で踏んだ）。
 * ★ **高さは見積もらない。** 行数からの計算は仕切りのぶんだけずれるので、
 *   出したあとに実物を測って画面に収める（下の `useLayoutEffect`）。
 */
const POPUP = { columns: 4, cell: 44, pad: 8, margin: 8 };
const POPUP_WIDTH = POPUP.columns * POPUP.cell + 2 * POPUP.pad + 2 * 4 + 2 * 1;

/**
 * ランチャーバブル（url: `launchers/:launcherId`）。
 *
 * 見た目は岸に貼り付いていても海に浮いていても同じ一覧。並べ方は
 * **中身を描ける大きさと項目数**だけで決まる（{@link launcherLayout}）。岸のことは知らない。
 *
 * 箱がアイコン 2 つぶんに届かないほど小さいときだけ**1 つのアイコンにまとまり**、
 * 押すと一覧が泡の外へ浮かぶ（ポケットと同じ手ざわり）。
 */
export const LauncherBubble: BubbleContentRenderer = ({ bubble }) => {
  const launcherId = bubble.params.launcherId ?? bubble.url.replace(/^launchers\//, "");
  const { launcher } = useLauncher(launcherId);
  const { openBubble } = useContext(BubblesContext);
  /** 片付けるかどうかを訊いている最中か（`ResetStorageConfirm` の註） */
  const [asking, setAsking] = useState(false);
  const entries = useMemo<LauncherViewEntry[]>(
    () =>
      (launcher?.entries ?? []).map((e) => {
        const target = resolveLaunchTarget(e.url);
        return { id: e.id, url: e.url, label: target.label, icon: target.icon };
      }),
    [launcher],
  );

  /**
   * **描ける大きさは、海から配られたものを使う**（`BubbleBoxContext`）。
   *
   * ★ 自分では測らない。測るのは泡の通り道 1 か所（`legacyRouteBridge` の
   *   `LegacyScreen`）── 中身ごとに ResizeObserver を持つと同じことを何度もやる。
   * ★ 配られていなければ旧の海。あちらの `bubble.size` は**枠込みの外側**なので、
   *   枠のぶんを引いてから使う（配られるほうは引いたあとの内側）。
   */
  const given = useBubbleBox();
  // 貼り付いている辺は知らなくてよい。並べ方は中身を描ける大きさと項目数で決まる。
  // 末尾の「片付ける」も 1 項目として数える
  const outer = bubble.size ?? bubble.defaultSize;
  const drawable =
    given ?? { width: Math.max(0, outer.width - CHROME), height: Math.max(0, outer.height - CHROME) };
  const layout = launcherLayout(drawable, entries.length + 1);

  /** まとまっているとき、外に浮かんでいる一覧の位置。null なら出ていない */
  const [floatingAt, setFloatingAt] = useState<{ left: number; top: number } | null>(null);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  /**
   * 浮かべる所 ── **アイコンのすぐ外の、空いている方**へ。アイコンには被せない
   * （被せると、もう一度押して引っ込めることができなくなる）。
   */
  const floatAt = useCallback(() => {
    const el = iconRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x =
      window.innerWidth - r.right - POPUP.margin >= POPUP_WIDTH
        ? r.right + POPUP.margin                       // 右に入る
        : r.left - POPUP.margin - POPUP_WIDTH >= 0
          ? r.left - POPUP.margin - POPUP_WIDTH        // 入らなければ左
          : r.left;                                    // どちらも無理なら画面に収める
    return {
      left: Math.max(POPUP.margin, Math.min(window.innerWidth - POPUP_WIDTH - POPUP.margin, x)),
      // 縦は出してから実物を測って収める（すぐ下の `useLayoutEffect`）
      top: r.top,
    };
  }, []);

  /**
   * 出したあと、**実物の高さで**画面に収める。行数からの見積りは仕切りのぶんずれるので、
   * 描く前（`useLayoutEffect`）に測って上へずらす。
   */
  useLayoutEffect(() => {
    const el = floatingRef.current;
    if (!floatingAt || !el) return;
    const h = el.getBoundingClientRect().height;
    const top = Math.max(POPUP.margin, Math.min(window.innerHeight - h - POPUP.margin, floatingAt.top));
    if (Math.abs(top - floatingAt.top) > 0.5) setFloatingAt({ ...floatingAt, top });
  }, [floatingAt]);

  /** 外を押したら引っ込む（自分とその中身を押したときは、そのまま） */
  useEffect(() => {
    if (!floatingAt) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (floatingRef.current?.contains(t ?? null) || iconRef.current?.contains(t ?? null)) return;
      setFloatingAt(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [floatingAt]);

  /** 開いたら引っ込む ── 開いた泡が浮かんだ一覧の下に隠れないように */
  const launch = useCallback(
    (url: string) => {
      openBubble(url, bubble.id);
      setFloatingAt(null);
    },
    [openBubble, bubble.id],
  );

  if (!launcher) {
    return <div style={{ padding: 16, fontSize: "0.875rem" }}>ランチャー "{launcherId}" は無い</div>;
  }

  if (layout.collapsed) {
    return (
      <>
        <div
          ref={iconRef}
          title="押すと呼び出しの一覧が出る"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => setFloatingAt((at) => (at ? null : floatAt()))}
        >
          <AppsIcon sx={{ color: "#8aa4d6" }} />
        </div>

        {/* 泡の外に出す ── 泡の刈り込み（overflow）から逃がす */}
        {floatingAt &&
          createPortal(
            <div
              ref={floatingRef}
              style={{
                position: "fixed",
                left: floatingAt.left,
                top: floatingAt.top,
                width: POPUP_WIDTH,
                padding: POPUP.pad,
                boxSizing: "border-box",
                /**
                 * ★ **地はポケットの受け皿と同じ明るい箱**（`rgba(255,255,255,.9)`）。
                 *   同じ「アイコンを押すと外へ浮かぶ中身」なのに、こちらだけ暗いと
                 *   別の仕掛けに見える。岸に貼ったランチャーの地（`light`）とも揃う。
                 */
                borderRadius: 8,
                background: "rgba(255,255,255,.9)",
                color: "#1b2029",
                boxShadow: "0 2px 8px rgba(0,0,0,.1)",
                zIndex: 2000,
                filter: "drop-shadow(0 8px 24px rgba(0,0,0,.35))",
              }}
              /**
               * ★ portal は DOM では body の子だが、**React の出来事は親までのぼる**。
               *   止めないと、一覧の中を押しただけでアイコンの `onClick` が走って引っ込む。
               */
              onClick={(e) => e.stopPropagation()}
            >
              <LauncherView
                entries={entries}
                vertical={false}
                labels={false}
                wrap
                onLaunch={launch}
                onReset={() => {
                  setFloatingAt(null);
                  setAsking(true);
                }}
              />
            </div>,
            document.body,
          )}
        <ResetStorageConfirm open={asking} onClose={() => setAsking(false)} />
      </>
    );
  }

  return (
    <>
    <LauncherView
      entries={entries}
      vertical={layout.direction === "vertical"}
      labels={layout.labels}
      // 開いたバブルはランチャーの子（帯がランチャーの項目から伸びる）。
      // 帯を見せるかどうかはバブルの linksHidden（設定バブルから切り替え）で決まり、
      // 関係自体は常に残るので、切り替えれば既に開いているものにも効く
      onLaunch={(url) => openBubble(url, bubble.id)}
      onReset={() => setAsking(true)}
    />
    <ResetStorageConfirm open={asking} onClose={() => setAsking(false)} />
    </>
  );
};
