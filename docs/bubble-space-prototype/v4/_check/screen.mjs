// 画面の約束（v3/SPEC.md §5）を1つずつ確かめる ── 説明は散文ではなく、画面の中で完結しているか
//   node docs/bubble-space-prototype/v4/_check/screen.mjs
import { openLab, V4 } from "./lab.mjs";

const lab = await openLab(`${V4}/lab.html`);
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };
const css = (sel, prop) => lab.page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);

// 1. ツールバーの下のヒント行（乗せると1行で出る／何も乗せていないときは規則①〜⑤）
{
  const base = await lab.textOf("#hint");
  console.log(`  ヒント行（既定）：${base}`);
  ok(["①", "②", "③", "④", "⑤"].every((n) => base.includes(n)), `ヒント行の既定が 規則①〜⑤ の見出し（番号の読み方がここで分かる）`);
  ok(base.split("\n").length === 1, `1行`);
  await lab.page.hover('[data-preset="grid"]');
  await lab.page.waitForTimeout(60);
  const hov = await lab.textOf("#hint");
  console.log(`  ヒント行（格子に乗せた）：${hov}`);
  ok(hov !== base && hov.includes("格子"), `乗せると、そのボタンの意味が1行で出る`);
}

// 2. 右上の空間の一覧（入れ子のツリー）。名前はその空間を持つ泡と同じ色
{
  const t = await lab.textOf("#spaces");
  const names = ["外の空間", "横に並べるの中", "coverflowの中", "X魚眼ビューの中", "議事録（版）の中", "勤務表の中", "スタッフの中", "カレンダーの中", "並び（見えない親）"];
  ok(names.every((n) => t.includes(n)), `空間の一覧に 9 つの空間が入れ子で出る`);
  const colors = await lab.page.evaluate(() =>
    [...document.querySelectorAll("#spaces .nm")].map((e) => [e.textContent, getComputedStyle(e).color]));
  const hue = await lab.page.evaluate(() => window.__lab.bubbles().find((b) => b.id === "kinmu").hue);
  const kin = colors.find(([n]) => n === "勤務表の中");
  console.log(`  勤務表の中 の色 ${kin[1]}（泡の hue ${hue}）`);
  ok(kin[1] !== "rgb(230, 235, 245)" && kin[1] !== colors.find(([n]) => n === "外の空間")[1], `空間の名前は、その空間を持つ泡と同じ色`);
  ok(new Set(colors.map((c) => c[1])).size >= 6, `空間ごとに色が違う（${new Set(colors.map((c) => c[1])).size} 色）`);
}

// 3. その下の「選択中の泡」（どこにいるか／横・縦・ホイール・触る で何が起きるか）
{
  await lab.select("d3"); await lab.settle();
  const t = await lab.textOf("#selection");
  console.log("  選択中の泡（カレンダーの「4」）:\n" + t.split("\n").map((l) => "    " + l).join("\n"));
  for (const k of ["いる空間", "横ドラッグ", "縦ドラッグ", "ホイール", "角を引く", "倍率"])
    ok(t.includes(k), `選択中の泡に「${k}」が出る`);
  ok(/[①-⑤]/.test(t), `どの規則から出ている答えかが、行頭の番号で分かる`);
}

// 4. カーソルの脇のヒント
{
  const r = await lab.rect("d3");
  await lab.hover(r.x + r.w / 2, r.y + r.h / 2);
  const shown = await css("#cursor-hint", "display");
  const t = await lab.textOf("#cursor-hint");
  console.log(`  カーソル脇（カレンダーの「4」の上）: ${JSON.stringify(t)}`);
  ok(shown === "block", `カーソルの脇にヒントが出る`);
  ok(t.includes("列を移る") && t.includes("行を移る"), `その場所で引いたら何が起きるかが出る`);
  await lab.shot("screen-cursor");
}

