#!/usr/bin/env node

/**
 * Appwrite Changelog Database Setup Script
 * Creates the change_logs collection in Appwrite with proper schema
 */

const { Client, Databases, ID, Permission, Role } = require('node-appwrite')
const dotenv = require('dotenv')

dotenv.config()

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID
const APPWRITE_MASTER_API_KEY = process.env.APPWRITE_MASTER_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'devpad_main'
const COLLECTION_ID = 'change_logs'

if (!APPWRITE_PROJECT_ID || !APPWRITE_MASTER_API_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   - APPWRITE_PROJECT_ID')
  console.error('   - APPWRITE_MASTER_API_KEY')
  process.exit(1)
}

async function setupChangelogsCollection () {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_MASTER_API_KEY)

  const databases = new Databases(client)

  try {
    console.log('🔍 Checking if database exists...')

    // Try to get the database
    try {
      await databases.get(DATABASE_ID)
      console.log('✅ Database exists:', DATABASE_ID)
    } catch (error) {
      if (error.code === 404) {
        console.log('📦 Creating database:', DATABASE_ID)
        await databases.create(DATABASE_ID, 'DevPad Database')
        console.log('✅ Database created successfully')
      } else {
        throw error
      }
    }

    console.log('🔍 Checking if collection exists...')

    // Try to get the collection
    try {
      await databases.getCollection(DATABASE_ID, COLLECTION_ID)
      console.log('⚠️  Collection already exists:', COLLECTION_ID)
      console.log('   To recreate, delete it manually first from Appwrite Console')
      return
    } catch (error) {
      if (error.code === 404) {
        console.log('📝 Creating collection:', COLLECTION_ID)

        // Create collection with public read permissions
        await databases.createCollection(
          DATABASE_ID,
          COLLECTION_ID,
          'Changelogs',
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
          ],
          false, // documentSecurity
          true // enabled
        )

        console.log('✅ Collection created successfully')
      } else {
        throw error
      }
    }

    console.log('📋 Creating attributes...')

    // Create date attribute (required, indexed)
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'date',
      10,
      true, // required
      null,
      false
    )
    console.log('✅ Created attribute: date (string)')

    // Create changes attribute (required, array of strings)
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'changes',
      10000,
      true, // required
      null,
      true // array
    )
    console.log('✅ Created attribute: changes (string array)')

    console.log('⏳ Waiting for attributes to be available...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Create index on date for sorting
    console.log('🔗 Creating index on date field...')
    await databases.createIndex(DATABASE_ID, COLLECTION_ID, 'date_idx', 'key', ['date'], ['DESC'])
    console.log('✅ Created index: date_idx')

    console.log('\n✅ Changelog collection setup complete!')
    console.log(`   Database ID: ${DATABASE_ID}`)
    console.log(`   Collection ID: ${COLLECTION_ID}`)
    console.log('\n📌 Next steps:')
    console.log('   1. Run: node scripts/migrate-changelog-to-appwrite.js')
    console.log('   2. Add APPWRITE_DATABASE_ID to your .env file')
  } catch (error) {
    console.error('❌ Error setting up collection:', error)
    process.exit(1)
  }
}

setupChangelogsCollection()
