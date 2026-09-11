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
 *     --source event-shift-puzzle/event-shift-puzzle-model/src/lib \
 *     --slices  event-shift-puzzle/event-shift-puzzle-libs/src/slice \
 *     --out     event-shift-puzzle/event-shift-puzzle-libs/src/model-graph/modelGraph.generated.ts
 *
 * jsdom ではなく node 環境で走らせる（fs と TypeScript のコンパイラ API を使うため）。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractModelGraph,
  extractSliceRoots,
  renderGeneratedModule,
} from "@bublys-org/model-graph/extract";

const REPO = join(__dirname, "../../../..");
const SOURCE = join(REPO, "event-shift-puzzle/event-shift-puzzle-model/src/lib");
const SLICES = join(REPO, "event-shift-puzzle/event-shift-puzzle-libs/src/slice");
const GENERATED = join(__dirname, "modelGraph.generated.ts");
const DISPLAY_ROOT = "event-shift-puzzle/event-shift-puzzle-model/src/lib";

function regenerate() {
  return renderGeneratedModule(
    extractModelGraph({
      sourceRoot: SOURCE,
      displayRoot: DISPLAY_ROOT,
      aggregateTypes: extractSliceRoots(SLICES).aggregateClasses,
    })
  );
}

describe("モデル図の生成物", () => {
  it("★ ソースと食い違っていない（食い違ったら生成し直す）", () => {
    expect(regenerate()).toBe(readFileSync(GENERATED, "utf-8"));
  });

  /**
   * ★ このバブリには記述子（`HOTEL_OBJECTS` のようなもの）が無いので、
   * 「どのクラスが集約の根か」はスライスが唯一の宣言になる。
   * 引数に手で書いていたら、スライスを1つ足したとき図が黙って古くなる。
   */
  it("スライスの宣言が、そのまま集約の根になっている", () => {
    const roots = extractSliceRoots(SLICES).aggregateClasses;
    expect(roots).toEqual(["Member", "ShiftPlan", "ShiftPreference", "Task"]);
  });

  /**
   * ★ `Shift` は根ではない。スライスが保存しているのは `ShiftPlan` のほうで、
   * Shift はその中の部品。ところが**世界線に載るのは Shift だけ**——
   * 「集約の単位」と「巻き戻りの単位」がずれている、このバブリの読みどころ。
   */
  it("Shift は集約の根ではない（ShiftPlan の中の部品）", () => {
    expect(extractSliceRoots(SLICES).aggregateClasses).not.toContain("Shift");
    const graph = extractModelGraph({
      sourceRoot: SOURCE,
      displayRoot: DISPLAY_ROOT,
      aggregateTypes: extractSliceRoots(SLICES).aggregateClasses,
    });
    expect(graph.classes.find((c) => c.name === "Shift")?.kind).toBe("part");
    expect(
      graph.relations.some(
        (r) => r.from === "ShiftPlan" && r.to === "Shift" && r.kind === "contains"
      )
    ).toBe(true);
  });
});
