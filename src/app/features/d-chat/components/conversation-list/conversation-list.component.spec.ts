import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConversationItemComponent } from './conversation-list.component';
import { DChatService } from '../../d-chat.service';
import { DConversation } from '../../../../core/models/d-chat.model';
import { signal } from '@angular/core';

describe('ConversationItemComponent', () => {
  let component: ConversationItemComponent;
  let fixture: ComponentFixture<ConversationItemComponent>;
  let dChatService: any;

  const mockConversation: DConversation = {
    id: 'conv-1',
    user1_id: 'user-1',
    user2_id: 'user-2',
    last_message: {
      id: 'msg-1',
      sender_id: 'user-2',
      recipient_id: 'user-1',
      content: 'Hello',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      read: false,
      conversation_id: 'conv-1',
    },
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const dChatServiceMock = {
      getUserById: jest.fn().mockResolvedValue({
        id: 'user-2',
        email: 'user2@example.com',
        first_name: 'John',
        last_name: 'Doe',
      }),
      getUnreadCountForConversation: jest.fn().mockResolvedValue(0),
    };

    await TestBed.configureTestingModule({
      imports: [ConversationItemComponent],
      providers: [{ provide: DChatService, useValue: dChatServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConversationItemComponent);
    component = fixture.componentInstance;
    dChatService = TestBed.inject(DChatService);

    component.conversation = mockConversation;
    component.currentUserId = 'user-1';
    component.userStatuses = new Map();
    component.isSelected = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with signals', () => {
    component.ngOnInit();

    expect(component.otherUserId()).toBe('user-2');
  });

  it('should load other user info', async () => {
    await component.ngOnInit();

    expect(dChatService.getUserById).toHaveBeenCalledWith('user-2');
    expect(component.otherUser()).toBeTruthy();
  });

  it('should emit selectConversation on select', () => {
    const spy = jest.spyOn(component.selectConversation, 'emit');

    component.onSelect();

    expect(spy).toHaveBeenCalled();
  });

  it('should show online status when user is online', () => {
    component.otherUserId.set('user-2');
    const onlineStatus = new Map([
      [
        'user-2',
        {
          user_id: 'user-2',
          is_online: true,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    ]);
    component.userStatusesSignal.set(onlineStatus);

    expect(component.isOnline()).toBe(true);
  });

  it('should show offline status when user is offline', () => {
    component.otherUserId.set('user-2');
    component.userStatusesSignal.set(new Map());

    expect(component.isOnline()).toBe(false);
  });

  it('should update signals on input change', () => {
    component.ngOnChanges({
      userStatuses: {
        currentValue: new Map([['user-2', { user_id: 'user-2', is_online: true }]]),
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(component.userStatusesSignal()).toBeTruthy();
  });
});
