import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import {
  Bubble,
  BubbleJson,
  createBubble,
} from "../Bubble.domain.js";
import {
  BubblesProcess,
  BubblesProcessState,
} from "../BubblesProcess.domain.js";
import { BubblesProcessDPO } from "../BubblesProcessDPO.js";
import { CoordinateSystemData, CoordinateSystem, Point2, Size2 } from "@bublys-org/bubbles-ui-util";


export type BubblesRelation = {
  openerId: string;
  openeeId: string;
}

/**
 * 1つの universe の中で「どのバブルがどこに開いていて、どう繋がっているか」を
 * ひとまとめに表す plain state。{@link BubbleArrangement} クラスの内部状態。
 *
 * world-line-graph に1オブジェクトとして commit/復元する単位でもある。
 * カメラ/設定(surfaceLeftTop, globalCoordinateSystem)や transient(renderCount,
 * animatingBubbleIds)は含めない。
 */
export type BubbleArrangementState = {
  bubbles: Record<string, BubbleJson>;
  bubbleRelations: BubblesRelation[];
  process: BubblesProcessState;
}

export type OpeningPosition = "right-side" | "left-side" | "top-side" | "bottom-side" | "origin-side";

export type PopChildPayload = {
  bubbleId: string;
  openingPosition?: OpeningPosition;
}

/**
 * 1つの universe（バブルが住む空間）の状態。
 * 再帰的 universe に向け、universe ごとにこの単位を持つ。
 */
export interface UniverseState {
  bubbles: Record<string, BubbleJson>;
  process: BubblesProcessState;
  bubbleRelations: BubblesRelation[];
  globalCoordinateSystem: CoordinateSystemData;
  surfaceLeftTop: Point2; // surface領域の universe 上での起点（奥のレイヤーをどれだけ覗かせるか）
}

/** ルート universe の ID。ネストした universe は別 ID を持つ。 */
export const ROOT_UNIVERSE_ID = "root";

/**
 * Normalized slice state:
 * - universes: universeId ごとの UniverseState
 * - renderCount / animatingBubbleIds: universe をまたぐ transient な状態
 */
export interface BubbleStateSlice {
  universes: Record<string, UniverseState>;

  renderCount: number; //レンダリングが発生した回数。UIの強制再レンダリングに使う

  animatingBubbleIds: string[]; // アニメーション中のバブルID（リンクバブル非表示用）
}

// --- Initial bubbles configuration ---
// 各アプリがストア作成前に設定可能
let configuredInitialBubbleUrls: string[] = ["user-groups", "users"];

/**
 * 初期バブルのURLを設定する（slice注入前に呼び出す）
 */
export const setInitialBubbleUrls = (urls: string[]) => {
  configuredInitialBubbleUrls = urls;
};

/** 空の universe を作る */
const createEmptyUniverse = (): UniverseState => ({
  bubbles: {},
  process: { layers: [] },
  bubbleRelations: [],
  globalCoordinateSystem: CoordinateSystem.GLOBAL.toData(),
  surfaceLeftTop: { x: 100, y: 100 },
});

// 初期状態を構築する関数（遅延評価）
const getInitialState = (): BubbleStateSlice => {
  const bubbleInstances = configuredInitialBubbleUrls.map((url, index) => {
    return createBubble(url, { x: index * 400, y: 0 });
  });

  const entities: Record<string, BubbleJson> = {};
  bubbleInstances.forEach((b) => {
    entities[b.id] = b.toJSON();
  });

  const process: BubblesProcessState = {
    layers: bubbleInstances.map((b) => [b.id]),
  };

  return {
    universes: {
      [ROOT_UNIVERSE_ID]: {
        bubbles: entities,
        process,
        bubbleRelations: [],
        globalCoordinateSystem: CoordinateSystem.GLOBAL.toData(),
        surfaceLeftTop: { x: 100, y: 100 },
      },
    },
    renderCount: 0,
    animatingBubbleIds: [],
  };
};

