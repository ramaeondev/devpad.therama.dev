import { TestBed } from '@angular/core/testing';
import { DChatService } from './d-chat.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { signal } from '@angular/core';

describe('DChatService', () => {
  let service: DChatService;
  let supabaseService: any;

  beforeEach(() => {
    // Create a mock that properly handles method chaining for all queries
    const createMockQuery = () => ({
      select: jest.fn(function() { return this; }),
      eq: jest.fn(function() { return this; }),
      or: jest.fn(function() { return this; }),
      ilike: jest.fn(function() { return this; }),
      neq: jest.fn(function() { return this; }),
      limit: jest.fn(function() { return this; }),
      update: jest.fn(function() { return this; }),
      insert: jest.fn(function() { return this; }),
      upsert: jest.fn(function() { return this; }),
      single: jest.fn(function() { return this; }),
    });

    const supabaseServiceMock = {
      from: jest.fn(() => createMockQuery()),
      realtimeClient: {
        channel: jest.fn().mockReturnValue({
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn().mockReturnThis(),
          unsubscribe: jest.fn().mockReturnThis(),
        }),
      },
    };

    const authServiceMock = {
      userId: signal('test-user-id'),
      userEmail: signal('test@example.com'),
    };

    TestBed.configureTestingModule({
      providers: [
        DChatService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
        { provide: AuthStateService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(DChatService);
    supabaseService = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setUserOnline', () => {
    it('should set user online status', async () => {
      await service.setUserOnline('test-user-id');

      expect(supabaseService.from).toHaveBeenCalledWith('d_user_status');
    });
  });

  describe('setUserOffline', () => {
    it('should set user offline status', async () => {
      await service.setUserOffline('test-user-id');

      expect(supabaseService.from).toHaveBeenCalledWith('d_user_status');
    });
  });

  describe('searchUsers', () => {
    it('should search for users', async () => {
      await service.searchUsers('john');

      expect(supabaseService.from).toHaveBeenCalledWith('user_profiles');
    });
  });

  describe('cleanup', () => {
    it('should cleanup subscriptions', () => {
      expect(() => service.cleanup('test-user-id')).not.toThrow();
    });
  });
});
});
