"use client";
/**
 * **岸の収まり** ── 画面の大きさを変えながら、岸に貼るものの置き方を見比べる台。
 *
 * > 端末ごとの場合分けは書かない。決めるのは次の 3 つだけ。
 *
 *   ① **詰まり具合** … その辺に要る長さ ÷ その辺の長さ。1 を超えたらはみ出す
 *   ② **縦横比**     … どちらの辺が余っているか（横持ちは幅が余って高さが無い）
 *   ③ **指かマウスか** … 触る的の大きさ。画面の広さとは別の軸
 *
 * 端末はこの軸の上の**目印**として置くだけ。解像度そのものは見ない ── 絵を描く広さ
 * （CSS px）は解像度 ÷ 端末の倍率なので、同じ「FHD+ (1080×2400)」がスマホでは幅 360、
 * モニタでは幅 1080 になる。岸が収まるかを決めるのは後者だけ。
 *
 * ★ ③ は CSS の `any-pointer: coarse` で決まるので、ここで枠を小さくしても切り替わらない
 *   （本物の指で見るしかない）。この台で見えるのは ① と ②。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BubbleSea, SEA_ARRANGEMENT_DOMAIN, type Docked, type Home } from "@bublys-org/bubble-space-shell";
import { BUBBLE_ARRANGEMENT_DOMAIN, FocusedObjectProvider } from "@bublys-org/bubbles-ui";
import { DomainRegistryProvider } from "@bublys-org/domain-registry";
import { ShellManagerProvider } from "@bublys-org/object-shell";
import { bubbleRoutes } from "../bubble-ui/BubblesUI/registration/bubbleRoutes";
import { HOMES as REAL_HOMES } from "../bubble-ui/BubblesUI/feature/BubblesUINext";

// ========== 岸に貼るものと、その中身が要る長さ ==========

const URL = {
  launcher: "launchers/main",
  spaceView: "space-view",
  demoSites: "demo-sites",
  pocket: "pocket",
  worldLines: "world-lines",
  guide: "guide",
} as const;

/**
 * **中身が要る長さ**（実測。ブラウザが並べた結果）。
 *
 * ★ ここに書いてあること自体が、いま直そうとしている問題そのもの ── 本当の幅を
 *   決めているのは CSS で、この数はそれを人が写したもの。どの候補を採っても、
 *   最後は**中身を測って決める**（`ResizeObserver`）ようにするべき所。
 */
const NEED = { spaceView: 470, demoSites: 348 } as const;

const LAUNCHER = 60;  // アイコンだけの幅
const ICON = 48;      // ポケット・世界線・説明
const BAR = 44;       // 横に寝た口の高さ
const GAP = 8;

const dockOf = (
  url: string,
  dock: Docked["dock"],
  size: Docked["size"],
  ground: Docked["ground"],
): Docked => ({ key: `${url}#dock`, url, dock, size, ground });

/** どの候補でも動かさないもの ── ランチャー・ポケット・世界線・説明 */
const FIXED: readonly Home[] = [
  (vp) => dockOf(URL.launcher, { edges: ["left", "top"], at: { x: 0, y: 0 } },
    { width: LAUNCHER, height: vp.height }, "light"),
  () => dockOf(URL.pocket, { edges: ["bottom", "right"], at: { x: 0, y: 0 } },
    { width: ICON, height: ICON }, "none"),
  (vp) => dockOf(URL.worldLines, { edges: ["top", "right"], at: { x: vp.width, y: 0 } },
    { width: ICON, height: ICON }, "none"),
  (vp) => dockOf(URL.guide, { edges: ["right"], at: { x: vp.width, y: ICON + GAP } },
    { width: ICON, height: ICON }, "none"),
];

/**
 * 上の縁の、**角にもう居るものを除いた**残り（左のランチャーと、右上の世界線）。
 *
 * ★ ここで世界線の 48 を引き忘れていて、「辺に収める」はずの候補が 108% はみ出した
 *   （実測・375 幅：60 ＋ 299 ＋ 48 ＝ 407）。辺の残りは**その辺に着いている全部**を引く。
 */
const roomTop = (w: number) => w - LAUNCHER - ICON - 3 * GAP;
/** 下の縁の、ランチャーとポケットを除いた残り */
const roomBottom = (w: number) => w - LAUNCHER - ICON - 3 * GAP;

