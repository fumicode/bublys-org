import { configureStore } from '@reduxjs/toolkit';
import bubblesReducer, {
  addBubble,
  removeBubble,
  makeSelectBubbleById,
  makeSelectBubbleLayerIndex,
} from './bubbles-slice.js';
import { bubbleSelectorCacheListener } from './bubble-selector-cache-listener.js';
import { Bubble } from '../Bubble.domain.js';

function makeTestStore() {
  return configureStore({
    reducer: { bubbleState: bubblesReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(bubbleSelectorCacheListener.middleware),
  });
}

describe('bubbleSelectorCacheListener', () => {
  it('removeBubble後は、そのbubbleIdのセレクタキャッシュが解放され新しいインスタンスが返る', async () => {
    const store = makeTestStore();
    const bubble = new Bubble({ id: 'bubble-1', url: 'test/bubble-1', colorHue: 0, type: 'test' });

    store.dispatch(addBubble(bubble.toJSON()));

    const selectorBefore = makeSelectBubbleById('bubble-1');
    // 同じbubbleIdでは同一インスタンスが返る（キャッシュされている）
    expect(makeSelectBubbleById('bubble-1')).toBe(selectorBefore);

    store.dispatch(removeBubble('bubble-1'));
    await Promise.resolve();
    await Promise.resolve();

    const selectorAfter = makeSelectBubbleById('bubble-1');
    // evict されているので、同じbubbleIdでも新しいインスタンスが作られる
    expect(selectorAfter).not.toBe(selectorBefore);
  });

  it('layerIndexセレクタキャッシュも解放される', async () => {
    const store = makeTestStore();
    const bubble = new Bubble({ id: 'bubble-2', url: 'test/bubble-2', colorHue: 0, type: 'test' });
    store.dispatch(addBubble(bubble.toJSON()));

    const selectorBefore = makeSelectBubbleLayerIndex('bubble-2');

    store.dispatch(removeBubble('bubble-2'));
    await Promise.resolve();
    await Promise.resolve();

    const selectorAfter = makeSelectBubbleLayerIndex('bubble-2');
    expect(selectorAfter).not.toBe(selectorBefore);
  });
});
