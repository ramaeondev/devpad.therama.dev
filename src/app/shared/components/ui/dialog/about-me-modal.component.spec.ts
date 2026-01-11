import { TestBed } from '@angular/core/testing';
import { AboutMeModalComponent } from './about-me-modal.component';

describe('AboutMeModalComponent', () => {
  it('renders About Us header and emits close', async () => {
    class MockAppwrite {
      async getSocialLinks() {
        return [];
      }
    }
    await TestBed.configureTestingModule({
      imports: [AboutMeModalComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/appwrite.service')).AppwriteService,
          useClass: MockAppwrite,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AboutMeModalComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('About Us');

    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.close.subscribe(spy);
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    expect(spy).toHaveBeenCalled();
  });
});
