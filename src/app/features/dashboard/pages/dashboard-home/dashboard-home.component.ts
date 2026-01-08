import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleDrivePreviewComponent } from '../../../integrations/components/google-drive-preview/google-drive-preview.component';
import { OneDrivePreviewComponent } from '../../../integrations/components/onedrive-preview/onedrive-preview.component';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { GoogleDriveService } from '../../../../core/services/google-drive.service';
import { OneDriveService } from '../../../../core/services/onedrive.service';
import { GoogleDriveFile, OneDriveFile } from '../../../../core/models/integration.model';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, GoogleDrivePreviewComponent, OneDrivePreviewComponent],
  template: `
    <div class="h-full">
      @if (selectedGoogleDriveFile()) {
        <app-google-drive-preview
          [file]="selectedGoogleDriveFile()!"
          (onClose)="closeGoogleDrivePreview()"
          (onFileAction)="handleGoogleDriveFileAction($event)"
        />
      } @else if (selectedOneDriveFile()) {
        <app-onedrive-preview
          [file]="selectedOneDriveFile()!"
          (onClose)="closeOneDrivePreview()"
          (onFileAction)="handleOneDriveFileAction($event)"
        />
      } @else {
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <i class="fa-solid fa-file"></i>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome to DevPad
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Select a file from the sidebar to get started
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class DashboardHomeComponent implements OnInit {
  private workspaceState = inject(WorkspaceStateService);
  private googleDrive = inject(GoogleDriveService);
  private oneDrive = inject(OneDriveService);

  selectedGoogleDriveFile = signal<GoogleDriveFile | null>(null);
  selectedOneDriveFile = signal<OneDriveFile | null>(null);

  ngOnInit() {
    console.log('Dashboard home initialized, subscribing to file selection');

    this.workspaceState.googleDriveFileSelected$.subscribe((file) => {
      console.log('Google Drive file selected in dashboard:', file);
      this.selectedGoogleDriveFile.set(file);
    });

    this.workspaceState.oneDriveFileSelected$.subscribe((file) => {
      console.log('OneDrive file selected in dashboard:', file);
      this.selectedOneDriveFile.set(file);
    });
  }

  closeGoogleDrivePreview() {
    this.selectedGoogleDriveFile.set(null);
  }

  closeOneDrivePreview() {
    this.selectedOneDriveFile.set(null);
  }

  async handleGoogleDriveFileAction(event: { action: string; file: GoogleDriveFile }) {
    const { action, file } = event;

    switch (action) {
      case 'rename':
        await this.googleDrive.renameFile(file.id, file.name);
        break;
      case 'delete':
        const success = await this.googleDrive.deleteFile(file.id);
        if (success) {
          this.closeGoogleDrivePreview();
        }
        break;
      case 'imported':
        // File was imported, just close preview
        break;
    }
  }

  async handleOneDriveFileAction(event: { action: string; file: OneDriveFile }) {
    const { action, file } = event;

    switch (action) {
      case 'rename':
        await this.oneDrive.renameFile(file.id, file.name);
        break;
      case 'delete':
        const success = await this.oneDrive.deleteFile(file.id);
        if (success) {
          this.closeOneDrivePreview();
        }
        break;
      case 'imported':
        // File was imported, just close preview
        break;
    }
  }
}
