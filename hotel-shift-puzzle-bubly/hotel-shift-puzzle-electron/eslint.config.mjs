import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
          // electron は実行時に import するが、electron-builder の決まりで devDependencies に置く
          //   （dependencies に置くとパッケージ作りが止まる）。
          // tslib は使わない（tsconfig.lib.json で importHelpers を切ってある）。
          ignoredDependencies: ['electron', 'tslib'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    ignores: ['**/out-tsc', '**/release', '**/dist'],
  },
];
