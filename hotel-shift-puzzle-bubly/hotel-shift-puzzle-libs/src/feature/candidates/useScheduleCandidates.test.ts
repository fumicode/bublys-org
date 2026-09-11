import { StrictMode, createElement, type FC } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  MonthlyStaffSchedule,
  ScheduleConstraints,
  StaffMonthlyShiftWish,
  WorkShift,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { computeCandidatesFor } from "./candidateRequest.js";
import type {
  CandidateWorkerRequest,
  CandidateWorkerResponse,
} from "./candidateWorkerProtocol.js";
import { useScheduleCandidates } from "./useScheduleCandidates.js";

/**
 * 「バブルを開いた直後（何も編集していない状態）で候補集合が出るか」を守るテスト。
 *
 * React の StrictMode は effect を setup → cleanup → setup と 2 回流す。1 回目に作った
 * worker は cleanup で terminate されるので、1 回目に投げた依頼の応答は返ってこない。
 * 「同じ依頼を投げ続けない」ための歯止めが worker の作り直しを見ていないと、2 回目に
 * 再送されず computing のまま止まり、その後なにか編集するまで候補が出なくなる。
 */
describe("useScheduleCandidates", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const late = WorkShift.of("late", "遅番", { hour: 15 });
  const day1 = WorkingDay.of(2026, 6, 1);
  const workShifts = [early, late];
  const staffIds = ["L1", "L2", "X"];
  const wishByStaff = new Map<string, StaffMonthlyShiftWish>();

  const constraints = new ScheduleConstraints({
    scheduleId: "sched-1",
    leaderRules: [
      {
        key: "early",
        label: "早責",
        shiftName: "早番",
        leaderStaffIds: ["L1", "L2"],
        minCount: 1,
      },
    ],
  });

  // L1 が遅番で確定 → 早責を埋められるのは L2 だけ＝ L2×6/1 の候補は早番ひとつに絞られる
  const schedule = MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  }).setCell("L1", day1, { kind: "work", shiftId: "late" });

  /** 本物の worker と同じく「非同期に応答し、terminate されたら黙る」スタブ */
  class FakeWorker {
    onmessage: ((event: MessageEvent<CandidateWorkerResponse>) => void) | null = null;
    terminated = false;

    postMessage(message: CandidateWorkerRequest) {
      if (message.kind !== "candidates") return;
      Promise.resolve().then(() => {
        if (this.terminated) return;
        this.onmessage?.({
          data: {
            kind: "candidates",
            requestId: message.requestId,
            candidates: computeCandidatesFor(message.request),
          },
        } as MessageEvent<CandidateWorkerResponse>);
      });
    }

    terminate() {
      this.terminated = true;
    }
  }

  const createWorker = () => new FakeWorker() as unknown as Worker;

  const Probe: FC = () => {
    const { candidates, computing } = useScheduleCandidates({
      schedule,
      constraints,
      checkShiftWish: false,
      wishByStaff,
      workShifts,
      staffIds,
      createWorker,
    });
    const forced = computing ? undefined : candidates.candidatesOf("L2", day1);
    return createElement(
      "div",
      { "data-testid": "out" },
      forced ? forced.map((c) => (c.kind === "work" ? c.shiftId : c.kind)).join(",") : "-"
    );
  };

  it("StrictMode でマウントしても、編集を待たずに初回の候補集合が出る", async () => {
    render(createElement(StrictMode, null, createElement(Probe)));

    await waitFor(() =>
      expect(screen.getByTestId("out").textContent).toBe("early")
    );
  });
});
