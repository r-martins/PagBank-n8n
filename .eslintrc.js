module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  extends: ['plugin:n8n-nodes-base/community'],
  rules: {},
  overrides: [
    {
      // Credential type id must stay `pagBankConnect` so existing installs keep working.
      files: ['credentials/PagBankConnectApi.credentials.ts'],
      rules: {
        'n8n-nodes-base/cred-class-field-name-unsuffixed': 'off',
      },
    },
  ],
};
