import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  templateUrl: './privacy.component.html',
  styles: [],
})
export class PrivacyComponent {}
