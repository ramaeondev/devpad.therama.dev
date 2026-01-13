import { routes } from './app.routes';

describe('app.routes', () => {
  it('exports an array of routes', () => {
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  it('contains a wildcard that redirects to dashboard', () => {
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard).toBeDefined();
    expect((wildcard as any).redirectTo).toBe('dashboard');
  });

  it('contains expected top-level paths', () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        '',
        'changelog',
        'auth',
        'dashboard',
        'notes',
        'folders',
        'share/:shareToken',
        'policy',
        'terms',
      ]),
    );
  });

  it('dashboard route requires authGuard', () => {
    const dash = routes.find((r) => r.path === 'dashboard');
    expect(dash).toBeDefined();
    expect(dash?.canActivate).toBeDefined();
    expect((dash?.canActivate?.length ?? 0) > 0).toBe(true);
  });

  it('share route has a title and loadComponent', () => {
    const share = routes.find((r) => r.path === 'share/:shareToken');
    expect(share).toBeDefined();
    expect(share?.title).toBe('Shared Note - DevPad');
    expect(share?.loadComponent).toBeDefined();
  });

  it('top-level loadComponent functions resolve', async () => {
    const toLoad = routes.filter((r) => typeof (r as any).loadComponent === 'function');
    for (const r of toLoad) {
      const comp = await (r as any).loadComponent();
      expect(comp).toBeTruthy();
    }
  });
});
