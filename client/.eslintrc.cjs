/**
 * ESLint config for the redesigned Svara client.
 *
 * We stay on classic eslintrc (ESLint 8.x) because the v143 prototype was
 * shipped without any eslint config — this gives us a working lint pass
 * out of the box with sensible defaults for React + TS + import sorting.
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'simple-import-sort'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'react/prop-types': 'off',
    'react/no-unknown-property': ['error', { ignore: ['offscreen'] }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  ignorePatterns: ['dist', 'node_modules', 'src/**/*.test.*', 'src/__tests__/**'],
};
