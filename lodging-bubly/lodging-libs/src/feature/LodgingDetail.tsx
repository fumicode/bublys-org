'use client';
/**
 * 宿 1 軒の詳細。**保存と画面を橋渡しするだけ**で、直し方は集約が持つ。
 *
 * 流れ：セレクタで集約を取る → 集約のメソッドで新しいインスタンスを得る →
 * `toPlain()` して入れ物へ保存（CLAUDE.md 規則6）。
 */
import { FC, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { LodgingDetailView } from "../ui/LodgingDetailView.js";
import { selectLodgingById, updateLodging } from "../slice/lodging-slice.js";

export const LodgingDetail: FC<{ lodgingId: string }> = ({ lodgingId }) => {
  const dispatch = useAppDispatch();
  const lodging = useAppSelector(selectLodgingById(lodgingId));

  const onRename = useCallback(
    (name: string) => {
      if (!lodging) return;
      dispatch(updateLodging(lodging.withName(name).toPlain()));
    },
    [dispatch, lodging],
  );

  if (!lodging) return <div style={{ padding: 10, color: "#666" }}>この宿は見つかりませんでした。</div>;
  return <LodgingDetailView lodging={lodging} onRename={onRename} />;
};
