import { BubblesProcess, BubblesProcessState } from './BubblesProcess.domain.js';

const makeProcess = (layers: string[][], focusedBubbleId?: string): BubblesProcess => {
  return BubblesProcess.fromJSON({ layers, focusedBubbleId });
};

describe('BubblesProcess - focus', () => {
  it('focus() sets focusedId', () => {
    const process = makeProcess([['A', 'B'], ['C']]);
    const focused = process.focus('A');

    expect(focused.focusedId).toBe('A');
  });

  it('focus() returns a new instance (immutable)', () => {
    const process = makeProcess([['A', 'B']]);
    const focused = process.focus('A');

    expect(focused).not.toBe(process);
    expect(process.focusedId).toBeUndefined();
  });

  it('focus() replaces previous focused id', () => {
    const process = makeProcess([['A', 'B']]).focus('A');
    const refocused = process.focus('B');

    expect(refocused.focusedId).toBe('B');
  });

  it('toJSON() persists focusedBubbleId', () => {
    const process = makeProcess([['A', 'B']]).focus('B');
    const json = process.toJSON();

    expect(json.focusedBubbleId).toBe('B');
  });

  it('fromJSON() restores focusedBubbleId', () => {
    const state: BubblesProcessState = { layers: [['A', 'B']], focusedBubbleId: 'A' };
    const process = BubblesProcess.fromJSON(state);

    expect(process.focusedId).toBe('A');
  });

  it('layer operations preserve focusedBubbleId', () => {
    const process = makeProcess([['A', 'B'], ['C']]).focus('A');
    const afterLayerDown = process.layerDown('B');

    expect(afterLayerDown.focusedId).toBe('A');
  });
});

describe('BubblesProcess - popChild', () => {
  it('popChild() moves bubble to surface layer', () => {
    const process = makeProcess([['A', 'B'], ['C']]);
    const popped = process.popChild('C');

    expect(popped.layers[0]).toContain('C');
  });

  it('popChild() sets focusedId to the popped bubble', () => {
    const process = makeProcess([['A', 'B'], ['C']]);
    const popped = process.popChild('C');

    expect(popped.focusedId).toBe('C');
  });

  it('popChild() replaces previous focusedId', () => {
    const process = makeProcess([['A', 'B'], ['C']]).focus('A');
    const popped = process.popChild('C');

    expect(popped.focusedId).toBe('C');
  });
});
