# UI Refactoring Plan: Match Ontologizer Look and Feel

## Summary

Successfully refactored AI Grader Pro to match The Ontologizer's look and feel.

## Root Cause Analysis

### The Problem
The app used CSS variables with light mode as default:
- `--foreground: 210 11% 15%` (dark blue text)
- `--background: 0 0% 100%` (white)

But the page renders on a **dark blue gradient background**, creating a mismatch where:
- Default text color was dark blue (inherited from body)
- Text appeared black/illegible on dark backgrounds

### The Solution
1. Changed default `--foreground` to white in tokens.css
2. Changed font from Geist to Inter
3. Added explicit text colors to design system components
4. Added `text-white` to glass card variant

---

## Todo List

### Phase 1: Font Change
- [x] 1. Update `layout.tsx` to use Inter font instead of Geist

### Phase 2: Fix Component Default Colors
- [x] 2. Update `card.tsx` - add `text-white` default to CardTitle and glass variant
- [x] 3. Update `card.tsx` - change CardDescription to `text-[var(--light-gray)]`
- [x] 4. Update `UserMenu.tsx` - add `text-white` to email span
- [x] 5. Update `label.tsx` - add `text-white` default to Label component

### Phase 3: Fix muted-text References
- [x] 6. Update `AnalyzerForm.tsx` - change helper text to `text-[var(--light-gray)]`
- [x] 7. Update `dashboard/page.tsx` - fix text colors for dark background
- [x] 8. Update `loading-spinner.tsx` - change label to `text-[var(--light-gray)]`

### Phase 4: Root Cause Fix
- [x] 9. Update `tokens.css` - change `--foreground` to white as default

### Phase 5: Verification
- [x] 10. Run the app and compare visually with Ontologizer

---

## Review Section

### Changes Made

1. **tokens.css**: Changed `--foreground` from dark blue to white - THIS WAS THE ROOT CAUSE FIX
   - `--foreground: 0 0% 100%` (white instead of dark blue)
   - `--background: 210 11% 15%` (dark blue)

2. **layout.tsx**: Changed font from Geist to Inter (matching Ontologizer)

3. **card.tsx**:
   - Added `text-white` to CardTitle default classes
   - Added `text-white` to glass variant
   - Changed CardDescription from `text-[var(--muted-text)]` to `text-[var(--light-gray)]`

4. **UserMenu.tsx**: Added `text-white` to email span

5. **label.tsx**: Added `text-white` to Label component default classes

6. **AnalyzerForm.tsx**: Changed helper text from `text-[var(--muted-text)]` to `text-[var(--light-gray)]`

7. **dashboard/page.tsx**:
   - Changed text from `text-[var(--muted-text)]` to `text-[var(--light-gray)]`
   - Changed email span from `text-foreground` to `text-white`

8. **loading-spinner.tsx**: Changed label text from `text-[var(--muted-text)]` to `text-[var(--light-gray)]`

### Files Modified
- `app/layout.tsx`
- `app/styles/tokens.css`
- `components/ui/design-system/card.tsx`
- `components/ui/design-system/label.tsx`
- `components/ui/design-system/loading-spinner.tsx`
- `components/ui/UserMenu.tsx`
- `components/analyzer/AnalyzerForm.tsx`
- `app/dashboard/page.tsx`

### Testing Done
- Login page: "Welcome" and "Email" now display in white
- All text on dark backgrounds is now readable
- Font changed to Inter (matches Ontologizer)

### Notes
- The root cause was the `--foreground` CSS variable being set to dark blue while the app uses dark backgrounds
- Changing `--foreground` to white fixed the cascading text color issue
- The solid card variant (white background) still uses appropriate dark text for form elements
