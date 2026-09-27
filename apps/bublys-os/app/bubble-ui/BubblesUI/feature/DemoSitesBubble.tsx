"use client";
/**
 * **他のデモへ行く口** ── 1 つの泡にして、岸に貼る。
 *
 * ★ 画面に固定した面にはしない。新しい模型に固定の置き場所は無いし、
 *   固定すると海の上に居座って、動かすことも消すこともできない。
 *   見え方の口（{@link SpaceViewBubble}）やポケットと**同じ扱い**にしておけば、
 *   引き剥がして海に浮かべることも、要らなければ閉じることもできる。
 * ★ 中身（どのデモがあるか）は `bubbles-ui` の `DEMO_SITES` 1 か所から来る
 *   ── アプリごとに書くと、url が増えたときにどれか 1 つだけ古いまま残る。
 * ★ **小さくなったら 1 つのアイコンになる**（ランチャー・ポケット・説明・世界線と同じ）。
 */
import { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box } from "@mui/material";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import { DemoSwitcher, useBubbleBox } from "@bublys-org/bubbles-ui";

/**
 * アイコンだけにする大きさ ── **行き先が 2 つ並ばないなら、並べる意味がない**
 * （ランチャーの `twoIcons` と同じ考え方）。
 *
 *   横: いちばん広い行き先 98 ＋ 次 86 ＋ すき間 6 ＝ 190
 *   縦: 1 行 30 × 2 ＋ 余白 8 ＝ 68
 *
 * ★ 畳むのは**縦も横も足りないとき**だけ（「かつ」）。岸の帯（348×44）は横に余地が
 *   あるので帯のまま ── 入り切らないぶんは転がして見る。
 */
const COMPACT = { width: 190, height: 68 };

/** 浮かぶ一覧の大きさ（名前と一行が読める形） */
const FLOATING = { width: 240, margin: 8 };

export const DemoSitesBubble: FC = () => {
  /** 描ける大きさは海が測って配る。配られる前は広いものとして扱う */
  const box = useBubbleBox();
  const compact = !!box && box.width < COMPACT.width && box.height < COMPACT.height;

  const iconRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [floatingAt, setFloatingAt] = useState<{ left: number; top: number } | null>(null);

  /** 浮かべる所 ── アイコンのすぐ外の、空いている方へ。アイコンには被せない */
  const floatAt = useCallback(() => {
    const el = iconRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x =
      window.innerWidth - r.right - FLOATING.margin >= FLOATING.width
        ? r.right + FLOATING.margin
        : r.left - FLOATING.margin - FLOATING.width >= 0
          ? r.left - FLOATING.margin - FLOATING.width
          : r.left;
    return {
      left: Math.max(FLOATING.margin, Math.min(window.innerWidth - FLOATING.width - FLOATING.margin, x)),
      // 縦は出してから実物を測って収める（下の `useLayoutEffect`）
      top: r.bottom + FLOATING.margin,
    };
  }, []);

  /** 出したあと、**実物の高さで**画面に収める（中身の行数は数えない） */
  useLayoutEffect(() => {
    const el = floatingRef.current;
    if (!floatingAt || !el) return;
    const h = el.getBoundingClientRect().height;
    const top = Math.max(FLOATING.margin, Math.min(window.innerHeight - h - FLOATING.margin, floatingAt.top));
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

  if (compact) {
    return (
      <>
        <div
          ref={iconRef}
          title="押すと他のデモへ行く口が出る"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#8aa4d6",
          }}
          onClick={() => setFloatingAt((at) => (at ? null : floatAt()))}
        >
          <TravelExploreIcon />
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
                width: FLOATING.width,
                padding: 8,
                boxSizing: "border-box",
                borderRadius: 12,
                background: "rgba(22,27,38,.96)",
                border: "1px solid rgba(255,255,255,.14)",
                color: "#dce8ff",
                zIndex: 2000,
                filter: "drop-shadow(0 8px 24px rgba(0,0,0,.35))",
              }}
              /** portal は DOM では body の子だが、React の出来事は親までのぼる */
              onClick={(e) => e.stopPropagation()}
            >
              <DemoSwitcher variant="list" exclude="os" />
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        px: 0.5,
        color: "#dce8ff",
        /** ★ 入り切らないぶんは転がして見る（姿は落とさない） */
        maxWidth: "100%",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {/* ★ ここは OS の画面の中なので、自分（bublys OS）は出さない（`exclude` の註） */}
      <DemoSwitcher variant="bar" exclude="os" />
    </Box>
  );
};

export default DemoSitesBubble;
