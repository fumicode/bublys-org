'use client';

/**
 * PrimitiveGanttView — セルグリッド型ガント（プリミティブUI）
 *
 * レイアウト:
 *   Y軸 = 局員（行）
 *   X軸 = 時間（TimeSchedule の startMinute から endMinute まで、15分刻み）
 *
 * 配置表示:
 *   同一タスクの連続セルは1本のバーにマージして表示（名前は中央1つ）
 *   重複 = 複数シフトに同時参加 → 半透明オーバーレイ＋!バッジ
 *   範囲外 = シフトの validBlockRange の外 → 縞模様＋赤枠
 *
 * 操作（Plan A: drop確定型）:
 *   TaskList から task をドラッグ → ホバー中はプレビューのみ（commit しない）
 *   同一行内でドラッグを伸ばすとプレビュー範囲が拡張
 *   行をまたぐとアンカーリセット
 *   drop で範囲を一括 commit（onPaintRange）
 *   ドラッグキャンセル（行外/Esc）でプレビュー破棄
 *
 * 削除:
 *   既配置バーをホバーすると右端に × ボタン表示
 *   クリックでそのバー（連続範囲）を削除
 */

import React, { FC, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Shift, TimeSchedule, Member, type DayType } from '../domain/index.js';
import { type GanttConfig } from './MemberGanttView.js';
import { DRAG_TYPE_TASK, draggingTaskId } from './TaskListView.js';
import CloseIcon from '@mui/icons-material/Close';
import { UrledPlace } from '@bublys-org/bubbles-ui';

// 局員行の受け入れ可否型は MemberGanttView と共通（同一定義）
export type { RowAvailability } from './MemberGanttView.js';
import type { RowAvailability } from './MemberGanttView.js';

// ========== 公開型 ==========

export type PrimitiveGanttViewProps = {
  shifts: readonly Shift[];
  timeSchedules: readonly TimeSchedule[];
  members: readonly Member[];
  selectedDayType?: DayType;
  ganttConfig?: GanttConfig;
  /** 範囲 paint 要求（startBlock 以上 endBlock 未満） */
  onPaintRange?: (shiftId: string, memberId: string, startBlock: number, endBlock: number) => void;
  /** 範囲 remove 要求（startBlock 以上 endBlock 未満） */
  onRemoveRange?: (shiftId: string, memberId: string, startBlock: number, endBlock: number) => void;
  /**
   * 既配置バーの移動・リサイズ確定通知。
   * 同一userId/shiftIdで [oldStart..oldEnd) → [newStart..newEnd) への置き換えを意味する。
   * 局員変更（クロス行ムーブ）時は newMemberId が異なる。
   */
  onMoveRun?: (
    shiftId: string,
    oldMemberId: string,
    oldStart: number,
    oldEnd: number,
    newMemberId: string,
    newStart: number,
    newEnd: number,
  ) => void;
  /** 既配置バークリック（タスク詳細を開くなど） */
  onAssignedRunClick?: (shiftId: string, memberId: string, startBlock: number) => void;
  /** 既配置バーを「バブル展開元」としてマークするための URL ビルダ（LinkBubbleの曲線を有効化） */
  buildRunUrl?: (shiftId: string) => string;
  /** ブラシ対象タスクID（TaskListドラッグ中に外部から指定。ビジュアル用） */
  brushTaskId?: string | null;
  /** 局員行の受け入れ可否マップ（ブラシ中のみ意味がある） */
  rowAvailabilityMap?: Map<string, RowAvailability>;
};

// ========== 定数 ==========

const MEMBER_COLUMN_WIDTH = 130;
const ROW_HEIGHT = 32;

