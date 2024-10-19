/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js'],
  transform: { '^.+\\.ts?$': 'ts-jest' },
  testPathIgnorePatterns: ['dist/'],
  globals: { 'ts-jest': { diagnostics: false } },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
      },
    ],
  ],
};
