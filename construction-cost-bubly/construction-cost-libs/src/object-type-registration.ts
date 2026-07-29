/**
 * このバブリのオブジェクト型を登録する（副作用）。
 *
 * 型の定義は objects/constructionObjects.ts に1箇所集約。ここでは登録を実行するだけ。
 */
import { registerObjects } from "./objects/framework.js";
import { CONSTRUCTION_OBJECTS } from "./objects/constructionObjects.js";

registerObjects(CONSTRUCTION_OBJECTS);
