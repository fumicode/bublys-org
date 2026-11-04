import { versionLabelFor } from './versionLabel.js';

describe('versionLabelFor（確定したノードの名前）', () => {
  const nov4 = new Date(2026, 10, 4, 15, 30);

  test('確定した日で「◯月◯日版」', () => {
    expect(versionLabelFor(nov4, [])).toBe('11月4日版');
  });

  test('同じ世界線で重なったときだけ番号を足す', () => {
    expect(versionLabelFor(nov4, ['11月3日版'])).toBe('11月4日版');
    expect(versionLabelFor(nov4, ['11月4日版'])).toBe('11月4日版(2)');
    expect(versionLabelFor(nov4, ['11月4日版', '11月4日版(2)'])).toBe('11月4日版(3)');
  });
});