// draft state から universe を取得（無ければ作る）
const draftUniverse = (
  state: BubbleStateSlice,
  universeId: string,
): UniverseState => {
  let u = state.universes[universeId];
  if (!u) {
    u = createEmptyUniverse();
    state.universes[universeId] = u;
  }
  return u;
};

// 各 universe スコープのアクションは meta に universeId を載せる（省略時 root）。
// これにより既存の dispatch(addBubble(json)) は root のまま、
// ネストは dispatch(addBubble(json, universeId)) で対象 universe を指定できる。
type UniverseMeta = { universeId: string };
const withU = <P>(payload: P, universeId: string = ROOT_UNIVERSE_ID) => ({
  payload,
  meta: { universeId },
});
// 型付き prepare（payload 型を具体化しないと action creator の payload が unknown になる）
const prepStr = (payload: string, universeId?: string) => withU(payload, universeId);
const prepBubble = (payload: BubbleJson, universeId?: string) => withU(payload, universeId);
const prepRelation = (payload: BubblesRelation, universeId?: string) => withU(payload, universeId);
const prepPopChild = (payload: PopChildPayload, universeId?: string) => withU(payload, universeId);
const prepCoord = (payload: CoordinateSystemData, universeId?: string) => withU(payload, universeId);
const prepPoint = (payload: Point2, universeId?: string) => withU(payload, universeId);
const prepView = (payload: BubbleArrangementState, universeId?: string) => withU(payload, universeId);
const prepNavigate = (payload: { id: string; url: string }, universeId?: string) => withU(payload, universeId);

