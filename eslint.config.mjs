import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-unused-vars': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
          ],
          pathGroups: [
            { pattern: '@/components', group: 'internal', position: 'before' },
            {
              pattern: '@/components/**',
              group: 'internal',
              position: 'before',
            },
            { pattern: '@/consts', group: 'internal', position: 'before' },
            { pattern: '@/consts/**', group: 'internal', position: 'before' },
            { pattern: '@/services', group: 'internal', position: 'before' },
            { pattern: '@/services/**', group: 'internal', position: 'before' },
            { pattern: '@/supabase/**', group: 'internal', position: 'before' },
            { pattern: '@/types', group: 'internal', position: 'before' },
            { pattern: '@/types/**', group: 'internal', position: 'before' },
            { pattern: '@/utils', group: 'internal', position: 'before' },
            { pattern: '@/utils/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: {
            order: 'ignore',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
]);

export default eslintConfig;
