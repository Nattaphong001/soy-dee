// Flat config. Browser scripts loaded with <script> tags (no modules yet).
module.exports = [
    {
        files: ['assets/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                window: 'readonly', document: 'readonly', localStorage: 'readonly', fetch: 'readonly',
                console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', URLSearchParams: 'readonly',
                FormData: 'readonly', Intl: 'readonly', location: 'readonly', navigator: 'readonly',
                requestAnimationFrame: 'readonly', SoyDeeAPI: 'readonly', SoyDeeIcons: 'readonly'
            }
        },
        rules: { 'no-undef': 'error', 'no-unused-vars': 'warn', 'no-redeclare': 'error' }
    }
];
