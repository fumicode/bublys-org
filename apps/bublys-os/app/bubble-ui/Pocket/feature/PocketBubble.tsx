"use client";
/**
 * ポケット ── **1 つの泡**として。ただし**大きさで姿が変わる**。
 *
 * 前は画面の右下に居座る面で、専用の開閉ボタンを持っていた。新しい模型には
 * **画面に固定した面の置き場所が無い**（規則は「泡と、泡を囲む空間」しか知らない）。
 * だから同じものを普通の泡にして、いつも見えていてほしければ**岸に貼る**ことにした。
 *
 * 大きさで決まることは 2 つだけ:
 *
 *   1. **面ぜんぶが受け皿。** 泡のどこへ落としても入る（中の箱だけではない）
 *   2. **小さくなったらアイコンだけ**になり、一覧も巻物も消える。
 *      そのぶん、**押したとき**と**掴んだものが来たとき**に、中身が外へ浮かび上がる
 *      （旧の「ドラッグで近づくとポケットが開く」と同じ手ざわり）
 */
import { DragEvent as ReactDragEvent, FC, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BubblesContext, PocketView, hasDragPayload, parseDragPayload } from "@bublys-org/bubbles-ui";
import type { Bubble, DragDataType } from "@bublys-org/bubbles-ui";
import {
  addPocketItem,
  removePocketItem,
  selectPocketItems,
  useAppDispatch,
  useAppSelector,
} from "@bublys-org/state-management";

/**
 * アイコンだけにする大きさ。**「題名と 1 行が入らないなら、一覧を出す意味がない」**で決める。
 *
 *   横: 余白 24 ＋ 印 20 ＋ 隙間 8 ＋ ✕ 24 ＋ 名前のぶん  ＝ おおよそ 100
 *   縦: 余白 24 ＋ 題名 28 ＋ 隙間 12 ＋ 1 行 44          ＝ おおよそ 110
 *
 * 前は 200 × 120 にしていて、**細長いポケットが読めるのにアイコンのまま**だった。
 */
const COMPACT = { width: 100, height: 110 };
/** 外へ浮かび上がる受け皿の大きさ */
const FLOATING = { width: 260, height: 240 };
/** 浮かんだ受け皿が画面の縁から空ける隙間 */
const FLOAT_MARGIN = 8;

