import { TestBed } from '@angular/core/testing';
import { NoteEditorComponent } from './note-editor.component';
import { of } from 'rxjs';

function makeRouter() {
  return { navigate: jest.fn(), createUrlTree: jest.fn().mockReturnValue({}), serializeUrl: jest.fn().mockReturnValue('/'), events: of() };
}

class MockToast { success = jest.fn(); error = jest.fn(); }
class MockWorkspace { emitNoteCreated = jest.fn(); emitFoldersChanged = jest.fn(); }

describe('NoteEditorComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('creates a new note on save and navigates to edit route', async () => {
    const created = { id: 'c1', title: 'T', content: 'C' } as any;
    const noteSvc: any = { createNote: jest.fn().mockResolvedValue(created) };
    const auth: any = { userId: jest.fn().mockReturnValue('u1') };
    const router: any = makeRouter();
    const toast = new MockToast();
    const ws = new MockWorkspace();

    await TestBed.configureTestingModule({
      imports: [NoteEditorComponent],
      providers: [
        { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'new' } } } },
        { provide: (await import('@angular/router')).Router, useValue: router },
        { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth },
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast },
        { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: ws }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    const comp = fixture.componentInstance;

    // set content and title and call save
    comp.title.set('Hello');
    comp.content.set('World');

    await comp.onSave();

    expect(noteSvc.createNote).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Hello', content: 'World' }));
    expect(toast.success).toHaveBeenCalledWith('Note created');
    expect(ws.emitNoteCreated).toHaveBeenCalledWith(created);
    expect(ws.emitFoldersChanged).toHaveBeenCalled();
    expect(comp.isNew()).toBe(false);
    expect(comp.noteId()).toBe('c1');
    expect(router.navigate).toHaveBeenCalledWith(['/notes', 'c1', 'edit']);
  });

  it('shows error when create fails', async () => {
    const noteSvc: any = { createNote: jest.fn().mockRejectedValue(new Error('boom')) };
    const auth: any = { userId: jest.fn().mockReturnValue('u1') };
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'new' } } } }, { provide: (await import('@angular/router')).Router, useValue: makeRouter() }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    const comp = fixture.componentInstance;
    comp.title.set('X'); comp.content.set('Y');

    await comp.onSave();

    expect(toast.error).toHaveBeenCalledWith('Failed to save note');
    expect(comp.saving()).toBe(false);
  });

  it('updates an existing note on save', async () => {
    const updated = { title: 'Updated' };
    const noteSvc: any = { getNote: jest.fn().mockResolvedValue({ id: 'n1', title: 'Old', content: 'c' }), updateNote: jest.fn().mockResolvedValue(updated) };
    const auth: any = { userId: jest.fn().mockReturnValue('u1') };
    const route: any = { snapshot: { paramMap: { get: () => 'n1' } } };
    const router: any = makeRouter();
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: route }, { provide: (await import('@angular/router')).Router, useValue: router }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // allow ngOnInit -> loadNote to resolve
    await fixture.whenStable();

    comp.title.set('New title');
    comp.content.set('Content');

    await comp.onSave();

    expect(noteSvc.updateNote).toHaveBeenCalledWith('n1', 'u1', expect.objectContaining({ title: 'New title', content: 'Content' }));
    expect(toast.success).toHaveBeenCalledWith('Note saved');
    expect(comp.title()).toBe('Updated');
  });

  it('delete navigates on success', async () => {
    const noteSvc: any = { deleteNote: jest.fn().mockResolvedValue(true), getNote: jest.fn().mockResolvedValue({ id: 'n2', title: 't', content: '' }) };
    const auth: any = { userId: jest.fn().mockReturnValue('u1') };
    const router: any = makeRouter();
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'n2' } } } }, { provide: (await import('@angular/router')).Router, useValue: router }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    comp.noteId.set('n2'); comp.isNew.set(false);

    await comp.onDelete();

    expect(noteSvc.deleteNote).toHaveBeenCalledWith('n2', 'u1');
    expect(toast.success).toHaveBeenCalledWith('Note deleted');
    expect(router.navigate).toHaveBeenCalledWith(['/notes']);
  });

  it('delete shows error on failure', async () => {
    const noteSvc: any = { deleteNote: jest.fn().mockRejectedValue(new Error('boom')) };
    const auth: any = { userId: jest.fn().mockReturnValue('u1') };
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'n2' } } } }, { provide: (await import('@angular/router')).Router, useValue: makeRouter() }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    const comp = fixture.componentInstance;
    comp.noteId.set('n2'); comp.isNew.set(false);

    await comp.onDelete();
    expect(toast.error).toHaveBeenCalledWith('Failed to delete note');
  });

  it('loadNote redirects to signin when unauthenticated', async () => {
    const noteSvc: any = { getNote: jest.fn() };
    const auth: any = { userId: jest.fn().mockReturnValue(null) };
    const router: any = makeRouter();
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'n1' } } } }, { provide: (await import('@angular/router')).Router, useValue: router }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledWith('Not authenticated');
    expect(router.navigate).toHaveBeenCalledWith(['/auth/signin']);
    expect(noteSvc.getNote).not.toHaveBeenCalled();
  });

  it('loadNote handles not found and errors', async () => {
    const noteSvc: any = { getNote: jest.fn().mockResolvedValue(null) };
    const auth: any = { userId: jest.fn().mockReturnValue('u1') };
    const router: any = makeRouter();
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'n1' } } } }, { provide: (await import('@angular/router')).Router, useValue: router }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledWith('Note not found');
    expect(router.navigate).toHaveBeenCalledWith(['/notes']);

    // error path
    noteSvc.getNote = jest.fn().mockRejectedValue(new Error('boom'));
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'n1' } } } }, { provide: (await import('@angular/router')).Router, useValue: router }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: noteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: auth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture2 = TestBed.createComponent(NoteEditorComponent);
    fixture2.detectChanges();
    await fixture2.whenStable();

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load note: boom'));
  });

  it('isDocument detection and title input work', async () => {
    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: (await import('@angular/router')).ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'new' } } } }, { provide: (await import('@angular/router')).Router, useValue: makeRouter() }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: {} }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: () => 'u1' } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: new MockToast() }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: new MockWorkspace() } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteEditorComponent);
    const comp = fixture.componentInstance;

    comp.content.set('storage://notes/file.pdf');
    expect(comp.isDocument()).toBe(true);

    comp.content.set('plain text');
    expect(comp.isDocument()).toBe(false);

    // title input
    const ev: any = { target: { value: 'hey' } };
    comp.onTitleInput(ev as any);
    expect(comp.title()).toBe('hey');
  });
});