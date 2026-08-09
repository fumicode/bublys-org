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
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MonthlyStaffSchedule,
  ScheduleCandidates,
  ScheduleConstraints,
  StaffMonthlyShiftWish,
  WorkShift,
  diffScheduleCells,
  type ScheduleCandidatesPlain,
} from "@bublys-org/hotel-shift-puzzle-model";
import { computeCandidatesFor, type CandidateRequest } from "./candidateRequest.js";
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

  /** 今の candidates を計算したときの勤務表（差分の基準） */
  const baselineRef = useRef<{
    schedule: MonthlyStaffSchedule;
    candidates: ScheduleCandidates;
  } | null>(null);
  const requestIdRef = useRef(0);
  const requestScheduleRef = useRef(new Map<number, MonthlyStaffSchedule>());
  const workerRef = useRef<Worker | null>(null);

  // 応答の取り込み。連番が最新でないものは古い計算結果なので捨てる。
  const acceptRef = useRef<(response: CandidateWorkerResponse) => void>(() => undefined);
  acceptRef.current = ({ requestId, candidates: plain }: CandidateWorkerResponse) => {
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

    const worker = workerRef.current;
    if (worker) {
      setComputing(true);
      const message: CandidateWorkerRequest = { requestId, request };
      worker.postMessage(message);
      return;
    }

    const plain: ScheduleCandidatesPlain = computeCandidatesFor(request);
    acceptRef.current({ requestId, candidates: plain });
  }, [
    schedule,
    contextVersion,
    staffIds,
    workShifts,
    constraints,
    checkShiftWish,
    wishByStaff,
  ]);

  return {
    candidates,
    computing,
    mode: workerReady ? "worker" : "sync",
  };
}
