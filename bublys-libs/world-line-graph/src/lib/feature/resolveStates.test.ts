import { createStateRef, type StateRef } from '../domain';
import { resolveStateRefs } from './resolveStates';
import type { CasRegistry } from './CasProvider';

class Memo {
  constructor(readonly state: { id: string; text: string }) {}
}

const registry: CasRegistry = {
  Memo: {
    fromJSON: (json) => new Memo(json as { id: string; text: string }),
    toJSON: (obj) => (obj as Memo).state,
    getId: (obj) => (obj as Memo).state.id,
  },
};

const refOf = (id: string, hash: string): StateRef => createStateRef('Memo', id, hash);

/** 永続ストア（IndexedDB 相当）の代役 */
const storeOf = (data: Record<string, unknown>) => {
  const calls: string[][] = [];
  const loadStates = async (hashes: string[]) => {
    calls.push(hashes);
    const found = new Map<string, unknown>();
    for (const hash of hashes) {
      if (hash in data) found.set(hash, data[hash]);
    }
    return found;
  };
  return { loadStates, calls };
};

describe('resolveStateRefs', () => {
  it('メモリ上の CAS にあるものはそのまま解決し、取りに行かない', async () => {
    const { loadStates, calls } = storeOf({});
    const result = await resolveStateRefs(
      [refOf('m1', 'h1')],
      { h1: { id: 'm1', text: 'あ' } },
      loadStates,
      registry
    );

    expect(result.resolved).toEqual([
      { type: 'Memo', id: 'm1', obj: new Memo({ id: 'm1', text: 'あ' }) },
    ]);
    expect(calls).toEqual([]); // 永続ストアには触らない
    expect(result.unresolved).toEqual([]);
  });

  it('evict 済み（メモリに無い）ものは永続ストアから取ってきて解決する', async () => {
    // 「最新 head 以外は読めない」の再現に相当する状況。
    // 古いノードの状態は CAS から追い出されているが、永続ストアには残っている。
    const { loadStates } = storeOf({ old: { id: 'm1', text: '昔' } });
    const result = await resolveStateRefs(
      [refOf('m1', 'old')],
      {}, // メモリ上の CAS は空
      loadStates,
      registry
    );

    expect(result.resolved).toEqual([
      { type: 'Memo', id: 'm1', obj: new Memo({ id: 'm1', text: '昔' }) },
    ]);
    expect(result.loaded.get('old')).toEqual({ id: 'm1', text: '昔' });
    expect(result.unresolved).toEqual([]);
  });

  it('足りないぶんだけを1回にまとめて取りに行く', async () => {
    const { loadStates, calls } = storeOf({
      h2: { id: 'm2', text: 'い' },
      h3: { id: 'm3', text: 'う' },
    });
    await resolveStateRefs(
      [refOf('m1', 'h1'), refOf('m2', 'h2'), refOf('m3', 'h3')],
      { h1: { id: 'm1', text: 'あ' } },
      loadStates,
      registry
    );

    expect(calls).toEqual([['h2', 'h3']]);
  });

  it('削除済み（tombstone）は解決結果に含めないが、欠損とも扱わない', async () => {
    const { loadStates } = storeOf({});
    const result = await resolveStateRefs(
      [refOf('m1', 'gone')],
      { gone: null },
      loadStates,
      registry
    );

    expect(result.resolved).toEqual([]);
    expect(result.unresolved).toEqual([]);
  });

  it('どこにも無いものは unresolved として報告する（黙って落とさない）', async () => {
    const { loadStates } = storeOf({});
    const result = await resolveStateRefs(
      [refOf('m1', 'lost')],
      {},
      loadStates,
      registry
    );

    expect(result.resolved).toEqual([]);
    expect(result.unresolved).toEqual(['Memo:m1']);
  });

  it('登録されていない型は飛ばす（別アプリのデータが混ざっていても落ちない）', async () => {
    const { loadStates } = storeOf({});
    const result = await resolveStateRefs(
      [createStateRef('Unknown', 'x', 'h1')],
      { h1: { anything: true } },
      loadStates,
      registry
    );

    expect(result.resolved).toEqual([]);
    expect(result.unresolved).toEqual([]);
  });
});
