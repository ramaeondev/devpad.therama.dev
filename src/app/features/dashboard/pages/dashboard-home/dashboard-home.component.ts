import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleDrivePreviewComponent } from '../../../integrations/components/google-drive-preview/google-drive-preview.component';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { GoogleDriveService } from '../../../../core/services/google-drive.service';
import { GoogleDriveFile } from '../../../../core/models/integration.model';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, GoogleDrivePreviewComponent],
  template: `
    <div class="h-full">
      @if (selectedGoogleDriveFile()) {
        <app-google-drive-preview
          [file]="selectedGoogleDriveFile()!"
          (onClose)="closePreview()"
          (onFileAction)="handleFileAction($event)"
        />
      } @else {
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <i class="fa-solid fa-file"></i>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome to DevPad</h3>
            <p class="text-gray-600 dark:text-gray-400">Select a file from the sidebar to get started</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
})
export class DashboardHomeComponent implements OnInit {
  private workspaceState = inject(WorkspaceStateService);
  private googleDrive = inject(GoogleDriveService);

  selectedGoogleDriveFile = signal<GoogleDriveFile | null>(null);

  ngOnInit() {
    console.log('Dashboard home initialized, subscribing to Google Drive file selection');
    this.workspaceState.googleDriveFileSelected$.subscribe(file => {
      console.log('Google Drive file selected in dashboard:', file);
      this.selectedGoogleDriveFile.set(file);
    });
  }

  closePreview() {
    this.selectedGoogleDriveFile.set(null);
  }

  async handleFileAction(event: { action: string; file: GoogleDriveFile }) {
    const { action, file } = event;

    switch (action) {
      case 'rename':
        await this.googleDrive.renameFile(file.id, file.name);
        break;
      case 'delete':
        const success = await this.googleDrive.deleteFile(file.id);
        if (success) {
          this.closePreview();
        }
        break;
      case 'imported':
        // File was imported, just close preview
        break;
    }
  }
}
