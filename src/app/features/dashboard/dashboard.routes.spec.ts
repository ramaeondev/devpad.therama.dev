import dashboardRoutes from './dashboard.routes';

describe('dashboard.routes', () => {
  it('exports default routes', () => {
    expect(Array.isArray(dashboardRoutes)).toBe(true);
    expect(dashboardRoutes.length).toBeGreaterThan(0);
  });

  it('contains activity-log child route', () => {
    const top = dashboardRoutes[0];
    const child = top.children.find((c: any) => c.path === 'activity-log');
    expect(child).toBeDefined();
  });

  it('loadComponent functions resolve for dashboard routes and children', async () => {
    for (const r of dashboardRoutes) {
      if (typeof (r as any).loadComponent === 'function') {
        const comp = await (r as any).loadComponent();
        expect(comp).toBeTruthy();
      }
      if (Array.isArray((r as any).children)) {
        for (const c of (r as any).children) {
          if (typeof c.loadComponent === 'function') {
            const comp = await c.loadComponent();
            expect(comp).toBeTruthy();
          }
        }
      }
    }
  });
});
