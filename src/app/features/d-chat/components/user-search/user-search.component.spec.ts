import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserSearchComponent } from './user-search.component';
import { DChatService } from '../../d-chat.service';
import { DChatUser } from '../../../../core/models/d-chat.model';

describe('UserSearchComponent', () => {
  let component: UserSearchComponent;
  let fixture: ComponentFixture<UserSearchComponent>;
  let dChatService: any;

  beforeEach(async () => {
    const dChatSpy = jasmine.createSpyObj('DChatService', ['searchUsers']);

    await TestBed.configureTestingModule({
      imports: [UserSearchComponent],
      providers: [{ provide: DChatService, useValue: dChatSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSearchComponent);
    component = fixture.componentInstance;
    dChatService = TestBed.inject(DChatService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search for users on input', async () => {
    const mockUsers: DChatUser[] = [
      {
        id: 'user-1',
        email: 'user1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        is_online: true,
      },
    ];

    dChatService.searchUsers.and.returnValue(Promise.resolve(mockUsers));

    component.searchQuery = 'John';
    await component.onSearch();

    expect(dChatService.searchUsers).toHaveBeenCalledWith('John');
    expect(component.results()).toEqual(mockUsers);
  });

  it('should clear results for empty search', async () => {
    component.searchQuery = '';
    await component.onSearch();

    expect(component.results().length).toBe(0);
  });

  it('should emit userSelected event', () => {
    spyOn(component.userSelected, 'emit');

    const user: DChatUser = {
      id: 'user-1',
      email: 'user1@example.com',
      first_name: 'John',
      last_name: 'Doe',
    };

    component.onSelectUser(user);

    expect(component.userSelected.emit).toHaveBeenCalledWith(user);
  });

  it('should emit closeSearch event', () => {
    spyOn(component.closeSearch, 'emit');

    component.onClose();

    expect(component.closeSearch.emit).toHaveBeenCalled();
  });
});
