/**
 * 「ファイルに入れる世界線スコープ」の定義。
 *
 * bublys-os では 1 つの store を全バブリで共有するので、`worldLineGraph.graphs` には
 * 他バブリ（メモ・CSV インポータ等）のスコープや、バブル配置の `root` スコープも並ぶ。
 * このバブリの書類として意味があるのは次の 2 種類だけ:
 *   - `hotel`            … アプリ全体の世界線（スタッフ・勤務表・希望・制約）
 *   - `Schedule:<id>`    … 勤務表ごとのローカル世界線（試行錯誤の履歴・分岐）
 *
 * `root`（バブルの配置）は書類の中身ではなく「見ている人の作業環境」なので含めない。
 * 他人のファイルを開いた瞬間に自分のウィンドウ配置が吹き飛ぶのは書類の振る舞いではない。
 */
import { APP_SCOPE_ID, localScopeId } from "../objects/commit.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";

/** 勤務表ごとのローカル世界線スコープIDの接頭辞（例 `Schedule:`） */
const SCHEDULE_SCOPE_PREFIX = localScopeId(SCHEDULE_TYPE, "");

/** このスコープはファイルに保存・復元する対象か */
export function isDocumentScope(scopeId: string): boolean {
  return scopeId === APP_SCOPE_ID || scopeId.startsWith(SCHEDULE_SCOPE_PREFIX);
}
