"use client";
/**
 * **曼荼羅UI の台** ── OS の海の上で、曼荼羅を試す画面。
 *
 * > **入れたときだけ仕切りが出て、泡が区画に収まる。切れば、入る前の海に戻る。**
 *
 * ★ **海は OS と同じもの**（`BubbleSea` ＋ OS の `bubbleRoutes` ＋ `HOMES`）。
 *   岸もランチャーも家具も地も世界線も、本番と同じ。曼荼羅はその上に乗る層でしかない。
 * ★ 置き方は **`moveTo`**（＝ 掴んで動かすのと同じ道）。座標を直に書かないので、
 *   魚眼が掛かっていても寄っていても、狙った所に見えるように置ける。
 * ★ 切り替えバブルは**岸に貼る**（右の縁、説明の下）。海に浮かべると背景を引いたとき
 *   画面の外へ流れてしまう ── 道具は、いつも同じ所に居てほしい。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BubbleSea,
  SEA_ARRANGEMENT_DOMAIN,
  type Docked,
  type Home,
} from "@bublys-org/bubble-space-shell";
import { BUBBLE_ARRANGEMENT_DOMAIN, FocusedObjectProvider, useBubbleRoutes } from "@bublys-org/bubbles-ui";
import { DomainRegistryProvider } from "@bublys-org/domain-registry";
import { ShellManagerProvider } from "@bublys-org/object-shell";
import type { BubbleSpaceApi, SeaSnapshot, SettleWhy } from "@bublys-org/bubble-layout-feature";
import { CHROME, type BubbleId } from "@bublys-org/bubble-layout";
import {
  MandaraGrid,
  MandaraModeBubble,
  MandaraModeContext,
  PAD,
  placeOf,
  type Dir,
  type Mandara,
  type Member,
} from "@bublys-org/mandara-ui";
import "../bubble-ui/BubblesUI/registration/bubbleRoutes";
import { HOMES, SEA_RULES } from "../bubble-ui/BubblesUI/feature/BubblesUINext";
import { useEnsureMainLauncherEntity } from "../launcher/useEnsureMainLauncher";
import { useEnsureBublyLaunchers } from "../launcher/useEnsureBublyLaunchers";

const MODE_URL = "mandara-mode";

/**
 * 切り替えバブルの定位置 ── **右の縁、世界線と説明の下にアイコンで**。
 *
 * ★ 大きさはほかの家具と同じ 48。小さい箱を配られた中身は自分で印だけの姿になり、
 *   **その印が入り切りの口になる**（ポケットと同じ作法 ── `MandaraModeBubble`）。
 * ★ 広げれば札と説明が出る。畳むか広げるかは人のもの。
 */
const ICON = 48;
const GAP = 8;
const mandaraDock: Home = (viewport): Docked => ({
  key: `${MODE_URL}#dock`,
  url: MODE_URL,
  dock: { edges: ["right"], at: { x: viewport.width, y: (ICON + GAP) * 2 } },
  size: { width: ICON, height: ICON },
  ground: "none",
});

/** 切り替えバブルの口。部品の外に置いて、描き直しのたびに作り直さない */
const MODE_ROUTE = {
  pattern: /^mandara-mode$/,
  type: "mandara-mode",
  Component: () => <MandaraModeBubble />,
};

const LAB_REGISTRY = { ...BUBBLE_ARRANGEMENT_DOMAIN, ...SEA_ARRANGEMENT_DOMAIN };

