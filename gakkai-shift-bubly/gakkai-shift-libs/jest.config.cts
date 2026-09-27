/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@bublys-org/gakkai-shift-libs',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  /**
   * ★ **redux-persist だけは、こちらで機械語に直す。**
   *   置き場（slice）は読み込むだけで `injectSlice` を通り、その先で
   *   `redux-persist/es` に行き着く。あちらは新しい書き方（ESM）のままなので、
   *   既定どおり node_modules を素通しすると「import は使えない」で落ちる。
   */
  transformIgnorePatterns: ['/node_modules/(?!(redux-persist)/)'],
  coverageDirectory: 'test-output/jest/coverage',
};
