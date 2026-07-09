/**
 * member-shift-preference-listener
 *
 * ルール:「局員（Member）が削除されたら、その局員のシフト希望（ShiftPreference）も削除する」
 *
 * memberSlice と shiftPreferenceSlice は独立したスライスに分割されているため、
 * deleteMember の reducer 自体は shiftPreferences を関知しない。
 * この listener middleware が横断的なクリーンアップを担う。
 */
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { deleteMember } from "../slice/member-slice.js";
import { removeShiftPreference } from "../slice/shift-preference-slice.js";

export const memberShiftPreferenceListener = createListenerMiddleware();

memberShiftPreferenceListener.startListening({
  actionCreator: deleteMember,
  effect: async (action, listenerApi) => {
    const memberId = action.payload;
    listenerApi.dispatch(removeShiftPreference(memberId));
  },
});
