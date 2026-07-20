import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ShiftLearningExample } from "@bublys-org/hotel-shift-puzzle-model";
import {
  FEATURE_NAMES,
  featuresFromExample,
  featuresToVector,
  syntheticNegativeCell,
} from "./featuresFromExample.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const defaultCorpus = join(packageRoot, "out", "corpus.jsonl");
const defaultWeights = join(
  packageRoot,
  "..",
  "hotel-shift-puzzle-app",
  "public",
  "models",
  "shift-policy-weights.json"
);

export type ShiftPolicyWeights = {
  bias: number;
  weights: number[];
  version: string;
  featureNames: string[];
};

type TrainingRow = { x: number[]; y: number };

function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

function readCorpus(path: string): ShiftLearningExample[] {
  const raw = readFileSync(path, "utf-8").trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => JSON.parse(line) as ShiftLearningExample);
}

function buildTrainingRows(examples: ShiftLearningExample[]): TrainingRow[] {
  const setCellExamples = examples.filter((ex) => ex.kind === "setCell");
  const maxLinked = Math.max(
    1,
    ...setCellExamples.map((ex) => Math.abs(ex.context.linkedReportScore ?? 0))
  );

  const rows: TrainingRow[] = [];
  for (const ex of setCellExamples) {
    const positiveCell = ex.action.cellAfter;
    const negativeCell = syntheticNegativeCell(positiveCell);

    const pos = featuresToVector(
      featuresFromExample(ex, positiveCell, { maxLinkedReportScore: maxLinked })
    );
    const neg = featuresToVector(
      featuresFromExample(ex, negativeCell, {
        maxLinkedReportScore: maxLinked,
        wouldConcede: 0,
      })
    );

    rows.push({ x: pos, y: 1 }, { x: neg, y: 0 });
  }
  return rows;
}

function trainLogisticRegression(
  rows: TrainingRow[],
  featureCount: number,
  options?: { epochs?: number; learningRate?: number }
): { bias: number; weights: number[] } {
  const epochs = options?.epochs ?? 200;
  const lr = options?.learningRate ?? 0.1;
  let bias = 0;
  const weights = new Array(featureCount).fill(0);

  if (rows.length === 0) {
    return { bias, weights };
  }

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const row of rows) {
      let z = bias;
      for (let i = 0; i < featureCount; i++) {
        z += (weights[i] ?? 0) * (row.x[i] ?? 0);
      }
      const pred = sigmoid(z);
      const err = pred - row.y;

      bias -= lr * err;
      for (let i = 0; i < featureCount; i++) {
        weights[i] -= lr * err * (row.x[i] ?? 0);
      }
    }
  }

  return { bias, weights };
}

function main(): void {
  const corpusPath = resolve(process.argv[2] ?? defaultCorpus);
  const outputPath = resolve(process.argv[3] ?? defaultWeights);

  const examples = readCorpus(corpusPath);
  const rows = buildTrainingRows(examples);
  const { bias, weights } = trainLogisticRegression(rows, FEATURE_NAMES.length);

  const model: ShiftPolicyWeights = {
    bias,
    weights,
    version: "1",
    featureNames: [...FEATURE_NAMES],
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(model, null, 2) + "\n", "utf-8");

  console.log(
    `Trained on ${examples.length} examples (${rows.length} rows) → ${outputPath}`
  );
  console.log(`bias=${bias.toFixed(4)} weights=[${weights.map((w) => w.toFixed(4)).join(", ")}]`);
}

main();
