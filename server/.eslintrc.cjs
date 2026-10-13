module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'script' },
  extends: ['eslint:recommended'],
  rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  ignorePatterns: ['node_modules/', 'coverage/', 'uploads/'],
};
