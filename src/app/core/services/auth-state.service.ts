import { Injectable, signal, computed } from '@angular/core';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private currentUser = signal<User | null>(null);
  private loading = signal<boolean>(false);

  // Public readonly signals
  user = this.currentUser.asReadonly();
  isLoading = this.loading.asReadonly();
  isAuthenticated = computed(() => !!this.currentUser());
  userEmail = computed(() => this.currentUser()?.email ?? '');
  userId = computed(() => this.currentUser()?.id ?? '');

  setUser(user: User | null) {
    this.currentUser.set(user);
  }

  setLoading(loading: boolean) {
    this.loading.set(loading);
  }

  clear() {
    this.currentUser.set(null);
    this.loading.set(false);
  }
}