// ========== 配置候補 ==========

type Candidate = {
  readonly id: string;
  readonly label: string;
  readonly rule: string;
  readonly homesFor: (vp: { width: number; height: number }) => readonly Home[];
};

/** 上の縁の中央に、横に寝た口を貼る（幅は渡された数のまま） */
const topBar = (url: string, width: number): Home => (vp) =>
  dockOf(url, {
    edges: ["top"],
    // 真ん中は「空いている所」の真ん中 ── 左のランチャーと右上の世界線を除いた残りで測る
    at: { x: Math.round(LAUNCHER + (vp.width - LAUNCHER - ICON - width) / 2), y: 0 },
  }, { width, height: BAR }, "none");

/** 下の縁の、ランチャーのすぐ右に貼る */
const bottomBar = (url: string, width: number): Home => () =>
  dockOf(url, { edges: ["bottom"], at: { x: LAUNCHER + GAP, y: 0 } }, { width, height: BAR }, "none");

/** B の並び（C が「上に入るとき」に使い回す） */
const clampHomes = (vp: { width: number; height: number }): readonly Home[] => [
  ...FIXED,
  topBar(URL.spaceView, Math.min(NEED.spaceView, roomTop(vp.width))),
  bottomBar(URL.demoSites, Math.min(NEED.demoSites, roomBottom(vp.width))),
];

const CANDIDATES: readonly Candidate[] = [
  {
    id: "real",
    label: "★ いまの本番",
    rule:
      "本番の定位置そのもの（`BubblesUINext` の HOMES）。上の縁に見え方の口が入らない画面では、" +
      "上に 1 列のアイコン（ランチャー・他のデモ・説明・世界線・ポケット）、下に見え方の口を端から端まで。",
    homesFor: () => REAL_HOMES,
  },
  {
    id: "as-is",
    label: "A いまのまま",
    rule: "手で書いた大きさ（482 / 360）で、今の定位置に貼る。画面の広さは見ない。",
    homesFor: () => [...FIXED, topBar(URL.spaceView, 482), bottomBar(URL.demoSites, 360)],
  },
  {
    id: "clamp",
    label: "B 辺に収める",
    rule: "中身が要る長さで貼る。辺に入らなければ、辺の残りいっぱい（中身は右が切れる）。",
    homesFor: clampHomes,
  },
  {
    id: "spill",
    label: "C 下へ逃がす",
    rule: "上の縁に入らないなら、見え方の口は下の縁へ移って幅いっぱい。他のデモはそのとき泡に戻る。",
    homesFor: (vp) =>
      NEED.spaceView <= roomTop(vp.width)
        ? clampHomes(vp)
        : [...FIXED, bottomBar(URL.spaceView, roomBottom(vp.width))],
  },
  {
    id: "afloat",
    label: "D 泡に戻す",
    rule: "辺に入らないものは定位置を持たない（ランチャーから開く普通の泡になる）。",
    homesFor: (vp) => [
      ...FIXED,
      ...(NEED.spaceView <= roomTop(vp.width) ? [topBar(URL.spaceView, NEED.spaceView)] : []),
      ...(NEED.demoSites <= roomBottom(vp.width) ? [bottomBar(URL.demoSites, NEED.demoSites)] : []),
    ],
  },
];

// ========== 詰まり具合を測る ==========

type Fit = { readonly edge: string; readonly need: number; readonly room: number };

/**
 * 辺ごとに「要る長さ」を足す。その辺に着いているものは、辺に沿った向きの長さを取る
 * （左の縁に端から端まで立っているランチャーも、**上の縁では 60 を取っている**）。
 */
const fitOf = (list: readonly Docked[], vp: { width: number; height: number }): readonly Fit[] => {
  const along = (edge: "top" | "bottom" | "left" | "right") =>
    list
      .filter((d) => d.dock.edges.includes(edge))
      .reduce((sum, d) => sum + (edge === "top" || edge === "bottom" ? d.size.width : d.size.height), 0);
  return [
    { edge: "上", need: along("top"), room: vp.width },
    { edge: "下", need: along("bottom"), room: vp.width },
    { edge: "左", need: along("left"), room: vp.height },
    { edge: "右", need: along("right"), room: vp.height },
  ];
};

