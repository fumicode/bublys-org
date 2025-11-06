import { configureStore } from '@reduxjs/toolkit';
import appReducer, { localStorageMiddleware } from './apps.slice';
import exportDataReducer from './exportData.slice';
import massageReducer from './massages.slice';
import bublysContainersReducer from './bublysContainers.slice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    exportData: exportDataReducer,
    massage: massageReducer,
    bublysContainers: bublysContainersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
