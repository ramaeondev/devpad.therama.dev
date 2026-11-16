import { TestBed } from '@angular/core/testing';
import { ChangelogModalComponent } from './ui/changelog-modal.component';

class MockStaticData { async getChangelogs() { return [{ date: '2025-01-01', changes: ['x'] }]; } }

describe('ChangelogModalComponent', () => {
  it('loads changelog and shows date', async () => {
    await TestBed.configureTestingModule({ imports: [ChangelogModalComponent], providers: [ { provide: (await import('../../core/services/static-data.service')).StaticDataService, useClass: MockStaticData } ] }).compileComponents();
    const fixture = TestBed.createComponent(ChangelogModalComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2025-01-01');
  });

  it('emits close when onClose called', async () => {
    await TestBed.configureTestingModule({ imports: [ChangelogModalComponent], providers: [ { provide: (await import('../../core/services/static-data.service')).StaticDataService, useClass: MockStaticData } ] }).compileComponents();
    const fixture = TestBed.createComponent(ChangelogModalComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.close.subscribe(spy);
    comp.onClose();
    expect(spy).toHaveBeenCalled();
  });

  it('shows error state when changelog load fails', async () => {
    class MockStaticDataError { async getChangelogs() { throw new Error('fail'); } }
    await TestBed.configureTestingModule({ imports: [ChangelogModalComponent], providers: [ { provide: (await import('../../core/services/static-data.service')).StaticDataService, useClass: MockStaticDataError } ] }).compileComponents();
    const fixture = TestBed.createComponent(ChangelogModalComponent);
    fixture.detectChanges();
    // wait a tick for async ngOnInit
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Failed to load changelog');
  });
});