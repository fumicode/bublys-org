"use client";
/**
 * **海の世界線** ── どう並んでいたかの移り変わりを、節目ごとに記録する。
 *
 * > **節目は、言葉で言えることに対応させる。**
 *
 * 記録するのは 3 つだけ（`SettleWhy`）:
 *
 *   顔ぶれが変わった（開いた・閉じた・岸へ出した・戻した）
 *   並べ方を変えた（並べ方・レンズ）
 *   動かした・大きさを変えた（**手を離したときに 1 つ**）
 *
 * ★ 途中の 1px ごとに節を作らないのは、**戻りたい所が見つけられなくなる**から。
 *   「CSV を開いた」「格子にした」のように言えるものが 1 節。
 * ★ **知らせるのは人が触る口だけ。** 眺めている effect（岸の配列を見張る、など）から
 *   知らせてはいけない ── 機械が並べ直したぶん（画面の大きさが変わった、定位置を置き直した、
 *   戻した先で箱を測り直した）まで節になり、**押した節のすぐ下に中身の同じ節が生まれる**。
 *   時間で切るのは見分けにならない：素早い連続操作と落ち着きが区別できず、
 *   窓を広げれば人の操作が消え、狭めれば落ち着きが残る。
 * ★ 記録するのは**海の姿まるごと**（`SeaSnapshot`）── 差分ではない。
 *   泡は増えも減りもするので、差分で持つと「どの時点の何に対する差か」を別に持つ羽目になる。
 *   姿は小さい（泡の箱と url だけ）ので、丸ごとで困らない。
 */
import { useCallback, useEffect, useRef } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { defineDomainObjects } from "@bublys-org/domain-registry";
import { BubbleWorld } from "@bublys-org/bubble-layout";
import type { Bubble, BubbleId } from "@bublys-org/bubble-layout";
import type { BubbleSpaceApi, SeaSnapshot, SettleWhy } from "@bublys-org/bubble-layout-feature";
import type { Docked } from "./ShowreLayer.js";

/**
 * 世界線に置く「海の姿」。1 つの scope に 1 つだけ居る（id は固定）。
 *
 * ★ **岸も一緒に持つ。** 岸は置き場所であって並びではない、と最初は外していたが、
 *   そうすると「岸に貼った」節へ戻ったとき、その泡が**海と岸の両方に居る**ことになる
 *   （海の姿はまだ持っているのに、岸からは剥がれない）。貼る・剥がすが顔ぶれの変化なら、
 *   岸も姿の一部。
 */
export type SeaState = {
  readonly id: string;
  readonly snapshot: SeaSnapshot;
  /**
   * そのとき岸に貼ってあったもの。**無い記録は「岸を触らない」**
   *   ── 岸を持たずに記録していた頃の節へ戻っても、岸を空にしてしまわないように。
   */
  readonly shore?: readonly Docked[];
};

export class SeaArrangement {
  constructor(readonly state: SeaState) {}

  get id(): string {
    return this.state.id;
  }

  /** その時点で海に浮かんでいた泡の数（節目の要約に使う） */
  get count(): number {
    return this.state.snapshot.urls.length;
  }

  toPlain(): SeaState {
    return this.state;
  }

  static fromPlain(plain: SeaState): SeaArrangement {
    return new SeaArrangement(plain);
  }
}

export const SEA_ARRANGEMENT_TYPE = "sea-arrangement";
/** scope（海）ごとに 1 つなので、id は固定でよい */
export const SEA_ARRANGEMENT_ID = "sea";

export const SEA_ARRANGEMENT_DOMAIN = defineDomainObjects({
  [SEA_ARRANGEMENT_TYPE]: {
    class: SeaArrangement,
    fromJSON: (json: unknown) => SeaArrangement.fromPlain(json as SeaState),
    toJSON: (a: SeaArrangement) => a.toPlain(),
    getId: (a: SeaArrangement) => a.id,
  },
});

