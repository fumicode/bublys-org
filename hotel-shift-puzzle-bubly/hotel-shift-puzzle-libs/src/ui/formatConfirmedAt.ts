/**
 * 確定時刻（epoch ms）の小さな表示。同じ月の確定が複数あるとき見分ける手がかりなので、
 * 日付だけでなく時刻まで出す（例: "2026/5/31 18:04"）。分からなければ空文字。
 */
export function formatConfirmedAt(ms: number | undefined): string {
  if (ms === undefined) return "";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}
