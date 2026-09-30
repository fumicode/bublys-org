/**
 * ② 変換中の Enter ── **「この字でよい」であって「書き終えた」ではない。**
 *
 * 本物の変換は自動では起こせないので、ブラウザが立てる印だけを写して見張る。
 * ここが崩れると、日本語を打つ人は**変換した瞬間に欄から追い出される**。
 */
import { isComposing, isCommitKey } from './ime.js';

/** React が渡してくる形（素のイベントを nativeEvent に包んだもの） */
const react = (key: string, native: { isComposing?: boolean; keyCode?: number }) =>
  ({ key, nativeEvent: native }) as Parameters<typeof isCommitKey>[0];

describe('② 変換の最中かどうか', () => {
  it('isComposing が立っていれば、変換の最中', () => {
    expect(isComposing(react('Enter', { isComposing: true }))).toBe(true);
  });

  it('**229 だけで知らせるブラウザも取りこぼさない**', () => {
    expect(isComposing(react('Enter', { keyCode: 229 }))).toBe(true);
  });

  it('どちらも無ければ、変換の最中ではない', () => {
    expect(isComposing(react('Enter', { isComposing: false, keyCode: 13 }))).toBe(false);
  });

  it('素のイベントでも読める（nativeEvent に包まれていなくてよい）', () => {
    expect(isComposing({ isComposing: true } as Parameters<typeof isComposing>[0])).toBe(true);
  });
});

describe('② 書き終えた合図としての Enter', () => {
  it('変換の最中の Enter は、書き終えた合図ではない', () => {
    expect(isCommitKey(react('Enter', { isComposing: true }))).toBe(false);
  });

  it('変換が済んでからの Enter は、書き終えた合図', () => {
    expect(isCommitKey(react('Enter', { isComposing: false }))).toBe(true);
  });

  it('Enter 以外は、合図ではない', () => {
    expect(isCommitKey(react('Escape', { isComposing: false }))).toBe(false);
    expect(isCommitKey(react('a', { isComposing: false }))).toBe(false);
  });
});
