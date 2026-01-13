import { TestBed } from '@angular/core/testing';
import { PropertiesModalComponent } from './properties-modal.component';

describe('PropertiesModalComponent', () => {
  it('renders title and emits close', async () => {
    await TestBed.configureTestingModule({
      imports: [PropertiesModalComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(PropertiesModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.title = 'Meta';
    comp.properties = [{ label: 'A', value: 'v' } as any];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Meta');
    expect(fixture.nativeElement.textContent).toContain('v');

    const spy = jest.fn();
    comp.onClose.subscribe(spy);
    comp.close();
    expect(spy).toHaveBeenCalled();
  });

  it('shows no properties message when empty', async () => {
    await TestBed.configureTestingModule({
      imports: [PropertiesModalComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(PropertiesModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.properties = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No properties available');
  });
});
