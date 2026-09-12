'use client';

/**
 * 回収状況のアイコン（未入力 ○ / 入力あり ✎ / 回収済み ✓）。
 * 月一覧・月別一覧・スタッフ詳細で同じ絵が並ぶよう1箇所にまとめる。
 */
import { FC } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import type { ShiftWishStatus } from "./shiftWishStatus.js";

export const ShiftWishStatusIcon: FC<{ status: ShiftWishStatus }> = ({ status }) => {
  if (status === "collected") return <CheckCircleIcon fontSize="small" />;
  if (status === "draft") return <EditNoteIcon fontSize="small" />;
  return <RadioButtonUncheckedIcon fontSize="small" />;
};