const TASK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'task-reception': { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1' },
  'task-setup':     { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20' },
  'task-teardown':  { bg: '#fce4ec', border: '#c62828', text: '#b71c1c' },
  'task-mc':        { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  'task-record':    { bg: '#fff8e1', border: '#f57f17', text: '#e65100' },
  'task-general':   { bg: '#f5f5f5', border: '#757575', text: '#212121' },
  'task-break':     { bg: '#e0f7fa', border: '#0097a7', text: '#006064' },
};
const DEFAULT_TASK_COLOR = { bg: '#f0f4ff', border: '#5c6bc0', text: '#283593' };

function getTaskColor(taskId: string) {
  return TASK_COLORS[taskId] ?? DEFAULT_TASK_COLOR;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ========== 配置情報の計算 ==========

type CellPlacement = {
  shift: Shift;
  isOutOfRange: boolean;
};

/** 各 (memberId, blockIndex) → そのセルに置かれている配置リスト */
function buildPlacementMap(
  shifts: readonly Shift[],
  timeSchedule: TimeSchedule,
): Map<string, CellPlacement[]> {
  const map = new Map<string, CellPlacement[]>();
  for (const shift of shifts) {
    const bl = shift.blockList;
    for (let blockIndex = 0; blockIndex < bl.totalBlocks; blockIndex++) {
      const userIds = bl.getUsersAt(blockIndex);
      if (userIds.length === 0) continue;
      const isOutOfRange = !shift.isBlockInRange(blockIndex, timeSchedule);
      for (const userId of userIds) {
        const key = `${userId}:${blockIndex}`;
        const list = map.get(key) ?? [];
        list.push({ shift, isOutOfRange });
        map.set(key, list);
      }
    }
  }
  return map;
}

/**
 * 1局員の連続バー（run）を計算する。
 * primary = 各セルの placements[0]（最初に置かれたシフト）。
 * 同一 shift.id が連続するセル群を1つの run として束ねる。
 *
 * run レベルではフラグを持たず、制約違反は「どの blockIndex で違反しているか」という
 * セル単位のリストで保持する（outOfRangeBlocks / unavailableBlocks）。
 * ビジュアルも run 全体を塗るのではなくブロック単位で重ねるため、
 * 例えば「概ね時間内だが右端だけ1セルはみ出た」ようなケースが
 * そのまま理解できる形で表示される。
 */
type RunBar = {
  shift: Shift;
  startBlock: number;
  endBlock: number; // 半開区間
  isOverlap: boolean;
  outOfRangeBlocks: number[];  // shift の valid 範囲外に置かれた絶対 blockIndex
  unavailableBlocks: number[]; // 参加不可時間に該当する絶対 blockIndex
};

function buildRunsForMember(
  member: Member,
  timeSchedule: TimeSchedule,
  totalBlocks: number,
  placementMap: Map<string, CellPlacement[]>,
): RunBar[] {
  const runs: RunBar[] = [];
  let cur: RunBar | null = null;
  const dayType = timeSchedule.dayType;
  for (let b = 0; b < totalBlocks; b++) {
    const placements = placementMap.get(`${member.id}:${b}`) ?? [];
    const primary = placements[0];
    if (!primary) {
      if (cur) {
        runs.push(cur);
        cur = null;
      }
      continue;
    }
    const isOverlap = placements.length > 1;
    const blockMinute = timeSchedule.startMinute + b * 15;
    const isUnavailable = !member.isAvailableAt(dayType, blockMinute);
    const isOutOfRange = primary.isOutOfRange;
    if (cur && cur.shift.id === primary.shift.id) {
      cur.endBlock = b + 1;
      cur.isOverlap = cur.isOverlap || isOverlap;
      if (isOutOfRange) cur.outOfRangeBlocks.push(b);
      if (isUnavailable) cur.unavailableBlocks.push(b);
    } else {
      if (cur) runs.push(cur);
      cur = {
        shift: primary.shift,
        startBlock: b,
        endBlock: b + 1,
        isOverlap,
        outOfRangeBlocks: isOutOfRange ? [b] : [],
        unavailableBlocks: isUnavailable ? [b] : [],
      };
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * brushTaskId に対応するシフトを blockIndex 位置から1つ選ぶ。
 */
function resolveShiftForTaskAt(
  candidates: Shift[],
  blockIndex: number,
  timeSchedule: TimeSchedule,
): Shift | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const containing = candidates.find((s) => s.isBlockInRange(blockIndex, timeSchedule));
  if (containing) return containing;
  return candidates.reduce((best, s) => {
    const r = s.validBlockRange(timeSchedule);
    const mid = (r.start + r.end) / 2;
    const bestR = best.validBlockRange(timeSchedule);
    const bestMid = (bestR.start + bestR.end) / 2;
    return Math.abs(mid - blockIndex) < Math.abs(bestMid - blockIndex) ? s : best;
  });
}

// ========== プレビュー状態 ==========

/**
 * ドラッグ中の予定範囲。アンカー＝ドラッグで最初に入ったセル、current = 現在のホバーセル。
 * 同一行内のみ範囲を構築する。行をまたぐと anchor は新しい行の現在セルへリセット。
 */
type PreviewState = {
  memberId: string;
  anchorBlock: number;
  currentBlock: number;
};

// ========== メインコンポーネント ==========

export const PrimitiveGanttView: FC<PrimitiveGanttViewProps> = ({
  shifts,
  timeSchedules,
  members,
  selectedDayType,
  ganttConfig = {},
  onPaintRange,
  onRemoveRange,
  onMoveRun,
  onAssignedRunClick,
  buildRunUrl,
  brushTaskId,
  rowAvailabilityMap,
}) => {
  const hourPx = ganttConfig.hourPx ?? 60;
  const minutePx = hourPx / 60;
  const blockPx = minutePx * 15;

  const activeTimeSchedule = useMemo(() => {
    if (!selectedDayType) return timeSchedules[0] ?? null;
    return timeSchedules.find((ts) => ts.dayType === selectedDayType) ?? null;
  }, [timeSchedules, selectedDayType]);

  const activeShifts = useMemo(() => {
    if (!activeTimeSchedule) return [] as Shift[];
    return shifts.filter((s) => s.timeScheduleId === activeTimeSchedule.id);
  }, [shifts, activeTimeSchedule]);

  const placementMap = useMemo(
    () => activeTimeSchedule
      ? buildPlacementMap(activeShifts, activeTimeSchedule)
      : new Map<string, CellPlacement[]>(),
    [activeShifts, activeTimeSchedule],
  );

  // ブラシ候補シフト（state優先、無ければ draggingTaskId モジュール変数）
  const resolveActiveBrush = useCallback((): { taskId: string; candidates: Shift[] } | null => {
    if (!activeTimeSchedule) return null;
    const taskId = brushTaskId ?? draggingTaskId;
    if (!taskId) return null;
    const candidates = activeShifts.filter((s) => s.taskId === taskId);
    if (candidates.length === 0) return null;
    return { taskId, candidates };
  }, [brushTaskId, activeTimeSchedule, activeShifts]);

  // ブラシシフト群の「有効blockIndex」集合
  const brushValidBlocks = useMemo(() => {
    const brush = resolveActiveBrush();
    if (!brush || !activeTimeSchedule) return null;
    const set = new Set<number>();
    for (const s of brush.candidates) {
      const r = s.validBlockRange(activeTimeSchedule);
      for (let i = r.start; i < r.end; i++) set.add(i);
    }
    return set;
  }, [resolveActiveBrush, activeTimeSchedule]);

  const isPainting = brushValidBlocks !== null && brushValidBlocks.size > 0;

  // ========== ブラシペイントプレビュー ==========
  const [preview, setPreview] = useState<PreviewState | null>(null);

  // ========== 移動・リサイズプレビュー ==========
  /**
   * 既配置バーに対する編集操作。
   * - move      = バー本体ドラッグ（行内時刻シフト + クロス行で局員変更）
   * - resize-L  = 左エッジドラッグで開始時刻を変更
   * - resize-R  = 右エッジドラッグで終了時刻を変更
   */
  type EditState = {
    kind: 'move' | 'resize-L' | 'resize-R';
    shiftId: string;
    oldMemberId: string;
    oldStart: number;
    oldEnd: number;
    initialPointerX: number;
    initialPointerY: number;
    /** プレビュー後の値（commit時の値） */
    previewStart: number;
    previewEnd: number;
    /** クロス行ムーブ時の現ターゲット行 */
    targetMemberId: string;
    /** 実際にドラッグが動いたか（クリック検出用） */
    moved: boolean;
  };
  const [editState, setEditState] = useState<EditState | null>(null);
  /** 直近の pointerup でドラッグが起きたら、その後の click を抑制するフラグ */
  const suppressClickRef = useRef(false);

  // ========== ヘルパー: 行から member.id を引く（クロス行ムーブ用） ==========
  const findMemberIdAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const row = (el as Element).closest('[data-member-id]');
    return row ? row.getAttribute('data-member-id') : null;
  }, []);

  // ドラッグ終了で必ずプレビュークリア（drop/cancel 共通）
  useEffect(() => {
    const handleDragEnd = () => setPreview(null);
    window.addEventListener('dragend', handleDragEnd);
    return () => window.removeEventListener('dragend', handleDragEnd);
  }, []);

  // brushTaskId が変わったら（drop後など）プレビュークリア
  useEffect(() => {
    if (!brushTaskId) setPreview(null);
  }, [brushTaskId]);

  const calcBlockIndex = useCallback(
    (clientX: number, rowEl: Element): number => {
      const rect = rowEl.getBoundingClientRect();
      const x = Math.max(0, clientX - rect.left);
      return Math.min(Math.floor(x / blockPx), (activeTimeSchedule?.totalBlocks ?? 1) - 1);
    },
    [blockPx, activeTimeSchedule],
  );

  const handleRowDragOver = useCallback(
    (memberId: string, e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE_TASK)) return;
      const brush = resolveActiveBrush();
      if (!brush) return;
      // pointer編集中はブラシのドロップを優先しない
      if (editState) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const blockIndex = calcBlockIndex(e.clientX, e.currentTarget);
      // プレビュー更新：行をまたいだらアンカーリセット
      setPreview((prev) => {
        if (!prev || prev.memberId !== memberId) {
          return { memberId, anchorBlock: blockIndex, currentBlock: blockIndex };
        }
        if (prev.currentBlock === blockIndex) return prev;
        return { ...prev, currentBlock: blockIndex };
      });
    },
    [resolveActiveBrush, calcBlockIndex, editState],
  );

  const handleRowDrop = useCallback(
    (memberId: string, e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE_TASK)) return;
      const brush = resolveActiveBrush();
      if (!brush || !activeTimeSchedule) {
        setPreview(null);
        return;
      }
      e.preventDefault();
      const blockIndex = calcBlockIndex(e.clientX, e.currentTarget);
      // 確定範囲を計算：preview があればそれを採用、なければ単セル
      let startBlock = blockIndex;
      let endBlockExclusive = blockIndex + 1;
      if (preview && preview.memberId === memberId) {
        startBlock = Math.min(preview.anchorBlock, blockIndex);
        endBlockExclusive = Math.max(preview.anchorBlock, blockIndex) + 1;
      }
      // 範囲内の各cellに対し対応shiftを解決（範囲が複数shiftに跨る可能性あり）
      // シフトごとにグルーピングして commit
      const byShift = new Map<string, { shift: Shift; blocks: number[] }>();
      for (let b = startBlock; b < endBlockExclusive; b++) {
        const shift = resolveShiftForTaskAt(brush.candidates, b, activeTimeSchedule);
        if (!shift) continue;
        const entry = byShift.get(shift.id) ?? { shift, blocks: [] };
        entry.blocks.push(b);
        byShift.set(shift.id, entry);
      }
      // 連続範囲ごとに onPaintRange 呼び出し
      for (const { shift, blocks } of byShift.values()) {
        // blocks は昇順。連続区間に分割
        let runStart = blocks[0];
        let runPrev = blocks[0];
        for (let i = 1; i <= blocks.length; i++) {
          if (i === blocks.length || blocks[i] !== runPrev + 1) {
            onPaintRange?.(shift.id, memberId, runStart, runPrev + 1);
            if (i < blocks.length) {
              runStart = blocks[i];
              runPrev = blocks[i];
            }
          } else {
            runPrev = blocks[i];
          }
        }
      }
      setPreview(null);
    },
    [preview, resolveActiveBrush, activeTimeSchedule, calcBlockIndex, onPaintRange],
  );

  const handleRowDragLeave = useCallback((memberId: string, e: React.DragEvent) => {
    // currentTarget の外に出たらプレビュー消す（同一memberの行内移動では発火しないようにrelatedTargetチェック）
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Element).contains(related)) return;
    // 別行に移動した可能性 → preview側で memberId mismatch を検出してリセット
    // 完全に行外に出た場合：preview を残しておくと別行に行ったときに紛らわしいのでここでクリアしない
    void memberId;
  }, []);

  const handleRunClick = useCallback(
    (run: RunBar, memberId: string, e: React.MouseEvent) => {
      // 直前にドラッグ移動/リサイズが起きていたらクリック動作（詳細遷移）を抑制
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (e.defaultPrevented) return;
      onAssignedRunClick?.(run.shift.id, memberId, run.startBlock);
    },
    [onAssignedRunClick],
  );

  // ========== 移動・リサイズ pointer handlers ==========

  const startEdit = useCallback(
    (
      kind: EditState['kind'],
      run: RunBar,
      memberId: string,
      e: React.PointerEvent<HTMLElement>,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setEditState({
        kind,
        shiftId: run.shift.id,
        oldMemberId: memberId,
        oldStart: run.startBlock,
        oldEnd: run.endBlock,
        initialPointerX: e.clientX,
        initialPointerY: e.clientY,
        previewStart: run.startBlock,
        previewEnd: run.endBlock,
        targetMemberId: memberId,
        moved: false,
      });
    },
    [],
  );

  const handleEditMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!editState) return;
    e.preventDefault();
    const dxBlocks = Math.round((e.clientX - editState.initialPointerX) / blockPx);
    const dxPx = e.clientX - editState.initialPointerX;
    const dyPx = e.clientY - editState.initialPointerY;
    const moved = editState.moved || Math.abs(dxPx) >= 3 || Math.abs(dyPx) >= 3;

    if (editState.kind === 'move') {
      const newStart = editState.oldStart + dxBlocks;
      const newEnd = editState.oldEnd + dxBlocks;
      // ターゲット行をポインタ位置から検出（行をまたいだら局員変更）
      const targetId = findMemberIdAtPoint(e.clientX, e.clientY) ?? editState.targetMemberId;
      setEditState({ ...editState, previewStart: newStart, previewEnd: newEnd, targetMemberId: targetId, moved });
    } else if (editState.kind === 'resize-R') {
      const newEnd = Math.max(editState.oldStart + 1, editState.oldEnd + dxBlocks);
      setEditState({ ...editState, previewEnd: newEnd, moved });
    } else {
      // resize-L
      const newStart = Math.min(editState.oldEnd - 1, editState.oldStart + dxBlocks);
      setEditState({ ...editState, previewStart: newStart, moved });
    }
  }, [editState, blockPx, findMemberIdAtPoint]);

  const handleEditUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!editState) return;
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (editState.moved) {
      // commit
      const targetId = editState.kind === 'move' ? editState.targetMemberId : editState.oldMemberId;
      const noChange =
        targetId === editState.oldMemberId &&
        editState.previewStart === editState.oldStart &&
        editState.previewEnd === editState.oldEnd;
      if (!noChange) {
        onMoveRun?.(
          editState.shiftId,
          editState.oldMemberId,
          editState.oldStart,
          editState.oldEnd,
          targetId,
          editState.previewStart,
          editState.previewEnd,
        );
        suppressClickRef.current = true; // 次の click 動作は抑制
      }
    }
    setEditState(null);
  }, [editState, onMoveRun]);

  const handleEditCancel = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!editState) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setEditState(null);
  }, [editState]);

  const handleRunRemove = useCallback(
    (run: RunBar, memberId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRemoveRange?.(run.shift.id, memberId, run.startBlock, run.endBlock);
    },
    [onRemoveRange],
  );

  if (!activeTimeSchedule) {
    return (
      <StyledGantt>
        <div className="e-empty">DayTypeを選んでください</div>
      </StyledGantt>
    );
  }

  const totalBlocks = activeTimeSchedule.totalBlocks;
  const totalWidth = totalBlocks * blockPx;
  const dayStartMinute = activeTimeSchedule.startMinute;

  return (
    <StyledGantt>
      {/* 時間軸ヘッダー */}
      <div className="e-header-row">
        <div className="e-member-col-header" style={{ width: MEMBER_COLUMN_WIDTH }}>局員</div>
        <div className="e-time-axis" style={{ width: totalWidth }}>
          {Array.from({ length: totalBlocks + 1 }).map((_, i) => {
            const minute = dayStartMinute + i * 15;
            const isHour = minute % 60 === 0;
            return (
              <div
                key={i}
                className={`e-tick ${isHour ? 'is-hour' : ''}`}
                style={{ left: i * blockPx }}
              >
                {isHour && <span className="e-tick-label">{minutesToTime(minute)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 局員行 */}
      <div className="e-body">
        {members.map((member) => {
          const availability = isPainting ? (rowAvailabilityMap?.get(member.id) ?? null) : null;
          const runs = buildRunsForMember(member, activeTimeSchedule, totalBlocks, placementMap);
          const previewActive = preview && preview.memberId === member.id;
          const previewStart = previewActive ? Math.min(preview.anchorBlock, preview.currentBlock) : -1;
          const previewEnd = previewActive ? Math.max(preview.anchorBlock, preview.currentBlock) + 1 : -1;

          // 編集プレビュー: クロス行ムーブの target row なら preview bar を出す
          const editPreviewInThisRow =
            editState && editState.moved && editState.kind === 'move' && editState.targetMemberId === member.id
              ? { start: editState.previewStart, end: editState.previewEnd, shift: shifts.find((s) => s.id === editState.shiftId) }
              : null;

          return (
            <StyledMemberRow
              key={member.id}
              $availability={availability}
              style={{ height: ROW_HEIGHT }}
              data-member-id={member.id}
            >
              <div className="e-member-label" style={{ width: MEMBER_COLUMN_WIDTH }}>
                <span className="e-member-name">{member.name}</span>
                {member.isNewMember && <span className="e-new-badge">新</span>}
                <span className="e-dept-badge">{member.state.department.slice(0, 2)}</span>
              </div>
              <div
                className="e-cell-strip"
                style={{ width: totalWidth }}
                onDragOver={(e) => handleRowDragOver(member.id, e)}
                onDrop={(e) => handleRowDrop(member.id, e)}
                onDragLeave={(e) => handleRowDragLeave(member.id, e)}
              >
                {/* グリッド背景線（15分粒度） */}
                {Array.from({ length: totalBlocks }).map((_, b) => {
                  const isHour = ((dayStartMinute + b * 15) % 60) === 0;
                  const isInBrushRange = brushValidBlocks?.has(b) ?? false;
                  return (
                    <StyledGridCell
                      key={b}
                      $left={b * blockPx}
                      $width={blockPx}
                      $isHour={isHour}
                      $isInBrushRange={isInBrushRange}
                    />
                  );
                })}

                {/* 連結バー（既配置） */}
                {runs.map((run) => {
                  const color = getTaskColor(run.shift.taskId);
                  // この run が編集中なら preview を反映
                  const isBeingEdited =
                    editState &&
                    editState.shiftId === run.shift.id &&
                    editState.oldMemberId === member.id &&
                    editState.oldStart === run.startBlock &&
                    editState.oldEnd === run.endBlock;
                  // クロス行ムーブで別行に飛んだら、元の位置のバーは半透明で残す（ゴースト）
                  const isMovingToOtherRow =
                    isBeingEdited &&
                    editState.kind === 'move' &&
                    editState.targetMemberId !== member.id;
                  const start = isBeingEdited && !isMovingToOtherRow ? editState.previewStart : run.startBlock;
                  const end = isBeingEdited && !isMovingToOtherRow ? editState.previewEnd : run.endBlock;
                  const left = start * blockPx;
                  const width = (end - start) * blockPx;
                  const runUrl = buildRunUrl?.(run.shift.id);
                  const hasUnavailable = run.unavailableBlocks.length > 0;
                  const hasOutOfRange = run.outOfRangeBlocks.length > 0;
                  const titleParts = [run.shift.taskName];
                  if (hasOutOfRange) titleParts.push('（タスク時間外に配置）');
                  if (run.isOverlap) titleParts.push('（重複あり）');
                  if (hasUnavailable) titleParts.push('（参加不可時間に配置）');
                  const runBar = (
                    <StyledRunBar
                      key={`${run.shift.id}-${run.startBlock}`}
                      $left={left}
                      $width={width}
                      $bg={color.bg}
                      $border={color.border}
                      $text={color.text}
                      $isOutOfRange={hasOutOfRange}
                      $isOverlap={run.isOverlap}
                      $isGhost={!!isMovingToOtherRow}
                      $isUnavailable={hasUnavailable}
                      title={titleParts.join('')}
                      onClick={(e) => handleRunClick(run, member.id, e)}
                      onPointerDown={(e) => startEdit('move', run, member.id, e)}
                      onPointerMove={handleEditMove}
                      onPointerUp={handleEditUp}
                      onPointerCancel={handleEditCancel}
                    >
                      <StyledResizeHandle
                        $side="left"
                        onPointerDown={(e) => startEdit('resize-L', run, member.id, e)}
                        onPointerMove={handleEditMove}
                        onPointerUp={handleEditUp}
                        onPointerCancel={handleEditCancel}
                      />
                      {/* 参加不可ブロック毎のオーバーレイ（15分粒度） */}
                      {run.unavailableBlocks.map((b) => (
                        <StyledUnavailableBlock
                          key={`ua-${b}`}
                          style={{
                            left: (b - run.startBlock) * blockPx,
                            width: blockPx,
                          }}
                          aria-label="参加不可時間"
                        />
                      ))}
                      {/* タスク時間外ブロック毎のオーバーレイ（15分粒度） */}
                      {run.outOfRangeBlocks.map((b) => (
                        <StyledOutOfRangeBlock
                          key={`oor-${b}`}
                          style={{
                            left: (b - run.startBlock) * blockPx,
                            width: blockPx,
                          }}
                          aria-label="タスク時間外"
                        />
                      ))}
                      <span className="e-run-label">{run.shift.taskName}</span>
                      {hasOutOfRange && <span className="e-out-badge" aria-label="タスク時間外に配置">⧗</span>}
                      {hasUnavailable && <span className="e-unavailable-badge" aria-label="参加不可時間に配置">🚫</span>}
                      {run.isOverlap && <span className="e-overlap-badge">!</span>}
                      <button
                        type="button"
                        className="e-remove-btn"
                        title="削除"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleRunRemove(run, member.id, e)}
                      >
                        <CloseIcon style={{ fontSize: 14 }} />
                      </button>
                      <StyledResizeHandle
                        $side="right"
                        onPointerDown={(e) => startEdit('resize-R', run, member.id, e)}
                        onPointerMove={handleEditMove}
                        onPointerUp={handleEditUp}
                        onPointerCancel={handleEditCancel}
                      />
                    </StyledRunBar>
                  );
                  return runUrl ? (
                    <UrledPlace key={`${run.shift.id}-${run.startBlock}`} url={runUrl}>
                      {runBar}
                    </UrledPlace>
                  ) : (
                    runBar
                  );
                })}

                {/* クロス行ムーブの転送先プレビュー */}
                {editPreviewInThisRow && editPreviewInThisRow.shift && (
                  <StyledRunBar
                    $left={editPreviewInThisRow.start * blockPx}
                    $width={(editPreviewInThisRow.end - editPreviewInThisRow.start) * blockPx}
                    $bg={getTaskColor(editPreviewInThisRow.shift.taskId).bg}
                    $border={getTaskColor(editPreviewInThisRow.shift.taskId).border}
                    $text={getTaskColor(editPreviewInThisRow.shift.taskId).text}
                    $isOutOfRange={false}
                    $isOverlap={false}
                    $isGhost={false}
                    $isUnavailable={false}
                    style={{ opacity: 0.65, pointerEvents: 'none' }}
                  >
                    <span className="e-run-label">{editPreviewInThisRow.shift.taskName}</span>
                  </StyledRunBar>
                )}

                {/* プレビュー（ドラッグ中の塗り予告） */}
                {previewActive && previewStart >= 0 && (
                  <StyledPreviewBar
                    style={{
                      left: previewStart * blockPx,
                      width: (previewEnd - previewStart) * blockPx,
                    }}
                  />
                )}
              </div>
            </StyledMemberRow>
          );
        })}
      </div>
    </StyledGantt>
  );
};

// ========== スタイル ==========

const StyledGantt = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  font-size: 0.82em;
  user-select: none;

  .e-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #aaa;
    font-size: 1.1em;
  }

  .e-header-row {
    display: flex;
    align-items: stretch;
    border-bottom: 2px solid #ddd;
    background: #f8f8f8;
    position: sticky;
    top: 0;
    z-index: 20;
    flex-shrink: 0;
  }

  .e-member-col-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border-right: 2px solid #ddd;
    padding: 4px;
    color: #555;
    font-size: 0.85em;
    position: sticky;
    left: 0;
    z-index: 25;
    background: #f8f8f8;
  }

  .e-time-axis {
    position: relative;
    height: 24px;
    flex-shrink: 0;
  }

  .e-tick {
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 1px solid #e0e0e0;

    &.is-hour {
      border-left: 1px solid #bbb;
    }
  }

  .e-tick-label {
    position: absolute;
    left: 3px;
    top: 4px;
    font-size: 0.78em;
    color: #666;
    white-space: nowrap;
  }

  .e-body {
    flex: 1;
  }

  .e-member-label {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border-right: 2px solid #ddd;
    position: sticky;
    left: 0;
    z-index: 10;
    background: inherit;

    .e-member-name {
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .e-new-badge {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #90caf9;
      border-radius: 3px;
      padding: 0 3px;
      font-size: 0.75em;
      flex-shrink: 0;
    }

    .e-dept-badge {
      background: #f5f5f5;
      color: #757575;
      border: 1px solid #e0e0e0;
      border-radius: 3px;
      padding: 0 3px;
      font-size: 0.72em;
      flex-shrink: 0;
    }
  }

  .e-cell-strip {
    position: relative;
    flex-shrink: 0;
  }
`;

// 行の availability に応じた背景・左ボーダー色
function getAvailabilityStyle(availability: RowAvailability | null) {
  if (!availability) return '';
  if (availability === 'available') return `
    border-left: 4px solid #4caf50;
    background-color: rgba(76, 175, 80, 0.06);
  `;
  if (availability === 'warning') return `
    border-left: 4px solid #ff9800;
    background-color: rgba(255, 152, 0, 0.06);
  `;
  return `
    border-left: 4px solid #f44336;
    background-color: rgba(244, 67, 54, 0.06);
  `;
}

type StyledMemberRowProps = React.HTMLAttributes<HTMLDivElement> & {
  $availability: RowAvailability | null;
};

const StyledMemberRow = styled.div<StyledMemberRowProps>`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #eee;
  transition: background-color 0.1s, border-left 0.15s;
  ${(p) => getAvailabilityStyle(p.$availability)}

  &:hover {
    background-color: #fafafa;
  }
`;

type StyledGridCellProps = React.HTMLAttributes<HTMLDivElement> & {
  $left: number;
  $width: number;
  $isHour: boolean;
  $isInBrushRange: boolean;
};

/** 背景グリッド（クリック対象ではない・装飾のみ） */
const StyledGridCell = styled.div<StyledGridCellProps>`
  position: absolute;
  top: 0;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$width}px;
  height: 100%;
  border-left: 1px solid ${(p) => p.$isHour ? '#d0d0d0' : '#f0f0f0'};
  pointer-events: none;
  ${(p) => p.$isInBrushRange && `
    background: rgba(25, 118, 210, 0.06);
  `}
`;

type StyledRunBarProps = React.HTMLAttributes<HTMLDivElement> & {
  $left: number;
  $width: number;
  $bg: string;
  $border: string;
  $text: string;
  $isOutOfRange: boolean;
  $isOverlap: boolean;
  $isGhost: boolean;
  $isUnavailable: boolean;
};

/** 既配置の連結バー（既配置の単位） */
const StyledRunBar = styled.div<StyledRunBarProps>`
  position: absolute;
  top: 2px;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$width}px;
  height: ${ROW_HEIGHT - 4}px;
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 3px;
  color: ${(p) => p.$text};
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-size: 0.78em;
  font-weight: 600;
  cursor: grab;
  overflow: hidden;
  box-sizing: border-box;
  z-index: 2;
  user-select: none;
  touch-action: none;

  ${(p) => p.$isGhost && `
    opacity: 0.35;
    border-style: dashed;
  `}

  &:active {
    cursor: grabbing;
  }

  /* タスク時間外ブロックを1つ以上含む：赤の点線ボーダーで run を強調
     （実際に問題のあるブロックは StyledOutOfRangeBlock が重なって表示） */
  ${(p) => p.$isOutOfRange && `
    border-color: #f44336;
    border-style: dashed;
  `}

  ${(p) => p.$isOverlap && `
    box-shadow: inset 0 0 0 1px rgba(244, 67, 54, 0.45);
  `}

  /* 参加不可時間に配置：out-of-range と同時の時は赤を優先、
     参加不可単独ならアンバー点線ボーダーにする */
  ${(p) => p.$isUnavailable && !p.$isOutOfRange && `
    border-color: #ff8f00;
    border-style: dashed;
  `}

  &:hover {
    filter: brightness(0.96);
    .e-remove-btn { opacity: 1; }
  }

  .e-run-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
    z-index: 1;
  }

  .e-overlap-badge {
    color: #d32f2f;
    font-weight: 800;
    margin-right: 4px;
    position: relative;
    z-index: 1;
  }

  .e-unavailable-badge {
    font-size: 0.95em;
    margin-right: 4px;
    position: relative;
    z-index: 1;
  }

  .e-out-badge {
    color: #c62828;
    font-weight: 800;
    font-size: 1em;
    margin-right: 4px;
    position: relative;
    z-index: 1;
  }

  .e-remove-btn {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.7);
    color: #d32f2f;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.1s, background 0.1s;

    &:hover {
      background: #fff;
    }
  }
