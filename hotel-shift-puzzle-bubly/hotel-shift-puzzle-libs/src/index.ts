// Object type registration (副作用)
import "./object-type-registration.js";

// World-line graph 初期化（副作用）
import "./world-line/init.js";

// このバブリのスライス注入（副作用）
import "./slice/init.js";

// オブジェクト記述子フレームワーク + リポジトリ + このバブリのオブジェクト定義
export * from "./objects/framework.js";
export * from "./objects/repository.js";
export * from "./objects/world.js";
export * from "./objects/migrateLegacyScopes.js";
export * from "./objects/hotelObjects.js";
// 世界での立場（固定メンバーか）を答える純粋なクエリ。世界線ビューが使う。
// commit.js（書き込み API）はバレルに出さない ——「世界を作る場所は
// ensureWorldBorn 1本」という規約を app 側から破れなくするため
export * from "./objects/cellRole.js";

// Domain models (re-exported from @bublys-org/hotel-shift-puzzle-model)
export * from "./domain/index.js";

// UI components
export * from "./ui/index.js";

// Feature components
export * from "./feature/index.js";

// Redux slices
export * from "./slice/index.js";

// 勤務表ファイル（世界線ごとローカルファイルへ保存・読み込み）
export * from "./world-file/index.js";

// Sample data
export * from "./data/index.js";
