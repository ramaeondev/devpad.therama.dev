const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const configFiles = {
  development: path.resolve(__dirname, '../src/config.dev.ts'),
  production: path.resolve(__dirname, '../src/config.prod.ts'),
};

const envVariables = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_DIRECT_URL: process.env.SUPABASE_DIRECT_URL || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || '',
  MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || '',
  GOOGLE_APPID: process.env.GOOGLE_APPID || '',
  APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || '',
  APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || '',
  APPWRITE_DB_READ_ONLY_API_KEY: process.env.APPWRITE_DB_READ_ONLY_API_KEY || '',
  APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID || '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || '',
  GITLAB_Client_ID: process.env.GITLAB_Client_ID || '',
  GITLAB_Client_SECRET: process.env.GITLAB_Client_SECRET || '',
};

const generateConfigFile = (filePath) => {
  const content = `export const config = {
  supabase: {
    url: '${envVariables.SUPABASE_URL}',
    anonKey: '${envVariables.SUPABASE_ANON_KEY}',
    directUrl: '${envVariables.SUPABASE_DIRECT_URL}',
  },
  google: {
    clientId: '${envVariables.GOOGLE_CLIENT_ID}',
    apiKey: '${envVariables.GOOGLE_API_KEY}',
    appId: '${envVariables.GOOGLE_APPID}',
  },
  microsoft: {
    clientId: '${envVariables.MICROSOFT_CLIENT_ID}',
    redirectUri: '${envVariables.MICROSOFT_REDIRECT_URI}',
  },
  appwrite: {
    endpoint: '${envVariables.APPWRITE_ENDPOINT}',
    projectId: '${envVariables.APPWRITE_PROJECT_ID}',
    apiKey: '${envVariables.APPWRITE_DB_READ_ONLY_API_KEY}',
    databaseId: '${envVariables.APPWRITE_DATABASE_ID}',
  },
  github: {
    clientId: '${envVariables.GITHUB_CLIENT_ID}',
    clientSecret: '${envVariables.GITHUB_CLIENT_SECRET}',
  },
  gitlab: {
    clientId: '${envVariables.GITLAB_Client_ID}',
    clientSecret: '${envVariables.GITLAB_Client_SECRET}',
  },
};
`;

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
};

generateConfigFile(configFiles.development);
generateConfigFile(configFiles.production);