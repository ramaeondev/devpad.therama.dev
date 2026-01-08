const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()

const configFiles = {
  development: path.resolve(__dirname, '../src/config.dev.ts'),
  production: path.resolve(__dirname, '../src/config.prod.ts')
}

const envVariables = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_OLD_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || '',
  MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || '',
  GOOGLE_APPID: process.env.GOOGLE_APPID || '',
  APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || '',
  APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || '',
  APPWRITE_DB_READ_ONLY_API_KEY: process.env.APPWRITE_DB_READ_ONLY_API_KEY || '',
  APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID || ''
}

// Validate required env vars early: fail the build if missing
if (!envVariables.SUPABASE_URL || envVariables.SUPABASE_URL.trim() === '') {
  console.error('Missing SUPABASE_URL env var. Set SUPABASE_URL in your build environment.')
  process.exit(1)
}
if (!envVariables.SUPABASE_ANON_KEY || envVariables.SUPABASE_ANON_KEY.trim() === '') {
  console.error(
    'Missing SUPABASE_ANON_KEY env var. Set SUPABASE_ANON_KEY in your build environment.'
  )
  process.exit(1)
}

const generateConfigFile = (filePath) => {
  const microsoftRedirect = envVariables.MICROSOFT_REDIRECT_URI
    ? `'${envVariables.MICROSOFT_REDIRECT_URI}'`
    : "typeof window !== 'undefined' ? window.location.origin : 'https://devpad.therama.dev'"
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
    redirectUri: ${microsoftRedirect},
  },
  appwrite: {
    endpoint: '${envVariables.APPWRITE_ENDPOINT}',
    projectId: '${envVariables.APPWRITE_PROJECT_ID}',
    apiKey: '${envVariables.APPWRITE_DB_READ_ONLY_API_KEY}',
    databaseId: '${envVariables.APPWRITE_DATABASE_ID}',
  },
};
`

  fs.writeFileSync(filePath, content, { encoding: 'utf8' })
}

generateConfigFile(configFiles.development)
generateConfigFile(configFiles.production)
