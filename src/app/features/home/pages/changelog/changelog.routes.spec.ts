import { changelogRoutes } from './changelog.routes';

describe('changelogRoutes', () => {
  it('exports an array with a route that loads ChangelogPageComponent', async () => {
    expect(Array.isArray(changelogRoutes)).toBe(true);
    expect(changelogRoutes.length).toBeGreaterThanOrEqual(1);

    const route = changelogRoutes[0];
    expect(route.path).toBe('');
    expect(typeof route.loadComponent).toBe('function');

    const loaded = await route.loadComponent();

    // Routes use `.then(m => m.ChangelogPageComponent)` so the loader resolves to the component class
    expect(loaded).toBeDefined();
    expect((loaded as any).name || String(loaded)).toMatch(/ChangelogPageComponent/);
  });
});
