import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConversationItemComponent } from './conversation-list.component';
import { DChatService } from '../../d-chat.service';
import { DConversation } from '../../../../core/models/d-chat.model';

describe('ConversationItemComponent', () => {
  let component: ConversationItemComponent;
  let fixture: ComponentFixture<ConversationItemComponent>;
  let dChatService: any;

  beforeEach(async () => {
    const dChatSpy = jasmine.createSpyObj('DChatService', ['getUserById']);

    await TestBed.configureTestingModule({
      imports: [ConversationItemComponent],
      providers: [{ provide: DChatService, useValue: dChatSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConversationItemComponent);
    component = fixture.componentInstance;
    dChatService = TestBed.inject(DChatService);

    component.currentUserId = 'user-1';
    component.userStatuses = new Map();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display conversation info', () => {
    const conversation: DConversation = {
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
      },
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    component.conversation = conversation;
    component.isSelected = false;
    dChatService.getUserById.and.returnValue(
      Promise.resolve({
        id: 'user-2',
        email: 'user2@example.com',
        first_name: 'John',
        last_name: 'Doe',
        is_online: false,
      })
    );

    fixture.detectChanges();

    expect(component.otherUser).toBeTruthy();
  });

  it('should emit selectConversation event', () => {
    spyOn(component.selectConversation, 'emit');
    const conversation: DConversation = {
      id: 'conv-1',
      user1_id: 'user-1',
      user2_id: 'user-2',
      last_message: null,
      last_message_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    component.conversation = conversation;

    component.onSelect();

    expect(component.selectConversation.emit).toHaveBeenCalled();
  });
});
