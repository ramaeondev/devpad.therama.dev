import { TestBed } from '@angular/core/testing';
import { ActivityLogPageComponent } from './pages/activity-log-page/activity-log-page';
import { RouterTestingModule } from '@angular/router/testing';

class MockActivityLogService {
  getUserActivityLogs = jest.fn().mockResolvedValue([]);
  getActivityLogCount = jest.fn().mockResolvedValue(0);
}
class MockSupabase {
  getSession = jest.fn().mockResolvedValue({ session: { user: { id: 'u1' } } });
}

describe('ActivityLogComponent', () => {
  it('loads logs on init', async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityLogPageComponent, RouterTestingModule],
      providers: [
        {
          provide: (await import('../../core/services/activity-log.service')).ActivityLogService,
          useClass: MockActivityLogService,
        },
        {
          provide: (await import('../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // wait for effect
    await new Promise((r) => setTimeout(r, 0));
    expect(comp.logs()).toEqual([]);
  });
});
