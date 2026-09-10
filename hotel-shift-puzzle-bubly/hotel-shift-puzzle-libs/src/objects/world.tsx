'use client';

/**
 * 「いま居る世界」（World）
 *
 * このバブリのルール:
 *
 *   オブジェクトは「いま居る世界」から読む。
 *   どこから読むかは呼び出し側ではなく、**型が宣言する所属だけ**が決める。
 *
 * 読み先を決める権限を2つに分けているのが要点:
 *   - どの世界にいるか … バブルの境界で1回だけ決まる（この Context）
 *   - その型はその世界に属するか … 記述子の membership が1回だけ宣言する
 * この2つの積で読み先が決まるので、useObjects の呼び出し側は型しか書かなくてよい。
 *
 * 以前は読みが APP スコープ決め打ちだった。そのせいで勤務表の中身は勤務表の世界に
 * 属しているのに、行の一覧だけグローバルから引いていて、名簿を消すと勤務表が壊れていた。
 * また「読む場所」と「時間移動する場所」が違うので、時間移動のたびに状態を APP へ
 * 転記する橋渡し（restore）が必要だった。
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type FC,
  type ReactNode,
} from "react";
import { useCasScope, type CasScopeValue } from "@bublys-org/world-line-graph";
import { useAppStore } from "@bublys-org/state-management";
import { APP_SCOPE_ID } from "./commit.js";
import { membershipOf } from "./framework.js";
import { migrateLegacyScopes } from "./migrateLegacyScopes.js";

export type WorldValue = {
  /** いま居る世界のスコープID */
  scopeId: string;
  /** いま居る世界 */
  here: CasScopeValue;
  /** グローバル台帳（アプリ全体スコープ）。非メンバーはここから読む */
  app: CasScopeValue;
  /** here が誕生しているか（ノードが1つでもあるか） */
  born: boolean;
};

const WorldContext = createContext<WorldValue | null>(null);

export function useWorld(): WorldValue {
  const world = useContext(WorldContext);
  if (!world) {
    throw new Error(
      "useWorld: World の外で呼ばれました（HotelObjectsProvider の中で使ってください）"
    );
  }
  return world;
}

/**
 * 読み先の**スコープID**を決める唯一の分岐。ここ以外に分岐を作らないこと。
 *
 *   1. 非メンバー（external）は常にグローバル。
 *      実際の予約や確定レポートは、世界の中から読んでも時間移動で変わってはいけない。
 *   2. まだ誕生していない世界は「存在しない」。グローバルが現在の世界。
 *      これは**スコープ単位**の判定なので、過去に戻ったときに最新値が現れる心配はない
 *      （誕生していない世界には時間移動もできない）。
 *   3. live のうち、その id が本籍を持たないものはグローバル。
 *      勤務帯セットのようにグローバル固定IDのときだけ本籍が無い型があるので、
 *      **id を渡せるなら渡す**。渡さないと `WorkShiftSet:global` を世界の中から
 *      読んだときに「その世界には居ない」＝ undefined になる。
 *   4. 残り（この世界のメンバー）はいま居る世界から。**参照が無ければ「無い」**。
 *      ここで「無ければグローバルを見る」という親切をしてはいけない。起点より前の
 *      ノードへ戻ったときに、そこにグローバルの最新値が現れてしまう。
 *
 * 書き（`homeScopeOf`）と同じ (type, id) で解く。読みと書きで解決式が違うと、
 * 読めないものを保存できる／保存したものを読めない、というねじれが生まれる。
 */
export function readScopeIdOf(
  world: WorldValue,
  type: string,
  id?: string
): string {
  const membership = membershipOf(type);
  if (membership.kind === "external") return APP_SCOPE_ID;
  if (!world.born) return APP_SCOPE_ID;
  if (
    membership.kind === "live" &&
    id !== undefined &&
    membership.homeScope(id) === undefined
  ) {
    return APP_SCOPE_ID;
  }
  return world.scopeId;
}

/** 読み先のスコープ。分岐は {@link readScopeIdOf} の1箇所だけ */
export function readScopeOf(
  world: WorldValue,
  type: string,
  id?: string
): CasScopeValue {
  return readScopeIdOf(world, type, id) === APP_SCOPE_ID ? world.app : world.here;
}

/**
 * 古い形式の作り直しを済ませたストア。**アプリ起動につき1回**に絞るための印。
 * WeakSet なのでストアが捨てられれば一緒に消える（テストごとに別ストアでも正しく走る）。
 */
const migratedStores = new WeakSet<object>();

/** グローバル台帳を「いま居る世界」とする根の World。バブルの一番外側に置く。 */
export const AppWorld: FC<{ children: ReactNode }> = ({ children }) => {
  const store = useAppStore();
  const app = useCasScope(APP_SCOPE_ID);

  // 固定メンバーを持たない古い形式の世界線を作り直す。
  //
  // ★ バブルルートは全部トップレベルなので、AppWorld は**バブルを1つ開くたび**に
  //   マウントする。走らせるのはアプリ起動につき1回だけにする。冪等ではあるが、
  //   これは世界線を書き換える（＝不可逆な）操作なので、読みの経路から何度も
  //   起こしてよいものではない。全スコープの再パースも毎回は要らない。
  //   ファイル読み込みの直後は useWorldFile が明示的に呼ぶ。
  useEffect(() => {
    if (migratedStores.has(store)) return;
    migratedStores.add(store);
    migrateLegacyScopes(store);
  }, [store]);
  const value = useMemo<WorldValue>(
    () => ({
      scopeId: APP_SCOPE_ID,
      here: app,
      app,
      born: app.graph.state.rootNodeId !== null,
    }),
    [app]
  );
  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
};

/**
 * ある世界線スコープの中に入る。
 *
 * グローバル台帳（app）は親から借りて、自分は here のぶんだけ購読する
 * （同じスコープを二重に購読しない）。scopeId が undefined のときは親の世界のまま。
 */
export const World: FC<{ scopeId: string | undefined; children: ReactNode }> = ({
  scopeId,
  children,
}) => {
  const parent = useWorld();
  const here = useCasScope(scopeId ?? parent.scopeId);
  const value = useMemo<WorldValue>(
    () => ({
      scopeId: scopeId ?? parent.scopeId,
      here,
      app: parent.app,
      born: here.graph.state.rootNodeId !== null,
    }),
    [scopeId, parent.scopeId, parent.app, here]
  );
  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
};
