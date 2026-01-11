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

  it('shows error on empty input and canSubmit false', async () => {
    await TestBed.configureTestingModule({ imports: [NoteNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NoteNameModalComponent);
    const comp = fixture.componentInstance;

    comp.onInput({ target: { value: '' } } as any);
    expect(comp.error()).toBe('Title is required');
    expect(comp.canSubmit()).toBe(false);
  });

  it('onCancel emits cancel', async () => {
    await TestBed.configureTestingModule({ imports: [NoteNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NoteNameModalComponent);
    const comp = fixture.componentInstance;

    const cancelSpy = jest.fn();
    comp.cancel.subscribe(cancelSpy);
    comp.onCancel();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('trySubmit does not emit when invalid', async () => {
    await TestBed.configureTestingModule({ imports: [NoteNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NoteNameModalComponent);
    const comp = fixture.componentInstance;

    const submitSpy = jest.fn();
    comp.submit.subscribe(submitSpy);
    comp.name.set('');
    comp.trySubmit();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('validate clears error on valid name', async () => {
    await TestBed.configureTestingModule({ imports: [NoteNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NoteNameModalComponent);
    const comp = fixture.componentInstance;

    comp.existingNames = ['existing'];
    comp.onInput({ target: { value: 'New Name' } } as any);
    expect(comp.error()).toBeNull();
    expect(comp.canSubmit()).toBe(true);
  });
});
