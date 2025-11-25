import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoComponent],
  templateUrl: './terms.component.html',
  styles: [],
})
export class TermsComponent {}
