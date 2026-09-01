import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  // Fetch schema from backend (ensure backend is running on port 3000)
  schema: 'https://api.godevelopers.space/graphql',
  documents: ['src/**/*.ts', 'src/**/*.tsx'],

  generates: {
    './src/graphql/': {
      preset: 'client',
      config: {
        skipTypename: false,
        scalars: {
          DateTime: 'string',
          JSON: 'Record<string, any>',
        },
      },
    },
    './schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true,
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
