import { TestBed } from '@angular/core/testing';
import { FolderNameModalComponent } from './folder-name-modal.component';

describe('FolderNameModalComponent', () => {
  it('emits cancel', async () => {
    await TestBed.configureTestingModule({ imports: [FolderNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderNameModalComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.cancel.subscribe(spy);
    comp.onCancel();
    expect(spy).toHaveBeenCalled();
  });

  it('validate and submit', async () => {
    await TestBed.configureTestingModule({ imports: [FolderNameModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderNameModalComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.submit.subscribe(spy);

    comp.name.set('  ');
    comp.trySubmit();
    expect(comp.error()).toBe('Name is required');

    comp.name.set('New Folder');
    comp.trySubmit();
    expect(spy).toHaveBeenCalledWith('New Folder');
  });
});