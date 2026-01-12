import authRoutes from './auth.routes';

describe('auth.routes', () => {
  it('exports an array of routes', () => {
    expect(Array.isArray(authRoutes)).toBe(true);
    expect(authRoutes.length).toBeGreaterThan(0);
  });

  it('contains a signin route', () => {
    const signin = authRoutes.find((r: any) => r.path === 'signin');
    expect(signin).toBeDefined();
  });

  it('loadComponent functions resolve to components', async () => {
    const toLoad = authRoutes.filter((r: any) => typeof r.loadComponent === 'function');
    expect(toLoad.length).toBeGreaterThan(0);
    for (const rt of toLoad) {
      const comp = await rt.loadComponent();
      // Should resolve to a component constructor / function
      expect(comp).toBeTruthy();
      expect(typeof comp === 'function' || typeof comp === 'object').toBe(true);
    }
  });
});
