import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (avatarUrl) {
      <img 
        [src]="avatarUrl" 
        [alt]="alt" 
        [class]="avatarClasses()"
        class="rounded-full object-cover"
      />
    } @else {
      <div 
        [class]="avatarClasses()"
        class="rounded-full flex items-center justify-center font-semibold text-white"
        [ngClass]="gradientClass"
      >
        {{ initials() }}
      </div>
    }
  `,
  styles: []
})
export class AvatarComponent {
  @Input() avatarUrl: string | null = null;
  @Input() firstName: string = '';
  @Input() lastName: string = '';
  @Input() email: string = '';
  @Input() size: AvatarSize = 'md';
  @Input() alt: string = 'Avatar';
  @Input() gradientClass: string = 'bg-gradient-to-br from-blue-500 to-purple-600';

  initials = computed(() => {
    const f = (this.firstName || '').trim();
    const l = (this.lastName || '').trim();
    
    if (f && l) return (f[0] + l[0]).toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    if (this.email) return this.email[0].toUpperCase();
    return '?';
  });

  avatarClasses = computed(() => {
    const sizeMap: Record<AvatarSize, string> = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-9 h-9 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg'
    };
    return sizeMap[this.size];
  });
}
