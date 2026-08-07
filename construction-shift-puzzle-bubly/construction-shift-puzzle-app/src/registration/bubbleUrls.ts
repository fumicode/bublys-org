/**
 * bubbleUrls — このバブリの「バブル URL スキーム」を app 層で一元管理する。
 *
 * バブル URL（どの URL でどのバブルを開くか）は app（ルーティング）の関心事なので、
 * libs（domain/ui/feature）には一切持たせない。ルートの pattern（bubbleRoutes.tsx）と
 * URL の作り方（ここ）は対なので同じ app 層に並べてズレないようにする。
 *
 * オブジェクトの正規 URL（社員/機械）も registerObjectUrl でここから登録する。
 * これにより ObjectView(object=…) がドラッグ時に URL を解決でき、ドロップ側は URL 末尾から
 * id を取り出せる（配置表セルへのドラッグ配置）。
 */
import { registerObjectUrl } from "@bublys-org/bubbles-ui";
import {
  EMPLOYEE_TYPE,
  MACHINE_TYPE,
} from "@bublys-org/construction-shift-puzzle-libs";

/** 現場一覧バブル */
export const sitesUrl = (): string => `construction-shift-puzzle/sites`;

/** 社員一覧バブル */
export const employeesUrl = (): string => `construction-shift-puzzle/employees`;

/** 機械一覧バブル */
export const machinesUrl = (): string => `construction-shift-puzzle/machines`;

/** 配置表グリッドバブル（全社1枚） */
export const boardUrl = (): string => `construction-shift-puzzle/board`;

/** ある日の状態ビューバブル（日ヘッダのダブルクリックで開く） */
export const dayUrl = (dayKey: string): string =>
  `construction-shift-puzzle/days/${dayKey}`;

/**
 * 配置表の世界線ビューバブル（配置の編集履歴・時間移動）。
 * `/history` で終わると bubbles-ui が下部ストリップに特別扱いするため別名（world-line）にする。
 */
export const boardWorldLineUrl = (): string =>
  `construction-shift-puzzle/board/world-line`;

/** 社員オブジェクトの正規 URL（ドラッグ配置の id 抽出に使う） */
export const employeeUrl = (id: string): string =>
  `construction-shift-puzzle/employees/${id}`;

/** 機械オブジェクトの正規 URL */
export const machineUrl = (id: string): string =>
  `construction-shift-puzzle/machines/${id}`;

// オブジェクトの正規 URL を registry に登録（副作用）。ObjectView(object=…) の url 解決に使う。
registerObjectUrl(EMPLOYEE_TYPE, employeeUrl);
registerObjectUrl(MACHINE_TYPE, machineUrl);
