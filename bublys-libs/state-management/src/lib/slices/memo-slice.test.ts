import { Memo } from './memo-slice.js';

describe('Memo.mergeBlock', () => {
  const waMemo = 'aa';
  const ichi = 'cc';
  const ni = 'dd';

  const initialMemo = {
    id: waMemo,
    blocks: {
      [ichi]: { id: ichi, type: 'text', content: 'Line A' },
      [ni]: { id: ni, type: 'text', content: 'Line B' },
    },
    lines: [ichi, ni],
  };

  it('merges block content into previous block and removes it', () => {
    const merged = new Memo(initialMemo).mergeBlock(ni).toJson();
    expect(merged.lines).toEqual([ichi]);
    expect(merged.blocks[ichi].content).toBe('Line ALine B');
    expect(merged.blocks[ni]).toBeUndefined();
  });
});
