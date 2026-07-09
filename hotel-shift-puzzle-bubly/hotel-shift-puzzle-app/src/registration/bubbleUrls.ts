/**
 * bubbleUrls — このバブリの「バブル URL スキーム」を app 層で一元管理する。
 *
 * バブル URL（どの URL でどのバブルを開くか）は app（ルーティング）の関心事なので、
 * libs（domain/ui/feature）には一切持たせない。ここで:
 *   - オブジェクトの正規 URL（Staff / Schedule）を registerObjectUrl で登録する
 *     （ObjectView に object を渡すだけで開ける／ドラッグできるための「アドレス」）
 *   - ルート/サブビューの URL ビルダー（稼働日詳細・違反）を export し、bubbleRoutes や
 *     ScheduleGrid へ渡す
 *
 * ルートの pattern（bubbleRoutes.tsx）と URL の作り方（ここ）は対なので、同じ app 層に
 * 並べてズレないようにする。
 */
import { registerObjectUrl } from "@bublys-org/bubbles-ui";
import { STAFF_TYPE, SCHEDULE_TYPE } from "@bublys-org/hotel-shift-puzzle-libs";

/** スタッフ詳細バブル */
export const staffUrl = (staffId: string): string =>
  `hotel-shift-puzzle/staffs/${staffId}`;

/** 月間勤務表バブル */
export const scheduleUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}`;

/** 可能勤務帯エディタバブル */
export const scheduleAvailabilityUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/availability`;

/**
 * 世界線ビューバブル。`/history` で終わると bubbles-ui 側で画面下部ストリップ展開に
 * 特別扱いされるため、通常の bubble-side popChild にしたいこのバブルは別名（world-line）にする。
 */
export const scheduleWorldLineUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/world-line`;

/** 自動シフト パネルバブル */
export const scheduleAutoShiftUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/auto-shift`;

/**
 * 抽出勤務表バブル（選択スタッフだけの勤務表）。
 * 選択スタッフID群をカンマ連結して URL に乗せる。同じ URL を抽出ボタンの data-url にも使う
 * ので、選択順ではなく安定した順（呼び出し側で勤務表の並び順）で渡す前提。
 */
export const scheduleExtractUrl = (scheduleId: string, staffIds: string[]): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/extract/${staffIds.join(",")}`;

/** 稼働日詳細バブル（勤務表の日付ヘッダから開く） */
export const scheduleDayUrl = (scheduleId: string, dayKey: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/days/${dayKey}`;

/** 責任者ルール可視化バブル（上部ルール行のクリックで開く。ロールキーを乗せる） */
export const scheduleLeaderRuleUrl = (
  scheduleId: string,
  ruleKey: string
): string => `hotel-shift-puzzle/schedules/${scheduleId}/leader-rules/${ruleKey}`;

/** 制約違反バブル（赤帯・⊿マーカーから開く） */
export const scheduleViolationUrl = (
  scheduleId: string,
  violationKey: string
): string => `hotel-shift-puzzle/schedules/${scheduleId}/violations/${violationKey}`;

// オブジェクトの正規 URL を registry に登録（副作用）。libs の記述子からは url を外したので、
// ObjectView(object=...) の url 解決はこの登録が担う。このモジュールは bubbleRoutes から
// import されるため、ルート登録と同じタイミングで一度だけ走る。
registerObjectUrl(STAFF_TYPE, staffUrl);
registerObjectUrl(SCHEDULE_TYPE, scheduleUrl);