// ========== 目印（栞） ==========

const MARKS: readonly { readonly label: string; readonly w: number; readonly h: number; readonly note: string }[] = [
  { label: "iPhone SE", w: 375, h: 667, note: "いま岸がはみ出す幅" },
  { label: "iPhone 15", w: 393, h: 852, note: "今どきの縦持ち" },
  { label: "横持ち", w: 852, h: 393, note: "幅は足りるが高さが無い" },
  { label: "iPad 縦", w: 768, h: 1024, note: "3:4" },
  { label: "iPad 横", w: 1024, h: 768, note: "4:3" },
  { label: "小さいノート", w: 1280, h: 800, note: "16:10" },
  { label: "いまの基準", w: 1440, h: 900, note: "16:10" },
  { label: "FHD", w: 1920, h: 1080, note: "100% のモニタ。150% なら 1280×720" },
  { label: "3:2", w: 2000, h: 1200, note: "Surface 系" },
  { label: "WQXGA", w: 2560, h: 1600, note: "100%。200% なら 1280×800" },
];

// ========== 台 ==========

/**
 * ★ **本番の画面と同じ支度をする。** 海は岸の姿を世界線へ記録する口を持っているので
 *   （`useSeaWorldLine`）、記録しない場でも内容アドレスの置き場（CAS）は要る
 *   ── 無いと `useCas must be used within a CasProvider` で落ちる（実測で踏んだ）。
 *   ここは記録しない台なので、渡す型は海の並びと泡の並びだけ。
 */
const LAB_REGISTRY = { ...BUBBLE_ARRANGEMENT_DOMAIN, ...SEA_ARRANGEMENT_DOMAIN };

