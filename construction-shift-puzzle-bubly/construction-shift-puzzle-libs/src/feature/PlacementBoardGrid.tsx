'use client';

/**
 * PlacementBoardGrid — 配置表グリッドの Redux コネクター（オーケストレーション）。
 *
 * セレクタで集約（PlacementBoard）と現場/社員/機械/機械希望を取得し、UI から来た操作を
 * 集約のメソッドで実行して自動保存する。reducer にロジックを書かず、集約メソッド + update に徹する。
 */
import { FC, useState } from "react";
import styled from "styled-components";
import {
  PlacementBoard,
  MachineRequest,
  ResourceRef,
  Site,
  Employee,
  Machine,
  WorkingDay,
} from "@bublys-org/construction-shift-puzzle-model";
import { PlacementBoardGridView } from "../ui/PlacementBoardGridView.js";
import { useObjects, useObjectShell, useObjectRepo } from "../objects/repository.js";
import { useSeedConstructionData } from "../objects/seed.js";
import {
  SITE_TYPE,
  EMPLOYEE_TYPE,
  MACHINE_TYPE,
  PLACEMENT_BOARD_TYPE,
  MACHINE_REQUEST_TYPE,
  MAIN_BOARD_ID,
} from "../objects/constructionObjects.js";

type PlacementBoardGridProps = {
  boardId?: string;
  /** 日ヘッダのダブルクリックでその日の状態ビューを開く */
  onOpenDay?: (dayKey: string) => void;
  /** 日の状態ビューの URL ビルダー（リンクバブルの起点に使う data-url 用） */
  dayBubbleUrl?: (dayKey: string) => string;
  /** 世界線ビュー（配置の編集履歴・時間移動）を開く */
  onOpenHistory?: () => void;
};

const newId = (prefix: string): string =>
  globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.floor(performance.now())}`;

export const PlacementBoardGrid: FC<PlacementBoardGridProps> = ({
  boardId = MAIN_BOARD_ID,
  onOpenDay,
  dayBubbleUrl,
  onOpenHistory,
}) => {
  useSeedConstructionData();
  const sites = useObjects<Site>(SITE_TYPE);
  const employees = useObjects<Employee>(EMPLOYEE_TYPE);
  const machines = useObjects<Machine>(MACHINE_TYPE);
  const machineRequests = useObjects<MachineRequest>(MACHINE_REQUEST_TYPE);
  const { object: board, update } = useObjectShell<PlacementBoard>(PLACEMENT_BOARD_TYPE, boardId);
  const wishRepo = useObjectRepo<MachineRequest>(MACHINE_REQUEST_TYPE);

  const [wishMode, setWishMode] = useState(false);

  if (!board) {
    return <StyledLoading>配置表を準備中…</StyledLoading>;
  }

  const conflictCount = board.conflicts().length;
  const pendingWishCount = machineRequests.filter(
    (w) => !board.coversResource(ResourceRef.machine(w.machineId), w.siteId, w.range())
  ).length;

  const K = (key: string) => WorkingDay.fromKey(key);

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>配置表</h3>
        <label className={`e-wishtoggle${wishMode ? " on" : ""}`}>
          <input type="checkbox" checked={wishMode} onChange={(e) => setWishMode(e.target.checked)} />
          希望モード
        </label>
        {pendingWishCount > 0 && <span className="e-wish-badge">🕓 未達の希望 {pendingWishCount} 件</span>}
        {conflictCount > 0 && <span className="e-conflict-badge">⚠ 重複配置 {conflictCount} 件</span>}
        <span className="e-hint">
          {wishMode
            ? "機械を現場行にドロップ → 希望バー（端をドラッグで期間調整）"
            : "リソースをドロップ → 期間バー（端で伸縮・本体で移動）／機械を希望バーに落とすと達成"}
        </span>
      </div>
      <PlacementBoardGridView
        board={board}
        sites={sites}
        employees={employees}
        machines={machines}
        machineRequests={machineRequests}
        wishMode={wishMode}
        onAssignSpan={(ref, siteId, from, to) =>
          update((b) => b.assign(newId("asg"), ref, siteId, K(from), K(to)))
        }
        onResize={(id, from, to) => update((b) => b.resizeAssignment(id, K(from), K(to)))}
        onMove={(id, siteId, from, to) => update((b) => b.moveAssignment(id, siteId, K(from), K(to)))}
        onUnassign={(id) => update((b) => b.unassignById(id))}
        onCreateWish={(machineId, siteId, from, to) =>
          wishRepo.save(
            MachineRequest.create({ id: newId("req"), siteId, machineId, from: K(from), to: K(to) })
          )
        }
        onResizeWish={(wishId, from, to) => {
          const w = machineRequests.find((x) => x.id === wishId);
          if (w) wishRepo.save(w.resize(K(from), K(to)));
        }}
        onFulfillWish={(wish) =>
          update((b) =>
            b.assign(
              newId("asg"),
              ResourceRef.machine(wish.machineId),
              wish.siteId,
              wish.range().from,
              wish.range().to
            )
          )
        }
        onRemoveWish={(wishId) => wishRepo.remove(wishId)}
        onOpenDay={onOpenDay}
        dayBubbleUrl={dayBubbleUrl}
      />
      {onOpenHistory && (
        <div className="e-footer">
          <button type="button" className="e-history" onClick={onOpenHistory} title="配置の編集履歴（世界線）を開く">
            🕰 世界線
          </button>
        </div>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 6px;
    flex-wrap: wrap;

    h3 { margin: 0; }

    .e-wishtoggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.82em;
      padding: 2px 8px;
      border: 1px solid #cfd8dc;
      border-radius: 999px;
      cursor: pointer;
      user-select: none;
      &.on {
        border-color: #ff9800;
        background: #fff3e0;
        color: #7a4a00;
      }
    }
    .e-wish-badge {
      font-size: 0.8em;
      color: #7a4a00;
      background: #fff3e0;
      border: 1px solid #ffcc80;
      border-radius: 6px;
      padding: 2px 8px;
    }
    .e-conflict-badge {
      font-size: 0.8em;
      color: #d32f2f;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      border-radius: 6px;
      padding: 2px 8px;
    }
    .e-hint {
      font-size: 0.75em;
      color: #90a4ae;
      margin-left: auto;
    }
  }

  .e-footer {
    margin-top: 6px;
    display: flex;

    .e-history {
      font-size: 0.82em;
      padding: 3px 12px;
      border: 1px solid #cfd8dc;
      border-radius: 999px;
      background: #fff;
      color: #37474f;
      cursor: pointer;
      &:hover { background: #eceff1; border-color: #90a4ae; }
    }
  }
`;

const StyledLoading = styled.div`
  padding: 20px;
  color: #888;
`;
