/**
 * 旧データ（固定メンバーの無い世界線）の切り捨てを固定する。
 *
 * 世界線データは localStorage にも残るので、固定メンバーを導入した時点で
 * 「起点に名簿の載っていない Schedule スコープ」が既存の手元に存在する。
 * それを作り直すのがこのマイグレーション。
 */
import { setGraph, worldLineGraphSlice } from "@bublys-org/world-line-graph";
import { registerObjects } from "./framework.js";
import {
  APP_SCOPE_ID,
  commitToScope,
  ensureWorldBorn,
  refsOfTypeInScope,
} from "./commit.js";
import { migrateLegacyScopes } from "./migrateLegacyScopes.js";

class Note {
  constructor(readonly state: { id: string; text: string }) {}
}
class Person {
  constructor(readonly state: { id: string; name: string }) {}
}

const NOTE = "Note";
const PERSON = "Person";
const LOCAL = "Note:n1";

registerObjects({
  [NOTE]: {
    class: Note,
    getId: (o: Note) => o.state.id,
    membership: { kind: "live", homeScope: (id: string) => `Note:${id}` },
    scope: { pins: [PERSON] },
  },
  [PERSON]: {
    class: Person,
    getId: (o: Person) => o.state.id,
    membership: { kind: "pinned" },
  },
});

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
  };
}

/** 固定メンバーを導入する前の世界線（持ち主だけが載った起点）を再現する */
function bornWithoutPins(store: ReturnType<typeof fakeStore>) {
  commitToScope(store, LOCAL, NOTE, new Note({ id: "n1", text: "元" }));
}

describe("migrateLegacyScopes", () => {
  it("固定メンバーの無い世界線は作り直され、名簿が載る", () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, PERSON, new Person({ id: "p1", name: "田中" }));
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    bornWithoutPins(store);
    expect(refsOfTypeInScope(store, LOCAL, PERSON)).toHaveLength(0);

    expect(migrateLegacyScopes(store)).toEqual([LOCAL]);

    expect(refsOfTypeInScope(store, LOCAL, PERSON).map((r) => r.id)).toEqual(["p1"]);
  });

  it("すでに固定メンバーを持つ世界線は触らない（冪等）", () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, PERSON, new Person({ id: "p1", name: "田中" }));
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    ensureWorldBorn(store, LOCAL);
    const before = store.getState().worldLineGraph.graphs[LOCAL];

    expect(migrateLegacyScopes(store)).toEqual([]);
    expect(store.getState().worldLineGraph.graphs[LOCAL]).toEqual(before);
  });

  it("2回走らせても作り直しは1回だけ", () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, PERSON, new Person({ id: "p1", name: "田中" }));
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    bornWithoutPins(store);

    expect(migrateLegacyScopes(store)).toEqual([LOCAL]);
    expect(migrateLegacyScopes(store)).toEqual([]);
  });

  it("焼き付けるものがグローバルに無いときは作り直さない（毎回作り直す無限ループを防ぐ）", () => {
    const store = fakeStore();
    // 名簿が空の状態。作り直しても固定メンバーは載らないので、触ってはいけない
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    bornWithoutPins(store);

    expect(migrateLegacyScopes(store)).toEqual([]);
    expect(migrateLegacyScopes(store)).toEqual([]);
  });

  it("まだ生まれていない世界は触らない", () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, PERSON, new Person({ id: "p1", name: "田中" }));
    store.dispatch(
      setGraph({
        scopeId: LOCAL,
        graph: { nodes: {}, apexNodeId: null, rootNodeId: null },
      })
    );

    expect(migrateLegacyScopes(store)).toEqual([]);
  });
});
