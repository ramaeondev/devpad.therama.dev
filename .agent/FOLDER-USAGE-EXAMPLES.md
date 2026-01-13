# Folder Service Usage Examples

## Basic Usage

### 1. Initialize Root Folder (Automatic on First Login)

This happens automatically in `auth.guard.ts` and `signin.component.ts`, but you can also call it manually:

```typescript
import { inject } from '@angular/core';
import { FolderService } from './features/folders/services/folder.service';
import { AuthStateService } from './core/services/auth-state.service';

export class SomeComponent {
  private folderService = inject(FolderService);
  private authState = inject(AuthStateService);

  async initializeFolders() {
    const userId = this.authState.userId();
    try {
      const rootFolder = await this.folderService.initializeUserFolders(userId);
      console.log('Root folder:', rootFolder);
    } catch (error) {
      console.error('Failed to initialize folders:', error);
    }
  }
}
```

### 2. Display Folder Tree in Sidebar

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { FolderService } from './features/folders/services/folder.service';
import { AuthStateService } from './core/services/auth-state.service';
import { FolderTree } from './core/models/folder.model';

@Component({
  selector: 'app-my-sidebar',
  template: `
    <div class="sidebar">
      <h3>My Folders</h3>
      @for (folder of folders(); track folder.id) {
        <div (click)="selectFolder(folder)">
          {{ folder.icon }} {{ folder.name }}
          @if (folder.children) {
            <!-- Render children recursively -->
          }
        </div>
      }
    </div>
  `,
})
export class MySidebarComponent implements OnInit {
  private folderService = inject(FolderService);
  private authState = inject(AuthStateService);

  folders = signal<FolderTree[]>([]);

  async ngOnInit() {
    const userId = this.authState.userId();
    const tree = await this.folderService.getFolderTree(userId);
    this.folders.set(tree);
  }

  selectFolder(folder: FolderTree) {
    console.log('Selected:', folder.name);
  }
}
```

### 3. Create a New Folder

```typescript
import { Component, inject } from '@angular/core';
import { FolderService } from './features/folders/services/folder.service';
import { AuthStateService } from './core/services/auth-state.service';

@Component({
  selector: 'app-create-folder',
  template: ` <button (click)="createFolder()">Create Folder</button> `,
})
export class CreateFolderComponent {
  private folderService = inject(FolderService);
  private authState = inject(AuthStateService);

