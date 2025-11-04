import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '../Messages.domain';
import { HandShakeDTO, HandShakeMessage } from '../Messages.domain';

export interface MessageState {
  receivedMessages: Message[];
  handShakeMessages: HandShakeMessage[];
}

// 初期状態は常に空（サーバーとクライアントで一致させる）
const initialState: MessageState = {
  receivedMessages: [],
  handShakeMessages: [],
};

const massageSlice = createSlice({
  name: 'massage',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.receivedMessages.push(action.payload);
      console.log(state.receivedMessages);
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.receivedMessages = state.receivedMessages.filter(
        (msg) => msg.id !== action.payload
      );
    },
    hydrate: (_state, action: PayloadAction<MessageState>) => {
      return action.payload;
    },
    addHandShakeMessage: (state, action: PayloadAction<HandShakeMessage>) => {
      const index = state.handShakeMessages.findIndex(
        (e) => e.protocol === action.payload.protocol
      );
      if (index !== -1) {
        const newData = [...state.handShakeMessages];
        newData[index] = action.payload;
        state.handShakeMessages = newData;
      } else {
        state.handShakeMessages.push(action.payload);
      }
      console.log(state.handShakeMessages);
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

export const { addMessage, removeMessage, hydrate, addHandShakeMessage } =
  massageSlice.actions;
export default massageSlice.reducer;
