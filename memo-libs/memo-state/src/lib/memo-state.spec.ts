import { memoState } from './memo-state.js';

describe('memoState', () => {
  it('should work', () => {
    expect(memoState()).toEqual('memo-state');
  });
});
