/**
 * マッピング自動推定ロジック
 *
 * ソース側のリーフ path と、ターゲットスキーマのリーフ path を突き合わせて、
 * 名前・エイリアス・値パターンから最尤のマッピングを提案する。
 */

import { pathToString, type SchemaField } from "@bublys-org/domain-registry/schema";
import type { DomainSchema } from "./DomainSchema.js";
import type { FieldMapping, ValueTransform } from "./MappingRule.js";

/** 組み込みエイリアス辞書（プロパティ名の基底名でマッチ） */
const ALIAS_DICTIONARY: Record<string, string[]> = {
  name: ["名前", "氏名", "Name", "お名前"],
  furigana: ["フリガナ", "ふりがな", "カナ", "読み"],
  email: ["メール", "メールアドレス", "Email", "E-mail", "Eメール"],
  phone: ["電話", "電話番号", "Tel", "Phone", "携帯"],
  school: ["学校", "大学", "School", "学校名"],
  grade: ["学年", "Grade", "年次"],
  gender: ["性別", "Gender"],
  notes: ["備考", "メモ", "Notes", "コメント", "その他"],
  address: ["住所", "Address", "所在地"],
  age: ["年齢", "Age"],
  department: ["部署", "Department", "学部"],
  city: ["市区町村", "市", "City"],
  zip: ["郵便番号", "Zip", "Postal"],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\-+() ]{7,}$/;

/** ソース側リーフの表現 */
export type SourceLeaf = {
  /** dot-notation の path */
  readonly path: string;
  /** 見出しラベル（あれば） */
  readonly label?: string;
  /** サンプル値（パターンマッチ用） */
  readonly sampleValue?: unknown;
};

type ScoredMapping = {
  sourcePath: string;
  targetPath: string;
  score: number;
  transform: ValueTransform;
};

/** 基底名（path の末尾セグメント） */
const leafName = (p: string): string => {
  const parts = p.split(".");
  return parts[parts.length - 1] ?? p;
};

/** ソース leaf とターゲットフィールドの相性を採点 */
function scoreMatch(
  source: SourceLeaf,
  target: { path: string; field: SchemaField }
): ScoredMapping | null {
  let score = 0;
  let transform: ValueTransform = { type: "identity" };

  const srcName = leafName(source.path).toLowerCase();
  const srcLabel = source.label;
  const tgtName = leafName(target.path);
  const tgtLower = tgtName.toLowerCase();

  // 完全一致
  if (srcName === tgtLower) score += 10;

  // ラベル一致（ソースキーがターゲットのラベルと同じ）
  if (target.field.label && source.path === target.field.label) score += 10;
  if (target.field.label && srcLabel === target.field.label) score += 10;

  // エイリアス辞書
  const aliases = ALIAS_DICTIONARY[tgtName];
  if (aliases) {
    const hit = aliases.some((a) => a.toLowerCase() === srcName);
    if (hit) score += 8;
    if (srcLabel && aliases.some((a) => a === srcLabel)) score += 8;
  }

  // 値パターン
  const sample =
    typeof source.sampleValue === "string" ? source.sampleValue : undefined;
  if (sample) {
    if (tgtName === "email" && EMAIL_PATTERN.test(sample)) score += 5;
    if (tgtName === "phone" && PHONE_PATTERN.test(sample)) score += 5;
  }

  // 型に応じた transform 推定
  if (target.field.shape.kind === "primitive") {
    if (target.field.shape.primitive === "number") {
      transform = { type: "toNumber" };
    } else if (target.field.shape.primitive === "boolean") {
      transform = {
        type: "toBoolean",
        trueValues: ["true", "はい", "yes", "1", "○"],
      };
    }
  }

  if (score === 0) return null;
  return {
    sourcePath: source.path,
    targetPath: target.path,
    score,
    transform,
  };
}

/** ソース leaves とターゲットスキーマから提案を生成する */
export function suggestMappings(
  sources: SourceLeaf[],
  schema: DomainSchema
): FieldMapping[] {
  const targets = schema.leafFields.map(({ path, field }) => ({
    path: pathToString(path),
    field,
  }));

  const candidates: ScoredMapping[] = [];
  for (const src of sources) {
    for (const tgt of targets) {
      const m = scoreMatch(src, tgt);
      if (m) candidates.push(m);
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const usedSources = new Set<string>();
  const usedTargets = new Set<string>();
  const result: FieldMapping[] = [];
  for (const c of candidates) {
    if (usedSources.has(c.sourcePath) || usedTargets.has(c.targetPath)) continue;
    usedSources.add(c.sourcePath);
    usedTargets.add(c.targetPath);
    result.push({
      sourcePath: c.sourcePath,
      targetPath: c.targetPath,
      transform: c.transform,
    });
  }
  return result;
}
