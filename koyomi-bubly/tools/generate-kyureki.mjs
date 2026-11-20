#!/usr/bin/env node
/**
 * 旧暦（天保暦の決まりによる太陰太陽暦）の月の表を作る。
 *
 *   node koyomi-bubly/tools/generate-kyureki.mjs 2020 2032 > koyomi-bubly/koyomi-model/src/lib/kyurekiMonths.ts
 *
 * 旧暦の決まり:
 *   - 朔（新月）を含む日（日本時間）が、その月の1日
 *   - 中気（太陽黄経が30°の倍数）を含む月に、その中気の月番号を付ける
 *     雨水(330°)=1月, 春分(0°)=2月, … , 冬至(270°)=11月, 大寒(300°)=12月
 *   - 中気を含まない月は閏月（前の月の番号を引き継ぐ）
 *
 * 2033〜2034年は上の決まりだけでは月が決まらない（2033年問題）。この範囲を作ろうとすると止まる。
 *
 * 天文計算は Jean Meeus『Astronomical Algorithms』（第2版）による:
 *   - 朔: 第49章（月の位相）
 *   - 太陽の視黄経: 第25章（低精度。誤差 0.01° 程度＝時刻で15分程度）
 * 日付の境（日本時間の0時）に近い朔・中気は、計算の誤差で日付がずれうるので、
 * 標準エラー出力に「確かめること」として出す。国立天文台の暦要項の値と照らして確かめる。
 */

const DEG = Math.PI / 180;
const sin = (deg) => Math.sin(deg * DEG);
const norm360 = (deg) => ((deg % 360) + 360) % 360;

/** ΔT（TT − UT、秒）。2020〜2034年は 69〜72 秒程度。日付を決めるには十分な近似 */
const deltaTSeconds = (year) => 69.2 + 0.25 * (year - 2020);

/** JDE（力学時のユリウス日）→ 日本時間の Date 相当（UTC ミリ秒に9時間足したものを UTC として読む） */
const jdeToJstParts = (jde) => {
  const approxYear = 2000 + (jde - 2451545) / 365.25;
  const jdUt = jde - deltaTSeconds(approxYear) / 86400;
  const ms = (jdUt - 2440587.5) * 86400000 + 9 * 3600000;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    /** その日の0時（日本時間）から何分か */
    minuteOfDay: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60,
  };
};

const keyOf = ({ year, month, day }) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** k 番目の朔の JDE（k=0 が 2000年1月6日の朔）。Meeus 第49章 */
function newMoonJde(k) {
  const T = k / 1236.85;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde =
    2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = 2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
  jde +=
    -0.4072 * sin(Mp) +
    0.17241 * E * sin(M) +
    0.01608 * sin(2 * Mp) +
    0.01039 * sin(2 * F) +
    0.00739 * E * sin(Mp - M) -
    0.00514 * E * sin(Mp + M) +
    0.00208 * E * E * sin(2 * M) -
    0.00111 * sin(Mp - 2 * F) -
    0.00057 * sin(Mp + 2 * F) +
    0.00056 * E * sin(2 * Mp + M) -
    0.00042 * sin(3 * Mp) +
    0.00042 * E * sin(M + 2 * F) +
    0.00038 * E * sin(M - 2 * F) -
    0.00024 * E * sin(2 * Mp - M) -
    0.00017 * sin(Om) -
    0.00007 * sin(Mp + 2 * M) +
    0.00004 * sin(2 * Mp - 2 * F) +
    0.00004 * sin(3 * M) +
    0.00003 * sin(Mp + M - 2 * F) +
    0.00003 * sin(2 * Mp + 2 * F) -
    0.00003 * sin(Mp + M + 2 * F) +
    0.00003 * sin(Mp - M + 2 * F) -
    0.00002 * sin(Mp - M - 2 * F) -
    0.00002 * sin(3 * Mp + M) +
    0.00002 * sin(4 * Mp);
  const A = [
    [299.77 + 0.107408 * k - 0.009173 * T2, 0.000325],
    [251.88 + 0.016321 * k, 0.000165],
    [251.83 + 26.651886 * k, 0.000164],
    [349.42 + 36.412478 * k, 0.000126],
    [84.66 + 18.206239 * k, 0.00011],
    [141.74 + 53.303771 * k, 0.000062],
    [207.14 + 2.453732 * k, 0.00006],
    [154.84 + 7.30686 * k, 0.000056],
    [34.52 + 27.261239 * k, 0.000047],
    [207.19 + 0.121824 * k, 0.000042],
    [291.34 + 1.844379 * k, 0.00004],
    [161.72 + 24.198154 * k, 0.000037],
    [239.56 + 25.513099 * k, 0.000035],
    [331.55 + 3.592518 * k, 0.000023],
  ];
  for (const [arg, c] of A) jde += c * sin(arg);
  return jde;
}

