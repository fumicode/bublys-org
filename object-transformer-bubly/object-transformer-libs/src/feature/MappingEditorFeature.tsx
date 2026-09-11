'use client';

import { FC, useState, useCallback, useMemo } from "react";
import {
  parseDragPayload,
  getObjectType,
} from "@bublys-org/bubbles-ui";
import {
  DomainSchema,
  MappingRule,
  suggestMappings,
  getAtPath,
  inferShape,
  pathToString,
  stringToPath,
  getSchema,
  type FieldMapping,
  type SourceLeaf,
  type ValueTransform,
} from "@bublys-org/object-transformer-model";
import { MappingEditorView } from "../ui/MappingEditorView.js";
import { useTransformer } from "./TransformerProvider.js";

type MappingEditorFeatureProps = {
  bubbleId?: string;
};

/** ドロップされた側のパネル状態 */
type DroppedSide = {
  /** 生の値（application/json 由来。無ければ空） */
  value: unknown;
  /** 解決された DomainSchema */
  schema: DomainSchema;
  /** 表示用のラベル */
  label: string;
  /** 登録済みの型名（kebab-case）。無ければ null */
  typeName: string | null;
};

/**
 * ドラッグイベントからパネルの受け入れ内容を解決する。
 *
 * 1. type/xxx のドラッグ型が登録済みスキーマにヒットすれば、そのスキーマを使う
 * 2. そうでなければ application/json から shape を推論する
 * 3. どちらも取れなければ null（ドロップは失敗）
 */
function resolveDropped(e: React.DragEvent): DroppedSide | null {
  const payload = parseDragPayload(e);

  // application/json（csv-importer など、生データを載せる規約）
  let raw: unknown = null;
  const jsonStr = e.dataTransfer.getData("application/json");
  if (jsonStr) {
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      // ignore parse error
    }
  }

  // 優先度1: 登録済みスキーマ
  if (payload) {
    const kebab = getObjectType(payload.type);
    if (kebab) {
      const shape = getSchema(kebab);
      if (shape) {
        return {
          value: raw ?? {},
          schema: DomainSchema.of(kebab, payload.label ?? kebab, shape),
          label: payload.label ?? kebab,
          typeName: kebab,
        };
      }
    }
  }

  // 優先度2: 生データから推論
  if (raw !== null && typeof raw === "object") {
    const label =
      (raw as { name?: unknown }).name !== undefined
        ? String((raw as { name?: unknown }).name)
        : payload?.label ?? "Untitled";
    return {
      value: raw,
      schema: DomainSchema.of(label, label, inferShape(raw)),
      label,
      typeName: payload ? getObjectType(payload.type) : null,
    };
  }

  // 優先度3: 型名しかない（スキーマ未登録・データもなし）→ 空 shape のスタブ
  // 「型は認識したが構造が不明」ことを UI で伝えるため target 自体は更新する
  if (payload) {
    const kebab = getObjectType(payload.type) ?? "unknown";
    const label = payload.label ?? kebab;
    return {
      value: {},
      schema: DomainSchema.of(kebab, `${label}（スキーマ未登録）`, {
        kind: "object",
        fields: [],
      }),
      label,
      typeName: kebab,
    };
  }

  return null;
}

/** DroppedSide から SourceLeaf 配列を作る（推薦マッチング用） */
const toSourceLeaves = (side: DroppedSide): SourceLeaf[] => {
  return side.schema.leafFields.map(({ path, field }) => ({
    path: pathToString(path),
    label: field.label,
    sampleValue: getAtPath(side.value, path),
  }));
};

/** ターゲットフィールドの shape から transform を推定 */
const inferTransform = (schema: DomainSchema, targetPath: string): ValueTransform => {
  const field = schema.getFieldAt(stringToPath(targetPath));
  if (!field) return { type: "identity" };
  if (field.shape.kind === "primitive") {
    if (field.shape.primitive === "number") return { type: "toNumber" };
    if (field.shape.primitive === "boolean") {
      return { type: "toBoolean", trueValues: ["true", "はい", "yes", "1", "○"] };
    }
  }
  return { type: "identity" };
};

