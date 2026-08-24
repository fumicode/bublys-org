/**
 * 世界線への書き込みが、メモリ上の CAS の状態に左右されないことを固定する。
 *
 * #110: ローカル世界線の起点（baseline）を「APP の値を読めるか」で判断していたため、
 * その値が CAS から追い出されていると「APP にも無い」と誤判定し、起点の記録を黙って
 * 飛ばしていた。結果、起点ノードにその型が載らず、そこへ時間移動しても状態が戻らない。
 */
import {
  WorldLineGraph,
  setGraph,
  worldLineGraphSlice,
} from "@bublys-org/world-line-graph";
import { registerObjects } from "./framework.js";
import {
  APP_SCOPE_ID,
  commitToScope,
  refInScope,
  saveLocalBundle,
  readFromScope,
} from "./commit.js";

class Note {
  constructor(readonly state: { id: string; text: string }) {}
}
class Log {
  constructor(readonly state: { id: string; lines: string[] }) {}
}

const NOTE = "Note";
const LOG = "Log";
const LOCAL = "Note:n1";

registerObjects({
  [NOTE]: {
    class: Note,
    getId: (o: Note) => o.state.id,
    localScope: (o: Note) => `Note:${o.state.id}`,
  },
  [LOG]: {
    class: Log,
    getId: (o: Log) => o.state.id,
    localScope: (o: Log) => `Note:${o.state.id}`,
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
    /** メモリ上の CAS からデータだけ消す（evict / 未水和の再現。参照はグラフに残る） */
    evict: (type: string, id: string) => {
      const ref = refInScope(
        { getState: () => state, dispatch: () => undefined },
        APP_SCOPE_ID,
        type,
        id
      );
      if (!ref) return;
      // Redux Toolkit が state を凍結するので、消したものを作り直して差し替える
      const rest = { ...state.worldLineGraph.cas };
      delete rest[ref.hash];
      state = {
        worldLineGraph: { ...state.worldLineGraph, cas: rest },
      };
    },
  };
}

const rootRefsOf = (store: ReturnType<typeof fakeStore>, scopeId: string) => {
  const graph = store.getState().worldLineGraph.graphs[scopeId];
  const rootId = graph.rootNodeId as string;
  return graph.nodes[rootId].changedRefs.map((r) => r.type).sort();
};

describe("saveLocalBundle — ローカル世界線の起点", () => {
  it("APP の値が CAS から追い出されていても、起点に記録される", () => {
    const store = fakeStore();
    // APP に既存の状態がある（seed 相当）
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    commitToScope(store, APP_SCOPE_ID, LOG, new Log({ id: "n1", lines: [] }));

    // Note の実データだけ CAS から消える（参照は APP のグラフに残る）
    store.evict(NOTE, "n1");
    expect(readFromScope(store, APP_SCOPE_ID, NOTE, "n1")).toBeUndefined();

    // 最初の編集：ローカル世界線が作られる
    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "編集後" }) },
      { type: LOG, obj: new Log({ id: "n1", lines: ["編集した"] }) },
    ]);

    // 起点に Note が載っていないと、そこへ時間移動しても Note が戻らない
    expect(refInScope(store, LOCAL, NOTE, "n1")).toBeDefined();
    expect(rootRefsOf(store, LOCAL)).toEqual([LOG, NOTE]);
  });

  it("起点は1ノードにまとめて記録される（型ごとに分かれない）", () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    commitToScope(store, APP_SCOPE_ID, LOG, new Log({ id: "n1", lines: [] }));

    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "編集後" }) },
      { type: LOG, obj: new Log({ id: "n1", lines: ["編集した"] }) },
    ]);

    // 1件ずつ記録すると root には片方しか載らず、そこへ戻ったとき残りが戻らない
    expect(rootRefsOf(store, LOCAL)).toEqual([LOG, NOTE]);
  });

  it("起点と次のノードは、最初の編集ぶんだけ違う（同じ状態を2つ作らない）", () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));

    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "編集後" }) },
      { type: LOG, obj: new Log({ id: "n1", lines: ["編集した"] }) },
    ]);

    const graph = store.getState().worldLineGraph.graphs[LOCAL];
    const rootId = graph.rootNodeId as string;
    const secondId = Object.values(graph.nodes).find((n) => n.parentId === rootId)?.id;
    expect(secondId).toBeDefined();

    const noteHashAt = (nodeId: string) =>
      WorldLineGraph.fromJSON(graph)
        .getStateRefsAt(nodeId)
        .find((r) => r.type === NOTE)?.hash;

    // 起点＝編集前、次＝編集後。同じ内容のノードが2つ並ぶことはない
    expect(noteHashAt(rootId)).toBeDefined();
    expect(noteHashAt(secondId as string)).toBeDefined();
    expect(noteHashAt(rootId)).not.toBe(noteHashAt(secondId as string));
  });

  it("編集で値が変わらない型は、起点と次のノードで同じ参照のまま", () => {
    // 制約だけを変えたときなど、勤務表そのものは動かない操作がある。
    // このとき2つのノードは「勤務表としては同じ」に見えるが、それは正しい姿。
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));

    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "元" }) }, // 変えていない
      { type: LOG, obj: new Log({ id: "n1", lines: ["別のものを変えた"] }) },
    ]);

    const graph = store.getState().worldLineGraph.graphs[LOCAL];
    const rootId = graph.rootNodeId as string;
    const secondId = Object.values(graph.nodes).find((n) => n.parentId === rootId)?.id;
    const noteHashAt = (nodeId: string) =>
      WorldLineGraph.fromJSON(graph)
        .getStateRefsAt(nodeId)
        .find((r) => r.type === NOTE)?.hash;

    expect(noteHashAt(rootId)).toBe(noteHashAt(secondId as string));
  });

  it("記録するものに含まれない型でも、起点として渡せば載る", () => {
    // このスコープの持ち主（Note）を含まない記録が最初に来ることがある
    // （制約変更だけを記録する等）。それでも持ち主は起点に載っていないといけない。
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));

    saveLocalBundle(
      store,
      LOCAL,
      [{ type: LOG, obj: new Log({ id: "n1", lines: ["別のものを変えた"] }) }],
      [{ type: NOTE, obj: new Note({ id: "n1", text: "元" }) }]
    );

    expect(rootRefsOf(store, LOCAL)).toContain(NOTE);
    expect(refInScope(store, LOCAL, NOTE, "n1")).toBeDefined();
  });

  it("起点は APP から読めなくても、渡された値から作られる", () => {
    // APP の実データが手元に無くても（evict）、呼び出し側が編集前の値を持っていれば
    // 起点は確実に作れる。ストアから引き直さないのが要点。
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    store.evict(NOTE, "n1");

    saveLocalBundle(
      store,
      LOCAL,
      [{ type: NOTE, obj: new Note({ id: "n1", text: "編集後" }) }],
      [{ type: NOTE, obj: new Note({ id: "n1", text: "元" }) }]
    );

    const graph = store.getState().worldLineGraph.graphs[LOCAL];
    const rootId = graph.rootNodeId as string;
    const rootHash = WorldLineGraph.fromJSON(graph)
      .getStateRefsAt(rootId)
      .find((r) => r.type === NOTE)?.hash as string;
    // 起点には「編集前」の値が入っていて、実データも手元にある
    expect(store.getState().worldLineGraph.cas[rootHash]).toEqual({
      id: "n1",
      text: "元",
    });
  });

  it("APP に無いものは起点に記録しない（新規作成）", () => {
    const store = fakeStore();
    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "新規" }) },
    ]);

    // 起点＝最初の状態そのもの。戻る先が無いので余計なノードは作らない
    expect(rootRefsOf(store, LOCAL)).toEqual([NOTE]);
    expect(Object.keys(store.getState().worldLineGraph.graphs[LOCAL].nodes)).toHaveLength(1);
  });
});

