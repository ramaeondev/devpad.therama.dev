import { Directive, ElementRef, Input, OnInit, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[appRelativeTime]',
  standalone: true
})
export class RelativeTimeDirective implements OnInit, OnDestroy {
  @Input('appRelativeTime') timestamp!: string | Date;
  
  private el = inject(ElementRef);
  private updateInterval?: number;

  ngOnInit() {
    this.updateDisplay();
    // Update every minute to keep "Now", "X minutes ago" fresh
    this.updateInterval = window.setInterval(() => {
      this.updateDisplay();
    }, 60000); // 60 seconds
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private updateDisplay() {
    if (!this.timestamp) return;

    const date = typeof this.timestamp === 'string' ? new Date(this.timestamp) : this.timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let displayText = '';

    // Now (less than 1 minute)
    if (diffMinutes < 1) {
      displayText = 'Now';
    }
    // X minutes ago (1-59 minutes)
    else if (diffMinutes < 60) {
      displayText = `${diffMinutes}m ago`;
    }
    // Within past hour (show "in past hour")
    else if (diffHours < 1) {
      displayText = 'In past hour';
    }
    // Today (same calendar day)
    else if (this.isSameDay(date, now)) {
      displayText = 'Today';
    }
    // Yesterday
    else if (this.isYesterday(date, now)) {
      displayText = 'Yesterday';
    }
    // This week (within 7 days and same week)
    else if (diffDays < 7 && this.isSameWeek(date, now)) {
      displayText = 'This week';
    }
    // This month
    else if (this.isSameMonth(date, now)) {
      displayText = 'This month';
    }
    // This year - show month name
    else if (this.isSameYear(date, now)) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      displayText = months[date.getMonth()];
    }
    // Different year - show year
    else {
      displayText = date.getFullYear().toString();
    }

    this.el.nativeElement.textContent = displayText;
    this.el.nativeElement.title = date.toLocaleString(); // Full date on hover
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private isYesterday(date: Date, today: Date): boolean {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return this.isSameDay(date, yesterday);
  }

  private isSameWeek(date: Date, today: Date): boolean {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    return date >= startOfWeek;
  }

  private isSameMonth(date: Date, today: Date): boolean {
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth();
  }

  private isSameYear(date: Date, today: Date): boolean {
    return date.getFullYear() === today.getFullYear();
  }
}