export const MappingEditorFeature: FC<MappingEditorFeatureProps> = () => {
  const { saveRule } = useTransformer();

  const [source, setSource] = useState<DroppedSide | null>(null);
  const [target, setTarget] = useState<DroppedSide | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [suggestions, setSuggestions] = useState<FieldMapping[]>([]);

  const sourceLeaves = useMemo(
    () => (source ? toSourceLeaves(source) : []),
    [source]
  );

  const regenSuggestions = useCallback(
    (src: DroppedSide | null, tgt: DroppedSide | null) => {
      if (!src || !tgt) {
        setSuggestions([]);
        return;
      }
      setSuggestions(suggestMappings(toSourceLeaves(src), tgt.schema));
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDropSource = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const resolved = resolveDropped(e);
      if (!resolved) {
        console.warn(
          "[object-transformer] source drop: 型を解決できませんでした",
          Array.from(e.dataTransfer.types)
        );
        return;
      }
      setSource(resolved);
      regenSuggestions(resolved, target);
    },
    [target, regenSuggestions]
  );

  const handleDropTarget = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const resolved = resolveDropped(e);
      if (!resolved) {
        console.warn(
          "[object-transformer] target drop: 型を解決できませんでした",
          Array.from(e.dataTransfer.types)
        );
        return;
      }
      setTarget(resolved);
      regenSuggestions(source, resolved);
    },
    [source, regenSuggestions]
  );

  const handleMapField = useCallback(
    (sourcePath: string, targetPath: string) => {
      if (!target) return;
      const newMapping: FieldMapping = {
        sourcePath,
        targetPath,
        transform: inferTransform(target.schema, targetPath),
      };
      setMappings((prev) => {
        const filtered = prev.filter(
          (m) => m.targetPath !== targetPath && m.sourcePath !== sourcePath
        );
        return [...filtered, newMapping];
      });
      setSuggestions((prev) => prev.filter((s) => s.targetPath !== targetPath));
    },
    [target]
  );

  const handleUnmapField = useCallback((targetPath: string) => {
    setMappings((prev) => prev.filter((m) => m.targetPath !== targetPath));
  }, []);

  const handleAcceptSuggestion = useCallback(
    (targetPath: string) => {
      const s = suggestions.find((x) => x.targetPath === targetPath);
      if (s) handleMapField(s.sourcePath, s.targetPath);
    },
    [suggestions, handleMapField]
  );

  const handleAcceptAllSuggestions = useCallback(() => {
    const active = suggestions.filter(
      (s) => !mappings.some((m) => m.targetPath === s.targetPath)
    );
    setMappings((prev) => {
      let result = [...prev];
      for (const s of active) {
        result = result.filter(
          (m) => m.targetPath !== s.targetPath && m.sourcePath !== s.sourcePath
        );
        result.push(s);
      }
      return result;
    });
    setSuggestions([]);
  }, [suggestions, mappings]);

  const handleSaveRule = useCallback(
    (name: string) => {
      if (!target || mappings.length === 0) return;
      const targetSchemaId = target.typeName ?? target.schema.id;
      const rule = MappingRule.create(name, targetSchemaId, mappings);
      saveRule(rule.toJSON());
    },
    [target, mappings, saveRule]
  );

  return (
    <MappingEditorView
      sourceLabel={source?.label ?? null}
      sourceLeaves={sourceLeaves}
      targetLabel={target?.label ?? null}
      targetSchema={target?.schema ?? null}
      mappings={mappings}
      suggestions={suggestions}
      onDropSource={handleDropSource}
      onDropTarget={handleDropTarget}
      onDragOver={handleDragOver}
      onMapField={handleMapField}
      onUnmapField={handleUnmapField}
      onAcceptSuggestion={handleAcceptSuggestion}
      onAcceptAllSuggestions={handleAcceptAllSuggestions}
      onSaveRule={handleSaveRule}
    />
  );
};
