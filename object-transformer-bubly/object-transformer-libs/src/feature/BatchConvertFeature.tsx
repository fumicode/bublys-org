'use client';

import { FC, useCallback, useContext, useState } from "react";
import { BubblesContext, parseDragPayload } from "@bublys-org/bubbles-ui";
import { MappingRule, applyMappingRule } from "@bublys-org/object-transformer-model";
import { BatchConvertView } from "../ui/BatchConvertView.js";
import { useTransformer } from "./TransformerProvider.js";

type BatchConvertFeatureProps = {
  ruleId: string;
  bubbleId?: string;
};

/** 落とされたもの ── 変換の相手 */
type Dropped = {
  readonly label: string;
  readonly rows: unknown[];
};

/**
 * 落とされたものから、変換の相手を取り出す。
 *
 * > **相手は落として渡す。渡し方は 1 件でも一覧でも同じ。**
 *
 * ★ 読むのは `application/json` に載った実データだけ ── これは
 *   「型つきのドラッグに実データを載せる」という OS 共通の規約で、
 *   **どのバブリから来たかを知らずに受け取れる**（変換エディタは csv-importer を
 *   知らないし、知ってはいけない）。
 * ★ 並びで来れば**その全部**が相手、1 つで来れば 1 件だけが相手。
 */
const readDropped = (e: React.DragEvent): Dropped | null => {
  const json = e.dataTransfer.getData("application/json");
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const rows = Array.isArray(raw) ? raw : [raw];
  if (rows.length === 0) return null;
  const label = parseDragPayload(e)?.label ?? `${rows.length} 件`;
  return { label, rows };
};

export const BatchConvertFeature: FC<BatchConvertFeatureProps> = ({
  ruleId,
  bubbleId,
}) => {
  const { rules } = useTransformer();
  const { openBubble } = useContext(BubblesContext);

  const [source, setSource] = useState<Dropped | null>(null);
  const [results, setResults] = useState<Record<string, unknown>[] | null>(
    null
  );

  const ruleState = rules.find((r) => r.id === ruleId);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  /** 落とし直したら、前の結果は捨てる ── 相手が変わったのに答えだけ残っていると読み違える */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = readDropped(e);
    if (!dropped) return;
    setSource(dropped);
    setResults(null);
  }, []);

  const handleConvert = useCallback(() => {
    if (!ruleState || !source) return;
    const rule = MappingRule.fromJSON(ruleState);
    setResults(applyMappingRule(source.rows, rule));
  }, [ruleState, source]);

  const handleBack = useCallback(() => {
    if (bubbleId) {
      openBubble("object-transformer/rules", bubbleId);
    }
  }, [openBubble, bubbleId]);

  if (!ruleState) {
    return <div>ルールが見つかりません</div>;
  }

  return (
    <BatchConvertView
      rule={ruleState}
      sourceLabel={source?.label ?? null}
      sourceCount={source?.rows.length ?? 0}
      results={results}
      onConvert={handleConvert}
      onBack={handleBack}
      onDropSource={handleDrop}
      onDragOverSource={handleDragOver}
    />
  );
};
