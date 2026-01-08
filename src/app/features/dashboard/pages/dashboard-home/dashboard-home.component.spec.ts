import { TestBed } from '@angular/core/testing';
import { DashboardHomeComponent } from './dashboard-home.component';

class MockWorkspace { googleDriveFileSelected$ = { subscribe: () => {} }; oneDriveFileSelected$ = { subscribe: () => {} }; }

describe('DashboardHomeComponent', () => {
  it('renders welcome when no files selected and can close previews', async () => {
    await TestBed.configureTestingModule({ imports: [DashboardHomeComponent], providers: [
      { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace },
      { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useValue: {} },
      { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useValue: {} },
    ] }).compileComponents();

    const fixture = TestBed.createComponent(DashboardHomeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Welcome to DevPad');

    const comp = fixture.componentInstance;
    comp.selectedGoogleDriveFile.set({ id: 'f1', name: 'file' } as any);
    comp.closeGoogleDrivePreview();
    expect(comp.selectedGoogleDriveFile()).toBeNull();
  });
});