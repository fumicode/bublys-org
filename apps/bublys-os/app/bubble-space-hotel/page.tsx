"use client";
/**
 * hotel-shift-puzzle を bubble-space で組み直すデモ。
 *
 * 勤務表バブルは「表・制約・世界線・可能勤務帯・操作履歴…」を1つの中に抱えていた。
 * ここではそれを **独立した泡** に分け、bubble-space の関係で組み立てる:
 *   勤務表（表本体だけ）
 *     ├ 隣り合う(上)  制約パネル      ← 中に埋まっていたものを外に出した
 *     ├ 隣り合う(下)  世界線ビュー
 *     └ 開いた        可能勤務帯 / 操作履歴 / 稼働日 / 責任者ルール
 *
 * さらに、**配置そのものを世界線に載せている**（useSpaceWorldLine）。
 * 勤務表の中身と同じスコープなので、「戻る」で配置ごと巻き戻る。
 */
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  HOTEL_OBJECTS,
  makeObjectsProvider,
  APP_SCOPE_ID,
  buildSampleItems,
  useObjects,
  ScheduleGrid,
  ScheduleConstraintsPanel,
  ScheduleWorldLineView,
  ScheduleEditLogPanel,
  AvailabilityEditor,
  ScheduleDayDetail,
  LeaderRuleView,
  SCHEDULE_TYPE,
} from "@bublys-org/hotel-shift-puzzle-libs";
import type { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import {
  BubbleSpaceView,
  Space,
  useBubbleSpace,
  useSpaceWorldLine,
  defaultView,
  dimensions,
  LENSES,
  relationKind,
  beside,
  BubbleSpaceSnapshot,
  BUBBLE_SPACE_TYPE,
  BUBBLE_SPACE_ID,
  type BubbleNode,
  type Placement,
} from "@bublys-org/bubble-space";

/** 配置スナップショットも、勤務表やスタッフと同じく世界線に載る1つの型として登録する */
const ObjectsProvider = makeObjectsProvider({
  ...HOTEL_OBJECTS,
  [BUBBLE_SPACE_TYPE]: {
    class: BubbleSpaceSnapshot,
    getId: () => BUBBLE_SPACE_ID,
  },
});

const SCHEDULE_BUBBLE = "schedule";

export default function BubbleSpaceHotelPage() {
  return (
    <ObjectsProvider>
      <Inner />
    </ObjectsProvider>
  );
}

function Inner() {
  const scope = useCasScope(APP_SCOPE_ID);
  const schedules = useObjects<MonthlyStaffSchedule>(SCHEDULE_TYPE);
  const [scheduleId, setScheduleId] = useState<string | undefined>(undefined);

  // 世界が空なら例データを入れる（ファイルバブルの「例データ読み込み」と同じ一式）
  const seed = useCallback(() => {
    scope.addObjects(buildSampleItems().map((i) => ({ type: i.type, object: i.obj })));
  }, [scope]);

  useEffect(() => {
    if (!scheduleId && schedules.length > 0) setScheduleId(schedules[0].id);
  }, [schedules, scheduleId]);

  const initial = useMemo(() => Space.empty(), []);
  const {
    space, setSpace, view, setView, resolved,
    containerRef, selectedId, magnetHint, dragging,
    onBubblePointerDown, onBubbleSelect, onResizePointerDown, onBackgroundPointerDown, onWheel,
    focusOnFront, focusOn,
  } = useBubbleSpace({ initialSpace: initial, initialView: defaultView() });

  // ★ 配置そのものを世界線に載せる。勤務表の中身と同じスコープ。
  const { isEmpty: spaceNotRecorded } = useSpaceWorldLine({
    scopeId: APP_SCOPE_ID,
    space,
    setSpace,
    enabled: !!scheduleId,
  });

  // 勤務表が決まったら、初期の組み立てを1回だけ作る
  useEffect(() => {
    if (!scheduleId || !spaceNotRecorded || space.bubbles.length > 0) return;
    setSpace(
      Space.empty()
        .add({ id: SCHEDULE_BUBBLE, title: "勤務表", hue: 205,
               ownSize: { w: 880, h: 520 }, free: { x: 0, y: 40, z: 0 },
               data: { view: "schedule" } })
        .add({ id: "constraints", title: "制約", hue: 40,
               ownSize: { w: 880, h: 150 }, free: { x: 0, y: 0, z: 0 },
               data: { view: "constraints" } })
        .relate({ kind: "adjacent", from: SCHEDULE_BUBBLE, to: "constraints", anchor: beside("n") })
    );
  }, [scheduleId, spaceNotRecorded, space.bubbles.length, setSpace]);

  /** 勤務表から何かを開く。開いた関係（帯）＋ 置き場所（隣り合う）を1本ずつ張る。 */
  const openPanel = useCallback(
    (id: string, title: string, viewKind: string, size: { w: number; h: number },
     side: "e" | "s" | "n" | "w", data: Record<string, unknown> = {}) => {
      setSpace((s) => {
        if (s.bubble(id)) {
          return s.relate({ kind: "adjacent", from: SCHEDULE_BUBBLE, to: id, anchor: beside(side) });
        }
        return s
          .open(SCHEDULE_BUBBLE, { id, title, hue: 150, ownSize: size, data: { view: viewKind, ...data } })
          .relate({ kind: "adjacent", from: SCHEDULE_BUBBLE, to: id, anchor: beside(side) });
      });
      setTimeout(focusOnFront, 0);
    },
    [setSpace, focusOnFront]
  );

  const renderBubble = useCallback(
    (node: BubbleNode, _p: Placement) => {
      if (!scheduleId) return null;
      const kind = node.data?.["view"];
      const pad = (n: React.ReactNode) => <StyledPad>{n}</StyledPad>;
      switch (kind) {
        case "schedule":
          return pad(
            <ScheduleGrid
              scheduleId={scheduleId}
              // ★ 抱えていた付属パーツを全部外に出す。表だけが残る。
              chrome={{ header: false, rulesStrip: false, footer: false }}
              dayBubbleUrl={() => ""}
              onOpenRule={(ruleKey) =>
                openPanel(`rule-${ruleKey}`, `責任者ルール ${ruleKey}`, "rule", { w: 420, h: 320 }, "e", { ruleKey })
              }
              onOpenAvailability={() =>
                openPanel("availability", "可能勤務帯", "availability", { w: 460, h: 360 }, "w")
              }
              onOpenHistory={() =>
                openPanel("worldline", "世界線ビュー", "worldline", { w: 640, h: 240 }, "s")
              }
              onOpenEditLog={() =>
                openPanel("editlog", "操作履歴", "editlog", { w: 420, h: 320 }, "e")
              }
            />
          );
        case "constraints":
          return pad(
            <ScheduleConstraintsPanel
              scheduleId={scheduleId}
              onSelectRule={() => undefined}
            />
          );
        case "worldline":
          return <StyledFill><ScheduleWorldLineView scheduleId={scheduleId} /></StyledFill>;
        case "availability":
          return pad(<AvailabilityEditor scheduleId={scheduleId} />);
        case "editlog":
          return pad(<ScheduleEditLogPanel scheduleId={scheduleId} />);
        case "rule":
          return pad(
            <LeaderRuleView scheduleId={scheduleId} ruleKey={String(node.data?.["ruleKey"] ?? "")} />
          );
        case "day":
          return pad(
            <ScheduleDayDetail scheduleId={scheduleId} dayKey={String(node.data?.["dayKey"] ?? "")} />
          );
        default:
          return null;
      }
    },
    [scheduleId, openPanel]
  );

  const setAxis = (axis: "x" | "y" | "z", dimId: string) =>
    setView((v) => ({ ...v, axes: { ...v.axes, [axis]: dimId } }));
  const selected = selectedId ? space.bubble(selectedId) : undefined;

  return (
    <StyledPage>
      <StyledBar>
        {schedules.length === 0 ? (
          <button onClick={seed}>例データを読み込む</button>
        ) : (
          <select value={scheduleId ?? ""} onChange={(e) => setScheduleId(e.target.value)}>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.year}年{s.month}月
              </option>
            ))}
          </select>
        )}
        <span className="e-sep" />
        <span className="e-label">軸</span>
        {(["x", "y", "z"] as const).map((axis) => (
          <select key={axis} value={view.axes[axis]} onChange={(e) => setAxis(axis, e.target.value)}>
            {Object.values(dimensions()).map((d) => (
              <option key={d.id} value={d.id}>{axis.toUpperCase()}: {d.label}</option>
            ))}
          </select>
        ))}
        <select value={view.lensId} onChange={(e) => setView((v) => ({ ...v, lensId: e.target.value }))}>
          {Object.values(LENSES).map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        <span className="e-sep" />
        <button onClick={focusOnFront}>最前面を見る</button>
        <button onClick={() => openPanel("worldline", "世界線ビュー", "worldline", { w: 640, h: 240 }, "s")}>
          世界線
        </button>
        <span className="e-sep" />
        <span className="e-status">
          泡 {space.bubbles.length} / 関係 {space.relations.length}
          {selected && (
            <>
              {" ｜ "}<b>{selected.title}</b>{" "}
              {space.relations
                .filter((r) => r.from === selectedId || r.to === selectedId)
                .map((r) => `${r.from === selectedId ? "→" : "←"}${relationKind(r.kind).label}`)
                .join(" ")}
            </>
          )}
        </span>
      </StyledBar>

      <StyledStage onWheel={onWheel}>
        <BubbleSpaceView
          space={space}
          resolved={resolved}
          renderBubble={renderBubble}
          containerRef={containerRef}
          selectedId={selectedId}
          magnet={magnetHint ? { rect: magnetHint.rect, label: magnetHint.label } : null}
          dragging={dragging}
          onBubblePointerDown={onBubblePointerDown}
          onBubbleSelect={onBubbleSelect}
          onResizePointerDown={onResizePointerDown}
          onBackgroundPointerDown={onBackgroundPointerDown}
          onBubbleDoubleClick={focusOn}
        />
      </StyledStage>

      <StyledHelp>
        勤務表の中のボタン … それぞれ独立した泡として開く（帯でつながる）<br />
        ヘッダをドラッグ … 移動。他の泡へ近づけると結合　右下の角 … 大きさ<br />
        <b>配置も世界線に載っている</b>（勤務表の中身と同じスコープ）
      </StyledHelp>
    </StyledPage>
  );
}

