import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import getDomainWithProtocol from '../messageDomain/getDomainWithProtocol.js';
import {
  BublyContainers,
  ImportableContainer,
  HandShakeMessage,
} from '../messageDomain/Messages.domain.js';

export interface BublysContainersState {
  bublysContainers: BublyContainers[];
}

//各バブリのimportableContainersを管理する
const initialState: BublysContainersState = {
  bublysContainers: [],
};

const bublysContainersSlice = createSlice({
  name: 'bublysContainers',
  initialState,
  reducers: {
    addBublyContainer: (state, action: PayloadAction<HandShakeMessage>) => {
      const existingIndex = state.bublysContainers.findIndex(
        (e: BublyContainers) => e.bublyUrl === action.payload.protocol
      );
      if (existingIndex !== -1) {
        // 既存のものを更新 itemの構造は{containerName, containerUrl, storableTypes}
        action.payload.params.resources.forEach((item: ImportableContainer) => {
          const index = state.bublysContainers[
            existingIndex
          ].importableContainers.findIndex((e) => e.containerUrl === item.containerUrl);
          if (index === -1) {
            state.bublysContainers[existingIndex].importableContainers.push(
              item
            );
          }
        });
      } else {
        // 新しいものを追加
        const newBublyContainer: BublyContainers = {
          isActive: false,
          bublyUrl: action.payload.protocol,
          importableContainers: action.payload.params.resources,
        };
        state.bublysContainers.push(newBublyContainer);
      }
    },
  },
});

export const { addBublyContainer } = bublysContainersSlice.actions;

export const selectBublysContainersByBublyUrl = (
  state: BublysContainersState,
  bublyUrl: string
) => {
  console.log(
    getDomainWithProtocol(bublyUrl),
    getDomainWithProtocol(state.bublysContainers[0]?.bublyUrl)
  );
  return state.bublysContainers.find(
    (e) => getDomainWithProtocol(e.bublyUrl) === getDomainWithProtocol(bublyUrl)
  );
};
export default bublysContainersSlice.reducer;
