import {
  memberSlice,
  setMemberList,
  addMember,
  updateMember,
  deleteMember,
  setSelectedMemberId,
  type MemberState,
} from './member-slice.js';

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

describe('memberSlice', () => {
  const initialState = memberSlice.getInitialState();

  test('addMember でメンバーを追加できる', () => {
    const state = memberSlice.reducer(initialState, addMember(makeMember()));
    expect(state.memberList).toHaveLength(1);
    expect(state.memberList[0].id).toBe('m1');
  });

  test('updateMember で既存メンバーを更新できる', () => {
    let state = memberSlice.reducer(initialState, addMember(makeMember()));
    state = memberSlice.reducer(state, updateMember(makeMember({ name: '田中花子' })));
    expect(state.memberList[0].name).toBe('田中花子');
  });

  test('deleteMember でメンバーを削除できる', () => {
    let state = memberSlice.reducer(initialState, addMember(makeMember()));
    state = memberSlice.reducer(state, deleteMember('m1'));
    expect(state.memberList).toHaveLength(0);
  });

  test('setSelectedMemberId で選択中IDを更新できる', () => {
    const state = memberSlice.reducer(initialState, setSelectedMemberId('m1'));
    expect(state.selectedMemberId).toBe('m1');
  });

  test('setMemberList で全体を置換できる', () => {
    const state = memberSlice.reducer(
      initialState,
      setMemberList([makeMember(), makeMember({ id: 'm2' })])
    );
    expect(state.memberList.map((m) => m.id)).toEqual(['m1', 'm2']);
  });
});
