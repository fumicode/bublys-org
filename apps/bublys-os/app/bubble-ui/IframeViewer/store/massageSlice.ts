import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '../Messages.domain';

export interface MessageState {
  receivedMessages: Message[];
}

// 初期状態は常に空（サーバーとクライアントで一致させる）
const initialState: MessageState = { receivedMessages: [] };

const massageSlice = createSlice({
  name: 'massage',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.receivedMessages.push(action.payload);
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.receivedMessages = state.receivedMessages.filter(
        (msg) => msg.id !== action.payload
      );
    },
    hydrate: (_state, action: PayloadAction<MessageState>) => {
      return action.payload;
    },
  },
});

// 状態が変更されるたびにローカルストレージに保存するミドルウェア
export const localStorageMiddleware =
  (store: { getState: () => { massage: MessageState } }) =>
  (next: (action: { type: string }) => unknown) =>
  (action: { type: string }) => {
    const result = next(action);
    if (action.type.startsWith('massage/')) {
      const state = store.getState().massage;
      try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem('massageState', serializedState);
      } catch (e) {
        console.warn('ローカルストレージへの保存に失敗しました', e);
      }
    }
    return result;
  };

export const { addMessage, removeMessage, hydrate } = massageSlice.actions;
export default massageSlice.reducer;
