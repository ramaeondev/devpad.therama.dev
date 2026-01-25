import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DChatComponent } from './d-chat.component';
import { DChatService } from '../d-chat.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '../../../core/services/toast.service';

describe('DChatComponent', () => {
  let component: DChatComponent;
  let fixture: ComponentFixture<DChatComponent>;
  let dChatService: jasmine.SpyObj<any>;
  let toastService: jasmine.SpyObj<any>;

  beforeEach(async () => {
    const dChatSpy = jasmine.createSpyObj('DChatService', [
      'initializeChat',
      'getMessagesBetweenUsers',
      'markMessagesAsRead',
      'getUserById',
      'sendMessage',
      'getOrCreateConversation',
      'cleanup',
    ]);
    const authSpy = jasmine.createSpyObj('AuthStateService', [], {
      userId: jasmine.createSpy('userId').and.returnValue('test-user-id'),
      userEmail: jasmine.createSpy('userEmail').and.returnValue('test@example.com'),
    } as any);
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);

    dChatSpy.conversations$ = jasmine.createSpyObj('Signal', ['asReadonly']);
    dChatSpy.userStatuses$ = jasmine.createSpyObj('Signal', ['asReadonly']);

    await TestBed.configureTestingModule({
      imports: [DChatComponent],
      providers: [
        { provide: DChatService, useValue: dChatSpy },
        { provide: AuthStateService, useValue: authSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DChatComponent);
    component = fixture.componentInstance;
    dChatService = TestBed.inject(DChatService) as jasmine.SpyObj<any>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<any>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize chat on init', async () => {
      dChatService.initializeChat.and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(dChatService.initializeChat).toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });

    it('should handle initialization error', async () => {
      dChatService.initializeChat.and.returnValue(
        Promise.reject(new Error('Init failed'))
      );

      await component.ngOnInit();

      expect(toastService.showError).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should not send empty messages', async () => {
      component.messageInput.set('   ');

      await component.sendMessage();

      expect(dChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should send a message and clear input', async () => {
      component.selectedConversationId.set('conv-1');
      (component as any).otherUserId = jasmine.createSpy().and.returnValue('other-user-id');
      component.messageInput.set('Hello');

      const mockMessage = {
        id: 'msg-1',
        sender_id: 'test-user-id',
        recipient_id: 'other-user-id',
        content: 'Hello',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        read: false,
      };

      dChatService.sendMessage.and.returnValue(Promise.resolve(mockMessage));

      await component.sendMessage();

      expect(dChatService.sendMessage).toHaveBeenCalledWith(
        'conv-1',
        'other-user-id',
        'Hello'
      );
      expect(component.messageInput()).toBe('');
    });
  });

  describe('toggleMobileSidebar', () => {
    it('should toggle mobile sidebar', () => {
      component.isMobileOpen.set(false);

      component.toggleMobileSidebar();

      expect(component.isMobileOpen()).toBe(true);

      component.toggleMobileSidebar();

      expect(component.isMobileOpen()).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should cleanup on destroy', () => {
      component.ngOnDestroy();

      expect(dChatService.cleanup).toHaveBeenCalledWith('test-user-id');
    });
  });
});
