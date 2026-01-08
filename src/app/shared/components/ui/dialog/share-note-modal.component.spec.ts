import { TestBed } from '@angular/core/testing';
import { ShareNoteModalComponent } from './share-note-modal.component';

class MockShare {
  generateShareUrl(t: string) { return `https://share/${t}` }
  async getSharesForNote(_id: string) { return []; }
  async createShare() { return { id: 's1', share_token: 't1', permission: 'readonly' } }
  async updatePublicShare() { return {} }
  async deleteShare() { return {} }
}
class MockToast { success = jest.fn(); error = jest.fn(); }

describe('ShareNoteModalComponent', () => {
  it('ngOnInit returns early when no note', async () => {
    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useClass: MockShare }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.note = undefined as any;
    await comp.ngOnInit();
    expect(comp.loading()).toBeFalsy();
  });

  it('ngOnInit loads existing share and parses expiry/maxViews', async () => {
    const mock = new MockShare();
    mock.getSharesForNote = jest.fn().mockResolvedValue([{ id: 's2', share_token: 'tok', permission: 'editable', max_views: 1 }]);

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n1' } as any;

    await comp.ngOnInit();

    expect(mock.getSharesForNote).toHaveBeenCalledWith('n1');
    expect(comp.existingShare()).toBeTruthy();
    expect(comp.permission).toBe('editable');
    expect(comp.selectedExpiry()).toBe('once');
  });

  it('createShare calls service and emits shared & shows toast on success', async () => {
    const mock = new MockShare();
    mock.createShare = jest.fn().mockResolvedValue({ id: 's3', share_token: 't3', permission: 'readonly' });
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n1', title: 'T' } as any;

    const spy = jest.fn();
    comp.shared.subscribe(spy);

    await comp.createShare();

    expect(mock.createShare).toHaveBeenCalledWith('n1', comp.permission, null, null);
    expect(toast.success).toHaveBeenCalledWith('Share link created!');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 's3' }));
  });

  it('createShare shows toast on error', async () => {
    const mock = new MockShare();
    const err = new Error('boom');
    mock.createShare = jest.fn().mockRejectedValue(err);
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n1' } as any;

    await comp.createShare();

    expect(toast.error).toHaveBeenCalledWith('boom');
  });

  it('updateShare updates and shows success toast', async () => {
    const mock = new MockShare();
    mock.updatePublicShare = jest.fn().mockResolvedValue({});
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.existingShare.set({ id: 's4', permission: 'readonly' } as any);

    await comp.updateShare();

    expect(mock.updatePublicShare).toHaveBeenCalledWith('s4', expect.any(Object));
    expect(toast.success).toHaveBeenCalledWith('Share updated!');
    expect(comp.existingShare()?.permission).toEqual(comp.permission);
  });

  it('updateShare shows toast on error', async () => {
    const mock = new MockShare();
    mock.updatePublicShare = jest.fn().mockRejectedValue(new Error('nope'));
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.existingShare.set({ id: 's4', permission: 'readonly' } as any);

    await comp.updateShare();

    expect(toast.error).toHaveBeenCalledWith('Failed to update share');
  });

  it('unshare deletes share, emits cancel and shows toast', async () => {
    const mock = new MockShare();
    mock.deleteShare = jest.fn().mockResolvedValue({});
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.existingShare.set({ id: 's5' } as any);

    const cancelSpy = jest.fn();
    comp.cancel.subscribe(cancelSpy);

    await comp.unshare();

    expect(mock.deleteShare).toHaveBeenCalledWith('s5');
    expect(toast.success).toHaveBeenCalledWith('Share removed');
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('unshare shows toast on error', async () => {
    const mock = new MockShare();
    mock.deleteShare = jest.fn().mockRejectedValue(new Error('err'));
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.existingShare.set({ id: 's5' } as any);

    await comp.unshare();

    expect(toast.error).toHaveBeenCalledWith('Failed to remove share');
  });

  it('copyLink writes to clipboard, shows toast and resets copied after timeout', async () => {
    jest.useFakeTimers();
    const mock = new MockShare();
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.existingShare.set({ id: 's1', share_token: 'tok' } as any);

    (navigator as any).clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };

    comp.copyLink();
    // wait microtasks for .then
    await Promise.resolve();

    expect(comp.copied()).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Link copied!');

    jest.advanceTimersByTime(2000);
    expect(comp.copied()).toBe(false);
    jest.useRealTimers();
  });

  it('shareVia helpers call window.open with expected url fragments', async () => {
    const mock = new MockShare();
    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n1', title: 'Hello' } as any;
    comp.existingShare.set({ id: 's1', share_token: 'tok' } as any);

    (window as any).open = jest.fn();

    comp.shareViaWhatsApp();
    expect((window as any).open).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank');

    comp.shareViaTwitter();
    expect((window as any).open).toHaveBeenCalledWith(expect.stringContaining('twitter.com'), '_blank');

    comp.shareViaFacebook();
    expect((window as any).open).toHaveBeenCalledWith(expect.stringContaining('facebook.com'), '_blank');
  });

  it('copyForInstagram calls copyLink and shows toast', async () => {
    const mock = new MockShare();
    const toast = new MockToast();

    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;
    comp.existingShare.set({ id: 's1', share_token: 'tok' } as any);

    (navigator as any).clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };

    comp.copyForInstagram();
    await Promise.resolve();

    expect(toast.success).toHaveBeenCalledWith('Link copied! Paste it in your Instagram bio or story.');
  });

  it('onOverlayClick emits cancel only when clicking overlay', async () => {
    await TestBed.configureTestingModule({ imports: [ShareNoteModalComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useClass: MockShare }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(ShareNoteModalComponent);
    const comp = fixture.componentInstance;

    const cancelSpy = jest.fn();
    comp.cancel.subscribe(cancelSpy);

    const node = {} as any;
    const ev = { target: node, currentTarget: node } as unknown as Event;
    comp.onOverlayClick(ev);
    expect(cancelSpy).toHaveBeenCalled();

    // clicking child should not emit
    const childEv = { target: {}, currentTarget: node } as unknown as Event;
    comp.onOverlayClick(childEv);
    // still only called once
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});