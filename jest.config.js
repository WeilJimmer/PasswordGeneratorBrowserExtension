module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};