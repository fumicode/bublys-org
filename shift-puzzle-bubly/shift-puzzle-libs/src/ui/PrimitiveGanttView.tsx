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
import { Shift, TimeSchedule, Member } from '../domain/index.js';
import { type GanttConfig } from './MemberGanttView.js';
import { DRAG_TYPE_TASK, DRAG_TYPE_TASK_LIST, draggingTaskId, draggingDate } from './TaskListView.js';
import CloseIcon from '@mui/icons-material/Close';
import { createPortal } from 'react-dom';
import { UrledPlace } from '@bublys-org/bubbles-ui';

// 局員行の受け入れ可否型は MemberGanttView と共通（同一定義）
export type { RowAvailability } from './MemberGanttView.js';
import type { RowAvailability } from './MemberGanttView.js';

// ========== 公開型 ==========

export type PrimitiveGanttViewProps = {
  shifts: readonly Shift[];
  timeSchedules: readonly TimeSchedule[];
  members: readonly Member[];
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
  /** 局員ラベルクリック時のコールバック */
  onMemberClick?: (memberId: string) => void;
  /** 局員ラベルの URL ビルダー（UrledPlace の curve 起点に使用） */
  buildMemberUrl?: (memberId: string) => string;
  /** ブラシ対象タスクID（TaskListドラッグ中に外部から指定。ビジュアル用） */
  brushTaskId?: string | null;
  /** 局員行の受け入れ可否マップ（ブラシ中のみ意味がある） */
  rowAvailabilityMap?: Map<string, RowAvailability>;
  /** タスクリストまとめドロップ時コールバック（AI配置トリガー） */
  onTaskListDrop?: () => void;
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
  const dayType = timeSchedule.dayType;

  // シフトごとに担当ブロックを収集（bの昇順で追加されるため昇順保証）
  type ShiftEntry = {
    shift: Shift;
    blocks: number[];
    outOfRangeSet: Set<number>;
    overlapSet: Set<number>;
  };
  const shiftMap = new Map<string, ShiftEntry>();

  for (let b = 0; b < totalBlocks; b++) {
    const placements = placementMap.get(`${member.id}:${b}`) ?? [];
    if (placements.length === 0) continue;
    const hasOverlap = placements.length > 1;
    for (const { shift, isOutOfRange } of placements) {
      if (!shiftMap.has(shift.id)) {
        shiftMap.set(shift.id, { shift, blocks: [], outOfRangeSet: new Set(), overlapSet: new Set() });
      }
      const entry = shiftMap.get(shift.id)!;
      entry.blocks.push(b);
      if (isOutOfRange) entry.outOfRangeSet.add(b);
      if (hasOverlap) entry.overlapSet.add(b);
    }
  }

  const runs: RunBar[] = [];

  for (const { shift, blocks, outOfRangeSet, overlapSet } of shiftMap.values()) {
    if (blocks.length === 0) continue;
    // 連続ブロックをrunにまとめる
    let runStart = blocks[0];
    let runPrev = blocks[0];
    const oorBlocks: number[] = [];
    const unaBlocks: number[] = [];
    let isOverlap = false;

    const accumulate = (b: number) => {
      if (outOfRangeSet.has(b)) oorBlocks.push(b);
      if (!member.isAvailableAt(dayType, timeSchedule.startMinute + b * 15)) unaBlocks.push(b);
      if (overlapSet.has(b)) isOverlap = true;
    };
    accumulate(blocks[0]);

    for (let i = 1; i <= blocks.length; i++) {
      if (i === blocks.length || blocks[i] !== runPrev + 1) {
        runs.push({ shift, startBlock: runStart, endBlock: runPrev + 1, isOverlap, outOfRangeBlocks: [...oorBlocks], unavailableBlocks: [...unaBlocks] });
        if (i < blocks.length) {
          runStart = blocks[i];
          runPrev = blocks[i];
          oorBlocks.length = 0;
          unaBlocks.length = 0;
          isOverlap = false;
          accumulate(blocks[i]);
        }
      } else {
        runPrev = blocks[i];
        accumulate(blocks[i]);
      }
    }
  }

  // startBlock順に並べて描画順を安定させる
  runs.sort((a, b) => a.startBlock - b.startBlock || a.shift.id.localeCompare(b.shift.id));
  return runs;
}

