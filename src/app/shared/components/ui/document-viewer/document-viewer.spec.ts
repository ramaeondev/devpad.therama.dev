import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentViewerComponent } from './document-viewer';

describe('DocumentViewerComponent', () => {
  let component: DocumentViewerComponent;
  let fixture: ComponentFixture<DocumentViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle PDF URLs', () => {
    component.documentUrl = 'https://example.com/document.pdf';
    component.title = 'Test PDF';
    component.ngOnChanges({
      documentUrl: {
        currentValue: 'https://example.com/document.pdf',
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    expect(component.canPreviewInIframe()).toBeTruthy();
    expect(component.getFileType()).toBe('PDF');
  });

  it('should handle image URLs', () => {
    component.documentUrl = 'https://example.com/image.jpg';
    component.ngOnChanges({
      documentUrl: {
        currentValue: 'https://example.com/image.jpg',
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    expect(component.isImage()).toBeTruthy();
    expect(component.getFileType()).toBe('Image');
  });
});
