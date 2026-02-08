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
import { memoSlice } from "./slices/memo-slice.js";
import { pocketSlice } from "./slices/pocket-slice.js";
import { taskSlice } from "./slices/task-slice.js";

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
  memoSlice,
  pocketSlice,
  taskSlice,
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
 * 外部ライブラリからsliceを注入する
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const injectSlice = (slice: Slice) => {
  injectedSlices.push(slice);
  slice.injectInto(rootReducer);
};

/**
 * 外部ライブラリからmiddlewareを注入する
 */
export const injectMiddleware = (middleware: Middleware) => {
  injectedMiddlewares.push(middleware);
};

/**
 * persist blacklistにreducerPathを追加する
 */
export const addToBlacklist = (reducerPath: string) => {
  injectedBlacklist.push(reducerPath);
};

// Store 作成関数
export const makeStore = (options?: { persistKey?: string }) => {
  const persistConfig = {
    key: options?.persistKey ?? 'root',
    storage,
    blacklist: [environmentSlice.reducerPath, ...injectedBlacklist],
  };

  const persistedReducer = persistReducer(persistConfig, rootReducer);

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