export const PocketBubble: FC<{ bubble: Bubble }> = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectPocketItems);
  const { openBubble } = useContext(BubblesContext);

  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 大きさは**レイアウトの px**（泡に掛かる倍率の影響を受けない側）で見る
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = size.width > 0 && (size.width < COMPACT.width || size.height < COMPACT.height);

  /** 仕舞う（受け入れるかどうかは型で決まる） */
  const take = useCallback(
    (url: string, type: DragDataType, label?: string, objectId?: string) => {
      dispatch(addPocketItem({ id: crypto.randomUUID(), url, type, objectId, label, addedAt: Date.now() }));
    },
    [dispatch],
  );

  /** 取り出す ＝ この泡の隣に開く。ポケットからは出て行かない（クリップボードなので） */
  const onItemClick = useCallback((url: string) => openBubble(url, bubble.id), [openBubble, bubble.id]);
  const onRemove = useCallback((id: string) => dispatch(removePocketItem(id)), [dispatch]);

  /**
   * アイコンだけのとき、外に浮かび上がる中身。null なら出ていない。
   * 出るきっかけは 2 つ ── **押した**ときと、**掴んだものが来た**とき。
   */
  const [floatingAt, setFloatingAt] = useState<{ left: number; top: number } | null>(null);

  /**
   * 浮かべる所 ── **アイコンのすぐ外**（上、入らなければ下）に、縁をそろえて出す。
   * アイコンの上に被せない ── 被せると、もう一度押して引っ込めることができなくなる。
   */
  const floatAt = useCallback(() => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const maxX = window.innerWidth - FLOATING.width - FLOAT_MARGIN;
    const maxY = window.innerHeight - FLOATING.height - FLOAT_MARGIN;
    const above = r.top - FLOAT_MARGIN - FLOATING.height;
    const below = r.bottom + FLOAT_MARGIN;
    return {
      left: Math.max(FLOAT_MARGIN, Math.min(maxX, r.right - FLOATING.width)),
      top: Math.max(FLOAT_MARGIN, above >= FLOAT_MARGIN ? above : Math.min(below, maxY)),
    };
  }, []);

  // 掴んだものを離した・掴むのをやめた ── 受け皿は引っ込む
  useEffect(() => {
    if (!floatingAt) return;
    const hide = () => setFloatingAt(null);
    // ほかの所で落とした・掴むのをやめた。受け皿の中で落としたときは、受け取ってから
    // 自分で引っ込む（下の `onDrop`）── ここで捕まえる側から消すと、
    // 受け皿が先に居なくなって落とし物が宙に浮く
    window.addEventListener("dragend", hide);
    window.addEventListener("drop", hide);
    return () => {
      window.removeEventListener("dragend", hide);
      window.removeEventListener("drop", hide);
    };
  }, [floatingAt]);

  /** アイコンを押したら、仕舞ってあるものが浮かび上がる（もう一度押すと引っ込む） */
  const onClick = useCallback(() => {
    if (!compact) return;
    setFloatingAt((at) => (at ? null : floatAt()));
  }, [compact, floatAt]);

  /** 外を押したら引っ込む（自分とその中身を押したときは、そのまま） */
  const floatingRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!floatingAt) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (floatingRef.current?.contains(t ?? null) || ref.current?.contains(t ?? null)) return;
      setFloatingAt(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [floatingAt]);

  const onDragEnter = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      // dragenter/dragover では中身が読めない（保護モード）。型だけを見る
      if (!compact || !hasDragPayload(e)) return;
      e.preventDefault();
      setFloatingAt((at) => at ?? floatAt());
    },
    [compact, floatAt],
  );

  /** 面ぜんぶが受け皿 ── 中の箱が受けなかったぶんはここで受ける */
  const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    if (!hasDragPayload(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      const payload = parseDragPayload(e);
      if (!payload?.url) return;
      e.preventDefault();
      e.stopPropagation();
      take(payload.url, payload.type, payload.label, payload.objectId);
    },
    [take],
  );

  return (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", cursor: compact ? "pointer" : undefined }}
      title={compact ? "押すと仕舞ってあるものが出る" : undefined}
      onClick={onClick}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* 閉じるのは泡の ✕。ポケット自身は閉じる口を持たない（onClose を渡さない） */}
      <PocketView items={items} onRemove={onRemove} onItemClick={onItemClick} onDrop={take} compact={compact} />

      {/* アイコンだけのときの受け皿。**泡の外**に出すので、泡の刈り込み（overflow）から逃がす */}
      {floatingAt &&
        createPortal(
          <div
            ref={floatingRef}
            style={{
              position: "fixed",
              left: floatingAt.left,
              top: floatingAt.top,
              width: FLOATING.width,
              height: FLOATING.height,
              zIndex: 2000,
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,.35))",
            }}
            /**
             * ★ portal は DOM では body の子だが、**React の出来事は親までのぼる**。
             *   止めておかないと、受け皿の中を押しただけで泡（アイコン）の `onClick` が
             *   走り、受け皿が引っ込んでしまう ── 中のものを開けなくなる。
             */
            onClick={(e) => e.stopPropagation()}
            onDragLeave={(e) => {
              // 受け皿の中を移っただけなら引っ込めない
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setFloatingAt(null);
            }}
          >
            <PocketView
              items={items}
              onRemove={onRemove}
              onItemClick={onItemClick}
              // 受け取ってから引っ込む（中で落とすと drop はここで止まるので、自分で閉じる）
              onDrop={(url, type, label, objectId) => {
                take(url, type, label, objectId);
                setFloatingAt(null);
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
