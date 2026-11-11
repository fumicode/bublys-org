/**
 * storeFormats — このデプロイで選べる形態・区切り方
 *
 * 形態（ホテル・行政…）は店舗のデータが決める。デプロイが決めるのは「どれを選べるか」だけ。
 * 行政向けは作りかけなので、環境変数 `VITE_SHIFT_GOVERNMENT=on` を入れたビルドでだけ
 * 行政の形態と4週の区切り方を選べるようにする（公開中のホテル版には出さない）。
 *
 * 行政の入口（行政用の Vercel プロジェクト）を作るときは、ここで既定の形態も決める（#234 の PR3）。
 */
import {
  GOVERNMENT_FORMAT,
  HOTEL_FORMAT,
  type PeriodRuleKind,
  type StoreFormat,
} from "@bublys-org/hotel-shift-puzzle-model";

const governmentEnabled = import.meta.env.VITE_SHIFT_GOVERNMENT === "on";

export const availableStoreFormats: readonly StoreFormat[] = governmentEnabled
  ? [HOTEL_FORMAT, GOVERNMENT_FORMAT]
  : [HOTEL_FORMAT];

export const availablePeriodRuleKinds: readonly PeriodRuleKind[] = governmentEnabled
  ? ["calendar-month", "four-week"]
  : ["calendar-month"];
