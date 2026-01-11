# Coverage plans — Batch 1 & 2 🚀

Goal: raise each file's coverage to >= 80% (lines/statements) by adding focused unit tests.

Files included (detected by earliest test files - Batch 1 & 2):

- Batch 1 (first 10):
  - `src/app/app.spec.ts` (already covered)
  - `src/app/shared/components/ui/document-viewer/document-viewer.spec.ts` — source: `document-viewer.ts` (~72%)
  - `src/app/shared/directives/relative-time.directive.spec.ts` — (95%, OK)
  - `src/app/shared/components/ui/logo/logo.component.spec.ts` — (100%, OK)
  - `src/app/shared/components/ui/icon/icon.component.spec.ts` — (100%, OK)
  - `src/app/shared/components/ui/avatar/avatar.component.spec.ts` — (95%, OK)
  - `src/app/shared/components/ui/spinner/global-spinner.component.spec.ts` — (100%, OK)
  - `src/app/shared/components/ui/changelog-page.component.spec.ts` — (89%, OK)
  - `src/app/shared/components/ui/document-preview/document-preview.component.spec.ts` — source: `document-preview.component.ts` (~57%) ⚠️
  - `src/app/shared/components/ui/dropdown/dropdown.component.spec.ts` — (94%, OK)

- Batch 2 (next 10):
  - `src/app/shared/components/ui/toast/toast-container.component.spec.ts` — (100%, OK)
  - `src/app/shared/components/ui/dialog/confirm-modal.component.spec.ts` — (100%, OK)
  - `src/app/shared/components/ui/dialog/contact-us-modal.component.spec.ts` — source: `contact-us-modal.component.ts` (~45.7%) ⚠️
  - `src/app/layouts/dashboard-layout/dashboard-layout.component.spec.ts` — source: `dashboard-layout.component.ts` (~63%) ⚠️
  - `src/app/shared/components/social-links/social-links.component.spec.ts` — (100%, OK)
  - `src/app/shared/components/settings/settings-panel.component.spec.ts` — source: `settings-panel.component.ts` (~42.8%) ⚠️
  - `src/app/features/home/pages/home/home.component.spec.ts` — (100%, OK)
  - `src/app/features/dashboard/pages/dashboard-home/dashboard-home.component.spec.ts` — source: `dashboard-home.component.ts` (~42.5%) ⚠️
  - `src/app/features/notes/pages/note-list/note-list.component.spec.ts` — (100%, OK)
  - `src/app/features/notes/pages/note-detail/note-detail.component.spec.ts` — (100%, OK)

---

Per-file plans (only files < 80% in Batch 1 & 2):

1. `src/app/shared/components/ui/document-viewer/document-viewer.ts` (current ~72%) 🔧

- Tests to add
  - Validate behavior for different file types (image, pdf, text) and that the correct viewer path is chosen.
  - Test download link creation: mock URL.createObjectURL and ensure sanitized URL is used.
  - Test error handling when file fetch/read fails and fallback UI shows.
  - Ensure blob revocation path (revokeObjectURL) is exercised.
- Mocks needed: DomSanitizer (spy sanitize), File/Blob inputs (mock blobs), global URL.createObjectURL/revokeObjectURL.
- Estimates: 4–6 tests, ~80–120 LOC, ~1–1.5 hours.

2. `src/app/shared/components/ui/document-preview/document-preview.component.ts` (current ~57%) 🔧

- Tests to add
  - Render variants for image/pdf/text and assert template branches (isImage/isPdf helpers).
  - Clicking preview triggers `open()` — spy on DialogService or viewer component creation.
  - Test fallback / error states for unsupported types.
- Mocks needed: DialogService (spy open), DomSanitizer for safe resource URLs, sample blobs or URLs.
- Estimates: 6–8 tests, ~120–180 LOC, ~2–3 hours.

3. `src/app/shared/components/ui/dialog/contact-us-modal.component.ts` (current ~46%) 🔧

- Tests to add
  - Validate form validation (invalid form prevents submit).
  - Successful submit: mock mail/contact API, assert toast success and close behavior.
  - Failed submit: mock error, ensure error state and toast error called.
  - Loading state during submit.
- Mocks needed: Appwrite/EmailService (or whichever service handles the submit), ToastService, modal close handler.
- Estimates: 5–7 tests, ~80–120 LOC, ~1.5–2 hours.

4. `src/app/layouts/dashboard-layout/dashboard-layout.component.ts` (current ~63%) 🔧

- Tests to add
  - Simulate Router events to drive `isActivityLogPage` and assert signal value changes.
  - Test sidebar toggle/open/close methods and ensure appropriate signal/event emission.
  - Test responsive behavior if any (e.g., onNavigate side effects).
- Mocks needed: RouterTestingModule (simulate navigation events), maybe ActivityLogService if referenced.
- Estimates: 4–6 tests, ~80–120 LOC, ~1.5–2 hours.

5. `src/app/shared/components/settings/settings-panel.component.ts` (current ~42%) 🔧

- Tests to add
  - Load settings: mock service returning values; verify initial state is set.
  - Save flow: success path (toast) and error path.
  - Theme toggles: verify calls to ThemeService.
- Mocks needed: Settings/Appwrite service, ThemeService, ToastService.
- Estimates: 6–8 tests, ~120–180 LOC, ~2–3 hours.

6. `src/app/features/dashboard/pages/dashboard-home/dashboard-home.component.ts` (current ~42%) 🔧

- Tests to add
  - `ngOnInit` subscribes to selection service and updates local signals.
  - Handlers like `createNewNote` call expected services and route navigation.
  - Verify subscriptions are cleaned up on destroy if applicable.
- Mocks needed: FileSelection / WorkspaceState / Note creation services, RouterTestingModule.
- Estimates: 4–6 tests, ~80–120 LOC, ~1.5–2 hours.

---

Notes & risks:

- Some components interact with DOM APIs (URL.createObjectURL, Blob). Use `jest.spyOn(global.URL, 'createObjectURL')` or mock in `setup-jest.ts` per existing patterns.
- For API layers (Appwrite/Supabase), prefer to mock service methods rather than network calls to keep tests fast and deterministic.
- If a component relies on Signals that are mutated during render, call side-effectful logic outside `detectChanges()` or provide a stub workspace state; follow existing repo patterns.

---

Next step: implement these plans into `docs` (done) and, if you want, I can start implementing tests file-by-file (I recommend one file at a time, beginning with `document-preview` and `contact-us-modal` which give the largest coverage delta).
