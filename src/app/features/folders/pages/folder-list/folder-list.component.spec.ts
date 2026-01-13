import { TestBed } from '@angular/core/testing';
import { FolderListComponent } from './folder-list.component';

describe('FolderListComponent', () => {
  it('renders title', async () => {
    await TestBed.configureTestingModule({ imports: [FolderListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderListComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Folders');
  });
});
