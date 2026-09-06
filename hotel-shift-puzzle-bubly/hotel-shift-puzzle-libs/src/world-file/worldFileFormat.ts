/**
 * 勤務表ファイル（`.hsp.json`）のフォーマット定義と検証。
 *
 * ## なぜ JSON か
 * 保存したいものは世界線グラフ（DAG）と、その各ノードが参照する状態データ（CAS）。
 * どちらも既に plain な JSON として Redux / IndexedDB に載っている（`WorldLineGraphJson` と
 * `Record<hash, data>`）ので、独自バイナリを作る理由が無い。JSON にしておけば
 * エディタで開いて中身を読める・git で差分が見える・手で 1 セルだけ書き換えて
 * 読み直す、といった今のデバッグの仕方がそのまま活きる。
 *
 * ## 何を入れて何を入れないか
 * 入れる:
 *   - `hotel` スコープ（スタッフ・勤務表・希望・制約 … アプリ全体の世界線）
 *   - `Schedule:<id>` スコープ（勤務表ごとのローカル世界線＝試行錯誤の履歴・分岐）
 *   - 上記の全ノードが参照する CAS エントリ（＝履歴のすべての状態）
 * 入れない:
 *   - `root` スコープ（バブルの配置＝ウィンドウのレイアウト）。書類の中身ではなく
 *     見ている人の作業環境であり、他人のファイルを開いたときに自分の画面配置が
 *     吹き飛ぶのは望ましくない。
 *   - 同じ store に相乗りしている他バブリのスコープ（bublys-os では store が共有される）。
 *
 * ## 「今の盤面だけ」ではなく履歴ごと
 * apex のスナップショットだけなら小さく済むが、この題材で見たいのは「どう詰めていったか」
 * であり、世界線こそが資料的価値の本体なので、DAG と全 CAS を丸ごと保存する。
 */
import type { WorldLineGraphJson, StateRef, WorldNode } from "@bublys-org/world-line-graph";

/** ファイルの種類を見分けるためのタグ。他バブリのファイルを誤って開かないための印。 */
export const WORLD_FILE_FORMAT = "hotel-shift-puzzle/world" as const;

/** フォーマットのバージョン。互換性を壊す変更をしたら上げる。 */
export const WORLD_FILE_VERSION = 1 as const;

/** 保存ファイルの拡張子（`.json` で終えて、エディタが JSON と認識できるようにする） */
export const WORLD_FILE_EXTENSION = ".hsp.json";

export interface HotelWorldFile {
  /** ファイル種別のタグ */
  format: typeof WORLD_FILE_FORMAT;
  /** フォーマットのバージョン */
  formatVersion: number;
  /** 保存日時（ISO 8601） */
  savedAt: string;
  /** 人が書くメモ。「9月・詰みシナリオ」など、何を試したファイルかを残す用 */
  note?: string;
  /** スコープID → 世界線グラフ（DAG） */
  graphs: Record<string, WorldLineGraphJson>;
  /** ハッシュ → 状態データ（CAS）。graphs の全ノードが参照する分をすべて含む */
  cas: Record<string, unknown>;
}

/** 検証で落ちたときの例外。message はそのまま画面に出す前提で日本語にする。 */
export class WorldFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorldFileError";
  }
}

/** 検証は通ったが、伝えておきたいこと（欠けている CAS など） */
export interface WorldFileWarning {
  scopeId?: string;
  message: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStateRef(value: unknown): value is StateRef {
  return (
    isPlainObject(value) &&
    typeof value.type === "string" &&
    typeof value.id === "string" &&
    typeof value.hash === "string"
  );
}

function isWorldNode(value: unknown): value is WorldNode {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    (value.parentId === null || typeof value.parentId === "string") &&
    typeof value.timestamp === "number" &&
    Array.isArray(value.changedRefs) &&
    value.changedRefs.every(isStateRef) &&
    typeof value.worldLineId === "string"
  );
}

/**
 * グラフ 1 つの構造を検証する。
 *
 * ここを緩くすると、壊れたファイルがレンダリング中に例外を投げてアプリごと落ちる。
 * `WorldLineGraph.getPathToNode` は親を辿れないと throw し、それは
 * `useCasScope` が毎レンダー呼ぶ `getCurrentStateRefs()` の中なので、
 * 「読めたけど画面が真っ白」ではなく「読んだ瞬間クラッシュ」になる。
 * 読み込む前にここで弾く。
 */
