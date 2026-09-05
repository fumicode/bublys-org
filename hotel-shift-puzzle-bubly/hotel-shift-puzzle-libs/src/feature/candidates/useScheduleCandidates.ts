'use client';

/**
 * useScheduleCandidates — 勤務表の候補集合を保持するフック
 *
 * 候補集合は勤務表から導出できる派生データなので、世界線にも Redux にも載せず、ここで持つ。
 *
 * 勤務表が変わったら、前回計算したときの勤務表との差分（diffScheduleCells）を取り、
 * 変わったセルの影響範囲だけを計算し直す。制約・勤務帯・対象スタッフが変わったときだけ
 * 全計算に戻す。
 *
 * 計算は重い（未定セル数 × 候補数 × 盤面全体の制約チェック）ので、worker を注入できる。
 * worker の作り方は bundler 依存なので app 層から createWorker で渡す。渡されなければ
 * 同じ計算を main thread で同期に行う（結果は同じ・体感が変わるだけ）。
 *
 * 詰みセルの診断（解消案の探索）も同じ worker で受ける。こちらは盤面を総当たりするので
 * 候補集合の計算よりさらに重く、編集のたびには走らせない。人が求めたときだけ
 * diagnoseDeadCell() で依頼する。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deadCellDiagnosisFromPlain,
  MonthlyStaffSchedule,
  ScheduleCandidates,
  ScheduleConstraints,
  StaffMonthlyShiftWish,
  WorkShift,
  diffScheduleCells,
  type DeadCellDiagnosis,
  type ScheduleCandidatesPlain,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  computeCandidatesFor,
  diagnoseDeadCellFor,
  type CandidateCellRefPlain,
  type CandidateRequest,
} from "./candidateRequest.js";
import type {
  CandidateWorkerRequest,
  CandidateWorkerResponse,
} from "./candidateWorkerProtocol.js";

export type UseScheduleCandidatesParams = {
  schedule?: MonthlyStaffSchedule;
  /** 勤務表ごとの制約集約（未作成なら希望チェックだけ） */
  constraints?: ScheduleConstraints;
  /** 希望との食い違いも制約として見るか */
  checkShiftWish: boolean;
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  workShifts: WorkShift[];
  staffIds: string[];
  /** 候補集合 worker を作る（app 層から注入）。省略時は main thread で同期計算する */
  createWorker?: () => Worker;
};

export type ScheduleCandidatesResult = {
  candidates: ScheduleCandidates;
  /** worker の応答待ちか */
  computing: boolean;
  /** 実際に走っている計算経路 */
  mode: "worker" | "sync";
  /**
   * 詰みセルの診断を依頼する（重いので押されたときだけ走る）。
   * 勤務表が変わると結果は破棄される（別の盤面についての診断になってしまうため）。
   */
  diagnoseDeadCell: (cell: CandidateCellRefPlain) => void;
  /** 直近の診断結果。まだ依頼していない・盤面が変わったなら null */
  diagnosis: DeadCellDiagnosis | null;
  /** 診断の応答待ちか */
  diagnosing: boolean;
};

