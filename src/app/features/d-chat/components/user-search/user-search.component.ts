import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DChatService } from '../../d-chat.service';
import { DChatUser } from '../../../../core/models/d-chat.model';

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss'],
})
export class UserSearchComponent {
  @Output() userSelected = new EventEmitter<DChatUser>();
  @Output() closeSearch = new EventEmitter<void>();

  private readonly dChatService = inject(DChatService);

  searchQuery = '';
  searching = signal(false);
  results = signal<DChatUser[]>([]);

  async onSearch(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.results.set([]);
      return;
    }

    this.searching.set(true);
    try {
      const users = await this.dChatService.searchUsers(this.searchQuery);
      this.results.set(users);
    } catch (error) {
      console.error('Error searching users:', error);
      this.results.set([]);
    } finally {
      this.searching.set(false);
    }
  }

  onSelectUser(user: DChatUser): void {
    this.userSelected.emit(user);
  }

  onClose(): void {
    this.closeSearch.emit();
  }
}
