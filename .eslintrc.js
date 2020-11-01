module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        // "no-param-reassign": [2, { "props": false }]
        "no-param-reassign": 2,
        "strict": 2,
        "no-unused-vars": ["error", {
            "args": "after-used",
            "argsIgnorePattern": "(^_|_$)",
            "ignoreRestSiblings": true
        }]
    }
};