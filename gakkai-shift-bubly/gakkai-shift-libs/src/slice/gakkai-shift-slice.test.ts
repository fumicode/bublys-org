/**
 * **スタッフの置き場** ── スライスは集約の出し入れに徹する（CLAUDE.md の決め事）。
 *
 * だから押さえるのも出し入れだけ:
 *   置く／足す／**居るものだけ差し替える**／消す／いま選んでいる人を覚える
 *
 * ★ 差し替えは**居ないものを作らない**。「無ければ足す」にすると、消したはずの人が
 *   あとから来た更新で生き返る。
 */
import { gakkaiShiftSlice, setStaffList, addStaff, updateStaff, deleteStaff, setSelectedStaffId } from "./gakkai-shift-slice.js";

const reducer = gakkaiShiftSlice.reducer;
const 人 = (id: string, name: string) => ({ id, name }) as never;
const 初め = () => reducer(undefined, { type: "@@init" });

describe("gakkaiShift（スタッフの置き場）", () => {
  test("はじめは空で、誰も選んでいない", () => {
    expect(初め().staffList).toEqual([]);
    expect(初め().selectedStaffId).toBeNull();
  });

  test("まとめて置くと、そのまま入れ替わる", () => {
    const s = reducer(初め(), setStaffList([人("s1", "太郎"), 人("s2", "花子")]));
    expect(s.staffList.map((x) => x.id)).toEqual(["s1", "s2"]);
  });

  test("足すと末尾に付く", () => {
    let s = reducer(初め(), addStaff(人("s1", "太郎")));
    s = reducer(s, addStaff(人("s2", "花子")));
    expect(s.staffList.map((x) => x.id)).toEqual(["s1", "s2"]);
  });

  test("差し替えは、同じ id の所だけ", () => {
    let s = reducer(初め(), setStaffList([人("s1", "太郎"), 人("s2", "花子")]));
    s = reducer(s, updateStaff(人("s2", "花子（改）")));
    expect(s.staffList.map((x) => x.name)).toEqual(["太郎", "花子（改）"]);
  });

  test("居ない人を差し替えても、増えない", () => {
    let s = reducer(初め(), setStaffList([人("s1", "太郎")]));
    s = reducer(s, updateStaff(人("居ない", "誰か")));
    expect(s.staffList.map((x) => x.id)).toEqual(["s1"]);
  });

  test("消すと、その人だけ抜ける", () => {
    let s = reducer(初め(), setStaffList([人("s1", "太郎"), 人("s2", "花子")]));
    s = reducer(s, deleteStaff("s1"));
    expect(s.staffList.map((x) => x.id)).toEqual(["s2"]);
  });

  test("選んでいる人を覚える（外すときは null）", () => {
    let s = reducer(初め(), setSelectedStaffId("s1"));
    expect(s.selectedStaffId).toBe("s1");
    s = reducer(s, setSelectedStaffId(null));
    expect(s.selectedStaffId).toBeNull();
  });
});