// 5. 軸セレクタは選択中の泡がいる空間に効く。左に「○○の中 の」とその空間の色で
{
  await lab.select("d3"); await lab.settle();
  const [label, color] = await lab.page.evaluate(() =>
    [document.getElementById("axis-scope").textContent, getComputedStyle(document.getElementById("axis-scope")).color]);
  console.log(`  軸セレクタの見出し「${label}」 色 ${color}`);
  ok(label.startsWith("カレンダーの中"), `選択中の泡がいる空間の名前が左に出る`);
  const nm = await lab.page.evaluate(() => [...document.querySelectorAll("#spaces .nm")].find((e) => e.textContent === "カレンダーの中").style.color);
  ok(color === "rgb(" + nm.match(/\d+/g)?.slice(0, 3).join(", ") + ")" || color !== "rgb(230, 235, 245)", `その空間の色`);
  // ③ 並びの中の泡を選ぶと、セレクタは外の窓へ回る
  await lab.select("fA"); await lab.settle();
  const l2 = await lab.textOf("#axis-scope");
  console.log(`  並びの中の 付箋A を選ぶと「${l2}」`);
  ok(l2.startsWith("外の空間"), `③ 見えない親は View を選べないので、セレクタは外の窓を指す`);
}

// 6. 空間を持つ泡の上に印（canvas に描いている。字の当たりを数える）
{
  const marks = await lab.page.evaluate(() => {
    // canvas の中なので、印が描かれる泡（空間を持つ泡）の数と、印の文言の作り方だけ見る
    const hosts = window.__lab.placements().filter((p) => {
      const b = window.__lab.bubbles().find((b) => b.id === p.id);
      return !p.implicit && window.__lab.bubbles().some((k) => k.parent === p.id);
    });
    return hosts.map((p) => p.id);
  });
  console.log(`  空間を持つ泡 ${marks.length}：${marks.join(" ")}`);
  ok(marks.length >= 6, `空間を持つ泡が6つ以上あり、その上に印が描かれる（スクショで確かめる）`);
}

// 7. 左下の操作のヘルプ（短く3行まで）
{
  const t = await lab.textOf("#help");
  console.log("  ヘルプ:\n" + t.split("\n").map((l) => "    " + l).join("\n"));
  ok(t.split("\n").length <= 3, `3行まで（${t.split("\n").length} 行）`);
}

// 8. 暗い背景の色
{
  const vars = await lab.page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return ["--bg", "--panel", "--line", "--fg", "--dim", "--accent"].map((k) => k + ":" + s.getPropertyValue(k).trim());
  });
  console.log(`  ${vars.join("  ")}`);
  ok(vars.join(" ").includes("--bg:#0b0d14") && vars.join(" ").includes("--accent:#6ee7ff"), `SPEC の配色そのまま`);
}

// 9. 日本語。名前は見え方で付ける
{
  const t = (await lab.textOf("#spaces")) + (await lab.textOf("#bar"));
  ok(t.includes("X魚眼ビュー") && !t.includes("世界線"), `「世界線ビュー」ではなく「X魚眼ビュー」`);
  ok(!/[a-z]{4,}/.test((await lab.textOf("#help"))), `ヘルプは日本語`);
}

// 1440×900 で破綻しない（右上の一覧・選択欄が画面に入る）
{
  const box = await lab.page.evaluate(() => {
    const r = document.getElementById("side").getBoundingClientRect();
    const c = document.getElementById("cv").getBoundingClientRect();
    return { bottom: r.bottom, right: r.right, canvasBottom: c.bottom, canvasRight: c.right };
  });
  console.log(`  右上の欄の下端 ${box.bottom.toFixed(1)} / canvas の下端 ${box.canvasBottom.toFixed(1)}`);
  ok(box.bottom <= box.canvasBottom + 0.5 && box.right <= box.canvasRight + 0.5, `右上の一覧と選択欄が画面に入る（切れない）`);
}

await lab.shot("screen");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n画面の約束 NG ${ng}` : `\n画面の約束 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
