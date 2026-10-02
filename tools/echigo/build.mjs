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
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

/**
 * **写真の URL を、地点の公式ページから拾う。**
 *
 * > 中身の絵は持たない。持つのは「そこを開けば見える」の URL だけ。
 *
 * ★ 拾うのは OGP（共有時に見せる絵として運営者が明示している画像）。
 *   だから貼らせて怒られない筋のもの、が既定になる。
 * ★ ホスト単位で 3 秒 + ばらつき ── 越後の一覧は 3 つの観光ポータルに固まっており
 *   （十日町・魚沼・妙高で 6 割）、素直に並列で舐めると 1 つのサイトを叩き続けることになる。
 * ★ 結果は `.og-cache.json` に保存。**走らせ直しても再取得しない**。相手サイトへの礼儀と、
 *   時間の節約の両方のため。空振り（画像無し・404）もキャッシュに書き、二度と行かない。
 */
const OG_CACHE_PATH = join(HERE, ".og-cache.json");
const OG_HOST_INTERVAL_MS = 3000;
const OG_HOST_JITTER_MS = 1000;
const OG_REQUEST_TIMEOUT_MS = 10_000;
const OG_MAX_PARALLEL_HOSTS = 8;
const OG_USER_AGENT = "BubblysTravelSeed/0.1 (og:image extractor)";
/** 抽出ルールを増やすたびに上げる。上げると、site 抽出があるホストのぶんは取り直す */
const OG_CACHE_VERSION = 2;
/** 同じ画像 URL が N 件以上のスポットで使われていたら、サイト共通のバナー扱いで落とす */
const OG_SHARED_IMAGE_THRESHOLD = 3;

const readOgCache = () => {
  if (!existsSync(OG_CACHE_PATH)) return {};
  try { return JSON.parse(readFileSync(OG_CACHE_PATH, "utf8")); }
  catch { return {}; }
};

