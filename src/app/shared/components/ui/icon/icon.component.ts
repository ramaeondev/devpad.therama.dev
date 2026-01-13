import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (name === 'google-drive') {
      <svg
        [attr.width]="size"
        [attr.height]="size"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M7.71 3.5L1.15 15l3.38 5.87L11.1 9.3l-3.38-5.8zM20.85 3.5l-3.38 5.87L23.85 15 17.29 3.5zM12 9.3L5.53 20.87h12.94L12 9.3z"
        />
      </svg>
    } @else if (name === 'onedrive') {
      <svg
        [attr.width]="size"
        [attr.height]="size"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M13.98 3.37A6.5 6.5 0 007.5 9.5a6.5 6.5 0 00.1 1.13A5.73 5.73 0 000 16.5C0 19.54 2.46 22 5.5 22h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96A6.5 6.5 0 0013.98 3.37z"
        />
      </svg>
    } @else {
      <i class="material-icons" [style.font-size.px]="size">{{ name }}</i>
    }
  `,
})
export class IconComponent {
  @Input() name:
    | 'close'
    | 'menu'
    | 'check'
    | 'error'
    | 'info'
    | 'warning'
    | 'spinner'
    | 'refresh'
    | 'more_vert' // dots-vertical
    | 'more_horiz' // dots-horizontal
    | 'download'
    | 'file_upload' // import
    | 'edit' // pencil
    | 'delete' // trash
    | 'info' // info-circle
    | 'visibility' // eye
    | 'edit'
    | 'expand_more' // chevron-down
    | 'chevron_right'
    | 'expand_less' // chevron-up
    | 'photo_camera' // camera
    | 'article' // file
    | 'google-drive'
    | 'onedrive'
    | string = 'info';
  @Input() size: number | string = 20;
}
