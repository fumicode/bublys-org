import { configureStore } from '@reduxjs/toolkit';
import { memberSlice, addMember, deleteMember, type MemberState } from '../slice/member-slice.js';
import {
  shiftPreferenceSlice,
  setShiftPreference,
  type ShiftPreferenceState,
} from '../slice/shift-preference-slice.js';
import { memberShiftPreferenceListener } from './member-shift-preference-listener.js';

const makeMember = (overrides: Partial<MemberState> = {}): MemberState => ({
  id: 'm1',
  name: '田中太郎',
  department: '総務局',
  isNewMember: false,
  availability: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makePreference = (overrides: Partial<ShiftPreferenceState> = {}): ShiftPreferenceState => ({
  id: 'sp1',
  memberId: 'm1',
  entries: [],
  submittedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function makeTestStore() {
  return configureStore({
    reducer: {
      member: memberSlice.reducer,
      shiftPreference: shiftPreferenceSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(memberShiftPreferenceListener.middleware),
  });
}

describe('memberShiftPreferenceListener', () => {
  test('deleteMember 発火時に、そのmemberIdのShiftPreferenceも削除される', async () => {
    const store = makeTestStore();
    store.dispatch(addMember(makeMember()));
    store.dispatch(setShiftPreference(makePreference()));
    expect(store.getState().shiftPreference.shiftPreferences).toHaveLength(1);

    store.dispatch(deleteMember('m1'));
    // listener middleware の effect は非同期なので dispatch 完了を待つ
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().member.memberList).toHaveLength(0);
    expect(store.getState().shiftPreference.shiftPreferences).toHaveLength(0);
  });

  test('無関係なmemberIdのShiftPreferenceは削除されない', async () => {
    const store = makeTestStore();
    store.dispatch(addMember(makeMember()));
    store.dispatch(addMember(makeMember({ id: 'm2' })));
    store.dispatch(setShiftPreference(makePreference({ id: 'sp1', memberId: 'm1' })));
    store.dispatch(setShiftPreference(makePreference({ id: 'sp2', memberId: 'm2' })));

    store.dispatch(deleteMember('m1'));
    await Promise.resolve();
    await Promise.resolve();

    const remaining = store.getState().shiftPreference.shiftPreferences;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].memberId).toBe('m2');
  });
});
