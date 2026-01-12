import { homeRoutes } from './home.routes';

describe('home.routes', () => {
  it('exports homeRoutes', () => {
    expect(Array.isArray(homeRoutes)).toBe(true);
    expect(homeRoutes[0].title).toContain('DevPad');
  });

  it('loadComponent functions resolve for home routes', async () => {
    const toLoad = homeRoutes.filter((r: any) => typeof r.loadComponent === 'function');
    for (const r of toLoad) {
      const comp = await r.loadComponent();
      expect(comp).toBeTruthy();
    }
  });
});