/**
 * **世界線に入らないもの。** url で名指す（`BubbleSea` の `worldLineOutside`）。
 *
 * > **世界線を映すものは、世界線に入らない。**
 *
 * 世界線の泡（`world-lines`）は、いまどの節に居るかを**映す窓**であって、海の姿の一部ではない。
 * 姿に入れてしまうと 2 つ困る:
 *
 *   1. **移った先に自分が居ない** ── 古い節の姿には、あとから開いた世界線の泡が無い。
 *      戻した瞬間に窓ごと消えて、**戻ってくる手が無くなる**（実測で踏んだ）。
 *   2. **見ただけで枝が増える** ── 窓を開く・動かす・広げるは海の並びを変える操作ではないのに、
 *      顔ぶれが変わったことになって節が生まれる。移った先で節を書けば、そこが分岐になる。
 *
 * ★ **抜くのは記録と復元の 2 か所だけ。** 姿に入らないのだから、動かしても大きさを変えても
 *   **印（`sealOf`）が変わらない** ── 「これは節にしない」という分岐をどこにも書かなくてよい。
 * ★ 名指すのは器ではなく**使う側**（OS が `world-lines` を渡す）。器は「入らないものがある」
 *   ことだけ知っていればよい。
 */
export type WorldLineOutside = readonly string[];

/** その姿の中で、外のものが持っている泡の id */
const outsideIds = (snap: SeaSnapshot, outside: WorldLineOutside): ReadonlySet<BubbleId> =>
  new Set(snap.urls.filter(([, o]) => outside.includes(o.url)).map(([id]) => id));

/** 記録する姿から、外のものを抜く（中身ごと） */
export function withoutOutside(snap: SeaSnapshot, outside: WorldLineOutside): SeaSnapshot {
  if (!outside.length) return snap;
  const ids = outsideIds(snap, outside);
  if (!ids.size) return snap;
  const from = BubbleWorld.fromPlain(snap.world);
  let world = from;
  for (const id of ids) for (const k of from.subtreeOf(id)) world = world.without(k);
  return { ...snap, world: world.toPlain(), urls: snap.urls.filter(([id]) => !ids.has(id)) };
}

/**
 * 戻す姿へ、**いまの**外のものを混ぜ直す（＝ 移っても消えない）。
 * 大きさも中身も今のまま ── 節が覚えているものではないので、戻す先が無い。
 *
 * ★ **画面の上では 1px も動かさない。** 海の焦点は節ごとに違うので、置き場所をそのまま
 *   持ち越すと、移った先では**遠くへ飛ばされる** ── 魚眼が掛かっていればそこで潰れ、
 *   「小さすぎる泡は描かない」に掛かって**画面から消える**（実測で踏んだ：戻した直後に
 *   `display:none`）。これでは「移っても消えない」が半分しか守れない。
 *
 *   泡が写る所は「置き場所 − 焦点」で決まるので、**焦点が動いたぶんだけ一緒に動かす**と
 *   差が変わらず、画面の同じ所に**ぴたりと残る**（レンズを通しても同じ点）。
 *   世界線の窓は海に浮かんでいるのではなく、海を**覗くために画面に置いてある**もの ──
 *   海が移っても、窓はその場にある。
 *
 * ★ 動かすのはいちばん外に居るものだけ。中身（親を持つ泡）は親の中の席なので触らない。
 */
export function withOutside(there: SeaSnapshot, now: SeaSnapshot, outside: WorldLineOutside): SeaSnapshot {
  if (!outside.length) return there;
  const ids = outsideIds(now, outside);
  if (!ids.size) return there;
  const live = BubbleWorld.fromPlain(now.world);
  /** 焦点が動いたぶん（戻す先 − いま）。これを置き場所に足すと、写る所が変わらない */
  const df = {
    x: there.world.root.focus.x - now.world.root.focus.x,
    y: there.world.root.focus.y - now.world.root.focus.y,
    z: there.world.root.focus.z - now.world.root.focus.z,
  };
  const keep: Bubble[] = [];
  for (const id of ids)
    for (const k of live.subtreeOf(id)) {
      const b = live.bubble(k);
      if (!b) continue;
      keep.push(
        b.state.parent
          ? b
          : (['x', 'y', 'z'] as const).reduce((acc, a) => (df[a] ? acc.withFree(a, acc.state.free[a] + df[a]) : acc), b),
      );
    }
  return {
    world: BubbleWorld.fromPlain(there.world).withBubbles(keep).toPlain(),
    urls: [...there.urls.filter(([id]) => !ids.has(id)), ...now.urls.filter(([id]) => ids.has(id))],
    // ★ 番号は進めたまま（戻した先で開いた泡が、いま居る泡と id をぶつけないように）
    seq: Math.max(there.seq, now.seq),
  };
}

/** 岸からも同じように抜く（貼った・剥がしたも姿の一部なので） */
export const shoreWithout = (shore: readonly Docked[], outside: WorldLineOutside): readonly Docked[] =>
  outside.length ? shore.filter((d) => !outside.includes(d.url)) : shore;

