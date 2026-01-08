import { TestBed } from '@angular/core/testing';
import { NoteNameModalComponent } from './note-name-modal.component';

describe('NoteNameModalComponent', () => {
  it('initializes with input and validate duplicate', async () => {
    await TestBed.configureTestingModule({ imports: [NoteNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NoteNameModalComponent);
    const comp = fixture.componentInstance;
    // set inputs and call lifecycle without rendering template (avoid writing signals during render)
    comp.initial = 'Hello';
    comp.existingNames = ['Other', 'hello'];
    comp.ngOnInit();
    expect(comp.name()).toBe('Hello');

    // duplicate (call validate outside render)
    expect(comp.validate()).toBe(false);
    expect(comp.error()).toBeTruthy();

    // valid
    comp.name.set('New');
    expect(comp.validate()).toBe(true);
  });

  it('trySubmit emits when valid', async () => {
    await TestBed.configureTestingModule({ imports: [NoteNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NoteNameModalComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.submit.subscribe(spy);
    comp.name.set('New Note');
    comp.trySubmit();
    expect(spy).toHaveBeenCalledWith('New Note');
  });
});