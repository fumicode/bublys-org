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
import {
  STAFF_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_REPORT_TYPE,
} from "@bublys-org/hotel-shift-puzzle-libs";

/** スタッフ詳細バブル */
export const staffUrl = (staffId: string): string =>
  `hotel-shift-puzzle/staffs/${staffId}`;

/** 月間勤務表バブル */
export const scheduleUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}`;

/** 勤務スタッフ群バブル（誰が働くか・並び順・可能勤務帯・勤務帯の列をここで全部） */
export const scheduleStaffUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/staff`;

/** 予約状況（宿泊人数・部屋数）編集バブル（勤務表の予約行から開く） */
export const scheduleReservationInfoUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/reservation-info`;

/**
 * 世界線ビューバブル。`/history` で終わると bubbles-ui 側で画面下部ストリップ展開に
 * 特別扱いされるため、通常の bubble-side popChild にしたいこのバブルは別名（world-line）にする。
 */
export const scheduleWorldLineUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/world-line`;

/** キセキの木ビューバブル（SVG版・読み取り専用） */
export const scheduleWorldLineTreeUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/tree`;

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

/**
 * 勤務間インターバルのルール可視化バブル（上部ルール行の「遅番明け」アイコンから開く）。
 * 責任者ルールと並ぶ「ルールの図」なので、URL も leader-rules と同じ形に揃える。
 */
export const scheduleShiftIntervalRuleUrl = (
  scheduleId: string,
  ruleKey: string
): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/shift-interval-rules/${ruleKey}`;

/** 制約違反バブル（赤帯・⊿マーカーから開く） */
export const scheduleViolationUrl = (
  scheduleId: string,
  violationKey: string
): string => `hotel-shift-puzzle/schedules/${scheduleId}/violations/${violationKey}`;

/** シフト完成レポートバブル（勤務表の「完成レポートを作成」から開く） */
export const scheduleReportUrl = (reportId: string): string =>
  `hotel-shift-puzzle/schedule-reports/${reportId}`;

/** シフト完成レポート一覧バブル（次回シフト作成前の参照用。勤務表一覧から開く） */
export const scheduleReportListUrl = (): string => `hotel-shift-puzzle/schedule-reports`;

/**
 * 勤務表ファイルバブル（ローカルファイルへの保存・読み込み）。
 * 特定の勤務表ではなく世界全体を扱うので、勤務表の下ではなくトップレベルに置く。
 */
export const worldFileUrl = (): string => `hotel-shift-puzzle/file`;

/**
 * 世界線インスペクタ（デバッグ用）。
 * メモリ（Redux の CAS）と IndexedDB に何が入っているかを覗く。
 * 特定の勤務表ではなく世界線の仕組みそのものを見るので、トップレベルに置く。
 */
export const worldLineInspectorUrl = (): string =>
  `hotel-shift-puzzle/world-line-inspector`;

/** 世界線を3Dで覗くビュー（デバッグ用） */
export const worldLine3DUrl = (): string => `hotel-shift-puzzle/world-line-3d`;

/** モデルのクラス図 */
export const modelClassDiagramUrl = (): string => `hotel-shift-puzzle/model-class-diagram`;

/** 操作履歴（ノウハウ可視化）バブル */
export const scheduleEditLogUrl = (scheduleId: string): string =>
  `hotel-shift-puzzle/schedules/${scheduleId}/edit-log`;

// オブジェクトの正規 URL を registry に登録（副作用）。libs の記述子からは url を外したので、
// ObjectView(object=...) の url 解決はこの登録が担う。このモジュールは bubbleRoutes から
// import されるため、ルート登録と同じタイミングで一度だけ走る。
registerObjectUrl(STAFF_TYPE, staffUrl);
registerObjectUrl(SCHEDULE_TYPE, scheduleUrl);
registerObjectUrl(SCHEDULE_REPORT_TYPE, scheduleReportUrl);