export const bubblesSlice = createSlice({
  name: "bubbleState",
  initialState: getInitialState,
  reducers: {
    // Process-only actions
    deleteProcessBubble: {
      reducer: (state, action: PayloadAction<string, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.process = BubblesProcess.fromJSON(u.process)
          .deleteBubble(action.payload)
          .toJSON();
        state.renderCount += 1;
      },
      prepare: prepStr,
    },
    layerDown: {
      reducer: (state, action: PayloadAction<string, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.process = BubblesProcess.fromJSON(u.process)
          .layerDown(action.payload)
          .toJSON();
        state.renderCount += 1;
      },
      prepare: prepStr,
    },
    layerUp: {
      reducer: (state, action: PayloadAction<string, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.process = BubblesProcess.fromJSON(u.process)
          .layerUp(action.payload)
          .toJSON();
        state.renderCount += 1;
      },
      prepare: prepStr,
    },

    popChild: {
      reducer: (state, action: PayloadAction<PopChildPayload, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        const process = BubblesProcess.fromJSON(u.process);
        const poppedProcess = process.popChild(action.payload.bubbleId);
        u.process = poppedProcess.toJSON();
        state.renderCount += 1;
        // アニメーション対象のバブルIDを追加（重複防止）
        if (!state.animatingBubbleIds.includes(action.payload.bubbleId)) {
          state.animatingBubbleIds.push(action.payload.bubbleId);
        }
      },
      prepare: prepPopChild,
    },

    popChildMax: {
      reducer: (state, action: PayloadAction<string, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        const process = BubblesProcess.fromJSON(u.process);
        const poppedProcess = process.popChild(action.payload);

        u.process = poppedProcess.toJSON();
        state.renderCount += 1;
        // アニメーション対象のバブルIDを追加（重複防止）
        if (!state.animatingBubbleIds.includes(action.payload)) {
          state.animatingBubbleIds.push(action.payload);
        }
      },
      prepare: prepStr,
    },


    joinSibling: {
      reducer: (state, action: PayloadAction<string, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.process = BubblesProcess.fromJSON(u.process)
          .joinSibling(action.payload)
          .toJSON();
        state.renderCount += 1;
      },
      prepare: prepStr,
    },

    finishBubbleAnimation: (state, action: PayloadAction<string>) => {
      state.animatingBubbleIds = state.animatingBubbleIds.filter(id => id !== action.payload);
    },

    // フォールバック：全てのアニメーション状態をクリア
    clearAllAnimations: (state) => {
      state.animatingBubbleIds = [];
    },

    focusBubble: {
      reducer: (state, action: PayloadAction<string, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.process = BubblesProcess.fromJSON(u.process).focus(action.payload).toJSON();
      },
      prepare: prepStr,
    },

    // Entity-only actions
    addBubble: {
      reducer: (state, action: PayloadAction<BubbleJson, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.bubbles[action.payload.id] = action.payload;
        state.renderCount += 1;
      },
      prepare: prepBubble,
    },
    updateBubble: {
      reducer: (state, action: PayloadAction<BubbleJson, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        // 既存バブルのみ更新。world-line rehydrate で削除済みのバブルへ向けて
        // stale な async listener が dispatch しても復活させない（履歴トレイル汚染を防ぐ）。
        if (!u.bubbles[action.payload.id]) return;
        u.bubbles[action.payload.id] = action.payload;
        state.renderCount += 1;
      },
      prepare: prepBubble,
    },
    renderBubble: {
      reducer: (state, action: PayloadAction<BubbleJson, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        // 同上: 削除済みバブルへの renderedRect 通知は無視。
        if (!u.bubbles[action.payload.id]) return;
        u.bubbles[action.payload.id] = action.payload;
      },
      prepare: prepBubble,
    },
    // バブルの url 遷移（ナビゲーション）: 既存バブルの url だけを差し替える。
    // url はルート解決の入力なので、これで中身が別ビューへ遷移する。
    navigateBubble: {
      reducer: (state, action: PayloadAction<{ id: string; url: string }, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        const b = u.bubbles[action.payload.id];
        if (!b || b.url === action.payload.url) return;
        b.url = action.payload.url;
        state.renderCount += 1;
      },
      prepare: prepNavigate,
    },

    // Combined action
    removeBubble: {
      reducer: (state, action: PayloadAction<string, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        const removingId = action.payload;
        delete u.bubbles[removingId];
        state.renderCount += 1;

        u.bubbleRelations = u.bubbleRelations.filter(
          relation => relation.openerId !== removingId && relation.openeeId !== removingId
        );

        // Remove from process layers
        u.process.layers = u.process.layers.map(
          layer => layer.filter(id => id !== removingId)
        ).filter(layer => layer.length > 0);  // Remove empty layers

        // レイヤー移動アニメーションが発生するので、ダミーIDを追加
        // （フォールバックタイマーでクリアされる）
        if (!state.animatingBubbleIds.includes('__removing__')) {
          state.animatingBubbleIds.push('__removing__');
        }
      },
      prepare: prepStr,
    },
    relateBubbles: {
      reducer: (state, action: PayloadAction<BubblesRelation, string, UniverseMeta>) => {
        //重複がないようにチェックが必要そう
        if (action.payload.openerId === "root") {
          return;
        }
        const u = draftUniverse(state, action.meta.universeId);
        u.bubbleRelations.push(action.payload);
      },
      prepare: prepRelation,
    },
    setGlobalCoordinateSystem: {
      reducer: (state, action: PayloadAction<CoordinateSystemData, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.globalCoordinateSystem = action.payload;
      },
      prepare: prepCoord,
    },
    setSurfaceLeftTop: {
      reducer: (state, action: PayloadAction<Point2, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.surfaceLeftTop = action.payload;
      },
      prepare: prepPoint,
    },
    // world-line から復元した arrangement を丸ごと差し戻す
    replaceBubbleArrangement: {
      reducer: (state, action: PayloadAction<BubbleArrangementState, string, UniverseMeta>) => {
        const u = draftUniverse(state, action.meta.universeId);
        u.bubbles = action.payload.bubbles;
        u.bubbleRelations = action.payload.bubbleRelations;
        u.process = action.payload.process;
        state.renderCount += 1;
      },
      prepare: prepView,
    },
  },
});

