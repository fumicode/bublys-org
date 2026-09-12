import {
  validateWorldFile,
  suggestedFileName,
  WorldFileError,
  WORLD_FILE_FORMAT,
  WORLD_FILE_VERSION,
} from './worldFileFormat.js';

/**
 * 検証がここまで細かいのは、壊れたグラフを読み込むと「表示が変」ではなく
 * 「レンダー中に例外でアプリごと落ちる」ため（WorldLineGraph.getPathToNode は
 * 親を辿れないと throw し、それを useCasScope が毎レンダー呼ぶ）。
 * 読み込む前に弾けているかをここで担保する。
 */
describe('validateWorldFile（勤務表ファイルの検証）', () => {
  const node = (
    id: string,
    parentId: string | null,
    refs: { type: string; id: string; hash: string }[] = []
  ) => ({ id, parentId, timestamp: 1, changedRefs: refs, worldLineId: 'wl-1' });

  const validFile = (overrides: Record<string, unknown> = {}) => ({
    format: WORLD_FILE_FORMAT,
    formatVersion: WORLD_FILE_VERSION,
    savedAt: '2026-09-06T00:00:00.000Z',
    graphs: {
      hotel: {
        nodes: {
          n1: node('n1', null, [{ type: 'Staff', id: 'staff-1', hash: 'h1' }]),
          n2: node('n2', 'n1', [{ type: 'Staff', id: 'staff-1', hash: 'h2' }]),
        },
        rootNodeId: 'n1',
        apexNodeId: 'n2',
      },
    },
    cas: { h1: { id: 'staff-1', name: '佐藤' }, h2: { id: 'staff-1', name: '佐藤 花子' } },
    ...overrides,
  });

  it('正しいファイルを受け入れ、警告を出さない', () => {
    const { file, warnings } = validateWorldFile(validFile());
    expect(warnings).toEqual([]);
    expect(Object.keys(file.graphs)).toEqual(['hotel']);
    expect(file.cas['h2']).toEqual({ id: 'staff-1', name: '佐藤 花子' });
  });

  it('別バブリのファイルを拒否する', () => {
    expect(() => validateWorldFile(validFile({ format: 'memo/world' }))).toThrow(
      WorldFileError
    );
  });

  it('未来のフォーマットバージョンを拒否する', () => {
    expect(() =>
      validateWorldFile(validFile({ formatVersion: WORLD_FILE_VERSION + 1 }))
    ).toThrow(/新しい形式/);
  });

  it('親が見つからないノードを拒否する（読み込み後のクラッシュ源）', () => {
    const broken = validFile({
      graphs: {
        hotel: {
          nodes: { n2: node('n2', 'missing') },
          rootNodeId: 'n2',
          apexNodeId: 'n2',
        },
      },
    });
    expect(() => validateWorldFile(broken)).toThrow(/親 "missing" が見つかりません/);
  });

  it('apexNodeId が nodes に無いファイルを拒否する', () => {
    const broken = validFile({
      graphs: {
        hotel: { nodes: { n1: node('n1', null) }, rootNodeId: 'n1', apexNodeId: 'nope' },
      },
    });
    expect(() => validateWorldFile(broken)).toThrow(/apexNodeId が nodes に存在しません/);
  });

  it('root が 2 つあるファイルを拒否する', () => {
    const broken = validFile({
      graphs: {
        hotel: {
          nodes: { n1: node('n1', null), n2: node('n2', null) },
          rootNodeId: 'n1',
          apexNodeId: 'n2',
        },
      },
    });
    expect(() => validateWorldFile(broken)).toThrow(/親を持たないノードが 2 個/);
  });

  it('親が循環しているファイルを拒否する', () => {
    const broken = validFile({
      graphs: {
        hotel: {
          nodes: { a: node('a', 'b'), b: node('b', 'a') },
          rootNodeId: 'a',
          apexNodeId: 'b',
        },
      },
    });
    expect(() => validateWorldFile(broken)).toThrow(WorldFileError);
  });

  it('ノードのキーと id がずれているファイルを拒否する', () => {
    const broken = validFile({
      graphs: {
        hotel: { nodes: { n1: node('other', null) }, rootNodeId: 'n1', apexNodeId: 'n1' },
      },
    });
    expect(() => validateWorldFile(broken)).toThrow(/キーと一致しません/);
  });

  it('空のグラフ（ノード0件・root/apex null）を受け入れる', () => {
    const empty = validFile({
      graphs: { hotel: { nodes: {}, rootNodeId: null, apexNodeId: null } },
      cas: {},
    });
    expect(validateWorldFile(empty).warnings).toEqual([]);
  });

  it('参照先の状態データが欠けていたら警告する（読み込みは続行できる）', () => {
    const { warnings } = validateWorldFile(validFile({ cas: { h1: {} } }));
    expect(warnings).toHaveLength(1);
    expect(warnings[0].scopeId).toBe('hotel');
    expect(warnings[0].message).toContain('1 件');
  });

  it('JSON オブジェクトでないものを拒否する', () => {
    expect(() => validateWorldFile('[]')).toThrow(WorldFileError);
    expect(() => validateWorldFile(null)).toThrow(WorldFileError);
  });
});

describe('suggestedFileName（保存時の既定ファイル名）', () => {
  it('メモをファイル名に使い、パスに使えない文字を落とす', () => {
    expect(suggestedFileName('9月/詰み: シナリオ')).toMatch(
      /^9月-詰み-シナリオ-\d{4}-\d{2}-\d{2}\.hsp\.json$/
    );
  });

  it('メモが無ければ既定名にする', () => {
    expect(suggestedFileName()).toMatch(/^shift-\d{4}-\d{2}-\d{2}\.hsp\.json$/);
    expect(suggestedFileName('   ')).toMatch(/^shift-/);
  });
});
