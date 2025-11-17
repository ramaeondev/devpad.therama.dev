import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <!-- Center content intentionally left empty for now -->
    </div>
  `,
  styles: [],
})
export class DashboardHomeComponent {}
