# Activity Logging Guidelines

This document outlines the standards for logging user activities in the application. As new features are added, they must be integrated into the activity logging system following these guidelines to ensure consistency and reliable analytics.

## 1. When to Log
You should log an activity whenever a user performs a significant action that:
- Modifies data (Create, Update, Delete)
- Affects security (Login, Logout, Password Change)
- Involves collaboration (Sharing, Forking, Viewing Shared Content)
- Is valuable for user history or admin analytics

## 2. Usage
Inject `ActivityLogService` and use the helper methods for common actions.
You should import the Enums from `core/models/activity-log.model`.

### Content Actions (Notes, Folders, Tags)
Use `logContentAction` for standard CRUD.
```typescript
import { ActivityAction, ActivityResource } from '...';

this.activityLog.logContentAction(
  userId,
  ActivityAction.Create,     // Enum: Create, Update, Delete, Archive, Restore
  ActivityResource.Note,     // Enum: Note, Folder, Tag
  noteId,
  noteTitle,
  { tagCount: 5 } // Optional Metadata
);
```

### Sharing Actions
Use `logShareAction` for public link management.
```typescript
this.activityLog.logShareAction(
  userId,
  ActivityAction.ShareCreate, // Enum: ShareCreate, ShareUpdate, ShareDelete
  shareId,
  noteTitle
);
```

### Auth/Security Actions
Use `logAuthAction`.
```typescript
this.activityLog.logAuthAction(userId, ActivityAction.Login);
```

## 3. Extending the System
If a new feature requires a new **Action Type** or **Resource Type** that doesn't fit the existing Enums, follow this process:

1.  **Database Migration**:
    You must update the database ENUMs first.
    ```sql
    ALTER TYPE "public"."activity_action_type" ADD VALUE 'new_action';
    ALTER TYPE "public"."activity_resource_type" ADD VALUE 'new_resource';
    ```

2.  **Update Enums**:
    Update `src/app/core/models/activity-log.model.ts`:
    ```typescript
    export enum ActivityAction {
        ...
        NewAction = 'new_action'
    }
    ```

3.  **Update Service (Optional)**:
    If this is a frequent action, add a new helper method in `ActivityLogService` (e.g., `logBillingAction`).

## 4. Categories
The system automatically infers categories (`content`, `security`, `access`, `system`) based on the action/resource.
- **Content**: Creating/Editing notes or folders.
- **Security**: Login, Logout, Auth changes.
- **Access**: Viewing, Downloading, Sharing.
- **System**: Background tasks, settings changes.

## 5. Anonymous Logs
For public share views where no user is logged in:
- Pass `undefined` or `null` for `userId`.
- The service will automatically flag `is_anonymous: true`.
