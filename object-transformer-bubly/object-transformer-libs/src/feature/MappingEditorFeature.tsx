'use client';

import { FC, useState, useCallback, useMemo } from "react";
import { parseDragPayload } from "@bublys-org/bubbles-ui";
import {
  MappingRule,
  STAFF_SCHEMA,
  suggestMappings,
  type FieldMapping,
  type PlaneObjectLike,
} from "@bublys-org/object-transformer-model";
import { MappingEditorView } from "../ui/MappingEditorView.js";
import { useTransformer } from "./TransformerProvider.js";

type MappingEditorFeatureProps = {
  bubbleId?: string;
};

export const MappingEditorFeature: FC<MappingEditorFeatureProps> = () => {
  const { schemas, saveRule } = useTransformer();

  // ソースオブジェクト（PlaneObjectをコピーして保持）
  const [sourceObject, setSourceObject] = useState<PlaneObjectLike | null>(null);

  // ターゲットスキーマ（ドロップ or 選択）
  const [targetSchemaId, setTargetSchemaId] = useState<string | null>(null);
  const [targetSampleValues, setTargetSampleValues] = useState<Record<string, string>>({});

  // マッピング状態
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [suggestions, setSuggestions] = useState<FieldMapping[]>([]);

  const targetSchema = useMemo(
    () => (targetSchemaId ? schemas.find((s) => s.id === targetSchemaId) : null) ?? null,
    [schemas, targetSchemaId]
  );

  // ========== ソースドロップ ==========

  const handleDragOverSource = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDropSource = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const payload = parseDragPayload(e);
      if (!payload) return;

      // PlaneObjectのURLからデータを取得する想定
      // 実際のデータはドラッグペイロードのlabel等を使うか、
      // URLから別途取得する必要がある。
      // ここでは簡易的にJSON形式のデータを受け取る想定
      const jsonData = e.dataTransfer.getData("application/json");
      if (jsonData) {
        try {
          const obj = JSON.parse(jsonData) as PlaneObjectLike;
          setSourceObject(obj);

          // ターゲットスキーマがあれば提案を生成
          if (targetSchema) {
            const sourceKeys = Object.keys(obj).filter(
              (k) => k !== "id" && k !== "name"
            );
            const newSuggestions = suggestMappings(
              sourceKeys,
              targetSchema,
              obj
            );
            setSuggestions(newSuggestions);
          }
        } catch {
          // パース失敗は無視
        }
      }
    },
    [targetSchema]
  );

  // ========== ターゲットドロップ ==========

  const handleDragOverTarget = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDropTarget = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      // 初期実装: ハードコードスキーマを使用
      // ドロップイベントでスキーマを判別する
      // 今回は常にStaffスキーマ
      setTargetSchemaId(STAFF_SCHEMA.id);
      setTargetSampleValues({});

      // ソースがあれば提案を再生成
      if (sourceObject) {
        const sourceKeys = Object.keys(sourceObject).filter(
          (k) => k !== "id" && k !== "name"
        );
        const newSuggestions = suggestMappings(
          sourceKeys,
          STAFF_SCHEMA,
          sourceObject
        );
        setSuggestions(newSuggestions);
      }
    },
    [sourceObject]
  );

  // ========== マッピング操作 ==========

  const handleMapField = useCallback(
    (sourceKey: string, targetProperty: string) => {
      // ターゲットの型に応じてtransformを決定
      let transform: FieldMapping["transform"] = { type: "identity" };
      if (targetSchema) {
        const prop = targetSchema.getProperty(targetProperty);
        if (prop) {
          if (prop.type === "number") {
            transform = { type: "toNumber" };
          } else if (prop.type === "boolean") {
            transform = {
              type: "toBoolean",
              trueValues: ["true", "はい", "yes", "1", "○"],
            };
          }
        }
      }

      const newMapping: FieldMapping = {
        sourceKey,
        targetProperty,
        transform,
      };

      setMappings((prev) => {
        // 同じtarget or sourceの既存マッピングを除去
        const filtered = prev.filter(
          (m) =>
            m.targetProperty !== targetProperty &&
            m.sourceKey !== sourceKey
        );
        return [...filtered, newMapping];
      });

      // 提案からも除外
      setSuggestions((prev) =>
        prev.filter((s) => s.targetProperty !== targetProperty)
      );
    },
    [targetSchema]
  );

  const handleUnmapField = useCallback((targetProperty: string) => {
    setMappings((prev) =>
      prev.filter((m) => m.targetProperty !== targetProperty)
    );
  }, []);

  const handleAcceptSuggestion = useCallback(
    (targetProperty: string) => {
      const suggestion = suggestions.find(
        (s) => s.targetProperty === targetProperty
      );
      if (suggestion) {
        handleMapField(suggestion.sourceKey, suggestion.targetProperty);
      }
    },
    [suggestions, handleMapField]
  );

  const handleAcceptAllSuggestions = useCallback(() => {
    const activeSuggestions = suggestions.filter(
      (s) => !mappings.some((m) => m.targetProperty === s.targetProperty)
    );
    setMappings((prev) => {
      let result = [...prev];
      for (const s of activeSuggestions) {
        result = result.filter(
          (m) =>
            m.targetProperty !== s.targetProperty &&
            m.sourceKey !== s.sourceKey
        );
        result.push(s);
      }
      return result;
    });
    setSuggestions([]);
  }, [suggestions, mappings]);

  // ========== ルール保存 ==========

  const handleSaveRule = useCallback(
    (name: string) => {
      if (!targetSchemaId || mappings.length === 0) return;

      const rule = MappingRule.create(name, targetSchemaId, mappings);
      saveRule(rule.toJSON());
    },
    [targetSchemaId, mappings, saveRule]
  );

  return (
    <MappingEditorView
      sourceObject={sourceObject}
      onDropSource={handleDropSource}
      onDragOverSource={handleDragOverSource}
      schemaName={targetSchema?.name ?? null}
      targetProperties={targetSchema?.properties ?? []}
      targetSampleValues={targetSampleValues}
      onDropTarget={handleDropTarget}
      onDragOverTarget={handleDragOverTarget}
      mappings={mappings}
      suggestions={suggestions}
      onMapField={handleMapField}
      onUnmapField={handleUnmapField}
      onAcceptSuggestion={handleAcceptSuggestion}
      onSaveRule={handleSaveRule}
      onAcceptAllSuggestions={handleAcceptAllSuggestions}
    />
  );
};
