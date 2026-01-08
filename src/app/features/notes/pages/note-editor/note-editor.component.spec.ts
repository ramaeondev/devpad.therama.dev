import { TestBed } from '@angular/core/testing';
import { NoteEditorComponent } from './note-editor.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NoteEditorComponent', () => {
  it('updates title on input', async () => {
    await TestBed.configureTestingModule({ imports: [NoteEditorComponent], providers: [ { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } }, params: of({ id: '1' }) } } ] }).compileComponents();
    const fixture = TestBed.createComponent(NoteEditorComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input');
    input.value = 'New Title';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(comp.title()).toBe('New Title');
  });
});