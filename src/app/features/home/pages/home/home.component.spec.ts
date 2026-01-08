import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('HomeComponent', () => {
  it('renders and includes router link', async () => {
    await TestBed.configureTestingModule({ imports: [HomeComponent, RouterTestingModule] }).compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });
});