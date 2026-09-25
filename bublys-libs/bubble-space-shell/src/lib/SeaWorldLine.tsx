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
 * ★ 記録するのは**海の姿まるごと**（`SeaSnapshot`）── 差分ではない。
 *   泡は増えも減りもするので、差分で持つと「どの時点の何に対する差か」を別に持つ羽目になる。
 *   姿は小さい（泡の箱と url だけ）ので、丸ごとで困らない。
 */
import { useCallback, useEffect, useRef } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { defineDomainObjects } from "@bublys-org/domain-registry";
import type { BubbleSpaceApi, SeaSnapshot, SettleWhy } from "@bublys-org/bubble-layout-feature";

/** 世界線に置く「海の姿」。1 つの scope に 1 つだけ居る（id は固定） */
export class SeaArrangement {
  constructor(readonly state: { readonly id: string; readonly snapshot: SeaSnapshot }) {}

  get id(): string {
    return this.state.id;
  }

  /** その時点で海に浮かんでいた泡の数（節目の要約に使う） */
  get count(): number {
    return this.state.snapshot.urls.length;
  }

  toPlain(): { id: string; snapshot: SeaSnapshot } {
    return { id: this.state.id, snapshot: this.state.snapshot };
  }

  static fromPlain(plain: { id: string; snapshot: SeaSnapshot }): SeaArrangement {
    return new SeaArrangement(plain);
  }
}

export const SEA_ARRANGEMENT_TYPE = "sea-arrangement";
/** scope（海）ごとに 1 つなので、id は固定でよい */
export const SEA_ARRANGEMENT_ID = "sea";

export const SEA_ARRANGEMENT_DOMAIN = defineDomainObjects({
  [SEA_ARRANGEMENT_TYPE]: {
    class: SeaArrangement,
    fromJSON: (json: unknown) => SeaArrangement.fromPlain(json as { id: string; snapshot: SeaSnapshot }),
    toJSON: (a: SeaArrangement) => a.toPlain(),
    getId: (a: SeaArrangement) => a.id,
  },
});

/**
 * 海の姿を世界線に記録し、節へ移ったら海をその姿に戻す。
 *
 * ★ **書いたものを読み返して、また書かない。** 最後に書いた／戻した姿を覚えておいて、
 *   同じなら何もしない ── これが無いと「記録 → 世界が変わった → 記録」で止まらなくなる。
 */
export function useSeaWorldLine(
  scopeId: string | undefined,
  space: { current: BubbleSpaceApi | null },
): (why: SettleWhy) => void {
  // scope は名前が要る。使わないときも hook は呼ぶ（呼ぶ数は変えられない）
  const scope = useCasScope(scopeId ?? "");
  /** 最後に記録した／戻した姿の印。往復を止めるのはこれ 1 つ */
  const mark = useRef<string>("");

  const record = useCallback(
    (_why: SettleWhy) => {
      if (!scopeId) return;
      const api = space.current;
      if (!api) return;
      const snapshot = api.snapshot();
      const seal = JSON.stringify(snapshot);
      if (seal === mark.current) return;
      mark.current = seal;
      const shell = scope.getShell<SeaArrangement>(SEA_ARRANGEMENT_TYPE, SEA_ARRANGEMENT_ID);
      const next = new SeaArrangement({ id: SEA_ARRANGEMENT_ID, snapshot });
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
    const seal = JSON.stringify(there.state.snapshot);
    if (seal === mark.current) return;
    mark.current = seal;
    api.restore(there.state.snapshot);
  }, [there, space]);

  return record;
}
