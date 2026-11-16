import { TestBed } from '@angular/core/testing';
import { StaticDataService } from './static-data.service';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

describe('StaticDataService', () => {
  let service: StaticDataService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    TestBed.configureTestingModule({ providers: [StaticDataService] });
    service = TestBed.inject(StaticDataService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('getChangelogs requests the static schema newest-first and maps rows', async () => {
    fetchMock.mockReturnValue(okJson([
      { date: '2024-01-02', changes: ['B'] },
      { date: '2024-01-01', changes: null },
    ]));

    const res = await service.getChangelogs();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/rest/v1/change_logs?select=date,changes&order=date.desc');
    expect(init.headers['Accept-Profile']).toBe('static');
    expect(init.headers.apikey).toBeTruthy();
    expect(res).toEqual([
      { date: '2024-01-02', changes: ['B'] },
      { date: '2024-01-01', changes: [] },
    ]);
  });

  it('getChangelogs throws when the API fails', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 500, statusText: 'err' } as Response));
    await expect(service.getChangelogs()).rejects.toThrow('static.change_logs: 500');
  });

  it('getSocialLinks maps sort_order to order and only asks for active links', async () => {
    fetchMock.mockReturnValue(okJson([
      { id: '1', platform: 'github', url: 'u', icon: 'i', display_name: 'GitHub', sort_order: 1, is_active: true },
    ]));

    const res = await service.getSocialLinks();

    expect(fetchMock.mock.calls[0][0]).toContain('is_active=eq.true&order=sort_order.asc');
    expect(res).toEqual([
      { $id: '1', platform: 'github', url: 'u', icon: 'i', display_name: 'GitHub', order: 1, is_active: true },
    ]);
  });

  it('getSocialLinks returns [] on error', async () => {
    fetchMock.mockReturnValue(Promise.reject(new Error('network')));
    expect(await service.getSocialLinks()).toEqual([]);
  });
});