export const {
  deleteProcessBubble,
  layerDown,
  layerUp,
  popChild: popChildInProcess,
  popChildMax: popChildMaxInProcess,
  joinSibling: joinSiblingInProcess,
  addBubble,
  updateBubble,
  renderBubble,
  navigateBubble,
  removeBubble,
  relateBubbles,
  setGlobalCoordinateSystem,
  setSurfaceLeftTop,
  replaceBubbleArrangement,
  finishBubbleAnimation,
  clearAllAnimations,
  focusBubble,
} = bubblesSlice.actions;

// ============================================================================
// Selectors
//
// universe スコープのセレクタは make...(universeId) ファクトリ（universeId ごとに
// メモ化）。既存の selectX / 入力セレクタは root universe を指す別名で、
// 呼び出し側は無変更のまま動く。
// ============================================================================

// 未生成 universe を読んでも壊れないよう安定した空 universe を返す
const EMPTY_UNIVERSE: UniverseState = createEmptyUniverse();
const universeOf = (
  state: { bubbleState: BubbleStateSlice },
  universeId: string,
): UniverseState => state.bubbleState.universes[universeId] ?? EMPTY_UNIVERSE;

const rootUniverse = (state: { bubbleState: BubbleStateSlice }): UniverseState =>
  universeOf(state, ROOT_UNIVERSE_ID);

// universeId でメモ化するファクトリヘルパー
const memoizeByUniverse = <T>(build: (universeId: string) => T) => {
  const cache = new Map<string, T>();
  return (universeId: string): T => {
    let v = cache.get(universeId);
    if (v === undefined) {
      v = build(universeId);
      cache.set(universeId, v);
    }
    return v;
  };
};

export const selectBubble = (
  state: { bubbleState: BubbleStateSlice },
  { id, universeId = ROOT_UNIVERSE_ID }: { id: string; universeId?: string },
) => Bubble.fromJSON(universeOf(state, universeId).bubbles[id]);

export const selectRenderCount = (state: { bubbleState: BubbleStateSlice }) =>
  state.bubbleState.renderCount;

// 基本セレクター（入力セレクター）: universeId ファクトリ + root 別名
const makeSelectBubblesJson = memoizeByUniverse(
  (uid) => (state: { bubbleState: BubbleStateSlice }) => universeOf(state, uid).bubbles,
);
const makeSelectProcessJson = memoizeByUniverse(
  (uid) => (state: { bubbleState: BubbleStateSlice }) => universeOf(state, uid).process,
);
const makeSelectBubbleRelationsRaw = memoizeByUniverse(
  (uid) => (state: { bubbleState: BubbleStateSlice }) => universeOf(state, uid).bubbleRelations,
);
const selectBubblesJson = makeSelectBubblesJson(ROOT_UNIVERSE_ID);
const selectProcessJson = makeSelectProcessJson(ROOT_UNIVERSE_ID);
const selectBubbleRelationsRaw = makeSelectBubbleRelationsRaw(ROOT_UNIVERSE_ID);

/**
 * 「いま universe に居る = process.layers に出現する」バブル ID の集合を計算する。
 *
 * これに含まれないバブルは「孤児」とみなして arrangement から落とす。世界線への
 * commit/rehydrate サイクルで「見えているものとデータが揃う」状態に収束する。
 */
const collectLivingIds = (process: BubblesProcessState): Set<string> => {
  const ids = new Set<string>();
  for (const layer of process.layers) {
    for (const id of layer) ids.add(id);
  }
  return ids;
};

/**
 * 生のスライス状態から「universe の今の見かけ」と一致する arrangement を作る。
 *
 * - bubbles: process.layers に居る ID だけ残す（孤児を捨てる）
 *   ＋ renderedRect は計測由来の派生値なので落とす（含めると commit ループ）
 * - bubbleRelations: opener / openee がともに生きている関係だけ残す
 *
 * 結果として「`bubbles` のキー集合 ⊇ `process.layers` のID集合」
 * かつ「`bubbleRelations` の両端が `bubbles` に存在」というインバリアントが
 * 出力に成立する（このセレクタの出力を世界線に乗せ、復元時に
 * replaceBubbleArrangement で書き戻せば、in-memory state も同じ形に収束する）。
 */
