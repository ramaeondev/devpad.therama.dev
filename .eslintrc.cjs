module.exports = {
  root: true,
  ignorePatterns: ['projects/**/*', 'dist', 'build', 'node_modules', 'coverage'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', '@angular-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@angular-eslint/recommended',
    'prettier'
  ],
  rules: {
    // Add repository specific overrides here
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }]
  },
  overrides: [
    {
      files: ['*.html'],
      parser: '@angular-eslint/template-parser',
      plugins: ['@angular-eslint/template'],
      extends: ['plugin:@angular-eslint/template/recommended']
    },
    {
      files: ['*.spec.ts', 'src/test-setup.ts'],
      env: { jest: true }
    }
  ]
};
