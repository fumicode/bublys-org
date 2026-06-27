import bubblesReducer, {
  focusBubble,
  makeSelectFocusedBubbleId,
  ROOT_UNIVERSE_ID,
  BubbleStateSlice,
} from './bubbles-slice.js';

const emptyState = (): BubbleStateSlice => ({
  universes: {
    [ROOT_UNIVERSE_ID]: {
      bubbles: {},
      process: { layers: [] },
      bubbleRelations: [],
      globalCoordinateSystem: { origin: { x: 0, y: 0 }, scale: 1 },
      surfaceLeftTop: { x: 0, y: 0 },
    },
  },
  renderCount: 0,
  animatingBubbleIds: [],
});

describe('focusBubble action', () => {
  it('sets focusedBubbleId in the process', () => {
    const state = emptyState();
    const next = bubblesReducer(state, focusBubble('bubble-1'));

    expect(next.universes[ROOT_UNIVERSE_ID].process.focusedBubbleId).toBe('bubble-1');
  });

  it('replaces previous focusedBubbleId', () => {
    const state = emptyState();
    const first = bubblesReducer(state, focusBubble('bubble-1'));
    const second = bubblesReducer(first, focusBubble('bubble-2'));

    expect(second.universes[ROOT_UNIVERSE_ID].process.focusedBubbleId).toBe('bubble-2');
  });
});

describe('makeSelectFocusedBubbleId', () => {
  const selector = makeSelectFocusedBubbleId(ROOT_UNIVERSE_ID);

  it('returns undefined when no bubble is focused', () => {
    const state = { bubbleState: emptyState() };
    expect(selector(state)).toBeUndefined();
  });

  it('returns the focused bubble id after focusBubble', () => {
    const raw = emptyState();
    const next = bubblesReducer(raw, focusBubble('bubble-1'));
    const state = { bubbleState: next };

    expect(selector(state)).toBe('bubble-1');
  });
});
