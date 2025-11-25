import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DTOParams } from '../messageDomain/Messages.domain.js';

// 初期状態は常に空（サーバーとクライアントで一致させる）
//OSからバブリに送信するデータと、OSが参照しているデータを参照しているバブリのデータ
export interface AssociateUpdateDataPairs {
  fromDTO: DTOParams; //OSが参照しているデータ
  toDTOs: DTOParams[]; //OSが参照しているデータを参照しているデータ
}

export interface AssociateUpdateDataPairsState {
  associateUpdateDataPairs: AssociateUpdateDataPairs[];
}

export const initialState: AssociateUpdateDataPairsState = {
  associateUpdateDataPairs: [],
};

const exportDataSlice = createSlice({
  name: 'exportData',
  initialState,
  reducers: {
    //fromContainerURLに一致しないfromDTOを追加する
    addFromDTO: (state, action: PayloadAction<DTOParams>) => {
      const existingIndex = state.associateUpdateDataPairs.findIndex(
        (e) => e.fromDTO.containerURL === action.payload.containerURL
      );
      if (existingIndex !== -1) {
        // 既存のものを更新
        state.associateUpdateDataPairs[existingIndex].fromDTO = action.payload;
      } else {
        // 新しいものを追加
        state.associateUpdateDataPairs.push({
          fromDTO: action.payload,
          toDTOs: [],
        });
      }
    },
    //fromContainerURLに一致するfromDTOを検索して、そのtoDTOsのcontainerURLに一致しないtoDTOを追加または上書きする
    addToDTOs: (
      state,
      action: PayloadAction<{ toDTO: DTOParams; fromContainerURL: string }>
    ) => {
      const associatePair = state.associateUpdateDataPairs.find(
        (e) => e.fromDTO.containerURL === action.payload.fromContainerURL
      );

      if (!associatePair) {
        console.warn('fromDTO not found for containerURL:', action.payload.fromContainerURL);
        return;
      }

      // 既存のtoDTOを探す
      const existingToDTOIndex = associatePair.toDTOs.findIndex(
        (e) => e.containerURL === action.payload.toDTO.containerURL
      );

      if (existingToDTOIndex !== -1) {
        // 既存のtoDTOを上書き
        associatePair.toDTOs[existingToDTOIndex] = action.payload.toDTO;
      } else {
        // 新しいtoDTOを追加
        associatePair.toDTOs.push(action.payload.toDTO);
      }
    },
  },
});

export const { addFromDTO, addToDTOs } = exportDataSlice.actions;

export const selectFromDTO = (state: AssociateUpdateDataPairsState) => {
  const fromDTOs: DTOParams[] = [];
  state.associateUpdateDataPairs.map((e) => fromDTOs.push(e.fromDTO));
  return fromDTOs;
};
export default exportDataSlice.reducer;
