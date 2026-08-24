'use client';

/**
 * ScheduleWorldLineView — 勤務表ごとのローカル世界線（canvas版）
 *
 * 勤務表専用のローカル世界線スコープ（schedule:${id}）を、囲碁などと同じ共通ビュー
 * {@link WorldLineScopeView} で描く。canvas は2通りから選べる:
 *   - 縦（木）… ClimberWorldLineCanvasView。根が地面・今いる世界が梢。分岐が枝として伸びる
 *   - 横（流れ）… 共通の既定ビュー。左→右へ時間が流れ、分岐は下へ伸びる
 * 長い世界線を辿るなら横、分岐の形を見るなら縦、と用途が違うので切り替えられるようにする。
 *   - ノードクリック / 矢印キーでその時点の勤務表状態へ時間移動（restore でアプリ全体
 *     リポジトリへ反映するので、グリッドの表示も戻る）。onSelectNode に restore を渡す。
 *   - nameable で apex（選択中の世界）に名前をつけられる（setNodeLabel）。
 *   - ノード要約は出さない（操作の詳細は操作履歴パネルで見る）。
 *   - Cmd+Z はデータ undo 用に予約のため使わない。矢印キーのみ。
 *
 * 「完成レポートを作成」ボタンは勤務表（ScheduleGrid）側に移した。ここは純粋に
 * 世界線の可視化・時間移動だけを担う。
 */
import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import {
  WorldLineScopeView,
  type KeyBinding,
} from "@bublys-org/bubbles-ui";
import { useScheduleHistory } from "./useScheduleHistory.js";
import { ClimberWorldLineCanvasView } from "../ui/ClimberWorldLineCanvasView.js";

/** canvas の向き。tree=縦の木（クライマー）／flow=横の流れ（共通の既定ビュー）。 */
type Orientation = "tree" | "flow";

const ORIENTATIONS: { value: Orientation; label: string; title: string }[] = [
  { value: "tree", label: "縦", title: "木として描く（根が最初の状態、梢が今いる世界）" },
  { value: "flow", label: "横", title: "流れとして描く（左→右に時間、分岐は下へ）" },
];

type Props = {
  scheduleId: string;
};

export const ScheduleWorldLineView: FC<Props> = ({ scheduleId }) => {
  const { scope, restore } = useScheduleHistory(scheduleId);
  // 既定は縦（木）。今まで見えていたものが開いた直後に変わらないようにする。
  const [orientation, setOrientation] = useState<Orientation>("tree");

  // 矢印キーで時間移動（← 親 / → 子 / ↑↓ 分岐の兄弟切替）。すべて restore 経由で
  // アプリ全体スコープへ反映する（共通の moveToSiblingBranch は scope.moveTo を使うので
  // ここでは restore 版を自前で持つ）。
  const keyBindings = useMemo<KeyBinding[]>(() => {
    const restoreSibling = (delta: number) => {
      const apex = scope.graph.getApex();
      if (!apex || apex.parentId === null) return;
      const siblings = scope.graph.getChildrenMap()[apex.parentId] ?? [];
      const idx = siblings.indexOf(apex.id);
      const next = siblings[idx + delta];
      if (next) restore(next);
    };
    return [
      {
        key: "ArrowLeft",
        run: () => {
          const apex = scope.graph.getApex();
          if (apex?.parentId) restore(apex.parentId);
        },
      },
      {
        key: "ArrowRight",
        run: () => {
          const apex = scope.graph.getApex();
          const child = apex && scope.graph.getChildrenMap()[apex.id]?.[0];
          if (child) restore(child);
        },
      },
      { key: "ArrowUp", run: () => restoreSibling(-1) },
      { key: "ArrowDown", run: () => restoreSibling(1) },
    ];
  }, [scope, restore]);

  if (!scope.graph.state.rootNodeId) {
    return (
      <div style={{ padding: 24, color: "#888", fontSize: "0.85em" }}>
        履歴がありません。勤務表を編集すると記録されます。
      </div>
    );
  }

  // canvas はバブルいっぱい（WorldLineScopeView が 100% に広がる）。バブルの初期サイズは
  // route の bubbleOptions.initialSize で与え、リサイズすると canvas も伸縮する。
  // nameable で選択中の世界に名前をつけられる。
  return (
    <StyledWrap>
      <div className="e-orientation" role="group" aria-label="世界線の向き">
        {ORIENTATIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.title}
            aria-pressed={orientation === o.value}
            className={orientation === o.value ? "is-on" : undefined}
            // 押しても canvas のキー操作（矢印での時間移動）を奪わないようにする
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOrientation(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <WorldLineScopeView
        scope={scope}
        keyBindings={keyBindings}
        onSelectNode={restore}
        // flow は共通の既定ビューそのものなので、renderCanvas を渡さない
        renderCanvas={
          orientation === "tree"
            ? (props) => <ClimberWorldLineCanvasView {...props} />
            : undefined
        }
        nameable
      />
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  /* canvas の上に重ねる向き切り替え。canvas は全面に張るので絶対配置で角に置く。 */
  .e-orientation {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
    display: flex;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(2px);

    button {
      border: none;
      background: transparent;
      color: #666;
      font-size: 0.78em;
      line-height: 1.9;
      padding: 0 10px;
      cursor: pointer;

      & + button {
        border-left: 1px solid rgba(0, 0, 0, 0.12);
      }

      &:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      &.is-on {
        background: #1565c0;
        color: #fff;
      }
    }
  }
`;
