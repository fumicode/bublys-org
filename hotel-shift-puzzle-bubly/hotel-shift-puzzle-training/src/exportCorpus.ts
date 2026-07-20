import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MonthlyStaffSchedule,
  ScheduleEditLog,
  extractLearningExamples,
  type ShiftLearningExample,
} from "@bublys-org/hotel-shift-puzzle-model";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const defaultInput = join(packageRoot, "fixtures", "sample-dump.json");
const defaultOutput = join(packageRoot, "out", "corpus.jsonl");

type DumpNode = {
  nodeId: string;
  parentNodeId: string | null;
  schedule: Parameters<typeof MonthlyStaffSchedule.fromPlain>[0];
  editLog: ConstructorParameters<typeof ScheduleEditLog>[0];
};

type WorldLineDump = {
  scheduleId: string;
  nodes: DumpNode[];
};

function isWorldLineDump(value: unknown): value is WorldLineDump {
  return (
    typeof value === "object" &&
    value !== null &&
    "scheduleId" in value &&
    "nodes" in value &&
    Array.isArray((value as WorldLineDump).nodes)
  );
}

function isShiftLearningExample(value: unknown): value is ShiftLearningExample {
  return (
    typeof value === "object" &&
    value !== null &&
    "context" in value &&
    "action" in value &&
    "scheduleId" in value
  );
}

function parseInput(raw: string): ShiftLearningExample[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // JSONL: 各行が ShiftLearningExample
  if (!trimmed.startsWith("{") || trimmed.includes("\n{")) {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 1 || !trimmed.startsWith("{")) {
      return lines.map((line) => {
        const parsed = JSON.parse(line) as unknown;
        if (!isShiftLearningExample(parsed)) {
          throw new Error("JSONL の各行は ShiftLearningExample である必要があります");
        }
        return parsed;
      });
    }
  }

  const parsed = JSON.parse(trimmed) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.filter(isShiftLearningExample);
  }

  if (isShiftLearningExample(parsed)) {
    return [parsed];
  }

  if (isWorldLineDump(parsed)) {
    const snapshots = parsed.nodes.map((node) => ({
      nodeId: node.nodeId,
      parentNodeId: node.parentNodeId,
      schedule: MonthlyStaffSchedule.fromPlain(node.schedule),
      editLog: new ScheduleEditLog(node.editLog),
    }));
    return extractLearningExamples(parsed.scheduleId, snapshots);
  }

  throw new Error(
    "未対応の入力形式です。WorldLineDump または ShiftLearningExample の JSON/JSONL を渡してください"
  );
}

function main(): void {
  const inputPath = resolve(process.argv[2] ?? defaultInput);
  const outputPath = resolve(process.argv[3] ?? defaultOutput);
  const raw = readFileSync(inputPath, "utf-8");
  const examples = parseInput(raw);

  mkdirSync(dirname(outputPath), { recursive: true });
  const jsonl = examples.map((ex) => JSON.stringify(ex)).join("\n") + (examples.length ? "\n" : "");
  writeFileSync(outputPath, jsonl, "utf-8");

  console.log(`Wrote ${examples.length} examples to ${outputPath}`);
}

main();
