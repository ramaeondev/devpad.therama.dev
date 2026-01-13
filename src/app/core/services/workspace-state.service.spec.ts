import { TestBed } from '@angular/core/testing';
import { WorkspaceStateService } from './workspace-state.service';

describe('WorkspaceStateService', () => {
  let service: WorkspaceStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [WorkspaceStateService] });
    service = TestBed.inject(WorkspaceStateService);
  });

  it('initial signals are null and can be set', () => {
    expect(service.selectedFolderId()).toBeNull();
    service.setSelectedFolder('f1');
    expect(service.selectedFolderId()).toBe('f1');

    expect(service.selectedNoteId()).toBeNull();
    service.setSelectedNote('n1');
    expect(service.selectedNoteId()).toBe('n1');
  });

  it('emits noteCreated and foldersChanged', (done) => {
    const note = { id: 'n1', title: 't' } as any;
    service.noteCreated$.subscribe((n) => {
      expect(n).toBe(note);
      done();
    });
    service.emitNoteCreated(note);
  });

  it('emitNoteSelected sets selectedNoteId and emits', () => {
    const note = { id: 'n2', title: 't2' } as any;
    let emitted: any = null;
    service.noteSelected$.subscribe((n) => {
      emitted = n;
    });

    service.emitNoteSelected(note);
    expect(emitted).toBe(note);
    expect(service.selectedNoteId()).toBe('n2');
  });

  it('drive file selection emits', (done) => {
    const g = { id: 'g1' } as any;
    const o = { id: 'o1' } as any;

    service.googleDriveFileSelected$.subscribe((f) => {
      expect(f).toBe(g);
    });
    service.oneDriveFileSelected$.subscribe((f) => {
      expect(f).toBe(o);
      done();
    });

    service.emitGoogleDriveFileSelected(g);
    service.emitOneDriveFileSelected(o);
  });
});
