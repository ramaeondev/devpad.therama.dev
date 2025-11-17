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
            <svg class="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
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
