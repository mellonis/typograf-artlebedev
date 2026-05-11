import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  ...tsEslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);