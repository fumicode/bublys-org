/**
 * construction-shift-puzzle — ドメインモデル
 *
 * 建設現場のリソース（社員・機械）配置を表す不変ドメイン。
 */

// 値オブジェクト
export * from "./WorkingDay.js";
export * from "./DateRange.js";
export * from "./ResourceRef.js";

// エンティティ（現場・リソース）
export * from "./Site.js";
export * from "./Employee.js";
export * from "./Machine.js";

// 配置（中心集約）
export * from "./Assignment.js";
export * from "./PlacementBoard.js";

// 機械希望
export * from "./MachineRequest.js";
