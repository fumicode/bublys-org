"use client";
import { createContext, RefObject, useContext } from "react";
import type { Point2, Size2 } from "@bublys-org/bubbles-ui-util";
import type { ShowreSide } from "./Showre.domain.js";

/** 辺からこの距離（px）以内で離すと、その岸に着く */
export const SHOWRE_DOCK_THRESHOLD = 24;

/**
 * 引き剥がしの予告: 海のどこに、どの大きさで浮くか。
 * point は画面座標（clientX/Y）。左上がここに来る（落とした点 = バブルの位置）。
 */
export type FloatPreview = { point: Point2; size: Size2 };

export type ShowreDragContextType = {
  /** この岸を持つ universe */
  universeId: string;
  /** 岸 + 海のレイアウト要素。辺の判定と、海の要素の検索に使う */
  layoutRef: RefObject<HTMLDivElement | null>;
  /** ドラッグ中に「ここに着く」と見せている岸。無ければ null */
  previewSide: ShowreSide | null;
  setPreviewSide: (side: ShowreSide | null) => void;
  /** ドラッグ中に「ここに浮く」と見せている矩形。無ければ null */
  previewFloat: FloatPreview | null;
  setPreviewFloat: (preview: FloatPreview | null) => void;
  /**
   * 画面上の点がどの岸を指しているか。
   * 既にある帯の上、または辺から {@link SHOWRE_DOCK_THRESHOLD} 以内ならその岸。
   * 海の中なら undefined。
   */
  sideNear: (point: Point2) => ShowreSide | undefined;
  /**
   * その岸の並びで、点がどの位置に入るか（0 = 先頭）。
   * `excludeBubbleId` は自分自身（並び替えのとき数えない）。
   */
  indexOnSide: (side: ShowreSide, point: Point2, excludeBubbleId?: string) => number;
  /** この universe の海（`data-bubble-universe`）の要素。落とした点を universe 座標に直すのに使う */
  seaElement: () => HTMLElement | null;
};

/**
 * 着岸・引き剥がしのドラッグが、自分の universe の岸を見つけるための context。
 * {@link ShowreLayout} が提供する。外（岸を持たない場所）では null。
 */
export const ShowreDragContext = createContext<ShowreDragContextType | null>(null);

export const useShowreDrag = (): ShowreDragContextType | null => useContext(ShowreDragContext);
