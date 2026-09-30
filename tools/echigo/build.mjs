/**
 * **越後の調べ物を、バブリが読める形に変える。**
 *
 * > 出所は CSV 1 組。書き換えるのは人ではなく、この道具。
 *
 * ★ **生成物を手で直さない。** 直すなら `source/` の CSV を直して、これを走らせる
 *   ── 生成物に手を入れると、次に走らせたときに黙って消える。
 * ★ 出す先は 2 つ。地点（アクティビティ 793 件）は地図バブリへ、
 *   宿（1,540 件）は宿泊バブリへ。**同じ CSV を 2 か所で読まない**ので、
 *   読み方が食い違うことがない。
 *
 * 走らせ方:
 *   node tools/echigo/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

/**
 * CSV を読む。**引用符の中の読点と改行**を通す ── 住所に読点が入る行がある。
 */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  // BOM は落とす（見出しの 1 つ目が読めなくなる）
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(cell); cell = ""; continue; }
    if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (c === "\r") continue;
    cell += c;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows
    .filter((r) => r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
};

const read = (name) => parseCsv(readFileSync(join(HERE, "source", name), "utf8"));

/**
 * **id は名前と場所から作る。** 走らせ直すたびに変わる id だと、
 * 人が旅程やアクティビティから指したものが次の朝には外れている。
 */
const idOf = (prefix, name, lat, lng) => {
  const seed = `${name}@${lat},${lng}`;
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
  return `${prefix}-${h.toString(36)}`;
};

/** 数に読めなければ undefined（「未取得」の行がある） */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? n : undefined;
};

/** 空の欄は持たせない ── 「空文字が入っている」と「書かれていない」は違う */
const tidy = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) =>
  v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)));

/**
 * **種類は 5 つのまま。** 越後の一覧が持っている 46 種のタグは、
 * 分類ではなく**重ねられる目印**なので、そのまま `tags` に載せる
 * （温泉でもあり宿泊もできる、が言える）。地図のピンの色だけがこの 5 つを見る。
 */
const categoryOf = (tags) => {
  if (tags.includes("宿泊もできる")) return "lodging";
  return "sightseeing";
};

const spots = read("アクティビティ一覧.csv")
  .map((r) => {
    const lat = num(r["緯度"]);
    const lng = num(r["経度"]);
    if (lat === undefined || lng === undefined) return null;
    const tags = (r["タグ"] || "").split("|").filter(Boolean);
    return tidy({
      id: idOf("echigo", r["名称"], lat, lng),
      name: r["名称"],
      category: categoryOf(tags),
      lat,
      lng,
      tags,
      address: r["住所"],
      city: r["市町村"],
      region: r["地方"],
      tel: r["電話"],
      url: r["URL"],
      note: r["付随情報"],
    });
  })
  .filter(Boolean);

const lodgings = read("宿泊施設一覧.csv")
  .map((r) => {
    const lat = num(r["緯度"]);
    const lng = num(r["経度"]);
    if (lat === undefined || lng === undefined) return null;
    return tidy({
      id: idOf("echigo-stay", r["施設名"], lat, lng),
      name: r["施設名"],
      /** 区分の印（† ※）は出所の目印なので落とす ── 探すときに邪魔になる */
      kind: (r["区分"] || "").replace(/[†※]/g, "").trim(),
      lat,
      lng,
      address: r["住所"],
      tel: r["電話"],
      area: r["エリア/温泉地"],
      city: r["市町村"],
      region: r["地方"],
    });
  })
  .filter(Boolean);

/** 同じ場所が 2 度出てきたら 1 つにする（id は名前と場所から作るので当たる） */
const unique = (list) => [...new Map(list.map((x) => [x.id, x])).values()];

const emit = (path, header, typeName, importFrom, list) => {
  const body = unique(list).map((x) => `  ${JSON.stringify(x)},`).join("\n");
  const text = `${header}\nimport type { ${typeName} } from "${importFrom}";\n\nexport const ECHIGO: ${typeName}[] = [\n${body}\n];\n`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
  return unique(list).length;
};

const HEAD = (what, n) => `/**
 * **越後の${what}** ── ${n} 件。
 *
 * ★ **手で直さない。** これは \`tools/echigo/build.mjs\` が \`tools/echigo/source/\` の
 *   CSV から作ったもの。直すなら CSV を直して作り直す。
 * ★ id は名前と緯度経度から作ってある ── 作り直しても変わらないので、
 *   旅程やアクティビティから指したものが外れない。
 */`;

const nSpots = emit(
  join(ROOT, "map-bubly/map-libs/src/data/echigo-spots.ts"),
  HEAD("地点", spots.length),
  "SpotPlain",
  "../domain/Spot.domain.js",
  spots,
);
const nStays = emit(
  join(ROOT, "lodging-bubly/lodging-libs/src/data/echigo-lodgings.ts"),
  HEAD("宿", lodgings.length),
  "LodgingPlain",
  "../domain/Lodging.domain.js",
  lodgings,
);

console.log(`地点 ${nSpots} 件 / 宿 ${nStays} 件 を書き出しました`);
