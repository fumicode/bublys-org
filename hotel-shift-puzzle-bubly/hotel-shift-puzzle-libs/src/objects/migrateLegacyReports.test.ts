/**
 * 旧形式の完成レポート（ID が `勤務表ID:ノードID`）を、店舗×月で1つの確定版に畳む（#231）。
 */
import { worldLineGraphSlice } from "@bublys-org/world-line-graph";
import { ScheduleReport } from "@bublys-org/hotel-shift-puzzle-model";
import { registerObjects } from "./framework.js";
import { HOTEL_OBJECTS, SCHEDULE_REPORT_TYPE } from "./hotelObjects.js";
import { APP_SCOPE_ID, readFromScope, refsOfTypeInScope, saveObject } from "./commit.js";
import { migrateLegacyReports } from "./migrateLegacyReports.js";

registerObjects(HOTEL_OBJECTS);

type State = { worldLineGraph: ReturnType<typeof worldLineGraphSlice.getInitialState> };

function fakeStore() {
  let state: State = { worldLineGraph: worldLineGraphSlice.getInitialState() };
  return {
    getState: () => state,
    dispatch: (action: unknown) => {
      state = {
        worldLineGraph: worldLineGraphSlice.reducer(
          state.worldLineGraph,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          action as any
        ),
      };
    },
    /** メモリ上の CAS から値だけ落とす（参照はグラフに残る）。「読めない」を作る */
    evict: (hash: string) => {
      const cas = { ...state.worldLineGraph.cas };
      delete cas[hash];
      state = { worldLineGraph: { ...state.worldLineGraph, cas } };
    },
  };
}

/** #231 より前の形のレポート（ID が `勤務表ID:ノードID`） */
const legacy = (
  scheduleId: string,
  nodeId: string,
  params: { month?: number; storeId?: string; confirmedAt: number; title?: string }
) => {
  const fresh = ScheduleReport.create({
    scheduleId,
    worldLineNodeId: nodeId,
    year: 2026,
    month: params.month ?? 5,
    storeId: params.storeId ?? "st",
    compromises: [],
    busyDayContributions: [],
    contributionScores: [],
    confirmedAt: params.confirmedAt,
  });
  const plain = { ...fresh.toPlain(), id: `${scheduleId}:${nodeId}` };
  return ScheduleReport.fromPlain(params.title ? { ...plain, title: params.title } : plain);
};

const reportIds = (store: ReturnType<typeof fakeStore>) =>
  refsOfTypeInScope(store, APP_SCOPE_ID, SCHEDULE_REPORT_TYPE)
    .map((r) => r.id)
    .sort();

const read = (store: ReturnType<typeof fakeStore>, id: string) =>
  readFromScope<ScheduleReport>(store, APP_SCOPE_ID, SCHEDULE_REPORT_TYPE, id);

describe("migrateLegacyReports（旧形式の完成レポートを確定版に畳む）", () => {
  it("同じ店舗×月は、いちばん新しい確定を新しい ID で残し、残りは消す", () => {
    const store = fakeStore();
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("a", "n1", { confirmedAt: 100 }));
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("b", "n2", { confirmedAt: 300, title: "本番" }));
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("a", "n3", { confirmedAt: 200 }));
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("c", "n4", { confirmedAt: 50, month: 6 }));

    expect(migrateLegacyReports(store).sort()).toEqual(["st:2026-05", "st:2026-06"]);

    expect(reportIds(store)).toEqual(["st:2026-05", "st:2026-06"]);
    const may = read(store, "st:2026-05");
    expect(may?.version).toEqual({ scheduleId: "b", worldLineNodeId: "n2" });
    expect(may?.title).toBe("本番");
    expect(read(store, "st:2026-06")?.version).toEqual({ scheduleId: "c", worldLineNodeId: "n4" });
  });

  it("新しい形式の確定版のほうが新しければ、それを残す", () => {
    const store = fakeStore();
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("a", "n1", { confirmedAt: 100 }));
    const current = ScheduleReport.confirm({
      scheduleId: "b",
      worldLineNodeId: "n9",
      year: 2026,
      month: 5,
      storeId: "st",
      compromises: [],
      busyDayContributions: [],
      contributionScores: [],
      confirmedAt: 500,
    });
    saveObject(store, SCHEDULE_REPORT_TYPE, current);

    migrateLegacyReports(store);

    expect(reportIds(store)).toEqual(["st:2026-05"]);
    expect(read(store, "st:2026-05")?.version).toEqual(current.version);
  });

  it("冪等。畳んだあとは何もしない", () => {
    const store = fakeStore();
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("a", "n1", { confirmedAt: 100 }));
    migrateLegacyReports(store);

    expect(migrateLegacyReports(store)).toEqual([]);
    expect(reportIds(store)).toEqual(["st:2026-05"]);
  });

  it("★ 1つでも読めないレポートがあれば、何もしない（迷ったら触らない）", () => {
    const store = fakeStore();
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("a", "n1", { confirmedAt: 100 }));
    saveObject(store, SCHEDULE_REPORT_TYPE, legacy("b", "n2", { confirmedAt: 300 }));
    const ref = refsOfTypeInScope(store, APP_SCOPE_ID, SCHEDULE_REPORT_TYPE).find(
      (r) => r.id === "b:n2"
    );
    store.evict(ref?.hash ?? "");

    expect(migrateLegacyReports(store)).toEqual([]);
    expect(reportIds(store)).toEqual(["a:n1", "b:n2"]);
  });
});
