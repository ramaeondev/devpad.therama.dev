import folderRoutes from './folders.routes';

describe('folders.routes', () => {
  it('exports routes for folders', () => {
    expect(Array.isArray(folderRoutes)).toBe(true);
  });

  it('contains both index and :id routes', () => {
    const hasIndex = folderRoutes.some((r: any) => r.path === '');
    const hasParam = folderRoutes.some((r: any) => r.path === ':id');
    expect(hasIndex).toBe(true);
    expect(hasParam).toBe(true);
  });

  it('loadComponent functions resolve for folder routes', async () => {
    const toLoad = folderRoutes.filter((r: any) => typeof r.loadComponent === 'function');
    for (const r of toLoad) {
      const comp = await r.loadComponent();
      expect(comp).toBeTruthy();
    }
  });
});
