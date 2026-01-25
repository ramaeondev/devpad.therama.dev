import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  templateUrl: './terms.component.html',
  styles: [],
})
export class TermsComponent {}
