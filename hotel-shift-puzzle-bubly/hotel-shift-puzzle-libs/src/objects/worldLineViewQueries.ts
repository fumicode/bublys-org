/**
 * 世界線ビューの問いに、このバブリの規約で答える純粋なクエリ。
 *
 * world-line-graph は汎用ライブラリなので Staff も Membership も APP_SCOPE_ID も知らない。
 * 「この参照はどの世界に属すか（入れ子）」「その世界でどういう立場か（固定メンバーか）」は
 * このバブリの記述子（`objects/hotelObjects.tsx` の membership / scope.pins）だけから導き、
 * `resolveNestedScopeId` / `resolveCellRole` として注入する。
 *
 * ★ どれも読むだけ。ストアにも CAS にも触らない。だから module トップレベルの const に
 *   でき、3Dビューの useMemo の依存が毎レンダー変わってレイアウトを作り直す、
 *   という事故が起きない。
 * ★ 対になる2つの答えは同じ場所に置く。片方だけ app 層にあると、
 *   規約を直すときに片方を直し忘れる。
 */
import { membershipOf, homeScopeOf, pinnedTypesOf } from "./framework.js";
import { parseLocalScopeId } from "./commit.js";

/** 3Dビューの `CellRole`。ライブラリ側の型に合わせてあるが、依存はしない */
export type CellRole = "live" | "pinned" | "external";

/**
 * その参照が自分の世界線を持つなら、そのスコープID。
 *
 * 本籍（homeScope）がそのまま入れ子の答えになる。勤務表・可能勤務帯・制約・操作履歴は
 * どれも `Schedule:<id>` を本籍に持つので、同じ勤務表の世界線に解決される。
 * いま居る世界と同じなら入れ子ではない（自分の中に自分は居ない）。
 */
export function hotelNestedScope(
  ref: { type: string; id: string },
  currentScopeId: string
): string | null {
  const scopeId = homeScopeOf(ref.type, ref.id);
  if (!scopeId || scopeId === currentScopeId) return null;
  return scopeId;
}

/**
 * `scopeId` の世界から見た `type:id` の立場。
 *
 * - `live`   … この世界で変化する（勤務表そのもの・勤務帯セット・可能勤務帯 など）
 * - `pinned` … 世界が生まれた瞬間に参照を焼き付けたもの（スタッフ）。
 *              グローバル台帳で改名・削除しても**ここには届かない**
 * - `null`   … 立場を語れない。**「普通のメンバー」ではなく「分からない／該当しない」**
 *
 * `null` を返すのは主に2つ:
 *   1. 世界ではないスコープ（グローバル台帳 `hotel` や `root`）。
 *      台帳は誕生も固定メンバーも持たないので、そこに立場を書いたら嘘になる
 *   2. その世界の記述子が何も言っていない型
 *
 * 型だけでは決まらないことに注意。スタッフは `Schedule:<id>` では `pinned` だが、
 * グローバル台帳では立場を持たない。id にも依存する（勤務帯セットはグローバル固定IDの
 * ときだけ本籍を持たない）ので、判定には (type, id, scopeId) の3つが要る。
 */
export function hotelCellRole(
  ref: { type: string; id: string },
  scopeId: string
): CellRole | null {
  const owner = parseLocalScopeId(scopeId);
  // 世界ではない（グローバル台帳・バブル配置）。立場という概念が無い
  if (!owner) return null;

  // この世界を本籍に持つ＝ここで変化する
  if (homeScopeOf(ref.type, ref.id) === scopeId) return "live";

  // 焼き付けメンバー。宣言は両側に要る（メンバー側の membership と
  // オーナー側の scope.pins）。片方だけでは「どの世界へ焼くか」が言えない
  if (
    membershipOf(ref.type).kind === "pinned" &&
    pinnedTypesOf(owner.ownerType).includes(ref.type)
  ) {
    return "pinned";
  }

  return null;
}
