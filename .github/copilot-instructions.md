# GitHub Copilot Instructions for DevPad

## Project Overview
DevPad is a modern note-taking application built with Angular 18+ (standalone components), Tailwind CSS, and Supabase. The app features markdown editing, folder organization, dark/light mode, and real-time sync.

## Technology Stack
- **Framework**: Angular 18+ with standalone components architecture
- **State Management**: Angular Signals
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Build**: Angular CLI with esbuild
- **Deployment**: Vercel
- **Package Manager**: npm

## Code Style & Conventions

### Angular Patterns
- Use **standalone components** exclusively (no NgModules)
- Prefer **Angular Signals** for reactive state management
- Use **OnPush change detection** with `ChangeDetectorRef` for manual updates
- Implement proper lifecycle hooks cleanup (`OnDestroy` with timer/subscription cleanup)
- Use **inject()** function for dependency injection in newer code
- Component selectors: `app-<name>` (e.g., `app-logo`, `app-button`)
- Use @if and @for directives in templates for conditional rendering and loops
- Use DestroyRef for automatic unsubscription in components
- Use takeuntilDestroyed for observables in components
- Create separate html and css files for larger components
- Dont Use Alerts or  window.confirm, use custom modal components instead
- Use Custom components for showing confirmation modals
- Changelogs should be maintained in CHANGELOG.md
- Changelogs should summarize all commits day wise in the src/assets/changelog.json file by reading all the commits of that day

### File Structure
- Components: `<name>.component.ts` (inline templates/styles for small components)
- Services: `<name>.service.ts` 
- Models: `<name>.model.ts`
- Guards: `<name>.guard.ts`
- Interceptors: `<name>.interceptor.ts`
- Routes: `<feature>.routes.ts`

### Mobile Friendly
- Ensure responsive design using Tailwind's responsive utilities
- Use touch-friendly sizes for buttons and interactive elements
- Test layouts on various screen sizes (mobile, tablet, desktop)

### TypeScript
- Use strict typing; avoid `any` when possible
- Prefer `interface` for data models
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Async/await over raw promises when appropriate
- Proper error handling with try-catch

### Styling
- Use Tailwind utility classes (e.g., `text-gray-900 dark:text-gray-100`)
- Dark mode: `dark:` variants
- Responsive: `sm:`, `md:`, `lg:` prefixes
- Custom CSS only when Tailwind utilities are insufficient
- Keep component styles scoped

### State & Services
- Use Angular Signals for reactive state: `signal()`, `computed()`, `effect()`
- Services should be `providedIn: 'root'` unless component-scoped
- State management via dedicated state services (e.g., `AuthStateService`, `WorkspaceStateService`)
- Use BehaviorSubject/Observable only when Signals aren't suitable

### Build & Deploy
- Build command: `npm run build:prod` (Angular production build)
- Output directory: `dist/devpad/browser`
- Vercel configuration in `vercel.json` handles SPA routing
- Deploy: `vercel --prod`

## Common Tasks & Patterns

### Creating a New Component
```bash
# Generate standalone component
ng generate component features/<feature>/components/<name> --standalone --inline-style --inline-template
```

### Adding a New Feature Route
1. Create feature folder: `src/app/features/<feature>/`
2. Add `<feature>.routes.ts` with route definitions
3. Import routes in `app.routes.ts`
4. Use lazy loading: `loadComponent: () => import('./...')`

### Supabase Integration
- Use `SupabaseService` for client access
- Auth state via `AuthStateService`
- Database queries return typed models from `core/models/`
- Handle errors gracefully with toast notifications

### Toast Notifications
```typescript
this.toastService.showSuccess('Operation successful');
this.toastService.showError('Operation failed');
```

### Loading States
```typescript
this.loadingService.show();
// async operation
this.loadingService.hide();
```

## Code Quality Guidelines

### When Editing Code
- Preserve existing patterns and conventions
- Keep functions focused and under 30 lines when possible
- Add proper TypeScript types to all parameters and return values
- Include error handling for async operations
- Clean up resources in `ngOnDestroy()`
- Test edge cases (empty states, errors, loading states)

### When Creating New Files
- Follow the existing folder structure
- Use descriptive names (avoid abbreviations)
- Add JSDoc comments for complex logic
- Export only what's needed
- Keep components under 200 lines; extract subcomponents if needed

### Accessibility
- Use semantic HTML elements
- Add `aria-label` for icons and interactive elements without text
- Ensure keyboard navigation works
- Maintain color contrast (WCAG 2.1 AA)
- Test with screen readers when adding complex UI

### Performance
- Lazy load feature modules
- Use trackBy in `*ngFor` loops
- Minimize bundle size (check budget warnings)
- Avoid unnecessary re-renders with OnPush
- Optimize images and assets

## Common Pitfalls to Avoid
- ❌ Don't use CommonJS modules (prefer ESM)
- ❌ Don't import entire libraries (use tree-shakeable imports)
- ❌ Don't forget to unsubscribe from observables
- ❌ Don't hardcode URLs or secrets
- ❌ Don't bypass Angular's security (sanitize user input)
- ❌ Don't use `any` type without justification
- ❌ Don't commit `dist/` or `node_modules/`

## Environment Configuration
- Development: `src/environments/environment.ts`
- Production: `src/environments/environment.prod.ts`
- Supabase keys in environment files (use env vars in production)

## Testing
- Unit tests: `ng test`
- Coverage: `npm run test:coverage`
- Test files: `<name>.spec.ts`
- Focus on critical paths and edge cases

## Documentation
- Keep README.md updated for major changes
- Use JSDoc for complex functions
- Document breaking changes in commit messages
- Update CHANGELOG.md for releases

## Commit Message Format
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore, ci
Scope: component/feature name
Example: feat(logo): add Lottie animation support
```

## Additional Notes
- This is an active development project; patterns may evolve
- Prefer modern Angular APIs (Signals over RxJS when possible)
- Keep dependencies minimal and up-to-date
- Security: never commit secrets; use environment variables
- Mobile-first responsive design

## Changelog 
- Maintain a detailed changelog in CHANGELOG.md for all notable changes, following semantic versioning principles.
- Document new features, bug fixes, and breaking changes clearly for each release.
- Read all the commits for a day to summarize them effectively in the changelog.