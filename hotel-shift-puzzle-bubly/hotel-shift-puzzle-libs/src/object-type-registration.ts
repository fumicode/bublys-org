/**
 * このバブリのオブジェクト型を登録する（副作用）。
 *
 * 型の定義は objects/hotelObjects.ts に1箇所集約。ここでは登録を実行するだけ。
 */
import { registerObjects } from "./objects/framework.js";
import { HOTEL_OBJECTS } from "./objects/hotelObjects.js";

registerObjects(HOTEL_OBJECTS);