export default function ShoreFitPage() {
  return (
    <FocusedObjectProvider>
      <ShellManagerProvider>
        <DomainRegistryProvider registry={LAB_REGISTRY}>
          <ShoreFit />
        </DomainRegistryProvider>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}

function ShoreFit() {
  const [size, setSize] = useState({ w: 375, h: 667 });
  const [candId, setCandId] = useState(CANDIDATES[0].id);
  const [shrink, setShrink] = useState(true);

  const cand = CANDIDATES.find((c) => c.id === candId) ?? CANDIDATES[0];
  const vp = useMemo(() => ({ width: size.w, height: size.h }), [size.w, size.h]);
  const homes = useMemo(() => cand.homesFor(vp), [cand, vp]);
  const fits = useMemo(() => fitOf(homes.map((h) => h(vp)), vp), [homes, vp]);

  /**
   * 入りきらないときだけ縮める。**触り心地は変わらない** ── 入力は枠の倍率
   * （`getBoundingClientRect().width / offsetWidth`）で割ってから使われる。
   */
  const [room, setRoom] = useState({ w: 1200, h: 620 });
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    /**
     * ★ 上の操作帯の高さは**測る**。決め打ちにすると、窓が狭くて帯が折り返したとき
     *   （幅 862 で 128 のつもりが実測 223）枠の下の縁が画面の外へ出る
     *   ── 下の縁まで見えなければ置き方は判じられない。
     */
    const measure = () =>
      setRoom({
        w: window.innerWidth - 48,
        h: window.innerHeight - (stripRef.current?.getBoundingClientRect().height ?? 0) - 56,
      });
    measure();
    const ro = new ResizeObserver(measure);
    if (stripRef.current) ro.observe(stripRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const k = shrink ? Math.min(1, room.w / size.w, room.h / size.h) : 1;

  return (
    <div style={{ height: "100vh", overflow: "auto", background: "#0b0e16", color: "#e6ebf5",
      font: "13px/1.6 -apple-system, sans-serif" }}>
      <div ref={stripRef} style={{ display: "flex", gap: 24, alignItems: "flex-start", padding: "10px 16px",
        borderBottom: "1px solid #222838", flexWrap: "wrap" }}>

        {/* 目印と、自由な大きさ */}
        <div style={{ minWidth: 380 }}>
          <b>岸の収まり</b>
          <span style={{ color: "#8792ab", marginLeft: 8 }}>解像度ではなく、絵を描く広さ（CSS px）で見る</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {MARKS.map((m) => (
              <button key={m.label} onClick={() => setSize({ w: m.w, h: m.h })} title={`${m.w}×${m.h} ── ${m.note}`}
                style={chip(size.w === m.w && size.h === m.h)}>
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <Num value={size.w} onChange={(w) => setSize((s) => ({ ...s, w }))} />×
            <Num value={size.h} onChange={(h) => setSize((s) => ({ ...s, h }))} />
            <button onClick={() => setSize((s) => ({ w: s.h, h: s.w }))} style={chip(false)}>縦横を入れ替える</button>
            <label style={{ color: "#8792ab" }}>
              <input type="checkbox" checked={shrink} onChange={(e) => setShrink(e.target.checked)} />
              入らなければ縮める{k < 1 ? `（いま ${(k * 100).toFixed(0)}%）` : ""}
            </label>
          </div>
        </div>

        {/* 候補 */}
        <div style={{ minWidth: 300, maxWidth: 420 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CANDIDATES.map((c) => (
              <button key={c.id} onClick={() => setCandId(c.id)} style={chip(c.id === candId)}>{c.label}</button>
            ))}
          </div>
          <div style={{ color: "#8792ab", marginTop: 6 }}>{cand.rule}</div>
        </div>

        {/* 詰まり具合 */}
        <table style={{ borderCollapse: "collapse", font: "12px/1.5 ui-monospace, monospace" }}>
          <thead>
            <tr style={{ color: "#8792ab" }}>
              {["辺", "要る", "使える", "詰まり"].map((h) => (
                <th key={h} style={{ textAlign: "right", padding: "0 8px", fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fits.map((f) => {
              const ratio = f.need / f.room;
              return (
                <tr key={f.edge} style={{ color: ratio > 1 ? "#ff8f8f" : "#e6ebf5" }}>
                  <td style={{ textAlign: "right", padding: "0 8px" }}>{f.edge}</td>
                  <td style={{ textAlign: "right", padding: "0 8px" }}>{Math.round(f.need)}</td>
                  <td style={{ textAlign: "right", padding: "0 8px" }}>{Math.round(f.room)}</td>
                  <td style={{ textAlign: "right", padding: "0 8px" }}>
                    {(ratio * 100).toFixed(0)}%{ratio > 1 ? " はみ出す" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 枠 ── この中が「その端末の画面ぜんぶ」 */}
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <div style={{ width: size.w * k, height: size.h * k }}>
          <div style={{ width: size.w, height: size.h, transform: `scale(${k})`, transformOrigin: "left top",
            outline: "1px solid #2b3347", position: "relative" }}>
            {/*
              ★ 候補を変えたら**建て直す**。定位置は「居なければ置く」なので、
                貼ってあるものは候補を変えても勝手には動かない。
              ★ 大きさを変えたときも建て直す ── 中央ぞろえの `at.x` は貼った時の幅で
                決まるので、そのままでは前の幅の真ん中に残る。
            */}
            <BubbleSea
              key={`${candId}-${size.w}x${size.h}`}
              routes={bubbleRoutes}
              viewport={{ w: size.w, h: size.h }}
              homes={homes}
              rules={SEA_RULES}
              style={{ height: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 大元の海と同じ決め事（両軸魚眼のときは斜辺でまとめる） */
const SEA_RULES = { sizeCombine: "hypot" } as const;

const chip = (on: boolean): React.CSSProperties => ({
  font: "12px/1.4 -apple-system, sans-serif",
  padding: "4px 10px",
  borderRadius: 7,
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: `1px solid ${on ? "#4d8dff" : "rgba(255,255,255,.18)"}`,
  background: on ? "rgba(77,141,255,.18)" : "rgba(255,255,255,.06)",
  color: "#dce8ff",
});

const Num = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <input
    type="number"
    value={value}
    onChange={(e) => {
      const n = Number(e.target.value);
      // 小さい方は思い切り小さくできる ── 岸に貼ったものが姿を落とす所を見るため
      if (Number.isFinite(n) && n >= 60 && n <= 4096) onChange(Math.round(n));
    }}
    style={{ width: 72, ...chip(false), padding: "4px 6px", background: "rgba(255,255,255,.06)" }}
  />
);