const projectArrangement = (
  bubbles: Record<string, BubbleJson>,
  bubbleRelations: BubblesRelation[],
  process: BubblesProcessState,
): BubbleArrangementState => {
  const living = collectLivingIds(process);
  const arrangementBubbles: Record<string, BubbleJson> = {};
  for (const id of living) {
    const b = bubbles[id];
    if (!b) continue; // ID は layer に居るが entity が消えている → 落とす
    const { renderedRect: _renderedRect, ...rest } = b;
    arrangementBubbles[id] = rest;
  }
  const livingRelations = bubbleRelations.filter(
    (r) => living.has(r.openerId) && living.has(r.openeeId),
  );
  return { bubbles: arrangementBubbles, bubbleRelations: livingRelations, process };
};

/**
 * world-line に commit する arrangement（= 表示状態）を返す。
 * メモ化済み: bubbles / relations / process のいずれかが変わった時だけ再計算。
 *
 * 「`process.layers` に居ないバブル = 孤児」は捨てて、見えているものとデータを
 * 揃える（commit/rehydrate サイクルで in-memory state も収束する）。
 *
 * 各バブルの renderedRect は「計測由来の派生値」で毎フレーム更新されるため、
 * arrangement からは除外する（含めると測定のたびに commit が走ってしまう）。
 * 復元後はレンダリングで再計測されるので失われても問題ない。
 */
export const selectBubbleArrangement = createSelector(
  [selectBubblesJson, selectBubbleRelationsRaw, selectProcessJson],
  projectArrangement,
);

/**
 * サーフェスバブルのIDリストを返す（パフォーマンス最適化版）
 * Bubbleオブジェクトの生成を避ける
 */
export const selectSurfaceBubbleIds = createSelector(
  [selectProcessJson, selectBubblesJson],
  (processJson, bubblesJson): string[] => {
    const process = BubblesProcess.fromJSON(processJson);
    const surfaceIds = process.surface || [];
    return surfaceIds.filter(id => bubblesJson[id] !== undefined);
  }
);

export const selectSurfaceBubbles = createSelector(
  [selectProcessJson, selectBubblesJson],
  (processJson, bubblesJson) => {
    const process = BubblesProcess.fromJSON(processJson);
    const surfaceIds = process.surface || [];
    return surfaceIds
      .filter(id => bubblesJson[id] !== undefined)
      .map(id => Bubble.fromJSON(bubblesJson[id]));
  }
);

/**
 * 最後の兄弟バブル（サーフェスの最後のバブル）のrenderedRectを取得
 * joinSiblingリスナー用の最適化セレクター
 */
export const selectLastSiblingRenderedRect = createSelector(
  [selectProcessJson, selectBubblesJson],
  (processJson, bubblesJson) => {
    const process = BubblesProcess.fromJSON(processJson);
    const surfaceIds = process.surface || [];
    if (surfaceIds.length === 0) return undefined;

    const lastId = surfaceIds[surfaceIds.length - 1];
    const bubbleJson = bubblesJson[lastId];
    if (!bubbleJson) return undefined;

    // renderedRectだけを返す（Bubbleオブジェクト全体を作らない）
    return bubbleJson.renderedRect
      ? { bubbleId: lastId, renderedRect: Bubble.fromJSON(bubbleJson).renderedRect }
      : undefined;
  }
);

export const selectBubblesRelations = (state: { bubbleState: BubbleStateSlice }) => {
  return rootUniverse(state).bubbleRelations;
}

export const selectBubblesRelationByOpeneeId = (
  state: { bubbleState: BubbleStateSlice },
  { openeeId, universeId = ROOT_UNIVERSE_ID }: { openeeId: string; universeId?: string },
) => {
  return universeOf(state, universeId).bubbleRelations.find(relation => relation.openeeId === openeeId);
}

