const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'demo/snapdom.mjs', '__snapshots__/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'vitest/**/*.js', '__tests__/**/*.js', 'bin/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        process: 'readonly',
      },
    },
    rules: {
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'eol-last': ['error', 'always'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'arrow-spacing': ['error', { before: true, after: true }],
      'no-trailing-spaces': 'error',
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'never'],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
]
