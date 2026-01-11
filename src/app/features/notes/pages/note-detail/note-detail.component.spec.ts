import { TestBed } from '@angular/core/testing';
import { NoteDetailComponent } from './note-detail.component';

describe('NoteDetailComponent', () => {
  it('renders heading', async () => {
    await TestBed.configureTestingModule({ imports: [NoteDetailComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NoteDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Note Detail');
  });
});
