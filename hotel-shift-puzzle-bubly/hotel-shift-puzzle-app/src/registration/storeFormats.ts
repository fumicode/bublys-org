/**
 * storeFormats — このデプロイで選べる形態・区切り方
 *
 * 形態（ホテル・行政…）は店舗のデータが決める。デプロイが決めるのは
 * **既定の形態と、選べる形態**だけ。環境変数 `VITE_SHIFT_FORMATS` に並べ、先頭が既定になる。
 *
 *   未設定 / hotel        … 公開中のホテル版。ホテルだけ
 *   government            … 行政版。行政だけ（ホテルの形態は出さない）
 *   hotel,government      … 手元の開発用。両方（先頭のホテルが既定）
 *
 * 選べる区切り方は、選べる形態から決める。ホテルは暦月だけ（今のターゲットは暦月なので、
 * 4週はホテル版には出さない）。行政は4週と暦月（区切り方は店舗の設定）。
 *
 * 例データもここで決まる形態に合わせる（`useSampleWhenEmpty` / `WorldFilePanel` に渡す）。
 */
import {
  StoreFormat,
  type PeriodRuleKind,
  type StoreFormatId,
} from "@bublys-org/hotel-shift-puzzle-model";

/** このデプロイで選べる形態（先頭が既定） */
export const availableStoreFormats: readonly StoreFormat[] = StoreFormat.listOf(
  import.meta.env.VITE_SHIFT_FORMATS
);

/** 形態ごとに選べる区切り方 */
const RULE_KINDS_BY_FORMAT: Record<StoreFormatId, readonly PeriodRuleKind[]> = {
  hotel: ["calendar-month"],
  government: ["four-week", "calendar-month"],
};

/** このデプロイで選べる区切り方（選べる形態のぶんを合わせる） */
export const availablePeriodRuleKinds: readonly PeriodRuleKind[] = [
  ...new Set(availableStoreFormats.flatMap((f) => RULE_KINDS_BY_FORMAT[f.id])),
];
