import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent implements OnInit {
  private themeService = inject(ThemeService);

  ngOnInit() {
    this.themeService.initializeTheme();
  }
}
