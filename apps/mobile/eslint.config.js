// Expo's recommended rules plus Prettier compatibilit.
// The root eslint.config.mjs, so this file is the only config used here. 

const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
    globalIgnores(['dist/*', '.expo/*', 'ios/*', 'android/*']),
    expoConfig,
    prettierConfig,
    {
        rules: {
            'no-console': 'error',
        },
    },
]);