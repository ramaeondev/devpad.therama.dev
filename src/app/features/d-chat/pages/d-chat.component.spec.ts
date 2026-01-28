import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DChatComponent } from './d-chat.component';
import { DChatService } from '../d-chat.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '../../../core/services/toast.service';
import { signal } from '@angular/core';
import { DConversation } from '../../../core/models/d-chat.model';

describe('DChatComponent', () => {
  let component: DChatComponent;
  let fixture: ComponentFixture<DChatComponent>;
  let dChatService: any;

  const mockConversation: DConversation = {
    id: 'conv-1',
    user1_id: 'test-user-id',
    user2_id: 'user-2',
    last_message: null,
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const dChatServiceMock = {
      conversations$: signal([mockConversation]),
      messages$: signal([]),
      userStatuses$: signal(new Map()),
      hasMoreMessages$: signal(true),
      currentConversationMessages: signal([]),
      initializeChat: jest.fn().mockResolvedValue(undefined),
      getMessagesBetweenUsers: jest.fn().mockResolvedValue([]),
      setConversationMessages: jest.fn(),
      subscribeToConversationMessages: jest.fn(),
      markConversationMessagesAsRead: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue({ id: 'msg-1', content: 'test' }),
      sendMessageWithAttachments: jest
        .fn()
        .mockResolvedValue({ id: 'msg-1', content: 'test', attachments: [] }),
      getUserById: jest
        .fn()
        .mockResolvedValue({ id: 'user-2', first_name: 'Test', last_name: 'User' }),
      getOrCreateConversation: jest.fn().mockResolvedValue(mockConversation),
      getUnreadCountForConversation: jest.fn().mockResolvedValue(0),
      resetPaginationState: jest.fn(),
      loadMoreMessages: jest.fn().mockResolvedValue([]),
      cleanup: jest.fn(),
      registerSentMessageId: jest.fn(),
    };

    const authServiceMock = {
      userId: signal('test-user-id'),
      userEmail: signal('test@example.com'),
    };

    const toastServiceMock = {
      showError: jest.fn(),
      showSuccess: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DChatComponent],
      providers: [
        { provide: DChatService, useValue: dChatServiceMock },
        { provide: AuthStateService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DChatComponent);
    component = fixture.componentInstance;
    dChatService = TestBed.inject(DChatService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize chat on init', async () => {
      fixture.detectChanges();

      expect(dChatService.initializeChat).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should not send empty messages without attachments', async () => {
      component.messageInput.set('   ');
      component.attachments.set([]);

      await component.sendMessage();

      expect(dChatService.sendMessageWithAttachments).not.toHaveBeenCalled();
    });

    it('should send message with attachments when conversation is selected', async () => {
      // Setup: select the conversation first
      component.selectedConversationId.set('conv-1');
      component.messageInput.set('Hello');
      component.attachments.set([]);

      dChatService.sendMessageWithAttachments.mockResolvedValueOnce({ id: 'msg-1' });

      await component.sendMessage();

      expect(dChatService.sendMessageWithAttachments).toHaveBeenCalledWith(
        'conv-1',
        'user-2',
        'Hello',
        [],
        null,
      );
      expect(component.messageInput()).toBe('');
      expect(component.attachments()).toEqual([]);
    });
  });

  describe('toggleMobileSidebar', () => {
    it('should toggle mobile sidebar', () => {
      const initial = component.isMobileOpen();

      component.toggleMobileSidebar();

      expect(component.isMobileOpen()).toBe(!initial);
    });
  });

  describe('ngOnDestroy', () => {
    it('should cleanup on destroy', () => {
      component.ngOnDestroy();

      expect(dChatService.cleanup).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should reset pagination state when selecting conversation', async () => {
      await component.selectConversation(mockConversation);

      expect(dChatService.resetPaginationState).toHaveBeenCalled();
    });

    it('should load initial messages with pagination', async () => {
      await component.selectConversation(mockConversation);

      expect(dChatService.getMessagesBetweenUsers).toHaveBeenCalledWith('user-2', 100, 0);
    });

    it('should load more messages when loadMoreMessages is called', async () => {
      component.selectedConversationId.set('conv-1');
      dChatService.loadMoreMessages.mockResolvedValueOnce([]);

      await component.loadMoreMessages();

      expect(dChatService.loadMoreMessages).toHaveBeenCalled();
    });
  });
});