export function useScheduleCandidates({
  schedule,
  constraints,
  checkShiftWish,
  wishByStaff,
  workShifts,
  staffIds,
  createWorker,
}: UseScheduleCandidatesParams): ScheduleCandidatesResult {
  const [candidates, setCandidates] = useState(() => ScheduleCandidates.empty(""));
  const [computing, setComputing] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DeadCellDiagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  /** 今の candidates を計算したときの勤務表（差分の基準） */
  const baselineRef = useRef<{
    schedule: MonthlyStaffSchedule;
    candidates: ScheduleCandidates;
  } | null>(null);
  const requestIdRef = useRef(0);
  const diagnoseIdRef = useRef(0);
  /** 直近に投げた依頼の素材。診断は同じ素材を使い回す */
  const lastRequestRef = useRef<CandidateRequest | null>(null);
  const requestScheduleRef = useRef(new Map<number, MonthlyStaffSchedule>());
  const workerRef = useRef<Worker | null>(null);

  // 応答の取り込み。連番が最新でないものは古い計算結果なので捨てる。
  const acceptRef = useRef<(response: CandidateWorkerResponse) => void>(() => undefined);
  acceptRef.current = (response: CandidateWorkerResponse) => {
    if (response.kind === "diagnose") {
      if (response.requestId !== diagnoseIdRef.current) return;
      setDiagnosis(deadCellDiagnosisFromPlain(response.diagnosis));
      setDiagnosing(false);
      return;
    }
    const { requestId, candidates: plain } = response;
    if (requestId !== requestIdRef.current) return;
    const requested = requestScheduleRef.current.get(requestId);
    requestScheduleRef.current.clear();
    const next = ScheduleCandidates.fromPlain(plain);
    if (requested) baselineRef.current = { schedule: requested, candidates: next };
    setCandidates(next);
    setComputing(false);
  };

  useEffect(() => {
    if (!createWorker) return;
    let worker: Worker;
    try {
      worker = createWorker();
    } catch (error) {
      // worker を作れない環境（bundler が対応していない等）でも動きは保つ。
      // 計算は main thread の同期経路に落ちる（mode で見分けられる）。
      console.warn("候補集合 worker を作れませんでした。同期計算に切り替えます。", error);
      return;
    }
    workerRef.current = worker;
    setWorkerReady(true);
    worker.onmessage = (event: MessageEvent<CandidateWorkerResponse>) =>
      acceptRef.current(event.data);
    return () => {
      worker.terminate();
      workerRef.current = null;
      setWorkerReady(false);
    };
  }, [createWorker]);

  // 制約・勤務帯・対象スタッフ・希望のいずれかが変わったら全計算に戻すための識別子。
  const contextVersion = useMemo(
    () => ({}),
    [constraints, workShifts, staffIds, checkShiftWish, wishByStaff]
  );
  const lastContextRef = useRef<object | null>(null);
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!schedule) {
      baselineRef.current = null;
      setCandidates(ScheduleCandidates.empty(""));
      return;
    }

    const contextChanged = lastContextRef.current !== contextVersion;
    lastContextRef.current = contextVersion;

    const baseline = baselineRef.current;
    const reusable =
      !contextChanged && baseline && baseline.schedule.id === schedule.id
        ? baseline
        : null;
    const changed = reusable
      ? diffScheduleCells(reusable.schedule, schedule)
      : undefined;

    const request: CandidateRequest = {
      schedule: schedule.toPlain(),
      staffIds,
      workShifts: workShifts.map((w) => w.state),
      constraints: constraints?.toPlain() ?? null,
      checkShiftWish,
      wishes: [...wishByStaff.values()].map((w) => w.toPlain()),
      previous: reusable?.candidates.toPlain(),
      changed: changed?.map((cell) => ({
        staffId: cell.staffId,
        dayKey: cell.day.key,
      })),
    };

    // 依存の識別子が（中身は同じなのに）変わっただけのときに計算し直さないための歯止め。
    // 同じ依頼を投げ続けて再レンダーのループになるのを防ぐ。
    const signature = JSON.stringify([
      request.schedule,
      request.staffIds,
      request.workShifts,
      request.constraints,
      request.checkShiftWish,
      request.wishes,
    ]);
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;

    const requestId = ++requestIdRef.current;
    requestScheduleRef.current.set(requestId, schedule);
    lastRequestRef.current = request;
    // 盤面が変わったので、前の盤面についての診断は捨てる
    setDiagnosis(null);
    setDiagnosing(false);

    const worker = workerRef.current;
    if (worker) {
      setComputing(true);
      const message: CandidateWorkerRequest = { kind: "candidates", requestId, request };
      worker.postMessage(message);
      return;
    }

    const plain: ScheduleCandidatesPlain = computeCandidatesFor(request);
    acceptRef.current({ kind: "candidates", requestId, candidates: plain });
  }, [
    schedule,
    contextVersion,
    staffIds,
    workShifts,
    constraints,
    checkShiftWish,
    wishByStaff,
  ]);

  const diagnoseDeadCell = useCallback((cell: CandidateCellRefPlain) => {
    const request = lastRequestRef.current;
    if (!request) return;
    const requestId = ++diagnoseIdRef.current;
    setDiagnosing(true);

    const worker = workerRef.current;
    if (worker) {
      const message: CandidateWorkerRequest = {
        kind: "diagnose",
        requestId,
        request,
        deadCell: cell,
      };
      worker.postMessage(message);
      return;
    }
    // worker が無い環境では main thread で走る（数秒固まる。結果は同じ）
    acceptRef.current({
      kind: "diagnose",
      requestId,
      diagnosis: diagnoseDeadCellFor(request, cell),
    });
  }, []);

  return {
    candidates,
    computing,
    mode: workerReady ? "worker" : "sync",
    diagnoseDeadCell,
    diagnosis,
    diagnosing,
  };
}
