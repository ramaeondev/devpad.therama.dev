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
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || '',
  MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || '',
  GOOGLE_APPID: process.env.GOOGLE_APPID || '',
  APPWRITE_API: process.env.APPWRITE_API || '',
  APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || '',
  APPWRITE_DB_READ_ONLY_API_KEY: process.env.APPWRITE_DB_READ_ONLY_API_KEY || '',
};

const generateConfigFile = (filePath) => {
  const content = `export const config = {
  supabase: {
    url: '${envVariables.SUPABASE_URL}',
    anonKey: '${envVariables.SUPABASE_ANON_KEY}',
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
    endpoint: '${envVariables.APPWRITE_API}',
    projectId: '${envVariables.APPWRITE_PROJECT_ID}',
    apiKey: '${envVariables.APPWRITE_DB_READ_ONLY_API_KEY}',
  },
};
`;

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.log(`Config file generated: ${filePath}`);
  console.log('Debug - Environment Variables Loaded:');
  console.log('SUPABASE_URL:', envVariables.SUPABASE_URL ? 'Present' : 'Missing');
  console.log('SUPABASE_ANON_KEY:', envVariables.SUPABASE_ANON_KEY ? 'Present' : 'Missing');
};

generateConfigFile(configFiles.development);
generateConfigFile(configFiles.production);