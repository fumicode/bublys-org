export default {
  displayName: '@bublys-org/hash-world-line',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: 'test-output/jest/coverage',
  // まだテストを持たないライブラリ。0 件を失敗にしない
  passWithNoTests: true,
};
