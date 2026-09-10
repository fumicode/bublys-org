/**
 * 「そのオブジェクトは、その世界に対してどう属しているか」を答える純粋なクエリ。
 *
 * 世界線3Dビューが「勤務表に焼き付いた固定メンバー」を描き分けるために使う。
 * world-line-graph は汎用ライブラリなので Staff も Membership も知らない。
 * 判定はこのバブリの記述子（`objects/hotelObjects.tsx` の membership / scope.pins）
 * だけから導き、`resolveCellRole` として注入する。
 *
 * ★ 読むだけ。ストアにも CAS にも触らない。だから module トップレベルの const に
 *   でき、3Dビューの useMemo の依存が毎レンダー変わってレイアウトを作り直す、
 *   という事故が起きない。
 */
import { membershipOf, homeScopeOf, pinnedTypesOf } from "./framework.js";
import { parseLocalScopeId } from "./commit.js";

/** 3Dビューの `CellRole`。ライブラリ側の型に合わせてあるが、依存はしない */
export type CellRole = "member" | "pinned" | "external";

/**
 * `scopeId` の世界から見た `type:id` の立場。
 *
 * - `member` … この世界で変化する（勤務表そのもの・勤務帯セット・可能勤務帯 など）
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
  if (homeScopeOf(ref.type, ref.id) === scopeId) return "member";

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
