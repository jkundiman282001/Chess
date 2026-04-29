# Project Changelog

Every meaningful change to this project should be documented here. Keep entries concise but specific enough that another AI or developer can understand what changed, why it changed, and where to look.

## Documentation Rules

For every future code, schema, UI, or behavior change, add a changelog entry with:

- Date
- Area changed
- Summary of behavior change
- Key files touched
- Required setup steps, such as migrations or seeders
- Verification performed
- Known limitations or follow-up work, if any

Use this format:

```md
## YYYY-MM-DD - Short Change Title

Area: Backend | Frontend | Full stack | Documentation | Database

Summary:
- What changed from the user's point of view.
- Why the change was made, if important.

Files:
- path/to/file

Setup:
- Any required commands, or "None".

Verification:
- Commands run, or "Not run: reason".

Notes:
- Limitations, risks, or future follow-up.
```

## 2026-04-29 - Added AI Handoff Documentation

Area: Documentation

Summary:
- Added a dedicated project handoff document for future AI assistants and developers.
- Documented the current architecture, feature set, API surface, data model, AI behavior, store/admin systems, board customization, progression systems, known pitfalls, and recommended next features.
- Linked the handoff document from the root README.

Files:
- `AI_HANDOFF.md`
- `README.md`

Setup:
- None.

Verification:
- Documentation reviewed by reading the generated file.

Notes:
- This was documentation-only. No code tests were required.

## 2026-04-29 - Added Changelog Requirement

Area: Documentation

Summary:
- Added this changelog as the required place to document future project modifications.
- Added a documentation rule that future changes must include what changed, key files, setup steps, verification, and notes.

Files:
- `CHANGELOG.md`
- `README.md`

Setup:
- None.

Verification:
- Documentation reviewed by reading the generated file.

Notes:
- Future work should update this file in the same change set as the code or documentation change.

## 2026-04-29 - Store Card Banner Image Uploads

Area: Full stack

Summary:
- Replaced admin store card banner color customization with an uploaded banner image field.
- Store cards, featured bundles, and bundle detail previews now render `preview.banner` when available.
- Existing `preview.primary` and `preview.secondary` colors remain as fallback for cosmetics without an uploaded banner.

Files:
- `backend/app/Http/Controllers/Api/V1/AdminController.php`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/DashboardPage.tsx`
- `frontend/src/components/DashboardPage.css`
- `AI_HANDOFF.md`
- `CHANGELOG.md`

Setup:
- None. The feature uses the existing `cosmetic_items.preview` JSON field.

Verification:
- `php -l backend/app/Http/Controllers/Api/V1/AdminController.php`
- `cd backend && vendor/bin/pint --test app/Http/Controllers/Api/V1/AdminController.php`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

Notes:
- Banner images are currently stored as base64 data URLs in the database. This is acceptable for MVP but should move to file storage later.

## 2026-04-29 - Bundle Detail Product Sheet

Area: Frontend

Summary:
- Reworked the store bundle detail modal into a two-column product sheet.
- The left panel now showcases the uploaded banner image with bundle name, rarity, and description.
- The right panel shows price, ownership/equipped status, piece previews, and direct actions.
- Added click-outside close behavior and a dedicated close button.
- Added buy, equip, and unequip actions directly inside the bundle view.

Files:
- `frontend/src/components/DashboardPage.tsx`
- `frontend/src/components/DashboardPage.css`
- `CHANGELOG.md`

Setup:
- None.

Verification:
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

Notes:
- The modal still falls back to the existing gradient preview when no uploaded banner exists.
- This is a frontend-only structure change.

## 2026-04-29 - Storefront Layout Redesign

Area: Frontend

Summary:
- Restructured the player store into a stronger storefront layout.
- Added a hero header with coin balance and clearer store positioning.
- Replaced the old top stats row with compact status cards for equipped pieces, starter sets, owned extras, and available bundles.
- Moved filter, search, sort, and visible-count information into a browse sidebar.
- Kept the featured bundle and catalog sections in the main content area.
- Updated responsive behavior so the store collapses cleanly on tablet and mobile screens.

Files:
- `frontend/src/components/DashboardPage.tsx`
- `frontend/src/components/DashboardPage.css`
- `AI_HANDOFF.md`
- `CHANGELOG.md`

Setup:
- None.

Verification:
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

Notes:
- This is a frontend-only redesign. Store APIs and database schema were not changed.