describe("過去のノードから編集したとき（分岐）", () => {
  /** 起点＋最初の編集まで進めた世界線を作り、その2ノードのIDを返す */
  const withHistory = () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));
    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "1回目" }) },
      { type: LOG, obj: new Log({ id: "n1", lines: ["1回目"] }) },
    ]);
    const graph = store.getState().worldLineGraph.graphs[LOCAL];
    const rootId = graph.rootNodeId as string;
    const secondId = Object.values(graph.nodes).find((n) => n.parentId === rootId)
      ?.id as string;
    return { store, rootId, secondId };
  };

  /** 世界線のカーソルをそのノードへ移す（restore 相当） */
  const moveTo = (store: ReturnType<typeof fakeStore>, nodeId: string) => {
    const graph = WorldLineGraph.fromJSON(
      store.getState().worldLineGraph.graphs[LOCAL]
    );
    store.dispatch(setGraph({ scopeId: LOCAL, graph: graph.moveTo(nodeId).toJSON() }));
  };

  it("起点に戻って編集すると、起点の子として1つだけ枝が生える", () => {
    const { store, rootId, secondId } = withHistory();
    const before = Object.keys(store.getState().worldLineGraph.graphs[LOCAL].nodes);

    moveTo(store, rootId);
    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "別の道" }) },
      { type: LOG, obj: new Log({ id: "n1", lines: ["別の道"] }) },
    ]);

    const graph = store.getState().worldLineGraph.graphs[LOCAL];
    const added = Object.keys(graph.nodes).filter((id) => !before.includes(id));

    // 起点の子が1つだけ増える。EditLog の起点ノードが差し込まれて2つ増えてはいけない
    expect(added).toHaveLength(1);
    expect(graph.nodes[added[0]].parentId).toBe(rootId);
    // 最初の編集の続きになっていない（＝ちゃんと分岐している）
    expect(graph.nodes[added[0]].parentId).not.toBe(secondId);
    // 分岐したので別の世界線IDになる
    expect(graph.nodes[added[0]].worldLineId).not.toBe(graph.nodes[secondId].worldLineId);
  });

  it("先端で編集したときは、そのまま1つ伸びる", () => {
    const { store, secondId } = withHistory();
    const before = Object.keys(store.getState().worldLineGraph.graphs[LOCAL].nodes);

    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "2回目" }) },
      { type: LOG, obj: new Log({ id: "n1", lines: ["1回目", "2回目"] }) },
    ]);

    const graph = store.getState().worldLineGraph.graphs[LOCAL];
    const added = Object.keys(graph.nodes).filter((id) => !before.includes(id));
    expect(added).toHaveLength(1);
    expect(graph.nodes[added[0]].parentId).toBe(secondId);
  });
});

describe("起点ノードの見え方", () => {
  it("起点には「編集前」という名前が付く（操作に対応しないノードだと分かるように）", () => {
    const store = fakeStore();
    commitToScope(store, APP_SCOPE_ID, NOTE, new Note({ id: "n1", text: "元" }));

    saveLocalBundle(
      store,
      LOCAL,
      [{ type: NOTE, obj: new Note({ id: "n1", text: "編集後" }) }],
      [{ type: NOTE, obj: new Note({ id: "n1", text: "元" }) }]
    );

    const graph = store.getState().worldLineGraph.graphs[LOCAL];
    const rootId = graph.rootNodeId as string;
    expect(graph.nodes[rootId].label).toBe("編集前");
    // 2回目以降の編集では起点は増えないし、名前も付け直さない
    const before = Object.keys(graph.nodes).length;
    saveLocalBundle(store, LOCAL, [
      { type: NOTE, obj: new Note({ id: "n1", text: "3回目" }) },
    ]);
    const after = store.getState().worldLineGraph.graphs[LOCAL];
    expect(Object.keys(after.nodes)).toHaveLength(before + 1);
  });
});