const writeOgCache = (cache) => {
  writeFileSync(OG_CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
};

/**
 * HTML から og:image を全て抜く。相対パスは基準 URL で絶対化する。
 * 生 HTML 相手なので正規表現で足りる ── 完全な DOM は要らない。
 */
const extractOgImages = (html, base) => {
  const out = [];
  const re = /<meta\b[^>]*\bproperty\s*=\s*["']og:image(?::secure_url)?["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const content = m[0].match(/\bcontent\s*=\s*["']([^"']+)["']/i);
    if (!content) continue;
    try { out.push(new URL(content[1], base).toString()); }
    catch { /* おかしい URL は捨てる */ }
  }
  // 同じ URL が og:image と og:image:secure_url に二重に書かれることがある
  return [...new Set(out)];
};

/**
 * **ホストごとの追加抽出。** og:image がサイト共通のバナー 1 枚しか返さないサイト用。
 *
 * ★ 足すのは、**そのサイトを開いて確かめてから**。ページの中で写真がどう置かれているかを
 *   知っていないと、関係ない画像（バナーやアイコン）を掴んでしまう。
 * ★ 抜くのはそのサイト自身のドメイン下の画像だけにする ── 外部の URL を混ぜない。
 */
const SITE_EXTRACTORS = {
  /**
   * **十日町観光ナビ**。詳細ページの写真スライダーは
   * `<div style="background-image: url(...)">` で並ぶ。og:image はサイト共通のバナー。
   */
  "www.tokamachishikankou.jp": (html, base) => {
    const out = [];
    const re = /background-image\s*:\s*url\(\s*(["']?)([^)"']+)\1\s*\)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const raw = m[2].trim();
      if (!/\/wp\/wp-content\/uploads\//i.test(raw)) continue;
      try { out.push(new URL(raw, base).toString()); }
      catch { /* おかしい URL は捨てる */ }
    }
    return [...new Set(out)];
  },
};

const hostOf = (url) => { try { return new URL(url).host; } catch { return ""; } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 1 件だけ取ってくる（timeout 付き、HTML でなければ諦める）。
 * og:image と、ホスト固有の追加抽出（あれば）の両方を混ぜて返す。
 */
const fetchOgImages = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OG_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": OG_USER_AGENT, "accept": "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return { images: [], error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") || "";
    if (!/html/i.test(ct)) return { images: [], error: `not html (${ct})` };
    const html = await res.text();
    const base = res.url || url;
    const ogImages = extractOgImages(html, base);
    const siteExtractor = SITE_EXTRACTORS[hostOf(base)];
    const siteImages = siteExtractor ? siteExtractor(html, base) : [];
    // ★ site 抽出を先に置く ── og:image がサイト共通のバナーの場合、そちらは後で
    //   共通バナー除去に落ちるが、site 抽出は 1 枚目に来て欲しい。
    return { images: [...new Set([...siteImages, ...ogImages])] };
  } catch (e) {
    return { images: [], error: String(e?.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
};

/** キャッシュのバージョンが古く、いまなら追加抽出が効くはず、なら消して取り直させる */
const invalidateStaleCache = (cache) => {
  let invalidated = 0;
  for (const [url, entry] of Object.entries(cache)) {
    const host = hostOf(url);
    if (!SITE_EXTRACTORS[host]) continue;
    if ((entry.v ?? 1) >= OG_CACHE_VERSION) continue;
    delete cache[url];
    invalidated += 1;
  }
  if (invalidated > 0) {
    console.log(`site 抽出を足したホストの古いキャッシュを ${invalidated} 件、取り直す`);
  }
};

/**
 * **サイト共通のバナー除去。** 同じ画像 URL が 3 件以上のスポットで使い回されていたら、
 * サイト全体の飾りと見なして種から落とす（同じ写真が延々続くのが混乱の元）。
 */
const dropSharedImages = (spots) => {
  const counts = new Map();
  for (const s of spots) {
    if (!s.photoUrls) continue;
    for (const img of s.photoUrls) counts.set(img, (counts.get(img) ?? 0) + 1);
  }
  const banned = new Set(
    [...counts.entries()].filter(([, n]) => n >= OG_SHARED_IMAGE_THRESHOLD).map(([img]) => img),
  );
  if (banned.size === 0) return 0;
  let dropped = 0;
  for (const s of spots) {
    if (!s.photoUrls) continue;
    const kept = s.photoUrls.filter((img) => !banned.has(img));
    if (kept.length !== s.photoUrls.length) dropped += s.photoUrls.length - kept.length;
    if (kept.length === 0) delete s.photoUrls;
    else s.photoUrls = kept;
  }
  console.log(`サイト共通と見なした画像 ${banned.size} 個、延べ ${dropped} 件を種から落とした`);
  return dropped;
};

/** ホストごとにキューを 1 本ずつ流す。ホスト同士は並列。 */
const fetchAllOgImages = async (urls, cache) => {
  const byHost = new Map();
  for (const url of urls) {
    if (cache[url]) continue; // 前に見た（成功も失敗も）
    let host;
    try { host = new URL(url).host; } catch { continue; }
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
  }
  const total = [...byHost.values()].reduce((a, v) => a + v.length, 0);
  if (total === 0) {
    console.log("og:image：新しく取りに行くものは無し");
    return;
  }
  console.log(`og:image を ${total} 件、${byHost.size} ホストから取りに行く`);
  let done = 0;
  let lastPersistAt = 0;

  const runHost = async (queue) => {
    for (const url of queue) {
      const result = await fetchOgImages(url);
      cache[url] = { ...result, v: OG_CACHE_VERSION, at: Date.now() };
      done += 1;
      if (done - lastPersistAt >= 20 || done === total) {
        writeOgCache(cache);
        lastPersistAt = done;
        console.log(`  ${done}/${total}`);
      }
      // ホスト内は間隔を空ける（並びの最後は待たなくて良い）
      const isLast = queue.indexOf(url) === queue.length - 1;
      if (!isLast) {
        await sleep(OG_HOST_INTERVAL_MS + Math.random() * OG_HOST_JITTER_MS);
      }
    }
  };

  const hosts = [...byHost.entries()].map(([, q]) => q);
  // ホストが多い順に並べる ── 長いキューを先に走らせて詰まりを減らす
  hosts.sort((a, b) => b.length - a.length);

  // 並列数を制限しながら走らせる
  const running = new Set();
  for (const queue of hosts) {
    const p = runHost(queue).finally(() => running.delete(p));
    running.add(p);
    if (running.size >= OG_MAX_PARALLEL_HOSTS) {
      await Promise.race(running);
    }
  }
  await Promise.all(running);
  writeOgCache(cache);
};

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

// 公式ページの OGP を写真として拾って混ぜる（キャッシュ経由）
const ogCache = readOgCache();
invalidateStaleCache(ogCache);
const spotUrls = [...new Set(spots.map((s) => s.url).filter(Boolean))];
await fetchAllOgImages(spotUrls, ogCache);
for (const s of spots) {
  const hit = s.url ? ogCache[s.url] : undefined;
  if (hit && hit.images && hit.images.length > 0) s.photoUrls = hit.images;
}
dropSharedImages(spots);

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