`;

/** リサイズハンドル（バー左右端） */
type StyledResizeHandleProps = React.HTMLAttributes<HTMLDivElement> & { $side: 'left' | 'right' };
const StyledResizeHandle = styled.div<StyledResizeHandleProps>`
  position: absolute;
  top: 0;
  ${(p) => p.$side === 'left' ? 'left: 0;' : 'right: 0;'}
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 3;
  background: transparent;
  border-radius: ${(p) => p.$side === 'left' ? '3px 0 0 3px' : '0 3px 3px 0'};
  transition: background 0.1s;

  &:hover {
    background: rgba(0, 0, 0, 0.2);
  }
`;

/**
 * タスク時間外ブロック オーバーレイ（15分単位）
 * 赤の斜め縞で当該ブロックが「タスク（shift）の valid 範囲外」であることを示す。
 * run 全体を塗らずに該当ブロックだけ赤く重ねるため、
 * 「概ね時間内だが末端1セルだけはみ出た」ようなケースがひと目で分かる。
 */
const StyledOutOfRangeBlock = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(244, 67, 54, 0.55),
    rgba(244, 67, 54, 0.55) 3px,
    rgba(255, 205, 210, 0.55) 3px,
    rgba(255, 205, 210, 0.55) 6px
  );
`;

/**
 * 参加不可ブロック オーバーレイ（15分単位）
 * 黄/オレンジの斜め縞で当該ブロックが「局員の参加可能時間外」であることを示す。
 * バー本体の色を残しつつ可視化するため半透明＋ストライプ。
 */
const StyledUnavailableBlock = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 143, 0, 0.55),
    rgba(255, 143, 0, 0.55) 3px,
    rgba(255, 224, 130, 0.55) 3px,
    rgba(255, 224, 130, 0.55) 6px
  );
`;

/** ドロップ前のプレビュー帯 */
const StyledPreviewBar = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: absolute;
  top: 2px;
  height: ${ROW_HEIGHT - 4}px;
  background: rgba(25, 118, 210, 0.20);
  border: 2px dashed #1976d2;
  border-radius: 3px;
  pointer-events: none;
  z-index: 3;
`;
