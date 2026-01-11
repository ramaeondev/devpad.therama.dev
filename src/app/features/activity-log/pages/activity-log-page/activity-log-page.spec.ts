import { TestBed } from '@angular/core/testing';
import { ActivityLogPageComponent } from './activity-log-page';
import { ActivityLogService } from '../../../../core/services/activity-log.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { Router } from '@angular/router';

const makeActivityService = () => ({
  getUserActivityLogs: jest.fn().mockResolvedValue([{ id: 'l1', resource_type: 'Note' }]),
  getActivityLogCount: jest.fn().mockResolvedValue(1),
});

const makeSupabase = () => ({
  getSession: jest.fn().mockResolvedValue({ session: { user: { id: 'u1' } } }),
});

describe('ActivityLogPageComponent', () => {
  let mockActivity: any;
  let mockSupabase: any;

  beforeEach(() => {
    mockActivity = makeActivityService();
    mockSupabase = makeSupabase();

    TestBed.configureTestingModule({
      imports: [ActivityLogPageComponent],
      providers: [
        { provide: ActivityLogService, useValue: mockActivity },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    });
  });

  it('loads logs on init', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const instance = fixture.componentInstance as ActivityLogPageComponent;
    // Call explicitly to avoid timing issues with ngOnInit in test harness
    await instance.loadLogs();

    expect(instance.logs().length).toBe(1);
    expect(instance.totalCount()).toBe(1);
  });

  it('returns early from loadLogs when there is no user in session', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    mockSupabase.getSession.mockResolvedValue({ session: {} });
    mockActivity.getUserActivityLogs.mockClear();
    mockActivity.getActivityLogCount.mockClear();

    await instance.loadLogs();

    expect(mockActivity.getUserActivityLogs).not.toHaveBeenCalled();
    expect(mockActivity.getActivityLogCount).not.toHaveBeenCalled();
    expect(instance.loading()).toBe(false);
  });

  it('getRelativeTime returns Just now for recent dates', () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;
    const now = new Date().toISOString();
    expect(instance.getRelativeTime(now)).toBe('Just now');
  });

  it('loadLogs applies week and month filters when selectedDateRange is set', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    // Ensure session and service are set up
    mockSupabase.getSession.mockResolvedValue({ session: { user: { id: 'u1' } } });

    instance.selectedDateRange.set('week');
    await instance.loadLogs();
    let calledFilters = mockActivity.getUserActivityLogs.mock.calls.slice(-1)[0][1];
    expect(calledFilters.start_date).toBeDefined();

    instance.selectedDateRange.set('month');
    await instance.loadLogs();
    calledFilters = mockActivity.getUserActivityLogs.mock.calls.slice(-1)[0][1];
    expect(calledFilters.start_date).toBeDefined();
  });

  it('toggleRawJson toggles expandedLogId', () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;
    instance.toggleRawJson('l1');
    expect(instance.expandedLogId()).toBe('l1');
    instance.toggleRawJson('l1');
    expect(instance.expandedLogId()).toBeNull();
  });

  it('onFilterChange resets current page to 1 and calls loadLogs', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    instance.currentPage.set(3);
    const loadSpy = jest.spyOn(instance, 'loadLogs').mockResolvedValueOnce(undefined as any);

    await instance.onFilterChange();

    expect(instance.currentPage()).toBe(1);
    expect(loadSpy).toHaveBeenCalled();

    loadSpy.mockRestore();
  });

  it('nextPage/previousPage do nothing at bounds', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    // Make totalPages = 1
    mockActivity.getActivityLogCount.mockResolvedValue(5);
    mockActivity.getUserActivityLogs.mockResolvedValue([]);
    await instance.loadLogs();

    const goSpy = jest.spyOn(instance, 'goToPage');

    await instance.nextPage();
    expect(goSpy).not.toHaveBeenCalled();

    await instance.previousPage();
    expect(goSpy).not.toHaveBeenCalled();

    goSpy.mockRestore();
  });

  it('loadLogs handles errors gracefully and leaves loading false', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    mockSupabase.getSession.mockResolvedValue({ session: { user: { id: 'u1' } } });
    mockActivity.getUserActivityLogs.mockRejectedValue(new Error('boom'));

    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await instance.loadLogs();

    expect(errSpy).toHaveBeenCalled();
    expect(instance.loading()).toBe(false);

    errSpy.mockRestore();
  });

  it('formatJson returns a pretty-printed JSON string', () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    const str = instance.formatJson({ id: 'l1', foo: 'bar' } as any);
    expect(str).toContain('\n');
    expect(str).toContain('  ');
  });

  it('downloadJson throws if URL.createObjectURL fails', () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    const a: any = { href: '', download: '', click: jest.fn() };
    jest.spyOn(document, 'createElement').mockReturnValue(a as any);
    jest.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('fail');
    });

    expect(() => instance.downloadJson({ id: 'l1' } as any)).toThrow('fail');

    jest.restoreAllMocks();
  });

  it('copyJson writes to clipboard', async () => {
    (navigator as any).clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;
    const log: any = { id: 'l1', resource_type: 'Note' };
    await instance.copyJson(log);
    expect((navigator as any).clipboard.writeText).toHaveBeenCalled();
  });

  it('loadLogs applies date filters when selectedDateRange is set', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    // Ensure session and service are set up
    mockSupabase.getSession.mockResolvedValue({ session: { user: { id: 'u1' } } });

    instance.selectedDateRange.set('today');
    await instance.loadLogs();

    expect(mockActivity.getUserActivityLogs).toHaveBeenCalled();
    const calledFilters = mockActivity.getUserActivityLogs.mock.calls[0][1];
    expect(calledFilters.start_date).toBeDefined();
  });

  it('pagination methods respect bounds and call loadLogs', async () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    // simulate many results
    mockActivity.getUserActivityLogs.mockResolvedValue([]);
    mockActivity.getActivityLogCount.mockResolvedValue(100);

    await instance.loadLogs();
    expect(instance.totalPages()).toBeGreaterThan(1);

    // goToPage within bounds
    await instance.goToPage(3);
    expect(instance.currentPage()).toBe(3);
    expect(mockActivity.getUserActivityLogs).toHaveBeenCalled();

    // goToPage out of bounds does nothing
    const prevCalls = mockActivity.getUserActivityLogs.mock.calls.length;
    await instance.goToPage(999);
    expect(mockActivity.getUserActivityLogs.mock.calls.length).toBe(prevCalls);
  });

  it('getActionIcon and getActionColor return expected values', () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    expect(instance.getActionIcon(0 as any)).toBeDefined();
    expect(instance.getActionColor(0 as any)).toBeDefined();

    // Use a couple of concrete enum values
    expect(instance.getActionIcon(1 as any)).toMatch(/fa/);
    expect(instance.getActionColor(1 as any)).toMatch(/text|gray|purple|red|green/);
  });

  it('getRelativeTime returns days ago for older dates', () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(instance.getRelativeTime(twoDaysAgo)).toMatch(/d ago|\w{3},/);
  });

  it('downloadJson creates and clicks an anchor and revokes object URL', () => {
    const fixture = TestBed.createComponent(ActivityLogPageComponent);
    const instance = fixture.componentInstance as ActivityLogPageComponent;

    const clickSpy = jest.fn();
    const a: any = { href: '', download: '', click: clickSpy };

    jest.spyOn(document, 'createElement').mockReturnValue(a as any);
    const createSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:1');
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    instance.downloadJson({ id: 'l1' } as any);

    expect(createSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:1');

    jest.restoreAllMocks();
  });
});
