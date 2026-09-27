import {environmentSlice} from "./slices/environment-slice.js";
import { combineSlices, configureStore, Slice, Middleware } from "@reduxjs/toolkit";

import { persistStore, persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import storage from "redux-persist/es/storage"; // defaults to localStorage for web

import { counterSlice } from "./slices/counter-slice.js";
import { worldSlice } from "./slices/world-slice.js";
import { pocketSlice } from "./slices/pocket-slice.js";

//iframe-slices
import appReducer from './iframe-slices/apps.slice.js';
import exportDataReducer from './iframe-slices/exportData.slice.js';
import massageReducer from './iframe-slices/massages.slice.js';
import bublysContainersReducer from './iframe-slices/bublysContainers.slice.js';

// LazyLoadedSlices: 外部ライブラリからinjectIntoで注入されるsliceの型
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
export interface LazyLoadedSlices {}

// Reducers 定義（combineSlicesを使用）
export const rootReducer = combineSlices(
  counterSlice,
  worldSlice,
  environmentSlice,
  /**
   * ★ **メモのスライスは外した。** 置いてはあったが、**誰も読み書きしていなかった**
   *   ── OS のメモ（`memo-bubly`）は世界線の中（scope `memo:<id>`）に持っていて、
   *   単体のメモアプリ（`apps/memo`）は自分の `memo-state` を持っている。
   *   ここに残っていたのは、どちらにも繋がっていない 3 つ目の写しだった。
   */
  pocketSlice,
  // iframe-slices（単純なreducer）
  {
    app: appReducer,
    exportData: exportDataReducer,
    massage: massageReducer,
    bublysContainers: bublysContainersReducer,
  }
).withLazyLoadedSlices<LazyLoadedSlices>();

// RootState を rootReducer から推論
// LazyLoadedSlicesは必須として扱う（基盤ライブラリは常に注入される前提）
export type RootState = ReturnType<typeof rootReducer> & LazyLoadedSlices;

// 外部から注入されるsliceとmiddlewareを保持
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const injectedSlices: Slice[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const injectedMiddlewares: Middleware[] = [];
const injectedBlacklist: string[] = [];

/**
 * 外部ライブラリから slice を注入する。**注入はここ 1 か所を通す**
 * （`slice.injectInto(rootReducer)` を直に呼ばない）。
 *
 * - 同じ slice を二重注入しても 1 回しか登録しない（複数のバブリ／ライブラリが
 *   同じ初期化関数を呼ぶケースに耐えるため）
 * - ★ **差し替えだと言っておく**（`overrideExisting`）。開発中は HMR で slice の模型が
 *   作り直されるので、**同じ場所に別の reducer** が来る ── 黙っていると Redux Toolkit が
 *   「上書きするなら言え」と警告を出し続ける。作り直されたのは同じ slice なので、
 *   新しいほうで差し替えるのが正しい。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const injectSlice = (slice: Slice) => {
  if (injectedSlices.includes(slice)) return;
  injectedSlices.push(slice);
  slice.injectInto(rootReducer, { overrideExisting: true });
};

/**
 * **いま注ぎ込まれている置き場の名前**（`reducerPath`）。
 *
 * 読む前と後で見比べると「この読み込みで増えた置き場」が分かる ── バブリが
 * どの置き場を持ち込んだかは、それでしか知れない（注入は読み込みの最中に
 * 副作用として起きるので、誰が注いだかはどこにも書かれていない）。
 */
export const injectedSlicePaths = (): string[] => injectedSlices.map((s) => s.reducerPath);

/**
 * **名指しした置き場だけ、初期値へ戻す。**
 *
 * ★ 消すのではなく**忘れる**。その名前を状態から外すと、次にその reducer が
 *   呼ばれたとき `undefined` を受け取るので、自分で初期値を作り直す
 *   ── 置き場ごとに「消す」動作を書かせなくて済む（バブリ側に何も要らない）。
 * ★ `localStorage` は触らない。保存は状態についてくるので、戻した状態がそのまま書かれる。
 */
export const CLEAR_SLICES = "store/clearSlices" as const;
export const clearSlices = (paths: readonly string[]) => ({ type: CLEAR_SLICES, payload: paths });

/**
 * 外部ライブラリから middleware を注入する。
 * 同じ middleware を二重注入しても 1 回しか登録しない。
 */
export const injectMiddleware = (middleware: Middleware) => {
  if (injectedMiddlewares.includes(middleware)) return;
  injectedMiddlewares.push(middleware);
};

/**
 * persist blacklist に reducerPath を追加する（重複は無視）。
 */
export const addToBlacklist = (reducerPath: string) => {
  if (injectedBlacklist.includes(reducerPath)) return;
  injectedBlacklist.push(reducerPath);
};

// Store 作成関数
export const makeStore = (options?: { persistKey?: string }) => {
  const persistConfig = {
    key: options?.persistKey ?? 'root',
    storage,
    /**
     * ★ `memo` は**外したスライスの置き土産**。前に保存した人の localStorage には
     *   まだ入っていて、読み戻すと「知らない鍵だ」と毎回言われる
     *   （`Unexpected key "memo" found in previous state…`）。読みも書きもしないと
     *   言っておけば、静かに置き去りになる。
     */
    blacklist: ['memo', environmentSlice.reducerPath, ...injectedBlacklist],
  };

  /**
   * 名指しされた置き場を落としてから本体へ渡す（{@link clearSlices}）。
   * 落とした所は、その reducer が初期値を作り直す。
   */
  const clearable: typeof rootReducer = ((state, action) => {
    if (state && (action as { type?: string }).type === CLEAR_SLICES) {
      const paths = (action as { payload?: readonly string[] }).payload ?? [];
      const next = { ...(state as Record<string, unknown>) };
      for (const path of paths) delete next[path];
      return rootReducer(next as never, action);
    }
    return rootReducer(state, action);
  }) as typeof rootReducer;

  const persistedReducer = persistReducer(persistConfig, clearable);

  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(injectedMiddlewares),
  });
  console.log("Store created:", store);

  const persistor = persistStore(store);

  // React外のコード（labelResolver等）からstoreにアクセスできるよう参照を保持
  currentStore = store;

  return {
    store,
    persistor
  };
};


// ストア、ディスパッチ型
export type AppStore = ReturnType<typeof makeStore>["store"];
export type AppDispatch = AppStore['dispatch'];

// ストア参照（React外のコードからアクセス用）
let currentStore: AppStore | null = null;
export const getCurrentStore = (): AppStore | null => currentStore;