  async createFolder() {
    const userId = this.authState.userId();

    try {
      const newFolder = await this.folderService.createFolder(userId, {
        name: 'Work Projects',
        parent_id: null, // or a specific parent folder ID
        icon: '💼',
        color: '#3B82F6',
      });

      console.log('Created folder:', newFolder);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }
}
```

### 4. Create a Subfolder

```typescript
async createSubfolder(parentFolderId: string) {
  const userId = this.authState.userId();

  try {
    const subfolder = await this.folderService.createFolder(userId, {
      name: 'Important',
      parent_id: parentFolderId, // Set parent folder
      icon: '⭐',
      color: '#F59E0B'
    });

    console.log('Created subfolder:', subfolder);
  } catch (error) {
    console.error('Failed to create subfolder:', error);
  }
}
```

### 5. Update a Folder

```typescript
async renameFolder(folderId: string, newName: string) {
  const userId = this.authState.userId();

  try {
    const updated = await this.folderService.updateFolder(folderId, userId, {
      name: newName,
      icon: '📝', // Optional: update icon
      color: '#10B981' // Optional: update color
    });

    console.log('Updated folder:', updated);
  } catch (error) {
    console.error('Failed to update folder:', error);
  }
}
```

### 6. Move a Folder

```typescript
async moveFolder(folderId: string, newParentId: string | null) {
  const userId = this.authState.userId();

  try {
    const moved = await this.folderService.updateFolder(folderId, userId, {
      parent_id: newParentId
    });

    console.log('Moved folder:', moved);
  } catch (error) {
    console.error('Failed to move folder:', error);
  }
}
```

### 7. Delete a Folder

```typescript
async deleteFolder(folderId: string) {
  const userId = this.authState.userId();

  try {
    await this.folderService.deleteFolder(folderId, userId);
    console.log('Folder deleted successfully');
  } catch (error) {
    if (error.message.includes('root folder')) {
      console.error('Cannot delete root folder');
    } else {
      console.error('Failed to delete folder:', error);
    }
  }
}
```

### 8. Get All Folders (Flat List)

```typescript
async getAllFolders() {
  const userId = this.authState.userId();

  try {
    const folders = await this.folderService.getFolders(userId);
    console.log('All folders:', folders);
    return folders;
  } catch (error) {
    console.error('Failed to get folders:', error);
    return [];
  }
}
```

### 9. Get Root Folder

```typescript
async getRootFolder() {
  const userId = this.authState.userId();

  try {
    const root = await this.folderService.getRootFolder(userId);
    if (root) {
      console.log('Root folder:', root);
    } else {
      console.log('No root folder found');
    }
    return root;
  } catch (error) {
    console.error('Failed to get root folder:', error);
    return null;
  }
}
```

### 10. Get Child Folders

```typescript
async getSubfolders(parentId: string) {
  const userId = this.authState.userId();

  try {
    const children = await this.folderService.getChildFolders(parentId, userId);
    console.log('Subfolders:', children);
    return children;
  } catch (error) {
    console.error('Failed to get subfolders:', error);
    return [];
  }
}
```

## Advanced Usage

### Complete Folder Management Component

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FolderService } from './features/folders/services/folder.service';
import { AuthStateService } from './core/services/auth-state.service';
import { FolderTree } from './core/models/folder.model';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-folder-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="folder-manager">
      <h2>Manage Folders</h2>

      <!-- Create Folder Form -->
      <form [formGroup]="folderForm" (ngSubmit)="onSubmit()">
        <input formControlName="name" placeholder="Folder name" />
        <input formControlName="icon" placeholder="Icon (emoji)" />
        <select formControlName="parent_id">
          <option [value]="null">Root Level</option>
          @for (folder of allFolders(); track folder.id) {
            <option [value]="folder.id">{{ folder.name }}</option>
          }
        </select>
        <button type="submit" [disabled]="folderForm.invalid || loading()">
          {{ editingFolder() ? 'Update' : 'Create' }}
        </button>
      </form>

      <!-- Folder Tree -->
      <div class="folder-tree">
        @for (folder of folderTree(); track folder.id) {
          <div class="folder-item">
            <span>{{ folder.icon }} {{ folder.name }}</span>
            @if (!folder.is_root) {
              <button (click)="editFolder(folder)">Edit</button>
              <button (click)="deleteFolder(folder.id)">Delete</button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class FolderManagerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private folderService = inject(FolderService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);

  folderTree = signal<FolderTree[]>([]);
  allFolders = signal<FolderTree[]>([]);
  editingFolder = signal<FolderTree | null>(null);
  loading = signal(false);

  folderForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    icon: ['📁'],
    parent_id: [null as string | null],
  });

  async ngOnInit() {
    await this.loadFolders();
  }

  async loadFolders() {
    const userId = this.authState.userId();

    try {
      const tree = await this.folderService.getFolderTree(userId);
      this.folderTree.set(tree);

      const all = await this.folderService.getFolders(userId);
      this.allFolders.set(all);
    } catch (error) {
      console.error('Failed to load folders:', error);
      this.toast.error('Failed to load folders');
    }
  }

  async onSubmit() {
    if (this.folderForm.invalid) return;

    this.loading.set(true);
    const userId = this.authState.userId();
    const formValue = this.folderForm.getRawValue();

    try {
      const editing = this.editingFolder();

      if (editing) {
        // Update existing folder
        await this.folderService.updateFolder(editing.id, userId, {
          name: formValue.name,
          icon: formValue.icon,
          parent_id: formValue.parent_id,
        });
        this.toast.success('Folder updated');
      } else {
        // Create new folder
        await this.folderService.createFolder(userId, {
          name: formValue.name,
          icon: formValue.icon,
          parent_id: formValue.parent_id,
        });
        this.toast.success('Folder created');
      }

      this.folderForm.reset({ icon: '📁', parent_id: null });
      this.editingFolder.set(null);
      await this.loadFolders();
    } catch (error) {
      console.error('Failed to save folder:', error);
      this.toast.error('Failed to save folder');
    } finally {
      this.loading.set(false);
    }
  }

  editFolder(folder: FolderTree) {
    this.editingFolder.set(folder);
    this.folderForm.patchValue({
      name: folder.name,
      icon: folder.icon || '📁',
      parent_id: folder.parent_id,
    });
  }

  async deleteFolder(folderId: string) {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    this.loading.set(true);
    const userId = this.authState.userId();

    try {
      await this.folderService.deleteFolder(folderId, userId);
      this.toast.success('Folder deleted');
      await this.loadFolders();
    } catch (error: any) {
      console.error('Failed to delete folder:', error);
      if (error.message.includes('root folder')) {
        this.toast.error('Cannot delete root folder');
      } else {
        this.toast.error('Failed to delete folder');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
```

## Integration with Notes

### Filter Notes by Folder

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { SupabaseService } from './core/services/supabase.service';
import { AuthStateService } from './core/services/auth-state.service';
import { Note } from './core/models/note.model';

@Component({
  selector: 'app-note-list',
  template: `
    <div>
      <h2>Notes in {{ selectedFolderName() }}</h2>
      @for (note of notes(); track note.id) {
        <div>{{ note.title }}</div>
      }
    </div>
  `,
})
export class NoteListComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private authState = inject(AuthStateService);

