/**
 * 旧データの切り捨て
 *
 * 固定メンバー（Staff）を導入する前に作られた `Schedule:<id>` スコープは、起点に名簿が
 * 載っていない。`worldLineGraph` は localStorage にも永続化されている（persist の blacklist に
 * 入っているのは bubbles と environment だけ）ので、この形のデータは既存の手元にも
 * 保存済みファイルにも残っている。
 *
 * 遡及修復しようとすると、起点に参照を差し込むだけでは足りない。`WorldNode.stateHash` は
 * grow 時に焼かれ、打ち消しスナップが O(1) の比較に使っているので、全子孫ぶん再計算しないと
 * 世界線の挙動が壊れる。実験機能なので、そこまでせず**切り捨てる**方針にした。
 *
 * 捨てるのは**その勤務表の試行錯誤の履歴だけ**。勤務表・スタッフ・勤務帯・可能勤務帯・制約・
 * 希望・レポートはグローバル台帳（アプリ全体スコープ）にあるので消えない。
 * 空にしたあとその場で誕生し直すので、固定メンバー入りの起点がすぐできる。
 */
import {
  WorldLineGraph,
  setGraph,
  type WorldLineGraphJson,
} from "@bublys-org/world-line-graph";
import {
  APP_SCOPE_ID,
  TOMBSTONE_HASH,
  ensureWorldBorn,
  parseLocalScopeId,
  refsOfTypeInScope,
} from "./commit.js";
import { pinnedTypesOf } from "./framework.js";

type StoreLike = {
  getState: () => {
    worldLineGraph?: {
      graphs?: Record<string, WorldLineGraphJson>;
      cas?: Record<string, unknown>;
    };
  };
  dispatch: (action: unknown) => void;
};

const EMPTY_GRAPH: WorldLineGraphJson = WorldLineGraph.empty().toJSON();

/**
 * 誕生済みなのに固定メンバーを1つも持たないローカル世界線スコープを、空に戻して
 * 誕生し直す。**冪等**（作り直したスコープは固定メンバーを持つので2度目は対象外）。
 *
 * 判定は **CAS の値ではなくグラフの参照**で行う。値で見ると、まだ再水和されていない
 * だけのスコープを「固定メンバーが無い」と誤判定して履歴を捨ててしまう。
 *
 * 対象は「pinTypes を宣言した型が持ち主のスコープ」だけ。他バブリのスコープ（`memo:xxx` 等）は
 * この registry に無いので pinTypes が空になり、自然に対象外になる。
 *
 * @returns 作り直したスコープIDの一覧
 */
/**
 * グローバル台帳に、その型のオブジェクトが**最初に現れた時刻**。
 * 1つも無ければ Infinity（＝どの世界の誕生よりあとなので、旧形式とは判定されない）。
 */
function earliestPinnedAt(store: StoreLike, pinnedTypes: string[]): number {
  const types = new Set(pinnedTypes);
  const nodes = store.getState().worldLineGraph?.graphs?.[APP_SCOPE_ID]?.nodes ?? {};
  let earliest = Infinity;
  for (const node of Object.values(nodes)) {
    if (!node.changedRefs.some((r) => types.has(r.type) && r.hash !== TOMBSTONE_HASH)) {
      continue;
    }
    if (node.timestamp < earliest) earliest = node.timestamp;
  }
  return earliest;
}

export function migrateLegacyScopes(store: StoreLike): string[] {
  const graphs = store.getState().worldLineGraph?.graphs ?? {};
  const rebuilt: string[] = [];

  for (const scopeId of Object.keys(graphs)) {
    if (scopeId === APP_SCOPE_ID) continue;

    const graph = graphs[scopeId];
    if (!graph || graph.rootNodeId === null) continue; // まだ生まれていない＝対象外

    const owner = parseLocalScopeId(scopeId);
    if (!owner) continue;
    const pinnedTypes = pinnedTypesOf(owner.ownerType);
    if (pinnedTypes.length === 0) continue; // 固定メンバーを持たない型のスコープ

    const countIn = (target: string) =>
      pinnedTypes.reduce(
        (n, type) => n + refsOfTypeInScope(store, target, type).length,
        0
      );

    if (countIn(scopeId) > 0) continue; // 新しい形式。触らない
    // グローバルに焼き付けるものが1つも無いなら、作り直しても結果は同じ。
    // ここで抜けないと「作り直す → やはり固定メンバーが無い」を毎回繰り返してしまう。
    if (countIn(APP_SCOPE_ID) === 0) continue;

    // ★ 「固定メンバーが載っていない」だけでは旧形式の証拠にならない。
    //   名簿が空のときに作った世界も、正しく生まれたうえで0件になる。
    //   決め手は**生まれた時刻**: 焼き付けるべきものが世界の誕生より前から
    //   グローバルにあったなら、いまの仕組みなら必ず載っていたはず＝旧形式。
    //   誕生と同時か、あとから足された名簿なら、載っていなくて当たり前。
    //   取り違えると試行錯誤の履歴が黙って消えるので、迷ったら触らない側に倒す。
    const bornAt = graph.nodes[graph.rootNodeId]?.timestamp;
    if (bornAt === undefined) continue;
    // 同時刻（同じミリ秒）は旧形式側に倒す。いまの仕組みなら、誕生の時点で
    // 台帳にあったものは必ず焼き付いている＝0件で同時刻なら焼き損ねている
    if (!(earliestPinnedAt(store, pinnedTypes) <= bornAt)) continue;

    store.dispatch(setGraph({ scopeId, graph: EMPTY_GRAPH }));
    ensureWorldBorn(store, scopeId);
    rebuilt.push(scopeId);
  }

  if (rebuilt.length > 0) {
    console.info(
      `世界線: 固定メンバーの無い古い形式の世界線を作り直しました（${rebuilt.length}件）。` +
        `勤務表の内容は残りますが、その試行錯誤の履歴は失われます: ${rebuilt.join(", ")}`
    );
  }
  return rebuilt;
}
