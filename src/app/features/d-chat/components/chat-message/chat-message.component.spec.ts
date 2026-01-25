import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageComponent } from './chat-message.component';
import { DMessage } from '../../../../core/models/d-chat.model';

describe('ChatMessageComponent', () => {
  let component: ChatMessageComponent;
  let fixture: ComponentFixture<ChatMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatMessageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display message content', () => {
    const message: DMessage = {
      id: 'msg-1',
      sender_id: 'user-1',
      recipient_id: 'user-2',
      content: 'Hello World',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      read: false,
    };

    component.message = message;
    component.isOwn = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hello World');
  });

  it('should format time correctly', () => {
    const now = new Date();
    const formattedTime = component.formatTime(now.toISOString());

    expect(formattedTime).toBeTruthy();
    expect(formattedTime).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
  });

  it('should apply correct styling for own messages', () => {
    component.isOwn = true;
    fixture.detectChanges();

    const bubble = fixture.nativeElement.querySelector('.message-bubble');
    expect(bubble.classList.contains('bg-retro-green')).toBe(true);
  });

  it('should apply correct styling for received messages', () => {
    component.isOwn = false;
    fixture.detectChanges();

    const bubble = fixture.nativeElement.querySelector('.message-bubble');
    expect(bubble.classList.contains('bg-gray-700')).toBe(true);
  });
});
