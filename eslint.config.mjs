import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Formatting rules (indent, quotes, semi, linebreak-style) were removed from
// ESLint core in v10; `npm run format:check` (prettier) enforces all of them.
export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            'no-var': 'error',
        },
    }
);
