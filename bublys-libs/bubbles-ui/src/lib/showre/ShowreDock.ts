"use client";
import { createContext, useContext } from "react";
import type { Point2, Size2 } from "@bublys-org/bubbles-ui-util";
import type { DockState, ScreenRect } from "./Showre.domain.js";

/**
 * ドラッグ中に「いま離したらどうなるか」。
 * - `dock` があれば岸に貼り付く（`rect` は貼り付いたあとの矩形）
 * - `dock` が無ければ海に浮く（`rect` はそこに浮いたときの矩形）
 * 予告はどちらも `rect` をそのまま描く。
 */
export type DockResolution = {
  readonly rect: ScreenRect;
  readonly dock?: DockState;
};

export type ShowreDockContextType = {
  readonly universeId: string;
  /** 海（画面）の大きさ。貼り付いたバブルはこれより大きくならない */
  readonly viewport: Size2;
  /**
   * 「いま離したらどうなるか」を解く。
   *
   * @param rect   いまバブルが見えている矩形（画面座標）。**掴んだ点との相対位置はここに入っている**
   * @param cursor カーソルの位置。どの辺に寄せたかを決めるのはこちら
   *
   * 縁の近くなら岸（dock つき）、そうでなければ海に浮く（dock 無し）。
   * 先客に塞がれていて貼れないときは null（予告を出さない）。
   */
  resolve: (rect: ScreenRect, cursor: Point2, bubbleId: string) => DockResolution | null;
  /**
   * 貼ったまま大きさを変える。画面座標の矩形で留め直す。
   * 留まっている辺は変わらないので、貼った辺は動かず、掴んだ側だけが動く。
   */
  redock: (bubbleId: string, rect: ScreenRect) => void;
  /** ドラッグ中の予告（null で消す） */
  readonly preview: DockResolution | null;
  setPreview: (preview: DockResolution | null) => void;
  /** 画面の点を universe 座標に直す（剥がして海に浮かせるときの位置） */
  toUniverse: (point: Point2) => Point2 | undefined;
};

/**
 * 岸に貼り付ける・剥がすドラッグの支え。{@link BubblesLayeredView} が提供する。
 * 岸を持たない場所（テスト等）では null。
 */
export const ShowreDockContext = createContext<ShowreDockContextType | null>(null);

export const useShowreDock = (): ShowreDockContextType | null => useContext(ShowreDockContext);