/**
 * @deprecated パフォーマンス問題のため、代わりに selectValidBubbleRelationIds を使用してください
 */
export const selectBubblesRelationsWithBubble = createSelector(
  [selectBubbleRelationsRaw, selectBubblesJson],
  (relations, bubblesJson) => {
    return relations
      .filter(relation => bubblesJson[relation.openerId] && bubblesJson[relation.openeeId])
      .map(relation => ({
        opener: Bubble.fromJSON(bubblesJson[relation.openerId]),
        openee: Bubble.fromJSON(bubblesJson[relation.openeeId]),
      }));
  }
);

/**
 * 有効なバブル関係のIDペアのみを返す（パフォーマンス最適化版）
 * Bubbleオブジェクトの生成は各LinkBubbleViewで行う
 */
export const selectValidBubbleRelationIds = createSelector(
  [selectBubbleRelationsRaw, selectBubblesJson],
  (relations, bubblesJson): Array<{ openerId: string; openeeId: string }> => {
    return relations.filter(
      relation => bubblesJson[relation.openerId] && bubblesJson[relation.openeeId]
    );
  }
);

const selectGlobalCoordinateSystemData = (state: { bubbleState: BubbleStateSlice }): CoordinateSystemData => {
  return rootUniverse(state).globalCoordinateSystem;
}

export const selectGlobalCoordinateSystem = createSelector(
  [selectGlobalCoordinateSystemData],
  (data): CoordinateSystem => CoordinateSystem.fromData(data)
);

export const selectSurfaceLeftTop = (state: { bubbleState: BubbleStateSlice }): Point2 => {
  return rootUniverse(state).surfaceLeftTop;
}

/**
 * Returns the layerIndex of a bubble by its ID.
 * Returns -1 if the bubble is not found in any layer.
 */
export const selectBubbleLayerIndex = (state: { bubbleState: BubbleStateSlice }, { id }: { id: string }): number => {
  const process = BubblesProcess.fromJSON(rootUniverse(state).process);
  const layers = process.layers;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    if (layers[layerIndex].includes(id)) {
      return layerIndex;
    }
  }

  return -1; // not found
}

/**
 * Returns a BubblesProcessDPO instance for the given state.
 * Memoized to prevent unnecessary re-renders.
 */
export const selectBubblesProcessDPO = createSelector(
  [selectBubblesJson, selectProcessJson],
  (bubblesJson, processJson): BubblesProcessDPO => {
    const bubbles = Object.values(bubblesJson).map((s) => Bubble.fromJSON(s));
    const processInstance = BubblesProcess.fromJSON(processJson);
    return new BubblesProcessDPO(processInstance, bubbles);
  }
);

export const selectIsLayerAnimating = (state: { bubbleState: BubbleStateSlice }): boolean => {
  return state.bubbleState.animatingBubbleIds.length > 0;
}

/**
 * レイヤー構造（IDの配列のみ）を返す
 * バブルインスタンスは含まない - 各BubbleViewが個別に取得する
 */
export const selectBubbleLayers = createSelector(
  [selectProcessJson],
  (processJson): string[][] => {
    const process = BubblesProcess.fromJSON(processJson);
    return process.layers;
  }
);

/**
 * 個別バブルをIDで取得するセレクターファクトリー
 * 各バブルごとにメモ化され、そのバブルが変わった時だけ再計算
 */
type BubbleByIdSelector = (state: { bubbleState: BubbleStateSlice }) => Bubble | undefined;
const bubbleSelectorCache = new Map<string, BubbleByIdSelector>();

export const makeSelectBubbleById = (bubbleId: string): BubbleByIdSelector => {
  if (!bubbleSelectorCache.has(bubbleId)) {
    const selector = createSelector(
      [(state: { bubbleState: BubbleStateSlice }) => rootUniverse(state).bubbles[bubbleId]],
      (bubbleJson): Bubble | undefined => {
        if (!bubbleJson) return undefined;
        return Bubble.fromJSON(bubbleJson);
      }
    );
    bubbleSelectorCache.set(bubbleId, selector);
  }
  return bubbleSelectorCache.get(bubbleId)!;
};

