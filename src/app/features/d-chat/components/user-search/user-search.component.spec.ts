import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserSearchComponent } from './user-search.component';
import { DChatService } from '../../d-chat.service';
import { DChatUser } from '../../../../core/models/d-chat.model';
import { FormsModule } from '@angular/forms';

describe('UserSearchComponent', () => {
  let component: UserSearchComponent;
  let fixture: ComponentFixture<UserSearchComponent>;
  let dChatService: any;

  const mockUsers: DChatUser[] = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      first_name: 'John',
      last_name: 'Doe',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    const dChatServiceMock = {
      searchUsers: jest.fn().mockResolvedValue(mockUsers),
    };

    await TestBed.configureTestingModule({
      imports: [UserSearchComponent, FormsModule],
      providers: [{ provide: DChatService, useValue: dChatServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSearchComponent);
    component = fixture.componentInstance;
    dChatService = TestBed.inject(DChatService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search for users', async () => {
    component.searchQuery = 'John';

    await component.onSearch();

    expect(dChatService.searchUsers).toHaveBeenCalledWith('John');
  });

  it('should clear results for empty search', async () => {
    component.searchQuery = '';

    await component.onSearch();

    expect(component.results().length).toBe(0);
  });

  it('should emit userSelected on select', () => {
    const spy = jest.spyOn(component.userSelected, 'emit');
    const user = mockUsers[0];

    component.onSelectUser(user);

    expect(spy).toHaveBeenCalledWith(user);
  });

  it('should emit closeSearch on close', () => {
    const spy = jest.spyOn(component.closeSearch, 'emit');

    component.onClose();

    expect(spy).toHaveBeenCalled();
  });

  it('should display search results', async () => {
    component.searchQuery = 'John';
    dChatService.searchUsers.mockResolvedValueOnce(mockUsers);

    await component.onSearch();

    expect(component.results().length).toBeGreaterThan(0);
  });
});
