import { TestBed } from '@angular/core/testing';
import { NoteListComponent } from './note-list.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('NoteListComponent', () => {
  it('renders header and create link', async () => {
    await TestBed.configureTestingModule({
      imports: [NoteListComponent, RouterTestingModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(NoteListComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('My Notes');
    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
  });
});
