import { TestBed } from '@angular/core/testing';
import { PublicNoteComponent } from './public-note.component';

class MockShare {
  getShareByToken = jest.fn().mockResolvedValue({
    share_token: 't',
    note_title: 'Title',
    permission: 'readonly',
    user_id: 'u1',
    content: 'hello',
  });
  getShareContentForRefresh = jest.fn().mockResolvedValue({ content: 'hello' });
  importPublicShare = jest.fn().mockResolvedValue({ note_id: 'n1' });
  ensurePublicFolder = jest.fn().mockResolvedValue({ id: 'pub' });
  updatePublicContent = jest.fn().mockResolvedValue({});
  ensureImportsFolder = jest.fn().mockResolvedValue({ id: 'imp' });
}
class MockAuthState {
  isAuthenticated = jest.fn().mockReturnValue(false as any);
  userId = jest.fn().mockReturnValue(null);
  user = jest.fn().mockReturnValue(null);
}
class MockSupabase {
  getSession = jest.fn().mockResolvedValue({ session: { user: { id: 'u1' } } });
}
class MockToast {
  success = jest.fn();
  error = jest.fn();
  info = jest.fn();
}
class MockRouter {
  navigate = jest.fn();
}

describe('PublicNoteComponent', () => {
  it('simpleMarkdownToHtml converts markdown to html', () => {
    const md = '# Hello\n**bold** *em*';
    const html = (PublicNoteComponent.prototype as any).simpleMarkdownToHtml(md);
    expect(html).toContain('<h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('canEdit/isOwner logic works', () => {
    const fakeThis: any = {
      share: () => ({ permission: 'editable', user_id: 'u1' }),
      isLoggedIn: () => true,
      authState: { userId: () => 'u1' },
    };
    expect(PublicNoteComponent.prototype.canEdit.call(fakeThis)).toBe(true);
    expect(PublicNoteComponent.prototype.isOwner.call(fakeThis)).toBe(true);
  });

  it('ngOnInit sets error when share not found', async () => {
    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useClass: MockShare,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    const share = TestBed.inject(
      (await import('../../../../core/services/share.service')).ShareService as any,
    );
    share.getShareByToken.mockResolvedValue(null);

    await comp.ngOnInit();

    expect(comp.error()).toBe('This share link is invalid or has expired.');
    expect(comp.loading()).toBe(false);
  });

  it('ngOnInit loads share and updates meta/title', async () => {
    const { ShareService } = await import('../../../../core/services/share.service');
    const { AuthStateService } = await import('../../../../core/services/auth-state.service');
    const { SupabaseService } = await import('../../../../core/services/supabase.service');
    const { ActivatedRoute } = await import('@angular/router');
    const { Title, Meta } = await import('@angular/platform-browser');

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        { provide: ShareService, useClass: MockShare },
        { provide: AuthStateService, useClass: MockAuthState },
        { provide: SupabaseService, useClass: MockSupabase },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
        { provide: Title, useValue: { setTitle: jest.fn() } },
        { provide: Meta, useValue: { updateTag: jest.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;
    const share = TestBed.inject(ShareService as any);
    const title = TestBed.inject(Title as any);
    share.getShareByToken.mockResolvedValue({
      share_token: 't',
      note_title: 'T',
      content: '# A',
      isEncrypted: false,
      requiresEncryptionKey: false,
    });

    const spy = jest
      .spyOn<any, any>(comp as any, 'startContentRefresh')
      .mockImplementation(() => {});

    await comp.ngOnInit();

    expect(comp.share()?.note_title).toBe('T');
    expect(comp.content).toBe('# A');
    expect(spy).toHaveBeenCalledWith('token123');
    expect(title.setTitle).toHaveBeenCalledWith('T - DevPad');
  });

  it('startContentRefresh polls and updates content', async () => {
    jest.useFakeTimers();
    const { ShareService } = await import('../../../../core/services/share.service');
    const { AuthStateService } = await import('../../../../core/services/auth-state.service');
    const { ActivatedRoute } = await import('@angular/router');

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        { provide: ShareService, useClass: MockShare },
        { provide: AuthStateService, useClass: MockAuthState },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;
    const share = TestBed.inject(ShareService as any);

    comp.content = 'o';
    share.getShareContentForRefresh
      .mockResolvedValueOnce({ content: 'o' })
      .mockResolvedValueOnce({ content: 'n' });

    const addSpy = jest.spyOn(document, 'addEventListener');
    (comp as any).startContentRefresh('t1');
    expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    jest.advanceTimersByTime((comp as any).REFRESH_INTERVAL);
    await Promise.resolve();
    jest.advanceTimersByTime((comp as any).REFRESH_INTERVAL);
    await Promise.resolve();

    expect(comp.content).toBe('n');
    comp.ngOnDestroy();
  });

  it('saveContent does not save for non-editors', async () => {
    const { ShareService } = await import('../../../../core/services/share.service');
    const { AuthStateService } = await import('../../../../core/services/auth-state.service');
    const { ActivatedRoute } = await import('@angular/router');

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        { provide: ShareService, useClass: MockShare },
        { provide: AuthStateService, useClass: MockAuthState },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    comp.share.set({ share_token: 't', permission: 'readonly' } as any);
    (comp as any).content = 'x';

    await comp.saveContent();
    const shareSvc = TestBed.inject(ShareService as any);
    expect(shareSvc.updatePublicContent).not.toHaveBeenCalled();
  });

  it('saveContent updates and navigates for owner', async () => {
    const { ShareService } = await import('../../../../core/services/share.service');
    const { AuthStateService } = await import('../../../../core/services/auth-state.service');
    const { Router } = await import('@angular/router');
    const { ToastService } = await import('../../../../core/services/toast.service');
    const { ActivatedRoute } = await import('@angular/router');

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        { provide: ShareService, useClass: MockShare },
        { provide: AuthStateService, useClass: MockAuthState },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ToastService, useClass: MockToast },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    comp.share.set({
      share_token: 't',
      permission: 'editable',
      user_id: 'owner1',
      note_id: 'note1',
    } as any);
    (comp as any).content = 'c';
    (TestBed.inject(AuthStateService) as any).isAuthenticated.mockReturnValue(true);
    (TestBed.inject(AuthStateService) as any).userId.mockReturnValue('owner1');

    const shareSvc = TestBed.inject(ShareService as any);
    shareSvc.updatePublicContent.mockResolvedValue({});
    shareSvc.ensurePublicFolder.mockResolvedValue({ id: 'pub1' });

    await comp.saveContent();

    expect(shareSvc.updatePublicContent).toHaveBeenCalledWith('t', 'c');
    expect(shareSvc.ensurePublicFolder).toHaveBeenCalledWith('owner1');
  });

  it('importToMyNotes navigates to signup if unauthenticated', async () => {
    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        { provide: (await import('@angular/router')).Router, useValue: { navigate: jest.fn() } },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).isAuthenticated.mockReturnValue(false);
    await comp.importToMyNotes();

    expect(
      TestBed.inject((await import('@angular/router')).Router as any).navigate,
    ).toHaveBeenCalledWith(['/auth/signup']);
  });

  it('importToMyNotes forks and opens when authenticated and readonly', async () => {
    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useClass: MockShare,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        { provide: (await import('@angular/router')).Router, useValue: { navigate: jest.fn() } },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).isAuthenticated.mockReturnValue(true);
    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).userId.mockReturnValue('u2');
    comp.share.set({ share_token: 't', permission: 'readonly' } as any);

    const shareSvc = TestBed.inject(
      (await import('../../../../core/services/share.service')).ShareService as any,
    );
    shareSvc.importPublicShare.mockResolvedValue({ note_id: 'new' });
    shareSvc.ensureImportsFolder.mockResolvedValue({ id: 'imp' });

    await comp.importToMyNotes();

    expect(shareSvc.importPublicShare).toHaveBeenCalledWith('u2', 't');
    expect(shareSvc.ensureImportsFolder).toHaveBeenCalledWith('u2');
  });

  it('saveContent shows error when updatePublicContent fails', async () => {
    const mockToast = new MockToast();
    const mockShareSvc = new MockShare();
    mockShareSvc.updatePublicContent = jest.fn().mockRejectedValue(new Error('save fail'));

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: mockShareSvc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: mockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    comp.share.set({
      share_token: 't',
      permission: 'editable',
      user_id: 'owner1',
      note_id: 'note1',
    } as any);
    (comp as any).content = 'c';
    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).isAuthenticated.mockReturnValue(true);
    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).userId.mockReturnValue('owner1');

    await comp.saveContent();
    expect(mockShareSvc.updatePublicContent).toHaveBeenCalled();
    expect(
      TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any)
        .error,
    ).toHaveBeenCalled();
  });

  it('openInDashboard shows toast error when ensurePublicFolder fails', async () => {
    const mockToast = new MockToast();
    const failingShare = new MockShare();
    failingShare.ensurePublicFolder = jest.fn().mockRejectedValue(new Error('pfail'));

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: failingShare,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: mockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    comp.share.set({
      share_token: 't',
      permission: 'editable',
      user_id: 'owner1',
      note_id: 'note1',
    } as any);
    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).isAuthenticated.mockReturnValue(true);
    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).userId.mockReturnValue('owner1');

    await comp.openInDashboard();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('importToMyNotes shows error when importPublicShare fails', async () => {
    const mockToast = new MockToast();
    const failingShare = new MockShare();
    failingShare.importPublicShare = jest.fn().mockRejectedValue(new Error('import fail'));

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: failingShare,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: mockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).isAuthenticated.mockReturnValue(true);
    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).userId.mockReturnValue('u2');
    comp.share.set({ share_token: 't', permission: 'readonly' } as any);

    await comp.importToMyNotes();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('handleImportAndOpen returns error for editable shares when user is not owner', async () => {
    const mockToast = new MockToast();
    const svc = new MockShare();

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: svc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: mockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    (
      TestBed.inject(
        (await import('../../../../core/services/auth-state.service')).AuthStateService,
      ) as any
    ).userId.mockReturnValue('u2');

    await (comp as any).handleImportAndOpen({
      share_token: 't',
      permission: 'editable',
      user_id: 'owner1',
    } as any);
    expect(mockToast.error).toHaveBeenCalled();
    expect(comp.processingRedirect()).toBe(false);
  });

  it('handleDashboardRedirect navigates for owner/editable shares', async () => {
    const share: any = { permission: 'editable', user_id: 'u1', share_token: 'st' };
    const mockAuth: any = { userId: () => 'u1', isAuthenticated: jest.fn().mockReturnValue(true) };
    const mockShareSvc: any = { ensurePublicFolder: jest.fn().mockResolvedValue({ id: 'pf' }) };
    const mockRouter: any = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useValue: mockAuth,
        },
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: mockShareSvc,
        },
        { provide: (await import('@angular/router')).Router, useValue: mockRouter },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    await (comp as any).handleDashboardRedirect(share);
    expect(mockShareSvc.ensurePublicFolder).toHaveBeenCalledWith('u1');
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('handleImportAndOpen calls handleDashboardRedirect when user is owner', async () => {
    const share: any = { permission: 'readonly', user_id: 'u1', share_token: 'sowner' };
    const mockAuth: any = { userId: () => 'u1', isAuthenticated: jest.fn().mockReturnValue(true) };

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useValue: mockAuth,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    const spy = jest
      .spyOn(comp as any, 'handleDashboardRedirect')
      .mockImplementation(async () => {});

    await (comp as any).handleImportAndOpen(share);
    expect(spy).toHaveBeenCalledWith(share);
  });

  it('ngOnDestroy removes visibility listener', async () => {
    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useClass: MockShare,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    (comp as any).startContentRefresh('t1');
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    comp.ngOnDestroy();

    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('startPolling logs errors when refresh fails', async () => {
    jest.useFakeTimers();
    const mockShareSvc: any = {
      getShareContentForRefresh: jest.fn().mockRejectedValue(new Error('refresh fail')),
    };

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: mockShareSvc,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // ensure elapsed is small so polling executes
    (comp as any).refreshStartTime = Date.now();
    (comp as any).startPolling('t1');
    jest.advanceTimersByTime((comp as any).REFRESH_INTERVAL + 10);
    // allow Promise microtasks to run
    await Promise.resolve();
    await Promise.resolve();

    expect(errSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('handleDashboardRedirect shows error on failure and clears processing flag', async () => {
    const share: any = { permission: 'editable', user_id: 'u2', share_token: 's1', note_id: 'n1' };
    const mockAuth: any = { userId: () => 'u1', isAuthenticated: jest.fn().mockReturnValue(true) };
    const mockShareSvc: any = {
      ensurePublicFolder: jest.fn().mockRejectedValue(new Error('fail')),
    };
    const mockToast: any = { error: jest.fn(), success: jest.fn() };

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useValue: mockAuth,
        },
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: mockShareSvc,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: mockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    await (comp as any).handleDashboardRedirect(share);
    expect(mockToast.error).toHaveBeenCalled();
    expect(comp.processingRedirect()).toBe(false);
  });

  it('handleImportAndOpen success shows info and success toasts and navigates', async () => {
    const share: any = { permission: 'readonly', user_id: 'u2', share_token: 's3', note_id: 'n3' };
    const mockAuth: any = { userId: () => 'u1', isAuthenticated: jest.fn().mockReturnValue(true) };
    const mockShareSvc: any = {
      importPublicShare: jest.fn().mockResolvedValue({ note_id: 'nNew' }),
      ensurePublicFolder: jest.fn().mockResolvedValue({ id: 'pf' }),
    };
    const mockRouter: any = { navigate: jest.fn() };
    const mockToast: any = { info: jest.fn(), success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: mockShareSvc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useValue: mockAuth,
        },
        { provide: (await import('@angular/router')).Router, useValue: mockRouter },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: mockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    await (comp as any).handleImportAndOpen(share);
    expect(mockToast.info).toHaveBeenCalled();
    expect(mockShareSvc.importPublicShare).toHaveBeenCalledWith('u1', 's3');
    expect(mockShareSvc.ensurePublicFolder).toHaveBeenCalledWith('u1');
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('saveContent for non-owner editor shows saved toast and does not navigate', async () => {
    const mockShareSvc: any = {
      updatePublicContent: jest.fn().mockResolvedValue({}),
      ensurePublicFolder: jest.fn(),
    };
    const mockAuth: any = { userId: () => 'u2', isAuthenticated: jest.fn().mockReturnValue(true) };
    const mockToast: any = { success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      providers: [
        PublicNoteComponent,
        {
          provide: (await import('../../../../core/services/share.service')).ShareService,
          useValue: mockShareSvc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useValue: mockAuth,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: mockToast,
        },
        {
          provide: (await import('@angular/router')).ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => 'token123' },
              queryParamMap: { get: (_: string) => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicNoteComponent);
    const comp = fixture.componentInstance;

    comp.share.set({
      share_token: 't',
      permission: 'editable',
      user_id: 'owner1',
      note_id: 'note1',
    } as any);
    (comp as any).content = 'c';

    await comp.saveContent();
    expect(mockShareSvc.updatePublicContent).toHaveBeenCalled();
    expect(mockShareSvc.ensurePublicFolder).not.toHaveBeenCalled();
    expect(
      TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any)
        .success,
    ).toHaveBeenCalled();
  });
});
