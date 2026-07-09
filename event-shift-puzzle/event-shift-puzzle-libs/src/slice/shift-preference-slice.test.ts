import {
  shiftPreferenceSlice,
  setShiftPreference,
  removeShiftPreference,
  type ShiftPreferenceState,
} from './shift-preference-slice.js';

const makePreference = (overrides: Partial<ShiftPreferenceState> = {}): ShiftPreferenceState => ({
  id: 'sp1',
  memberId: 'm1',
  entries: [],
  submittedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('shiftPreferenceSlice', () => {
  const initialState = shiftPreferenceSlice.getInitialState();

  test('setShiftPreference で新規追加できる', () => {
    const state = shiftPreferenceSlice.reducer(initialState, setShiftPreference(makePreference()));
    expect(state.shiftPreferences).toHaveLength(1);
  });

  test('setShiftPreference で同じmemberIdの希望はupsertされる', () => {
    let state = shiftPreferenceSlice.reducer(initialState, setShiftPreference(makePreference()));
    state = shiftPreferenceSlice.reducer(state, setShiftPreference(makePreference({ id: 'sp2' })));
    expect(state.shiftPreferences).toHaveLength(1);
    expect(state.shiftPreferences[0].id).toBe('sp2');
  });

  test('removeShiftPreference で該当memberIdの希望を削除できる', () => {
    let state = shiftPreferenceSlice.reducer(initialState, setShiftPreference(makePreference()));
    state = shiftPreferenceSlice.reducer(state, removeShiftPreference('m1'));
    expect(state.shiftPreferences).toHaveLength(0);
  });
});
