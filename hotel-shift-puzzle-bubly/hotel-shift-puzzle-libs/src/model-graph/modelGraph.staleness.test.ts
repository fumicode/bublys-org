/**
 * @jest-environment node
 *
 * 生成した図が**ソースと食い違っていないか**を見張る。
 *
 * 図をソースから起こすことにしたのは、手で書いた宣言だとモデルを直したときに
 * 図だけが黙って古いまま残るから。ところが生成物をコミットする以上、
 * **生成し直し忘れれば結局同じことが起きる**。だからここで機械に見張らせる。
 *
 * 落ちたら生成し直すこと:
 *   npm --workspace @bublys-org/model-graph run build
 *   node bublys-libs/model-graph/dist/lib/extract/cli.js \
 *     --source   hotel-shift-puzzle-bubly/hotel-shift-puzzle-model/src/lib \
 *     --registry hotel-shift-puzzle-bubly/hotel-shift-puzzle-libs/src/objects/hotelObjects.tsx \
 *     --out      hotel-shift-puzzle-bubly/hotel-shift-puzzle-libs/src/model-graph/modelGraph.generated.ts
 *
 * jsdom ではなく node 環境で走らせる（fs と TypeScript のコンパイラ API を使うため）。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractModelGraph,
  extractRegistry,
  renderGeneratedModule,
} from "@bublys-org/model-graph/extract";

const REPO = join(__dirname, "../../../..");
const SOURCE = join(REPO, "hotel-shift-puzzle-bubly/hotel-shift-puzzle-model/src/lib");
const REGISTRY = join(
  REPO,
  "hotel-shift-puzzle-bubly/hotel-shift-puzzle-libs/src/objects/hotelObjects.tsx"
);
const GENERATED = join(__dirname, "modelGraph.generated.ts");
const DISPLAY_ROOT = "hotel-shift-puzzle-bubly/hotel-shift-puzzle-model/src/lib";

function regenerate() {
  const info = extractRegistry(REGISTRY, "HOTEL_OBJECTS");
  return renderGeneratedModule(
    extractModelGraph({
      sourceRoot: SOURCE,
      displayRoot: DISPLAY_ROOT,
      aggregateTypes: info.aggregateClasses,
      typeAliases: info.aliases,
    })
  );
}

describe("モデル図の生成物", () => {
  it("★ ソースと食い違っていない（食い違ったら生成し直す）", () => {
    expect(regenerate()).toBe(readFileSync(GENERATED, "utf-8"));
  });

  it("記述子の登録が、そのまま集約の根になっている", () => {
    const info = extractRegistry(REGISTRY, "HOTEL_OBJECTS");
    // 登録名とクラス名がずれている型があること自体が、別名の仕組みが要る理由
    expect(info.aliases["Schedule"]).toBe("MonthlyStaffSchedule");
    expect(info.aggregateClasses).toContain("Staff");
  });
});
