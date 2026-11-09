import unicorn from 'eslint-plugin-unicorn';
import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
    { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', '**/test/**', '**/*.examples.ts'] },
    { plugins: { unicorn, import: importPlugin }, linterOptions: { reportUnusedDisableDirectives: false } },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
        }
    },
    { files: ['**/*.mjs', '**/*.js'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } } }
);