/**
 * 個別バブルのlayerIndexを取得するセレクターファクトリー
 */
type LayerIndexSelector = (state: { bubbleState: BubbleStateSlice }) => number;
const layerIndexSelectorCache = new Map<string, LayerIndexSelector>();

export const makeSelectBubbleLayerIndex = (bubbleId: string): LayerIndexSelector => {
  if (!layerIndexSelectorCache.has(bubbleId)) {
    const selector = createSelector(
      [selectProcessJson],
      (processJson): number => {
        const process = BubblesProcess.fromJSON(processJson);
        const layers = process.layers;
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
          if (layers[layerIndex].includes(bubbleId)) {
            return layerIndex;
          }
        }
        return -1;
      }
    );
    layerIndexSelectorCache.set(bubbleId, selector);
  }
  return layerIndexSelectorCache.get(bubbleId)!;
};

// ============================================================================
// universe スコープのセレクタファクトリ（ネストした universe のレンダリング用）
// 上の root 用 selectX は make...(ROOT) と等価。
// ============================================================================

export const makeSelectFocusedBubbleId = memoizeByUniverse(
  (uid) => (state: { bubbleState: BubbleStateSlice }): string | undefined =>
    universeOf(state, uid).process.focusedBubbleId,
);

export const makeSelectBubbleLayers = memoizeByUniverse((uid) =>
  createSelector([makeSelectProcessJson(uid)], (processJson): string[][] =>
    BubblesProcess.fromJSON(processJson).layers,
  ),
);

export const makeSelectValidBubbleRelationIds = memoizeByUniverse((uid) =>
  createSelector(
    [makeSelectBubbleRelationsRaw(uid), makeSelectBubblesJson(uid)],
    (relations, bubblesJson): Array<{ openerId: string; openeeId: string }> =>
      relations.filter((r) => bubblesJson[r.openerId] && bubblesJson[r.openeeId]),
  ),
);

export const makeSelectGlobalCoordinateSystem = memoizeByUniverse((uid) =>
  createSelector(
    [(state: { bubbleState: BubbleStateSlice }) => universeOf(state, uid).globalCoordinateSystem],
    (data): CoordinateSystem => CoordinateSystem.fromData(data),
  ),
);

export const makeSelectSurfaceLeftTop = memoizeByUniverse(
  (uid) => (state: { bubbleState: BubbleStateSlice }): Point2 => universeOf(state, uid).surfaceLeftTop,
);

export const makeSelectSurfaceBubbles = memoizeByUniverse((uid) =>
  createSelector([makeSelectProcessJson(uid), makeSelectBubblesJson(uid)], (processJson, bubblesJson) => {
    const process = BubblesProcess.fromJSON(processJson);
    const surfaceIds = process.surface || [];
    return surfaceIds
      .filter((id) => bubblesJson[id] !== undefined)
      .map((id) => Bubble.fromJSON(bubblesJson[id]));
  }),
);

export const makeSelectSurfaceBubbleIds = memoizeByUniverse((uid) =>
  createSelector([makeSelectProcessJson(uid), makeSelectBubblesJson(uid)], (processJson, bubblesJson): string[] => {
    const surfaceIds = BubblesProcess.fromJSON(processJson).surface || [];
    return surfaceIds.filter((id) => bubblesJson[id] !== undefined);
  }),
);

/**
 * バブルの配置から universe のスクロール可能領域サイズを計算する。
 * 「無限スクロール」だが、バブルが置かれている範囲までで止まり、何もない void に
 * scroll してバブルを見失う事態を防ぐ。
 *
 * bubble.position は surface 層 local。表示上は surfaceLeftTop を加えた値で
 * StyledUniverse 内に絶対配置される。サイズが未確定（renderedRect 無し）の
 * バブルは仮サイズ DEFAULT_FALLBACK_BUBBLE_SIZE で見積もる。
 */
