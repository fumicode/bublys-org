/**
 * マッピング自動推定ロジック
 * ソースキーとスキーマプロパティの名前・エイリアス・値パターンからマッピングを提案する
 */

import type { DomainSchema, SchemaProperty } from "./DomainSchema.js";
import type { FieldMapping, ValueTransform } from "./MappingRule.js";

/** 組み込みエイリアス辞書 */
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
};

/** メールアドレスパターン */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 電話番号パターン */
const PHONE_PATTERN = /^[\d\-+() ]{7,}$/;

type ScoredMapping = {
  sourceKey: string;
  targetProperty: string;
  score: number;
  transform: ValueTransform;
};

/**
 * ソースキーとターゲットプロパティのスコアを計算する
 */
function scoreMatch(
  sourceKey: string,
  prop: SchemaProperty,
  sampleValue?: string
): ScoredMapping | null {
  let score = 0;
  let transform: ValueTransform = { type: "identity" };

  const srcLower = sourceKey.toLowerCase();
  const propLower = prop.name.toLowerCase();

  // 完全一致（大文字小文字無視）
  if (srcLower === propLower) {
    score += 10;
  }

  // ラベルとの完全一致
  if (prop.label && sourceKey === prop.label) {
    score += 10;
  }

  // エイリアス辞書マッチ
  const aliases = ALIAS_DICTIONARY[prop.name];
  if (aliases) {
    const aliasMatch = aliases.some(
      (alias) => alias.toLowerCase() === srcLower
    );
    if (aliasMatch) {
      score += 8;
    }
  }

  // 値パターンマッチ
  if (sampleValue) {
    if (prop.name === "email" || prop.type === "string") {
      if (EMAIL_PATTERN.test(sampleValue) && prop.name === "email") {
        score += 5;
      }
    }
    if (prop.name === "phone") {
      if (PHONE_PATTERN.test(sampleValue)) {
        score += 5;
      }
    }
  }

  // 型に応じたtransform推定
  if (prop.type === "number") {
    transform = { type: "toNumber" };
  } else if (prop.type === "boolean") {
    transform = {
      type: "toBoolean",
      trueValues: ["true", "はい", "yes", "1", "○"],
    };
  }

  if (score === 0) return null;

  return {
    sourceKey,
    targetProperty: prop.name,
    score,
    transform,
  };
}

/**
 * ソースキーとスキーマからマッピング候補を提案する
 *
 * @param sourceKeys PlaneObjectのキー一覧
 * @param schema 変換先スキーマ
 * @param sampleValues サンプル値（推定精度向上用）
 * @returns 提案されたFieldMappingの配列
 */
export function suggestMappings(
  sourceKeys: string[],
  schema: DomainSchema,
  sampleValues?: Record<string, string>
): FieldMapping[] {
  const candidates: ScoredMapping[] = [];

  for (const sourceKey of sourceKeys) {
    for (const prop of schema.properties) {
      const match = scoreMatch(
        sourceKey,
        prop,
        sampleValues?.[sourceKey]
      );
      if (match) {
        candidates.push(match);
      }
    }
  }

  // スコア降順でソート
  candidates.sort((a, b) => b.score - a.score);

  // 貪欲法: 各ソースキーとターゲットプロパティは1つずつ
  const usedSources = new Set<string>();
  const usedTargets = new Set<string>();
  const result: FieldMapping[] = [];

  for (const c of candidates) {
    if (usedSources.has(c.sourceKey) || usedTargets.has(c.targetProperty)) {
      continue;
    }
    usedSources.add(c.sourceKey);
    usedTargets.add(c.targetProperty);
    result.push({
      sourceKey: c.sourceKey,
      targetProperty: c.targetProperty,
      transform: c.transform,
    });
  }

  return result;
}