/**
 * 時間軸が重なるrunにスタックレベルを割り当てる（greedy interval coloring）。
 * level 0 = 通常バー、level 1+ = 重複バー（小さく底部に表示）。
 */
function computeRunLevels(runs: RunBar[]): number[] {
  const levels = new Array<number>(runs.length).fill(0);
  // levelEndBlock[lvl] = そのレベルで確保済みの最後のendBlock
  const levelEnds: number[] = [];

  for (let i = 0; i < runs.length; i++) {
    const { startBlock, endBlock } = runs[i];
    let assigned = -1;
    for (let lvl = 0; lvl < levelEnds.length; lvl++) {
      if (levelEnds[lvl] <= startBlock) {
        assigned = lvl;
        levelEnds[lvl] = endBlock;
        break;
      }
    }
    if (assigned === -1) {
      assigned = levelEnds.length;
      levelEnds.push(endBlock);
    }
    levels[i] = assigned;
  }
  return levels;
}

/**
 * ドラッグ中タスクが配置できない理由を文字列で返す。配置可能なら null。
 * draggingDate / draggingTaskId はモジュール変数を呼び出し時点で読む。
 */
function computeDragWarning(taskId: string, activeShifts: readonly Shift[]): string {
  if (activeShifts.length === 0) {
    return 'このシフト表にはシフトが設定されていません。シフト表リストで日付を設定したシフト表を選択してください。';
  }
  const shiftsForTask = activeShifts.filter((s) => s.taskId === taskId);
  const date = draggingDate; // module var, read at call time
  if (date) {
    const planDates = [...new Set(
      activeShifts.map((s) => s.state.date).filter((d): d is string => !!d)
    )];
    if (!planDates.includes(date)) {
      const planDateStr = planDates.length > 0 ? planDates.join('・') : '（未設定）';
      return `このタスクは ${date} のシフトです。表示中のシフト表は ${planDateStr} 用のため配置できません。`;
    }
  }
  if (shiftsForTask.length === 0) {
    return 'このタスクに対応するシフトがこのシフト表に含まれていません。';
  }
  return '配置可能なシフトが見つかりませんでした。';
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
  ganttConfig = {},
  onPaintRange,
  onRemoveRange,
  onMoveRun,
  onAssignedRunClick,
  buildRunUrl,
  onMemberClick,
  buildMemberUrl,
  brushTaskId,
  onTaskListDrop,
}) => {
  const hourPx = ganttConfig.hourPx ?? 60;
  const minutePx = hourPx / 60;
  const blockPx = minutePx * 15;

  const activeTimeSchedule = useMemo(() => timeSchedules[0] ?? null, [timeSchedules]);

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
  /** 直近のドラッグ直後に click/dblclick を抑制するフラグ（タイマー自動解除） */
  const suppressClickRef = useRef(false);

  /** ホバー中の run 情報（アクションパネル表示に使用） */
  type HoveredRunInfo = {
    key: string;
    run: RunBar;
    memberId: string;
    rect: DOMRect;
  };
  const [hoveredRunInfo, setHoveredRunInfo] = useState<HoveredRunInfo | null>(null);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ブラシ候補シフト（外部タスクドラッグ / クリック選択 / 既配置バー編集中 の順で解決）
  const resolveActiveBrush = useCallback((): { taskId: string; candidates: Shift[] } | null => {
    if (!activeTimeSchedule) return null;
    // 外部タスクドラッグ or クリック選択ブラシ
    const taskId = brushTaskId ?? draggingTaskId;
    if (taskId) {
      let candidates = activeShifts.filter((s) => s.taskId === taskId);
      // 日付付きドラッグ: タスクの日付がシフト表の日付と異なる場合は配置を禁止
      const date = draggingDate;
      if (date) {
        candidates = candidates.filter((s) => s.state.date === date);
      }
      if (candidates.length > 0) return { taskId, candidates };
    }
    // 既配置バーのドラッグ/リサイズ中: 編集中シフトの taskId からブラシを導出
    if (editState) {
      const editedShift = activeShifts.find((s) => s.id === editState.shiftId);
      if (editedShift) {
        const editTaskId = editedShift.taskId;
        const candidates = activeShifts.filter((s) => s.taskId === editTaskId);
        if (candidates.length > 0) return { taskId: editTaskId, candidates };
      }
    }
    return null;
  }, [brushTaskId, activeTimeSchedule, activeShifts, editState]);

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

  // ドラッグ中に配置不可の場合に表示する理由メッセージ
  const [dragWarning, setDragWarning] = useState<string | null>(null);

  // ========== ヘルパー: 行から member.id を引く（クロス行ムーブ用） ==========
  const findMemberIdAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const row = (el as Element).closest('[data-member-id]');
    return row ? row.getAttribute('data-member-id') : null;
  }, []);

  // ドラッグ終了で必ずプレビュー・警告クリア（drop/cancel 共通）
  useEffect(() => {
    const handleDragEnd = () => {
      setPreview(null);
      setDragWarning(null);
    };
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
      if (e.dataTransfer.types.includes(DRAG_TYPE_TASK_LIST)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        return;
      }
      if (!e.dataTransfer.types.includes(DRAG_TYPE_TASK)) return;
      const brush = resolveActiveBrush();
      if (!brush) {
        // 配置不可の理由を表示
        const taskId = draggingTaskId ?? brushTaskId;
        if (taskId) setDragWarning(computeDragWarning(taskId, activeShifts));
        return;
      }
      setDragWarning(null);
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
    [resolveActiveBrush, calcBlockIndex, editState, brushTaskId, activeShifts],
  );

  // ガント全体へのDragOverハンドラ（局員行以外のエリアでも警告を表示するため）
  const handleContainerDragOver = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_TYPE_TASK_LIST)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        return;
      }
      if (!e.dataTransfer.types.includes(DRAG_TYPE_TASK)) return;
      const brush = resolveActiveBrush();
      if (!brush) {
        const taskId = draggingTaskId ?? brushTaskId;
        if (taskId) setDragWarning(computeDragWarning(taskId, activeShifts));
      }
    },
    [resolveActiveBrush, brushTaskId, activeShifts],
  );

  const handleRowDrop = useCallback(
    (memberId: string, e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_TYPE_TASK_LIST)) {
        e.preventDefault();
        setPreview(null);
        onTaskListDrop?.();
        return;
      }
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
    [preview, resolveActiveBrush, activeTimeSchedule, calcBlockIndex, onPaintRange, onTaskListDrop],
  );

  const handleRowDragLeave = useCallback((memberId: string, e: React.DragEvent) => {
    // currentTarget の外に出たらプレビュー消す（同一memberの行内移動では発火しないようにrelatedTargetチェック）
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Element).contains(related)) return;
    // 別行に移動した可能性 → preview側で memberId mismatch を検出してリセット
    // 完全に行外に出た場合：preview を残しておくと別行に行ったときに紛らわしいのでここでクリアしない
    void memberId;
  }, []);

  /** ダブルクリックでrunの詳細を開く（ドラッグ直後は抑制） */
  const handleRunDoubleClick = useCallback(
    (run: RunBar, memberId: string, e: React.MouseEvent) => {
      if (suppressClickRef.current) return;
      if (e.defaultPrevented) return;
      onAssignedRunClick?.(run.shift.id, memberId, run.startBlock);
    },
    [onAssignedRunClick],
  );

  /** run bar にマウスが入ったときホバー情報を記録（アクションパネル用） */
  const handleRunMouseEnter = useCallback(
    (run: RunBar, memberId: string, e: React.MouseEvent<HTMLElement>) => {
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredRunInfo({ key: `${run.shift.id}-${run.startBlock}-${memberId}`, run, memberId, rect });
    },
    [],
  );

  /** run bar からマウスが出たら遅延後にパネルを消す（パネルへの移動時はキャンセル） */
  const scheduleHoverLeave = useCallback(() => {
    hoverLeaveTimerRef.current = setTimeout(() => {
      setHoveredRunInfo(null);
      hoverLeaveTimerRef.current = null;
    }, 120);
  }, []);

  const cancelHoverLeave = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  }, []);

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
      // ドラッグ開始時はアクションパネルを消す
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      setHoveredRunInfo(null);
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
    const tb = activeTimeSchedule?.totalBlocks ?? 1;
    const dxBlocks = Math.round((e.clientX - editState.initialPointerX) / blockPx);
    const dxPx = e.clientX - editState.initialPointerX;
    const dyPx = e.clientY - editState.initialPointerY;
    const moved = editState.moved || Math.abs(dxPx) >= 3 || Math.abs(dyPx) >= 3;

    if (editState.kind === 'move') {
      const runLen = editState.oldEnd - editState.oldStart;
      const newStart = Math.max(0, Math.min(tb - runLen, editState.oldStart + dxBlocks));
      const newEnd = newStart + runLen;
      // ターゲット行をポインタ位置から検出（行をまたいだら局員変更）
      const targetId = findMemberIdAtPoint(e.clientX, e.clientY) ?? editState.targetMemberId;
      setEditState({ ...editState, previewStart: newStart, previewEnd: newEnd, targetMemberId: targetId, moved });
    } else if (editState.kind === 'resize-R') {
      // endBlock は半開区間なので tb が上限（最後の有効 index は tb-1）
      const newEnd = Math.min(tb, Math.max(editState.oldStart + 1, editState.oldEnd + dxBlocks));
      setEditState({ ...editState, previewEnd: newEnd, moved });
    } else {
      // resize-L
      const newStart = Math.max(0, Math.min(editState.oldEnd - 1, editState.oldStart + dxBlocks));
      setEditState({ ...editState, previewStart: newStart, moved });
    }
  }, [editState, blockPx, findMemberIdAtPoint, activeTimeSchedule]);

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
        // ドラッグ後 400ms 以内の click/dblclick を抑制
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, 400);
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


  if (!activeTimeSchedule) {
    return (
      <StyledGantt>
        <div className="e-empty">スケジュールが設定されていません</div>
      </StyledGantt>
    );
  }

  const totalBlocks = activeTimeSchedule.totalBlocks;
  const totalWidth = totalBlocks * blockPx;
  const dayStartMinute = activeTimeSchedule.startMinute;

  return (
    <StyledGantt
      onDragOver={handleContainerDragOver}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE_TASK_LIST)) return;
        e.preventDefault();
        onTaskListDrop?.();
      }}
    >
      {/* ヘッダー行（grid row 1） */}
      <div className="e-member-col-header">局員</div>
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

      {/* ドラッグ配置不可の理由トースト: body に portal で描画 */}
      {dragWarning && createPortal(
        <StyledDragWarning>{dragWarning}</StyledDragWarning>,
        document.body,
      )}

      {/* ホバー時アクションパネル（削除）: body に portal で描画 */}
      {hoveredRunInfo && !editState && createPortal(
        <StyledRunActionPanel
          style={{
            position: 'fixed',
            left: hoveredRunInfo.rect.left + hoveredRunInfo.rect.width / 2,
            top: hoveredRunInfo.rect.top > 40
              ? hoveredRunInfo.rect.top - 32
              : hoveredRunInfo.rect.bottom + 4,
          }}
          onMouseEnter={cancelHoverLeave}
          onMouseLeave={() => setHoveredRunInfo(null)}
        >
          <button
            type="button"
            className="e-action-btn e-action-btn--delete"
            title="削除"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveRange?.(
                hoveredRunInfo.run.shift.id,
                hoveredRunInfo.memberId,
                hoveredRunInfo.run.startBlock,
                hoveredRunInfo.run.endBlock,
              );
              setHoveredRunInfo(null);
            }}
          >
            <CloseIcon style={{ fontSize: 13 }} />
          </button>
        </StyledRunActionPanel>,
        document.body,
      )}

      {/* 局員行（grid row 2 以降） */}
      {members.map((member) => {
          const runs = buildRunsForMember(member, activeTimeSchedule, totalBlocks, placementMap);
          const runLevels = computeRunLevels(runs);
          const previewActive = preview && preview.memberId === member.id;
          const previewStart = previewActive ? Math.min(preview.anchorBlock, preview.currentBlock) : -1;
          const previewEnd = previewActive ? Math.max(preview.anchorBlock, preview.currentBlock) + 1 : -1;

          // 編集プレビュー: クロス行ムーブの target row なら preview bar を出す
          const editPreviewInThisRow =
            editState && editState.moved && editState.kind === 'move' && editState.targetMemberId === member.id
              ? { start: editState.previewStart, end: editState.previewEnd, shift: shifts.find((s) => s.id === editState.shiftId) }
              : null;

          const memberUrl = buildMemberUrl?.(member.id);
          const memberLabel = (
            <div
              className={`e-member-label${onMemberClick ? ' is-clickable' : ''}`}
              data-member-id={member.id}
              onClick={() => onMemberClick?.(member.id)}
            >
              <span className="e-member-name">{member.name}</span>
              {member.isNewMember && <span className="e-new-badge">新</span>}
              <span className="e-dept-badge">{member.state.department.slice(0, 2)}</span>
            </div>
          );

          return (
            <React.Fragment key={member.id}>
              {memberUrl ? (
                <UrledPlace url={memberUrl}>{memberLabel}</UrledPlace>
              ) : (
                memberLabel
              )}
              <div
                className="e-cell-strip"
                style={{ width: totalWidth }}
                data-member-id={member.id}
                onDragOver={(e) => handleRowDragOver(member.id, e)}
                onDrop={(e) => handleRowDrop(member.id, e)}
                onDragLeave={(e) => handleRowDragLeave(member.id, e)}
              >
                {/* グリッド背景線（15分粒度） */}
                {Array.from({ length: totalBlocks }).map((_, b) => {
                  const isHour = ((dayStartMinute + b * 15) % 60) === 0;
                  let brushState: 'available' | 'unavailable' | null = null;
                  if (isPainting && brushValidBlocks?.has(b)) {
                    const minute = activeTimeSchedule.startMinute + b * 15;
                    brushState = member.isAvailableAt(activeTimeSchedule.dayType, minute)
                      ? 'available'
                      : 'unavailable';
                  }
                  return (
                    <StyledGridCell
                      key={b}
                      $left={b * blockPx}
                      $width={blockPx}
                      $isHour={isHour}
                      $brushState={brushState}
                    />
                  );
                })}

                {/* 連結バー（既配置） */}
                {runs.map((run, runIdx) => {
                  const stackLevel = runLevels[runIdx] ?? 0;
                  const color = getTaskColor(run.shift.taskId);
                  // この run が編集中なら preview を反映（重複バーは編集対象外）
                  const isBeingEdited =
                    stackLevel === 0 &&
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
                  const runUrl = stackLevel === 0 ? buildRunUrl?.(run.shift.id) : undefined;
                  const hasUnavailable = run.unavailableBlocks.length > 0;
                  const hasOutOfRange = run.outOfRangeBlocks.length > 0;
                  const titleParts = [run.shift.taskName];
                  if (hasOutOfRange) titleParts.push('（タスク時間外に配置）');
                  if (run.isOverlap) titleParts.push('（重複あり）');
                  if (hasUnavailable) titleParts.push('（参加不可時間に配置）');
                  const runBar = (
                    <StyledRunBar
                      key={`${run.shift.id}-${run.startBlock}-${stackLevel}`}
                      $left={left}
                      $width={width}
                      $bg={color.bg}
                      $border={color.border}
                      $text={color.text}
                      $isOutOfRange={hasOutOfRange}
                      $isOverlap={run.isOverlap}
                      $isGhost={!!isMovingToOtherRow}
                      $isUnavailable={hasUnavailable}
                      $stackLevel={stackLevel}
                      title={titleParts.join('')}
                      {...(stackLevel === 0 ? {
                        onDoubleClick: (e: React.MouseEvent) => handleRunDoubleClick(run, member.id, e as React.MouseEvent<HTMLElement>),
                        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => handleRunMouseEnter(run, member.id, e),
                        onMouseLeave: scheduleHoverLeave,
                        onPointerDown: (e: React.PointerEvent<HTMLElement>) => startEdit('move', run, member.id, e),
                        onPointerMove: handleEditMove,
                        onPointerUp: handleEditUp,
                        onPointerCancel: handleEditCancel,
                      } : {})}
                    >
                      {stackLevel === 0 && (
                        <StyledResizeHandle
                          $side="left"
                          onPointerDown={(e) => startEdit('resize-L', run, member.id, e)}
                          onPointerMove={handleEditMove}
                          onPointerUp={handleEditUp}
                          onPointerCancel={handleEditCancel}
                          onDoubleClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {/* 参加不可ブロック毎のオーバーレイ（15分粒度） */}
                      {stackLevel === 0 && run.unavailableBlocks.map((b) => (
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
                      {stackLevel === 0 && run.outOfRangeBlocks.map((b) => (
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
                      {stackLevel === 0 && hasOutOfRange && <span className="e-out-badge" aria-label="タスク時間外に配置">⧗</span>}
                      {stackLevel === 0 && hasUnavailable && <span className="e-unavailable-badge" aria-label="参加不可時間に配置">🚫</span>}
                      {run.isOverlap && <span className="e-overlap-badge">!</span>}
                      {stackLevel === 0 && (
                        <StyledResizeHandle
                          $side="right"
                          onPointerDown={(e) => startEdit('resize-R', run, member.id, e)}
                          onPointerMove={handleEditMove}
                          onPointerUp={handleEditUp}
                          onPointerCancel={handleEditCancel}
                          onDoubleClick={(e) => e.stopPropagation()}
                        />
                      )}
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
                    $stackLevel={0}
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
            </React.Fragment>
          );
        })}
    </StyledGantt>
  );
};

// ========== スタイル ==========

const StyledGantt = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  display: grid;
  grid-template-columns: ${MEMBER_COLUMN_WIDTH}px auto;
  grid-template-rows: 24px;
  grid-auto-rows: ${ROW_HEIGHT}px;
  height: 100%;
  overflow: auto;
  font-size: 0.82em;
  user-select: none;

  .e-empty {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #aaa;
    font-size: 1.1em;
  }

  /* col 1 / row 1: 両方向にstickyな角セル */
  .e-member-col-header {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 25;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border-right: 2px solid #ddd;
    border-bottom: 2px solid #ddd;
    padding: 4px;
    color: #555;
    font-size: 0.85em;
    background: #f8f8f8;
  }

  /* col 2 / row 1: 上方向にstickyなヘッダー */
  .e-time-axis {
    position: sticky;
    top: 0;
    z-index: 20;
    background: #f8f8f8;
    border-bottom: 2px solid #ddd;
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

  /* col 1 / row 2+: 左方向にstickyな局員ラベル */
  .e-member-label {
    position: sticky;
    left: 0;
    z-index: 10;
    background: #fff;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border-right: 2px solid #ddd;
    border-bottom: 1px solid #eee;

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

    &.is-clickable {
      cursor: pointer;
      &:hover {
        background: #f0f4ff;
      }
    }
  }

  /* col 2 / row 2+: セル描画エリア */
  .e-cell-strip {
    position: relative;
    border-bottom: 1px solid #eee;

    &:hover {
      background-color: #fafafa;
    }

  }
`;

type StyledGridCellProps = React.HTMLAttributes<HTMLDivElement> & {
  $left: number;
  $width: number;
  $isHour: boolean;
  $brushState: 'available' | 'unavailable' | null;
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
  ${(p) => p.$brushState === 'available' && `background: rgba(76, 175, 80, 0.18);`}
  ${(p) => p.$brushState === 'unavailable' && `background: rgba(244, 67, 54, 0.10);`}
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
  $stackLevel: number;
};

/** 既配置の連結バー（既配置の単位） */
const StyledRunBar = styled.div<StyledRunBarProps>`
  position: absolute;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$width}px;
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 3px;
  color: ${(p) => p.$text};
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-size: 0.78em;
  font-weight: 600;
  overflow: hidden;
  box-sizing: border-box;
  user-select: none;
  touch-action: none;

  /* stackLevel 0: 通常バー（フル高さ）。stackLevel 1+: 重複バー（底部に小さく表示） */
  ${(p) => p.$stackLevel === 0 ? `
    top: 2px;
    height: ${ROW_HEIGHT - 4}px;
    cursor: grab;
    z-index: 2;
  ` : `
    top: ${ROW_HEIGHT - 12}px;
    height: 10px;
    cursor: default;
    z-index: 3;
    pointer-events: none;
    opacity: 0.85;
    font-size: 0.72em;
    padding: 0 4px;
    border-radius: 2px;
  `}

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

/** ホバー時に body に描画されるアクションパネル（削除） */
const StyledRunActionPanel = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  transform: translateX(-50%);
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.16);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 5px;
  animation: pgFadeIn 0.13s ease;
  pointer-events: all;
  z-index: 9999;

  @keyframes pgFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .e-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    color: #555;
    padding: 0;

    &:hover {
      background: #f0f0f0;
      color: #333;
    }

    &.e-action-btn--delete {
      color: #c62828;
      &:hover {
        background: #ffebee;
      }
    }
  }
`;

/** ドラッグ配置不可の理由トースト（画面下部固定） */
const StyledDragWarning = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff8e1;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 0.86em;
  color: #5d4037;
  z-index: 9999;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  max-width: 520px;
  text-align: center;
  white-space: pre-wrap;

  &::before {
    content: '⚠ ';
  }
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
