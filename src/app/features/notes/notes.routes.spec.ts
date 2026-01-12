import notesRoutes from './notes.routes';

describe('notes.routes', () => {
  it('exports notes routes', () => {
    expect(Array.isArray(notesRoutes)).toBe(true);
  });

  it('contains new and :id routes', () => {
    const hasNew = notesRoutes.some((r: any) => r.path === 'new');
    const hasId = notesRoutes.some((r: any) => r.path === ':id');
    expect(hasNew).toBe(true);
    expect(hasId).toBe(true);
  });

  it('loadComponent functions resolve for notes routes', async () => {
    const toLoad = notesRoutes.filter((r: any) => typeof r.loadComponent === 'function');
    for (const r of toLoad) {
      const comp = await r.loadComponent();
      expect(comp).toBeTruthy();
    }
  });
});
