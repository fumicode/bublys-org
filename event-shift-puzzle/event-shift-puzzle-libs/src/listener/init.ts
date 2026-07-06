/**
 * listener 機能の初期化（副作用）
 *
 * 本ファイルを import するだけで以下が行われる:
 * - member-shift-preference-listener の注入
 */
import { injectMiddleware } from "@bublys-org/state-management";
import { memberShiftPreferenceListener } from "./member-shift-preference-listener.js";

injectMiddleware(memberShiftPreferenceListener.middleware);