/**
 * **姿を見分ける印。**
 *
 * ★ `seq`（開いた順の通し番号）は**含めない。** これは「次に開く泡の id がぶつからない
 *   ように」の覚えであって、どう並んでいたかではない ── 戻しても後戻りしない
 *   （戻った先で開いた泡が、昔の id とぶつかっては困る）ので、含めると
 *   **戻した直後に「違う姿だ」と見なして新しい節を書いて**しまい、押した節に留まれない
 *   （実測：古い節を押すと、海は戻るのにすぐ先端へ飛び直した）。
 */
const sealOf = (state: SeaState): string =>
  JSON.stringify({ world: state.snapshot.world, urls: state.snapshot.urls, shore: state.shore });

/**
 * 海の姿を世界線に記録し、節へ移ったら海をその姿に戻す。
 *
 * ★ **書いたものを読み返して、また書かない。** 最後に書いた／戻した姿を覚えておいて、
 *   同じなら何もしない ── これが無いと「記録 → 世界が変わった → 記録」で止まらなくなる。
 */
export function useSeaWorldLine(
  scopeId: string | undefined,
  space: { current: BubbleSpaceApi | null },
  /** いま岸に貼ってあるもの。これが変われば、それだけで 1 つの節目 */
  shore: readonly Docked[],
  setShore: (next: readonly Docked[]) => void,
  /** **世界線に入らないもの**（url。`WorldLineOutside` の註）。渡さなければ、ぜんぶ入る */
  outside: WorldLineOutside = [],
): (why: SettleWhy) => void {
  // scope は名前が要る。使わないときも hook は呼ぶ（呼ぶ数は変えられない）
  const scope = useCasScope(scopeId ?? "");
  /** 最後に記録した／戻した姿の印。往復を止めるのはこれ 1 つ */
  const mark = useRef<string>("");
  /** 岸の**いまの姿**を覚え書きで持つ（記録は描き終えてから呼ばれるので、これで足りる） */
  const shoreRef = useRef(shore);
  shoreRef.current = shore;
  /** 外すもの（url）も同じく覚え書きで ── 配列は描くたびに新しくなるので、頼りにはしない */
  const outsideRef = useRef(outside);
  outsideRef.current = outside;

  const record = useCallback(
    (_why: SettleWhy) => {
      if (!scopeId) return;
      const api = space.current;
      if (!api) return;
      const state: SeaState = {
        id: SEA_ARRANGEMENT_ID,
        // 世界線を映すものは、世界線に入らない（海からも岸からも抜く）
        snapshot: withoutOutside(api.snapshot(), outsideRef.current),
        shore: shoreWithout(shoreRef.current, outsideRef.current),
      };
      const seal = sealOf(state);
      if (seal === mark.current) return;
      mark.current = seal;
      const shell = scope.getShell<SeaArrangement>(SEA_ARRANGEMENT_TYPE, SEA_ARRANGEMENT_ID);
      const next = new SeaArrangement(state);
      if (shell) shell.update(() => next);
      else scope.addObject(SEA_ARRANGEMENT_TYPE, next);
    },
    [scopeId, scope, space],
  );

  /**
   * いま居る節の姿へ戻す。
   *
   * ★ 見るのは**いま居る節（apex）にある姿**だけ ── 節を移ったかどうかは見ない。
   *   自分が書いた姿なら印が同じなので、何もしない。
   */
  const shell = scopeId
    ? scope.getShell<SeaArrangement>(SEA_ARRANGEMENT_TYPE, SEA_ARRANGEMENT_ID)
    : null;
  const there = shell?.object ?? null;
  useEffect(() => {
    if (!there) return;
    const api = space.current;
    if (!api) return;
    const seal = sealOf(there.state);
    if (seal === mark.current) return;
    mark.current = seal;
    const out = outsideRef.current;
    // ★ **外のものは、いまのまま持ち越す。** 節が覚えていないので戻す先が無く、
    //   持ち越さないと「移った瞬間に世界線の泡が消える」（`WorldLineOutside` の註）
    api.restore(withOutside(there.state.snapshot, api.snapshot(), out));
    // 岸を持たない記録（岸を外していた頃の節）では、岸は触らない
    if (there.state.shore)
      setShore([
        ...shoreWithout(there.state.shore, out),
        ...shoreRef.current.filter((d) => out.includes(d.url)),
      ]);
  }, [there, space, setShore]);


  return record;
}
