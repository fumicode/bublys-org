import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message,  HandShakeMessage } from '../messageDomain/Messages.domain.js';
import { getDomainWithProtocol } from '../messageDomain/getDomainWithProtocol.js';

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

export const { addMessage, removeMessage, addHandShakeMessage } = massageSlice.actions;

export const selectReceivedMessagesByAppUrl = 
(
  state: MessageState,
  appUrl: string
) => {
  return state.receivedMessages.filter(
    (e) => getDomainWithProtocol(e.protocol) === getDomainWithProtocol(appUrl)
  );
};

export const selectChildHandShakeMessage = (
  state: MessageState,
  appUrl: string
) =>
  state.handShakeMessages.find(
    (e) => getDomainWithProtocol(e.protocol) === getDomainWithProtocol(appUrl)
  );

export default massageSlice.reducer;
