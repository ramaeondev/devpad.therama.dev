import { TestBed } from '@angular/core/testing';
import { NotePropertiesModalComponent } from './note-properties-modal.component';

describe('NotePropertiesModalComponent', () => {
  it('formats size and shows active status', async () => {
    await TestBed.configureTestingModule({
      imports: [NotePropertiesModalComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotePropertiesModalComponent);
    const comp = fixture.componentInstance;
    comp.properties = {
      id: '1',
      title: 'T',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      size: 1024 * 1024 * 2,
    } as any;
    fixture.detectChanges();

    expect(comp.formatSize(0)).toBe('0 Bytes');
    expect(comp.formatSize(1024)).toContain('KB');
  });

  it('renders tags and status badges', async () => {
    await TestBed.configureTestingModule({
      imports: [NotePropertiesModalComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotePropertiesModalComponent);
    const comp = fixture.componentInstance;
    comp.properties = {
      id: '1',
      title: 'T',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: ['a'],
      is_favorite: true,
    } as any;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('⭐ Favorite');
    expect(fixture.nativeElement.textContent).toContain('a');
  });
});
