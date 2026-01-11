module.exports = {
  preset: 'jest-preset-angular',
  roots: ['<rootDir>/src/'],
  testMatch: ['**/+(*.)+(spec).+(ts|js)'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "^src/(.*)$": "<rootDir>/src/$1",
    "^\\.\\./config\\.dev$": "<rootDir>/src/__mocks__/config.dev.ts",
    "^\\.\\./config\\.prod$": "<rootDir>/src/__mocks__/config.prod.ts"
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'mjs'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
      isolatedModules: true
    }
  },
  testEnvironment: 'jsdom',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/main.ts',
    '!src/environments/**',
    '!src/**/*.module.ts'
  ]
};
