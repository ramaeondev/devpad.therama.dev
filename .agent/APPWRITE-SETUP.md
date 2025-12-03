# Appwrite Integration Setup

## Overview
DevPad now supports Appwrite as an additional backend service alongside Supabase. This integration provides access to Appwrite's database, storage, and authentication features.

## Installation

Appwrite SDK is already installed:
```bash
npm install appwrite
```

## Configuration

### 1. Set up Appwrite Project
1. Go to [Appwrite Console](https://cloud.appwrite.io/)
2. Create a new project or use an existing one
3. Note your:
   - **Endpoint**: Usually `https://cloud.appwrite.io/v1`
   - **Project ID**: Found in project settings

### 2. Configure Environment Variables

Add to `.env`:
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key-or-jwt-token
```

**Note about API Key:**
- The API key is **optional** for client-side operations
- Required only if you need server-side authentication or specific API operations
- For user authentication, use `account.createEmailSession()` instead
- You can set the API key at runtime using `appwriteService.setApiKey(key)`

### 3. Run Configuration Script

```bash
npm run inject-env
```

This will generate `config.dev.ts` and `config.prod.ts` with Appwrite configuration.

## Key & Endpoint Policy

To keep client usage secure and predictable:

- Client-side API calls must use `APPWRITE_API` (custom endpoint) and `APPWRITE_DB_READ_ONLY_API_KEY`.
- Do NOT use `APPWRITE_MASTER_API_KEY` or `APPWRITE_ENDPOINT` in any client-side code. These are only for one-off/server-side setup scripts (e.g., creating databases, collections, and attributes).
- The configuration generator (`scripts/inject-env.js`) maps:
  - `APPWRITE_API` → `config.appwrite.endpoint`
  - `APPWRITE_DB_READ_ONLY_API_KEY` → `config.appwrite.apiKey`
- Setup-only variables (never bundled in app logic):
  - `APPWRITE_ENDPOINT` (e.g., cloud endpoint)
  - `APPWRITE_MASTER_API_KEY`

Example env for client retrievals:
```env
APPWRITE_API=https://api-v2.therama.dev/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_DB_READ_ONLY_API_KEY=your-read-only-key
```

Server-side/setup script only:
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_MASTER_API_KEY=your-master-key
```

## Usage

### Inject the Service

```typescript
import { AppwriteService } from './core/services/appwrite.service';

export class MyComponent {
  private appwrite = inject(AppwriteService);
}
```

### Available Methods

#### Authentication
```typescript
// Get current session
const user = await this.appwrite.getCurrentSession();

// Create email session (login)
await this.appwrite.createEmailSession('user@example.com', 'password');

// Logout
await this.appwrite.deleteSession();
```

#### Database Operations
```typescript
// List documents
const docs = await this.appwrite.listDocuments('databaseId', 'collectionId');

// Get document
const doc = await this.appwrite.getDocument('databaseId', 'collectionId', 'documentId');

// Create document
await this.appwrite.createDocument('databaseId', 'collectionId', 'unique()', {
  title: 'My Document',
  content: 'Hello World'
});

// Update document
await this.appwrite.updateDocument('databaseId', 'collectionId', 'documentId', {
  title: 'Updated Title'
});

// Delete document
await this.appwrite.deleteDocument('databaseId', 'collectionId', 'documentId');
```

#### Storage Operations
```typescript
// Upload file
const file = new File(['content'], 'file.txt');
await this.appwrite.uploadFile('bucketId', 'unique()', file);

// Get file preview URL
const previewUrl = this.appwrite.getFilePreview('bucketId', 'fileId', 400, 300);

// Get file download URL
const downloadUrl = this.appwrite.getFileDownload('bucketId', 'fileId');

// Delete file
await this.appwrite.deleteFile('bucketId', 'fileId');
```

### Direct SDK Access

For advanced usage, access the Appwrite SDK directly:

```typescript
// Access services directly
const account = this.appwrite.account;
const databases = this.appwrite.databases;
const storage = this.appwrite.storage;
const teams = this.appwrite.teams;

// Or get the client
const client = this.appwrite.getClient();
```

## Example: Creating a Notes Collection

1. **In Appwrite Console:**
   - Create a Database (e.g., `main`)
   - Create a Collection (e.g., `notes`)
   - Add attributes: `title` (string), `content` (string), `userId` (string)
   - Set permissions appropriately

2. **In Your Code:**
```typescript
// Create a note
await this.appwrite.createDocument(
  'main',           // databaseId
  'notes',          // collectionId
  'unique()',       // documentId (auto-generated)
  {
    title: 'My Note',
    content: 'Note content',
    userId: currentUserId
  }
);

// List user's notes
const notes = await this.appwrite.listDocuments(
  'main',
  'notes',
  [Query.equal('userId', currentUserId)]
);
```

## Testing

Check if Appwrite is configured:
```typescript
if (this.appwrite.isConfigured()) {
  // Appwrite is ready to use
  const user = await this.appwrite.getCurrentSession();
}
```

## Next Steps

1. Add your Appwrite endpoint and project ID to `.env`
2. Run `npm run inject-env`
3. Start building with Appwrite APIs
4. Refer to [Appwrite Documentation](https://appwrite.io/docs) for advanced features

## Notes

- Appwrite integration is optional - DevPad continues to work with Supabase
- The service provides error handling with console logging
- All methods are async and should be awaited
- Use Appwrite's `Query` helper for advanced filtering (import from 'appwrite')
