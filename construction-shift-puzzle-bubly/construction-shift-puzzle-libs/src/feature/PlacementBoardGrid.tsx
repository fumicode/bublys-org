'use client';

/**
 * PlacementBoardGrid — 配置表グリッドの Redux コネクター（オーケストレーション）。
 *
 * セレクタで集約（PlacementBoard）と現場/社員/機械を取得し、UI から来たセル操作を
 * 集約のメソッド（assign / unassign）で実行して自動保存する。
 * reducer にはロジックを書かず、集約メソッド + useObjectShell().update に徹する。
 */
import { FC } from "react";
import styled from "styled-components";
import {
  PlacementBoard,
  Site,
  Employee,
  Machine,
  WorkingDay,
} from "@bublys-org/construction-shift-puzzle-model";
import { PlacementBoardGridView } from "../ui/PlacementBoardGridView.js";
import { useObjects, useObjectShell } from "../objects/repository.js";
import { useSeedConstructionData } from "../objects/seed.js";
import {
  SITE_TYPE,
  EMPLOYEE_TYPE,
  MACHINE_TYPE,
  PLACEMENT_BOARD_TYPE,
  MAIN_BOARD_ID,
} from "../objects/constructionObjects.js";

type PlacementBoardGridProps = {
  /** 表示する配置表ID（未指定なら全社1枚の MAIN_BOARD_ID） */
  boardId?: string;
};

export const PlacementBoardGrid: FC<PlacementBoardGridProps> = ({
  boardId = MAIN_BOARD_ID,
}) => {
  useSeedConstructionData();
  const sites = useObjects<Site>(SITE_TYPE);
  const employees = useObjects<Employee>(EMPLOYEE_TYPE);
  const machines = useObjects<Machine>(MACHINE_TYPE);
  const { object: board, update } = useObjectShell<PlacementBoard>(
    PLACEMENT_BOARD_TYPE,
    boardId
  );

  if (!board) {
    return <StyledLoading>配置表を準備中…</StyledLoading>;
  }

  const conflictCount = board.conflicts().length;

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>配置表</h3>
        {conflictCount > 0 && (
          <span className="e-conflict-badge">⚠ 重複配置 {conflictCount} 件</span>
        )}
      </div>
      <PlacementBoardGridView
        board={board}
        sites={sites}
        employees={employees}
        machines={machines}
        onAssign={(ref, siteId, dayKey) =>
          update((b) => b.assign(ref, siteId, WorkingDay.fromKey(dayKey)))
        }
        onUnassign={(ref, siteId, dayKey) =>
          update((b) => b.unassign(ref, siteId, WorkingDay.fromKey(dayKey)))
        }
        onDropResource={(ref, siteId, dayKey, source) =>
          update((b) => {
            const toDay = WorkingDay.fromKey(dayKey);
            // セル間移動: 移動元があり、かつ別セルなら元を外してから配置する
            if (source && !(source.siteId === siteId && source.dayKey === dayKey)) {
              return b
                .unassign(ref, source.siteId, WorkingDay.fromKey(source.dayKey))
                .assign(ref, siteId, toDay);
            }
            // 新規配置（社員/機械バブルからのドロップ）。同一セルへの移動は no-op（assign が冪等）
            return b.assign(ref, siteId, toDay);
          })
        }
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 4px;

    h3 { margin: 0; }

    .e-conflict-badge {
      font-size: 0.8em;
      color: #d32f2f;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      border-radius: 6px;
      padding: 2px 8px;
    }
  }
`;

const StyledLoading = styled.div`
  padding: 20px;
  color: #888;
`;
