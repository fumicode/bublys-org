/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@bublys-org/hotel-shift-puzzle-libs',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]sx?$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  moduleNameMapper: {
    // redux-persist の es ビルドは ESM のまま配布されていて jest が解釈できない。
    // 同内容の CJS ビルドへ差し替える（state-management 経由で読み込まれる）。
    '^redux-persist/es/(.*)$': 'redux-persist/lib/$1',
  },
  coverageDirectory: 'test-output/jest/coverage',
};
