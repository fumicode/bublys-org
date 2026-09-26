import nx from '@nx/eslint-plugin';
// ★ 共通の設定はリポジトリの根（2 つ上）。1 つ上だと `apps/eslint.config.mjs` を探して
//   **設定の読み込みで死ぬ** ── この画面は 1 ファイルも検査されていなかった。
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/react'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
];
