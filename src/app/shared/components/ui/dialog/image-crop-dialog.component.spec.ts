import { TestBed } from '@angular/core/testing';
import { ImageCropDialogComponent } from './image-crop-dialog.component';

describe('ImageCropDialogComponent', () => {
  it('initializes and shows tips text when open', async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImageCropDialogComponent);
    const comp = fixture.componentInstance;
    comp.open = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tips:');
  });

  it('emits cancel on onCancel', async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImageCropDialogComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.cancel.subscribe(spy);
    comp.onCancel();
    expect(spy).toHaveBeenCalled();
  });

  it('does not emit save when no cropped blob exists and Save button is disabled', async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImageCropDialogComponent);
    const comp = fixture.componentInstance;
    // open the dialog so footer buttons are rendered
    comp.open = true;
    fixture.detectChanges();

    const saveSpy = jest.fn();
    comp.save.subscribe(saveSpy);

    const buttons = fixture.nativeElement.querySelectorAll('button');
    // last button is 'Save Photo'
    const saveButton = Array.from(buttons).find((b: any) => b.textContent.includes('Save Photo')) as HTMLButtonElement;
    expect(saveButton).toBeTruthy();
    expect(saveButton.disabled).toBeTruthy();

    // attempt to call onSave when no blob
    comp.onSave();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('sets cropped image/blob and emits save', async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImageCropDialogComponent);
    const comp = fixture.componentInstance;
    const blob = new Blob(['a']);
    comp.imageCropped({ blob, objectUrl: 'blob:1' } as any);
    expect(comp.croppedBlob()).toBeTruthy();
    expect(comp.croppedImage()).toBeTruthy();

    const spy = jest.fn();
    comp.save.subscribe(spy);
    comp.onSave();
    expect(spy).toHaveBeenCalled();
  });

  it('sets loading false and clears error on imageLoaded', async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImageCropDialogComponent);
    const comp = fixture.componentInstance;
    // set loading true then call imageLoaded
    comp.loading.set(true);
    comp.errorMessage.set('some error');
    comp.imageLoaded();
    expect(comp.loading()).toBe(false);
    expect(comp.errorMessage()).toBe('');
  });

  it('sets loading false on cropperReady and sets error on loadImageFailed', async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImageCropDialogComponent);
    const comp = fixture.componentInstance;

    comp.loading.set(true);
    comp.cropperReady();
    expect(comp.loading()).toBe(false);

    comp.loading.set(true);
    comp.loadImageFailed();
    expect(comp.loading()).toBe(false);
    expect(comp.errorMessage()).toContain('Failed to load image');
  });

  it('resetState clears cropped image/blob', async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImageCropDialogComponent);
    const comp = fixture.componentInstance;
    comp.croppedBlob.set(new Blob(['x']));
    comp.croppedImage.set('some' as any);
    (comp as any).resetState();
    expect(comp.croppedBlob()).toBeNull();
    expect(comp.croppedImage()).toBeNull();
  });
});