function validateGraph(scopeId: string, graph: unknown): WorldLineGraphJson {
  const where = `スコープ "${scopeId}"`;
  if (!isPlainObject(graph)) {
    throw new WorldFileError(`${where}: グラフがオブジェクトではありません`);
  }
  const { nodes, apexNodeId, rootNodeId } = graph;
  if (!isPlainObject(nodes)) {
    throw new WorldFileError(`${where}: nodes がオブジェクトではありません`);
  }
  if (apexNodeId !== null && typeof apexNodeId !== "string") {
    throw new WorldFileError(`${where}: apexNodeId が不正です`);
  }
  if (rootNodeId !== null && typeof rootNodeId !== "string") {
    throw new WorldFileError(`${where}: rootNodeId が不正です`);
  }

  const nodeIds = Object.keys(nodes);
  for (const [key, node] of Object.entries(nodes)) {
    if (!isWorldNode(node)) {
      throw new WorldFileError(`${where}: ノード "${key}" の形が不正です`);
    }
    if (node.id !== key) {
      throw new WorldFileError(
        `${where}: ノード "${key}" の id が キーと一致しません（${node.id}）`
      );
    }
  }

  if (nodeIds.length === 0) {
    if (rootNodeId !== null || apexNodeId !== null) {
      throw new WorldFileError(`${where}: ノードが空なのに root/apex が指定されています`);
    }
    return { nodes: {}, apexNodeId: null, rootNodeId: null };
  }

  if (typeof rootNodeId !== "string" || !(rootNodeId in nodes)) {
    throw new WorldFileError(`${where}: rootNodeId が nodes に存在しません`);
  }
  if (typeof apexNodeId !== "string" || !(apexNodeId in nodes)) {
    throw new WorldFileError(`${where}: apexNodeId が nodes に存在しません`);
  }

  // 親がすべて解決でき、循環していないこと。root は 1 つだけ。
  const roots: string[] = [];
  for (const id of nodeIds) {
    const node = nodes[id] as WorldNode;
    if (node.parentId === null) {
      roots.push(id);
      continue;
    }
    if (!(node.parentId in nodes)) {
      throw new WorldFileError(
        `${where}: ノード "${id}" の親 "${node.parentId}" が見つかりません`
      );
    }
  }
  if (roots.length !== 1) {
    throw new WorldFileError(
      `${where}: 親を持たないノードが ${roots.length} 個あります（1 個でなければなりません）`
    );
  }
  if (roots[0] !== rootNodeId) {
    throw new WorldFileError(`${where}: rootNodeId が親を持たないノードと一致しません`);
  }

  // 循環検出（親を辿ると必ず root に着く）。深さは全ノード数で頭打ちにする。
  for (const id of nodeIds) {
    let cursor: string | null = id;
    let steps = 0;
    while (cursor !== null) {
      if (steps++ > nodeIds.length) {
        throw new WorldFileError(`${where}: ノード "${id}" の親を辿ると循環しています`);
      }
      cursor = (nodes[cursor] as WorldNode).parentId;
    }
  }

  return graph as unknown as WorldLineGraphJson;
}

/**
 * パース済み JSON がこのバブリのファイルとして読めるかを検証する。
 *
 * 返すのは「そのまま読み込んでよい」と判断できたファイルと、伝えるべき警告。
 * 致命的なもの（構造が壊れている・別バブリのファイル）は throw する。
 */
export function validateWorldFile(json: unknown): {
  file: HotelWorldFile;
  warnings: WorldFileWarning[];
} {
  if (!isPlainObject(json)) {
    throw new WorldFileError("ファイルの中身が JSON オブジェクトではありません");
  }
  if (json.format !== WORLD_FILE_FORMAT) {
    throw new WorldFileError(
      `このバブリのファイルではありません（format: ${JSON.stringify(json.format)}）`
    );
  }
  if (typeof json.formatVersion !== "number") {
    throw new WorldFileError("formatVersion がありません");
  }
  if (json.formatVersion > WORLD_FILE_VERSION) {
    throw new WorldFileError(
      `新しい形式のファイルです（v${json.formatVersion}）。このアプリは v${WORLD_FILE_VERSION} まで読めます`
    );
  }
  if (!isPlainObject(json.graphs)) {
    throw new WorldFileError("graphs がありません");
  }
  if (!isPlainObject(json.cas)) {
    throw new WorldFileError("cas がありません");
  }

  const warnings: WorldFileWarning[] = [];
  const graphs: Record<string, WorldLineGraphJson> = {};
  for (const [scopeId, graph] of Object.entries(json.graphs)) {
    graphs[scopeId] = validateGraph(scopeId, graph);
  }

  // 参照されているのに CAS に無いハッシュを警告する。読み込み自体は続行できる
  // （その型・IDのオブジェクトがその世界に居ないものとして描画されるだけ）が、
  // 黙って欠けるより気づけたほうがよい。
  const cas = json.cas as Record<string, unknown>;
  for (const [scopeId, graph] of Object.entries(graphs)) {
    const missing = new Set<string>();
    for (const node of Object.values(graph.nodes)) {
      for (const ref of node.changedRefs) {
        if (!(ref.hash in cas)) missing.add(ref.hash);
      }
    }
    if (missing.size > 0) {
      warnings.push({
        scopeId,
        message: `状態データが ${missing.size} 件欠けています（履歴の一部が復元できません）`,
      });
    }
  }

  return {
    file: {
      format: WORLD_FILE_FORMAT,
      formatVersion: json.formatVersion,
      savedAt: typeof json.savedAt === "string" ? json.savedAt : "",
      note: typeof json.note === "string" ? json.note : undefined,
      graphs,
      cas,
    },
    warnings,
  };
}

/** ファイル名の既定値。日付を入れて連番デバッグに耐えるようにする。 */
export function suggestedFileName(note?: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = (note ?? "").trim().replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 40);
  return slug ? `${slug}-${stamp}${WORLD_FILE_EXTENSION}` : `shift-${stamp}${WORLD_FILE_EXTENSION}`;
}
