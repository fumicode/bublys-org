import { configureStore } from '@reduxjs/toolkit';
import appReducer, { localStorageMiddleware } from './appSlice';
import exportDataReducer from './exportData.Slice';
import massageReducer from './massageSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    exportData: exportDataReducer,
    massage: massageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