  notes = signal<Note[]>([]);
  selectedFolderName = signal<string>('All Notes');

  async loadNotesByFolder(folderId: string | null) {
    const userId = this.authState.userId();

    try {
      let query = this.supabase.from('notes').select('*').eq('user_id', userId);

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      this.notes.set(data || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }
}
```

## User Service Examples

### Check if Root Folder Created

```typescript
import { inject } from '@angular/core';
import { UserService } from './core/services/user.service';
import { AuthStateService } from './core/services/auth-state.service';

export class SomeComponent {
  private userService = inject(UserService);
  private authState = inject(AuthStateService);

  async checkRootFolder() {
    const userId = this.authState.userId();
    const hasRoot = await this.userService.hasRootFolder(userId);

    if (!hasRoot) {
      console.log('User needs root folder initialization');
    }
  }
}
```

### Get User Profile

```typescript
async getUserProfile() {
  const userId = this.authState.userId();

  try {
    const profile = await this.userService.getUserProfile(userId);
    console.log('User profile:', profile);
    console.log('Root folder created:', profile?.is_root_folder_created);
  } catch (error) {
    console.error('Failed to get profile:', error);
  }
}
```

## Error Handling Best Practices

```typescript
import { ToastService } from './core/services/toast.service';

async safeCreateFolder(name: string) {
  const userId = this.authState.userId();

  if (!userId) {
    this.toast.error('Please sign in to create folders');
    return null;
  }

  try {
    const folder = await this.folderService.createFolder(userId, {
      name,
      icon: '📁'
    });

    this.toast.success(`Folder "${name}" created`);
    return folder;
  } catch (error: any) {
    console.error('Create folder error:', error);

    if (error.code === '23505') {
      this.toast.error('A folder with this name already exists');
    } else if (error.code === '23503') {
      this.toast.error('Parent folder not found');
    } else {
      this.toast.error('Failed to create folder');
    }

    return null;
  }
}
```
