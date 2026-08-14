/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@bublys-org/event-shift-puzzle-libs',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
  // redux-persist は node_modules 内で ESM (import文) のまま配布されているため、
  // デフォルトの transformIgnorePatterns (node_modules 除外) だとJestが構文解析できない。
  // @bublys-org/state-management 経由で redux-persist に依存するテストのために変換対象に含める。
  transformIgnorePatterns: ['/node_modules/(?!(redux-persist)/)'],
};