/** 太陽の視黄経（度）。Meeus 第25章（低精度） */
function sunApparentLongitude(jde) {
  const T = (jde - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const Om = 125.04 - 1934.136 * T;
  return norm360(L0 + C - 0.00569 - 0.00478 * sin(Om));
}

/** 太陽の視黄経が target 度になる JDE（guess の近くで探す） */
function solarTermJde(target, guess) {
  let jde = guess;
  for (let i = 0; i < 20; i++) {
    let diff = target - sunApparentLongitude(jde);
    diff = ((diff + 540) % 360) - 180; // −180〜180 に寄せる
    jde += (diff / 360) * 365.2422;
    if (Math.abs(diff) < 1e-7) break;
  }
  return jde;
}

/** 中気の黄経 → 旧暦の月番号 */
const monthOfChuki = (lon) => ((lon / 30 + 2) % 12) || 12;

// ===== 範囲 =====
const [fromYear, toYear] = process.argv.slice(2).map(Number);
if (!fromYear || !toYear) {
  console.error("使い方: node generate-kyureki.mjs <開始年> <終了年>");
  process.exit(1);
}
if (toYear >= 2033) {
  console.error("2033〜2034年は旧暦の月が一意に決まらない（2033年問題）。2032年までにしてください");
  process.exit(1);
}

// 余裕を持って前後1年ぶんの朔と中気を求める
const startJde = 2451545 + (fromYear - 1 - 2000) * 365.25;
const endJde = 2451545 + (toYear + 2 - 2000) * 365.25;

const moons = [];
for (let k = Math.floor((startJde - 2451550) / 29.530588861); ; k++) {
  const jde = newMoonJde(k);
  if (jde > endJde) break;
  if (jde >= startJde) moons.push(jdeToJstParts(jde));
}

const chukis = [];
for (let y = fromYear - 1; y <= toYear + 2; y++) {
  for (let lon = 0; lon < 360; lon += 30) {
    // 春分（0°）が3月20日ごろ。黄経から日付のおおよそを出して、その近くで探す
    const guess = 2451545 + (y - 2000) * 365.2422 + 79 + (lon / 360) * 365.2422 - 0.5;
    const jde = solarTermJde(lon, guess);
    chukis.push({ lon, ...jdeToJstParts(jde) });
  }
}
chukis.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

// ===== 月を決める =====
const months = [];
for (let i = 0; i + 1 < moons.length; i++) {
  const start = keyOf(moons[i]);
  const next = keyOf(moons[i + 1]);
  const inside = chukis.filter((c) => keyOf(c) >= start && keyOf(c) < next);
  months.push({ start, chukis: inside });
}
const from = `${fromYear}-01-01`;
const to = `${toYear}-12-31`;
let prevMonth = undefined;
for (const m of months) {
  // 表に入れるのは範囲（〜toYear 年末）を覆う月まで。その先は決めない（2033年問題に踏み込まない）
  if (m.start > to) break;
  if (m.chukis.length > 1) {
    console.error(`中気を2つ含む月がある（${m.start}）。2033年問題と同じ形なので止める`);
    process.exit(1);
  }
  if (m.chukis.length === 1) {
    m.month = monthOfChuki(m.chukis[0].lon);
    m.leap = false;
  } else {
    if (prevMonth === undefined) continue; // 先頭は前の月が分からないので捨てる
    m.month = prevMonth;
    m.leap = true;
  }
  if (prevMonth !== undefined && !m.leap && m.month !== (prevMonth % 12) + 1) {
    console.error(`月の番号が飛んでいる（${m.start} が ${m.month}月、前が ${prevMonth}月）`);
    process.exit(1);
  }
  prevMonth = m.month;
}

// 範囲（fromYear-01-01 〜 toYear-12-31）を覆う月だけを残す
const firstIdx = months.findLastIndex((m) => m.start <= from && m.month !== undefined);
const lastIdx = months.findLastIndex((m) => m.start <= to);
const table = months.slice(firstIdx, lastIdx + 2); // 最後の月の終わりを示すため、次の月の1日まで持つ

// ===== 日付の境に近いものを知らせる =====
const NEAR_MIN = 30;
const near = (p) => p.minuteOfDay < NEAR_MIN || p.minuteOfDay > 1440 - NEAR_MIN;
const fmt = (p) =>
  `${keyOf(p)} ${String(Math.floor(p.minuteOfDay / 60)).padStart(2, "0")}:${String(
    Math.floor(p.minuteOfDay % 60)
  ).padStart(2, "0")}`;
const lo = table[0].start, hi = table[table.length - 1].start;
for (const p of moons) {
  if (keyOf(p) >= lo && keyOf(p) <= hi && near(p)) console.error(`確かめること: 朔 ${fmt(p)}（日本時間）`);
}
for (const c of chukis) {
  if (keyOf(c) >= lo && keyOf(c) <= hi && near(c)) console.error(`確かめること: 中気 ${c.lon}° ${fmt(c)}（日本時間）`);
}

// ===== 書き出す =====
const lines = table.map((m, i) => {
  const isEnd = i === table.length - 1;
  if (isEnd) return `  ["${m.start}"],`;
  return `  ["${m.start}", ${m.month}${m.leap ? ", true" : ""}],`;
});
process.stdout.write(`/**
 * 旧暦の月の表（${fromYear}〜${toYear}年）。**生成物なので手で直さない。**
 *
 *   node koyomi-bubly/tools/generate-kyureki.mjs ${fromYear} ${toYear} > koyomi-bubly/koyomi-model/src/lib/kyurekiMonths.ts
 *
 * 1行が旧暦の1か月: [その月の1日（新暦）, 月の番号, 閏月なら true]。
 * 最後の行は表の終わり（最後の月の次の月の1日）を示すだけで、月の番号を持たない。
 */
export const KYUREKI_MONTHS: readonly (readonly [string, number?, boolean?])[] = [
${lines.join("\n")}
];
`);
