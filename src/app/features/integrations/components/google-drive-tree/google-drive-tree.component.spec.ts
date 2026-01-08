import { TestBed } from '@angular/core/testing';
import { GoogleDriveTreeComponent } from './google-drive-tree.component';

class MockGoogleDrive { async checkConnection(){} async downloadFile(){ return new Blob(['a']); } }
class MockToast { success = jest.fn(); error = jest.fn(); }

describe('GoogleDriveTreeComponent', () => {
  it('toggles root and menus and properties', async () => {
    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogleDrive }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    expect(comp.isRootExpanded()).toBe(true);
    comp.toggleRootFolder();
    expect(comp.isRootExpanded()).toBe(false);

    comp.toggleFileMenu('f1');
    expect(comp.openMenuId()).toBe('f1');
    comp.toggleFileMenu('f1');
    expect(comp.openMenuId()).toBeNull();

    const file = { id: 'x', name: 'n', size: '1024', mimeType: 'text/plain' } as any;
    comp.handleProperties(file);
    expect(comp.showPropertiesModal()).toBe(true);
    expect(comp.propertiesModalData().length).toBeGreaterThan(0);
  });
});