export default function MandaraUiPage() {
  return (
    <FocusedObjectProvider>
      <ShellManagerProvider>
        <DomainRegistryProvider registry={LAB_REGISTRY}>
          <MandaraUi />
        </DomainRegistryProvider>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}

function MandaraUi() {
  /**
   * ★ **ランチャーの中身は、海ではなく集約が持っている。**
   *   `HOMES` は「どこに貼るか」だけで、`launchers/main` という集約そのものは
   *   これが作る（OS 本体 `BubblesUINext` と同じ一行）。借りずにいたので、
   *   触ったことのないブラウザでは**ランチャー "main" は無い**と出ていた。
   */
  useEnsureMainLauncherEntity();
  /** ロードしたバブリは自分の呼び出しを 1 つ持つ ── その中身を用意するのもここ */
  useEnsureBublyLaunchers();

  const [viewport, setViewport] = useState({ w: 1280, h: 720 });
  const [on, setOn] = useState(false);
  const [focusId, setFocusId] = useState<BubbleId | null>(null);
  const [, setTrail] = useState<readonly BubbleId[]>([]);
  const [mandara, setMandara] = useState<Mandara | null>(null);
  /** 顔ぶれが変わったら置き直す（モード中に開いた泡を、区画へ引き取るため） */
  const [tick, setTick] = useState(0);

  const apiRef = useRef<BubbleSpaceApi | null>(null);
  const onRef = useRef(on);
  onRef.current = on;
  const focusRef = useRef(focusId);
  focusRef.current = focusId;
  /** 入る前の海（切ったらここへ戻す） */
  const beforeRef = useRef<SeaSnapshot | null>(null);
  /**
   * **最後に触られた泡。**
   *
   * ★ 選ばれたことは**変わったときにしか**知らされない。だからモードを入れる前から
   *   選ばれていた泡は、入れたあとに押し直しても何も起きない（値が変わらないので）。
   *   いつでも覚えておいて、入れたときにそれを中央に据える。
   */
  const lastSelRef = useRef<BubbleId | null>(null);
  /**
   * **前に置いた所。**
   *
   * ★ **変わっていない泡には書かない**（`setChildren` の註と同じ作法）。
   *   毎回ぜんぶ書くと、同じ値を書くだけの描き直しが海に流れ続ける ── 動きは同じでも、
   *   ほかの書き込み（ホイールの焦点など）と押し合う種になる。
   */
  const placedRef = useRef<Map<BubbleId, string>>(new Map());
  const viewRef = useRef(viewport);
  viewRef.current = viewport;

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /**
   * **OS が開けるもの ＋ 切り替えバブル。**
   *
   * ★ 一覧は**レジストリから引く**（`useBubbleRoutes`）── 組み込みのぶんも、
   *   あとからロードしたバブリのぶんも同じ所に居る。静的な配列を直に読むと、
   *   ロードしたバブリが開けない。
   */
  const osRoutes = useBubbleRoutes();
  const routes = useMemo(() => [...osRoutes, MODE_ROUTE], [osRoutes]);
  const homes = useMemo<readonly Home[]>(() => [...HOMES, mandaraDock], []);

  /**
   * **中央から見た、それぞれの向き。**
   *
   * ★ いまは**開いた関係**で決めている（答え 1）── 開いた先は東、開いた元は西。
   *   実際に居る場所（角度）で決める案に替えるときは、ここだけ書き換える。
   * ★ 海に直に浮いている泡だけ。入れ子の泡（一覧の中の札）は海の区画に置く相手ではない。
   */
  const membersOf = useCallback((api: BubbleSpaceApi, center: BubbleId): readonly Member[] => {
    const opened = api.snapshot().urls;
    const openerOf = new Map<BubbleId, BubbleId | null>(opened.map(([id, o]) => [id, o.openerId]));
    const out: Member[] = [];
    for (const [id, o] of opened) {
      if (id === center || o.url === MODE_URL) continue;
      if (api.hostOf(id) !== null) continue;
      const dir: Dir | null =
        openerOf.get(id) === center ? "E" : openerOf.get(center) === id ? "W" : null;
      if (dir) out.push({ id, dir });
    }
    return out;
  }, []);

  /** 曼荼羅に入っているあいだ、中央と画面の大きさが変わるたびに置き直す */
  useEffect(() => {
    if (!on) {
      setMandara(null);
      return;
    }
    const api = apiRef.current;
    const vp = viewRef.current;
    const members = api && focusId ? membersOf(api, focusId) : [];
    const { mandara: m, placed } = placeOf(vp, focusId, members);
    setMandara(m);
    if (!api) return;
    const c = CHROME.plain;
    const next = new Map<BubbleId, string>();
    for (const p of placed) {
      const key = `${Math.round(p.rect.x)},${Math.round(p.rect.y)},${Math.round(p.rect.w)},${Math.round(p.rect.h)}`;
      next.set(p.id, key);
      if (placedRef.current.get(p.id) === key) continue;   // 行き先が同じなら、何も書かない
      // 先に箱の大きさ、そのあと置き場所（中心を合わせるので、大きさが決まっていないとずれる）
      api.setSize(p.id, {
        w: Math.max(80, p.rect.w - c.left - c.right),
        h: Math.max(10, p.rect.h - c.top - c.bottom),
      });
      api.moveTo(p.id, p.rect);
    }
    placedRef.current = next;
  }, [on, focusId, viewport, tick, membersOf]);

  /**
   * 入り切り。
   *
   * ★ 戻し方は海の口に任せる（`snapshot` / `restore`）── 泡の座標も大きさも寄りも
   *   まとめて戻る。自分で覚え直すと、覚え落としが必ず出る。
   *   値段：**曼荼羅のあいだに開いた泡は、切ったときに消える**（入る前の海に戻るので）。
   */
  const toggle = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    if (!onRef.current) {
      beforeRef.current = api.snapshot();
      // 入る前から選ばれていた泡があれば、それが中央。無ければ仕切りだけ出て待つ（答え 7）
      placedRef.current = new Map();
      const last = lastSelRef.current;
      setFocusId(last && api.urlOf(last) !== MODE_URL ? last : null);
      setTrail([]);
      setOn(true);
      return;
    }
    const before = beforeRef.current;
    if (before) {
      /**
       * ★ **入る前の姿へ戻すが、曼荼羅のあいだに開いた泡は残す。**
       *
       *   丸ごと戻すと、せっかく開いたものが無かったことになる
       *   （実測：モード中に開いた詳細が、切った瞬間に消えた）。
       *   入る前から居た泡だけを元の所へ戻し、あとから来た泡はそのまま置いておく。
       */
      const now = api.snapshot();
      const known = new Set(before.world.bubbles.map((b) => b.id));
      api.restore({
        world: {
          ...before.world,
          bubbles: [...before.world.bubbles, ...now.world.bubbles.filter((b) => !known.has(b.id))],
          implicitSeq: Math.max(before.world.implicitSeq, now.world.implicitSeq),
        },
        urls: [...before.urls, ...now.urls.filter(([id]) => !known.has(id))],
        seq: now.seq,
      });
    }
    beforeRef.current = null;
    placedRef.current = new Map();
    setTrail([]);
    setOn(false);
  }, []);

  /** テンキー。入っているあいだだけ効く */
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      const d = e.code.startsWith("Numpad") ? e.code.slice(6) : e.key;
      if (d === "0") {
        setTrail((t) => {
          if (!t.length) return t;
          setFocusId(t[t.length - 1]);
          return t.slice(0, -1);
        });
        e.preventDefault();
        return;
      }
      const dir = PAD[d];
      const api = apiRef.current;
      const here = focusRef.current;
      if (!dir || !api || !here) return;
      const hit = membersOf(api, here).find((m) => m.dir === dir);
      if (!hit) return;
      setTrail((t) => [...t, here]);
      setFocusId(hit.id);
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, membersOf]);

  /** 触った泡が中央になる（答え 7 の「フォーカスを当てたら始まる」） */
  const onSelect = useCallback((id: BubbleId | null) => {
    if (!id) return;
    if (apiRef.current?.urlOf(id) === MODE_URL) return;   // 道具であって、行き先ではない
    /**
     * ★ **中央になれるのは、海に直に浮いている泡だけ。**
     *
     *   曼荼羅は**海**を区画に分けるもので、区画は海の座標で切ってある。
     *   一覧の中の札のように海に居ない泡を中央に据えると、置き場所は正しく出るのに
     *   書いても効かない ── 別の空間の泡を、海の座標で動かそうとするから
     *   （実測：中央の矩形は {146, 8, 674, 764} と正しいのに、泡は画面の外に残った）。
     */
    if (apiRef.current?.hostOf(id) !== null) return;
    lastSelRef.current = id;
    if (!onRef.current) return;
    setFocusId((cur) => {
      if (cur === id) return cur;
      if (cur) setTrail((t) => [...t, cur]);
      return id;
    });
  }, []);

  const onSpaceReady = useCallback((api: BubbleSpaceApi) => {
    apiRef.current = api;
  }, []);

  /**
   * **顔ぶれが変わったら置き直す。**
   *
   * ★ これが無いと、曼荼羅のあいだに開いた泡が区画に引き取られない ──
   *   中央の泡が画面幅いっぱいに伸びているので、`openAt` の「右隣に開く」が
   *   **画面の外**になる（実測：開いた泡がどこにも見えなくなった）。
   * ★ 見るのは顔ぶれ（`members`）だけ。置き場所（`moved`）まで拾うと、
   *   自分が置いたことで自分がもう一度走る。
   */
  const onSettled = useCallback((why: SettleWhy) => {
    if (why === "members") setTick((n) => n + 1);
  }, []);

  return (
    <MandaraModeContext.Provider value={{ on, toggle }}>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        <BubbleSea
          routes={routes}
          homes={homes}
          rules={SEA_RULES}
          onSpaceReady={onSpaceReady}
          onSelect={onSelect}
          onSettled={onSettled}
          style={{ height: "100dvh" }}
        />
        {on && mandara ? <MandaraGrid mandara={mandara} /> : null}
      </div>
    </MandaraModeContext.Provider>
  );
}
