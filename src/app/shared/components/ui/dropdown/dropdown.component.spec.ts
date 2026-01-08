import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DropdownComponent } from './dropdown.component';

@Component({
  template: `
    <app-dropdown>
      <button dropdownTrigger>Trigger</button>
      <div dropdownMenu><button class="item">One</button></div>
    </app-dropdown>
  `,
  standalone: true,
  imports: [DropdownComponent],
})
class Host {}

describe('DropdownComponent', () => {
  it('toggles open on trigger click and closes on menu item click', async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button[dropdownTrigger]') as HTMLElement;
    expect(trigger).toBeTruthy();
    trigger.click();
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('[dropdownMenu]');
    expect(menu).toBeTruthy();

    const item = menu.querySelector('.item') as HTMLElement;
    item.click();
    // wait for setTimeout close
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[dropdownMenu]')).toBeNull();
  });
});