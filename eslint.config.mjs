import nx from '@nx/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '**/test-output',
      '**/public/bubly.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    /**
     * ★ **React の hook の決まりは、どの lib でも同じ名前で引けるようにする。**
     *   置いていなかったので、`// eslint-disable-next-line react-hooks/exhaustive-deps`
     *   と書いてある所が**そんな規則は無い**と言われて赤くなっていた（15 か所）。
     *   ここで配るのは名前と、2 つの決まり:
     *     rules-of-hooks   呼ぶ順が変わる書き方（**本当に壊れる**）→ エラー
     *     exhaustive-deps  頼り先の書き漏らし → 注意（直し方が場面ごとに違うので）
     *   アプリ（`bublys-os`）は Next が配る新しい版を使うので、ここは触らない。
     */
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /**
       * ★ **中身の無い interface は、書き方として正しいことがある。**
       *   Redux の型を後から足す定型（`interface LazyLoadedSlices extends
       *   WithSlice<typeof xSlice> {}`）がそれで、中身が無いことに意味がある
       *   ── 22 か所が赤かった。**1 つだけ継いでいるとき**は許す。
       * ★ 古いほうの規則（`no-empty-interface`）は、新しいほう
       *   （`no-empty-object-type`）に引き継がれた同じ検査なので止める
       *   ── 同じ 1 行が 2 回数えられていた。
       */
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      '@typescript-eslint/no-empty-interface': 'off',
    },
  },
];