type DivProps = React.HTMLAttributes<HTMLDivElement>;

const StyledPage = styled.div<DivProps>`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #0b0d14;
  color: #e6ebf5;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif;
`;
const StyledBar = styled.div<DivProps>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #141824;
  border-bottom: 1px solid #2a3145;
  font-size: 12px;
  .e-label { color: #8b95ad; }
  .e-sep { width: 1px; height: 18px; background: #2a3145; }
  .e-status { color: #8b95ad; }
  .e-status b { color: #6ee7ff; }
  select, button {
    background: #1d2334; color: #e6ebf5; border: 1px solid #2a3145;
    border-radius: 6px; padding: 3px 8px; font: inherit; cursor: pointer;
  }
`;
const StyledStage = styled.div<DivProps>`
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
`;
const StyledHelp = styled.div<DivProps>`
  position: absolute; right: 14px; bottom: 14px; z-index: 100000; pointer-events: none;
  background: rgba(10,12,20,.86); border: 1px solid #2a3145; border-radius: 8px;
  padding: 8px 11px; color: #8b95ad; font-size: 11px; line-height: 1.7; text-align: right;
  b { color: #6ee7ff; }
`;
/** hotel のコンポーネントは白背景前提なので、泡の中で読める器を用意する */
const StyledPad = styled.div<DivProps>`
  min-height: 100%;
  padding: 6px 8px;
  background: #f7f8fa;
  color: #1a1d24;
  font-size: 13px;
`;
const StyledFill = styled.div<DivProps>`
  width: 100%;
  height: 100%;
  background: rgba(15,18,28,.3);
`;
