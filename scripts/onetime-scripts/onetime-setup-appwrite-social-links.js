/**
 * Appwrite Social Links Setup Script
 * Run this with: node scripts/setup-appwrite-social-links.js
 * 
 * Prerequisites:
 * 1. npm install node-appwrite
 * 2. Set APPWRITE_MASTER_API_KEY in .env (must have database create permissions)
 */

const sdk = require('node-appwrite');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Use Appwrite Cloud by default
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_MASTER_API_KEY;

// Validate configuration
if (!PROJECT_ID) {
  console.error('❌ APPWRITE_PROJECT_ID is missing in .env file');
  process.exit(1);
}
if (!API_KEY) {
  console.error('❌ APPWRITE_MASTER_API_KEY is missing in .env file');
  process.exit(1);
}

console.log('🔧 Configuration:');
console.log('   Endpoint:', ENDPOINT);
console.log('   Project ID:', PROJECT_ID);
console.log('   API Key:', API_KEY.substring(0, 20) + '...\n');

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);

const DATABASE_ID = 'devpad_main';
const COLLECTION_ID = 'social_links';

const socialLinksData = [
  {
    platform: 'github',
    url: 'https://github.com/ramaeon',
    icon: 'fab fa-github',
    display_name: 'GitHub',
    order: 1,
    is_active: true,
  },
  {
    platform: 'twitter',
    url: 'https://twitter.com/ramaeon',
    icon: 'fab fa-twitter',
    display_name: 'Twitter',
    order: 2,
    is_active: true,
  },
  {
    platform: 'linkedin',
    url: 'https://www.linkedin.com/in/ramaeon/',
    icon: 'fab fa-linkedin',
    display_name: 'LinkedIn',
    order: 3,
    is_active: true,
  },
  {
    platform: 'npm',
    url: 'https://www.npmjs.com/~ramaeon',
    icon: 'fab fa-npm',
    display_name: 'npm',
    order: 4,
    is_active: true,
  },
];

async function setupSocialLinks() {
  try {
    console.log('🚀 Starting Appwrite Social Links Setup...\n');

    // Step 1: Create Database
    console.log('📦 Creating database...');
    try {
      await databases.create(DATABASE_ID, 'DevPad Main Database');
      console.log('✅ Database created:', DATABASE_ID);
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Database already exists:', DATABASE_ID);
      } else {
        throw error;
      }
    }

    // Step 2: Create Collection
    console.log('\n📁 Creating collection...');
    try {
      await databases.createCollection(
        DATABASE_ID,
        COLLECTION_ID,
        'Social Links',
        [sdk.Permission.read(sdk.Role.any())]
      );
      console.log('✅ Collection created:', COLLECTION_ID);
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Collection already exists:', COLLECTION_ID);
      } else {
        throw error;
      }
    }

    // Step 3: Create Attributes
    console.log('\n🔧 Creating attributes...');
    const attributes = [
      { type: 'string', key: 'platform', size: 50 },
      { type: 'string', key: 'url', size: 500 },
      { type: 'string', key: 'icon', size: 100 },
      { type: 'string', key: 'display_name', size: 100 },
      { type: 'integer', key: 'order' },
      { type: 'boolean', key: 'is_active' },
    ];

    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.size,
            true
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            true,
            0,
            9999
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            true
          );
        }
        console.log(`✅ Attribute created: ${attr.key}`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          throw error;
        }
      }
    }

    // Wait for attributes to be ready
    console.log('\n⏳ Waiting for attributes to be ready...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 4: Create Documents
    console.log('\n📝 Creating documents...');
    for (const link of socialLinksData) {
      try {
        const doc = await databases.createDocument(
          DATABASE_ID,
          COLLECTION_ID,
          sdk.ID.unique(),
          link,
          [sdk.Permission.read(sdk.Role.any())]
        );
        console.log(`✅ Created: ${link.platform} (${doc.$id})`);
      } catch (error) {
        console.log(`⚠️  Failed to create ${link.platform}:`, error.message);
      }
    }

    console.log('\n🎉 Setup complete! Social links are ready to use.');
    console.log('\n📍 Configuration:');
    console.log(`   Database ID: ${DATABASE_ID}`);
    console.log(`   Collection ID: ${COLLECTION_ID}`);
    console.log(`   Total Documents: ${socialLinksData.length}`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the setup
setupSocialLinks();
