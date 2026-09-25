/**
 * **デモの行き来** ── どのデモに着いても、そこから全部へ行ける。
 *
 * ★ 一覧は**ここ 1 か所**に書く。アプリごとに書くと、URL が増えたときに
 *   どれか 1 つだけ古いまま残る（審査員はその 1 つを踏む）。
 * ★ 「いま居るのはどれか」は**その場の住所**（hostname）で決める。アプリ側に
 *   「自分はこれ」と書かせない ── 書かせると、同じ中身を別の url に置いたときに嘘になる。
 */
export type DemoSite = {
  readonly id: string;
  /** 人に見せる名前（提案書の呼称と揃える） */
  readonly name: string;
  /** 一行の説明。名前だけでは何か分からないので */
  readonly note: string;
  /** 細い帯（56px のサイドバー）に出す 1〜2 文字 */
  readonly short: string;
  readonly url: string;
};

/** 公開しているデモ。並び順は「まず土台、次に中身」 */
export const DEMO_SITES: readonly DemoSite[] = [
  {
    id: 'os',
    name: 'bublys OS',
    note: 'アプリを泡として並べる土台',
    short: 'OS',
    url: 'https://os.bublys.ooo/',
  },
  {
    id: 'shiftonton',
    name: 'シフトントン',
    note: '旅館のシフトを、試しながら作る',
    short: 'シフ',
    url: 'https://hotel-shift-puzzle.bublys.ooo/',
  },
  {
    id: 'sekaisen-igo',
    name: '世界線囲碁',
    note: '打ち直しを分岐として残す碁',
    short: '碁',
    url: 'https://sekaisen-igo.bublys.ooo/',
  },
  {
    id: 'gakkai-shift',
    name: '学会シフト',
    note: '学会の当番表（シフトントンの前身）',
    short: '学',
    url: 'https://shift-puzzle.bublys.ooo/',
  },
];

/** いま見ているのはどのデモか（住所で見る。分からなければ null） */
export const currentDemoId = (href?: string): string | null => {
  const here = href ?? (typeof window === 'undefined' ? '' : window.location.href);
  if (!here) return null;
  let host: string;
  try {
    host = new URL(here).hostname;
  } catch {
    return null;
  }
  const hit = DEMO_SITES.find((s) => {
    try {
      return new URL(s.url).hostname === host;
    } catch {
      return false;
    }
  });
  return hit ? hit.id : null;
};