const UNIVERSE_MIN_SIZE: Size2 = { width: 2000, height: 1500 };
const DEFAULT_FALLBACK_BUBBLE_SIZE: Size2 = { width: 400, height: 300 };

export const makeSelectUniverseDimensions = memoizeByUniverse((uid) =>
  createSelector(
    [makeSelectBubblesJson(uid), makeSelectSurfaceLeftTop(uid)],
    (bubblesJson, surfaceLeftTop): Size2 => {
      let maxRight = UNIVERSE_MIN_SIZE.width;
      let maxBottom = UNIVERSE_MIN_SIZE.height;
      for (const b of Object.values(bubblesJson)) {
        const x = b.position?.x ?? 0;
        const y = b.position?.y ?? 0;
        const w = b.size?.width ?? b.renderedRect?.width ?? DEFAULT_FALLBACK_BUBBLE_SIZE.width;
        const h = b.size?.height ?? b.renderedRect?.height ?? DEFAULT_FALLBACK_BUBBLE_SIZE.height;
        const right = surfaceLeftTop.x + x + w;
        const bottom = surfaceLeftTop.y + y + h;
        if (right > maxRight) maxRight = right;
        if (bottom > maxBottom) maxBottom = bottom;
      }
      return { width: maxRight, height: maxBottom };
    },
  ),
);

export const makeSelectLastSiblingRenderedRect = memoizeByUniverse((uid) =>
  createSelector([makeSelectProcessJson(uid), makeSelectBubblesJson(uid)], (processJson, bubblesJson) => {
    const surfaceIds = BubblesProcess.fromJSON(processJson).surface || [];
    if (surfaceIds.length === 0) return undefined;
    const lastId = surfaceIds[surfaceIds.length - 1];
    const bubbleJson = bubblesJson[lastId];
    if (!bubbleJson) return undefined;
    return bubbleJson.renderedRect
      ? { bubbleId: lastId, renderedRect: Bubble.fromJSON(bubbleJson).renderedRect }
      : undefined;
  }),
);

export const makeSelectBubbleArrangementForUniverse = memoizeByUniverse((uid) =>
  createSelector(
    [makeSelectBubblesJson(uid), makeSelectBubbleRelationsRaw(uid), makeSelectProcessJson(uid)],
    projectArrangement,
  ),
);

// --- universe スコープの個別バブルセレクタ（cache キー = universeId:bubbleId） ---
const universeBubbleByIdCache = new Map<string, BubbleByIdSelector>();
export const makeSelectBubbleByIdInUniverse = (universeId: string, bubbleId: string): BubbleByIdSelector => {
  const key = `${universeId}:${bubbleId}`;
  if (!universeBubbleByIdCache.has(key)) {
    universeBubbleByIdCache.set(
      key,
      createSelector(
        [(state: { bubbleState: BubbleStateSlice }) => universeOf(state, universeId).bubbles[bubbleId]],
        (bubbleJson): Bubble | undefined => (bubbleJson ? Bubble.fromJSON(bubbleJson) : undefined),
      ),
    );
  }
  return universeBubbleByIdCache.get(key)!;
};

const universeLayerIndexCache = new Map<string, LayerIndexSelector>();
export const makeSelectBubbleLayerIndexInUniverse = (universeId: string, bubbleId: string): LayerIndexSelector => {
  const key = `${universeId}:${bubbleId}`;
  if (!universeLayerIndexCache.has(key)) {
    universeLayerIndexCache.set(
      key,
      createSelector([makeSelectProcessJson(universeId)], (processJson): number => {
        const layers = BubblesProcess.fromJSON(processJson).layers;
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
          if (layers[layerIndex].includes(bubbleId)) return layerIndex;
        }
        return -1;
      }),
    );
  }
  return universeLayerIndexCache.get(key)!;
};

export default bubblesSlice.reducer;

// rootReducerにbubblesSliceを動的に注入する関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const injectBubblesSlice = (rootReducer: any) => {
  bubblesSlice.injectInto(rootReducer);
};
