# E2E Test Plan - AI 面试全流程助手 v0.1 MVP

## 1. Test Scope

| Module | Pages | Priority |
|--------|-------|----------|
| Home | `/` | P0 |
| Interviews CRUD | `/interviews`, `/interviews/new`, `/interviews/[id]`, `/interviews/[id]/edit` | P0 |
| Pre-Interview | `/pre-interview`, `/pre-interview/new`, `/pre-interview/[id]` | P0 |
| Analytics | `/analytics` | P1 |
| Companies | `/companies` | P1 |
| Profile | `/profile` | P1 |
| Settings | `/settings` | P1 |
| Navigation & i18n | All pages | P0 |

## 2. Test Categories

### 2.1 Functional Tests
- **CRUD operations**: Create, Read, Update, Delete for interviews
- **Form validation**: Required fields, data types, edge cases
- **AI integration**: Analysis triggers, loading states, result display
- **Data persistence**: Refresh persistence, state consistency

### 2.2 UI/UX Tests
- **Loading states**: Skeleton/spinner rendering during data fetch
- **Empty states**: Appropriate messaging when no data exists
- **Error states**: Graceful error handling and messaging
- **Responsive design**: Mobile menu, layout adaptation
- **Interactive elements**: Hover effects, transitions, button states

### 2.3 Navigation Tests
- **Desktop navigation**: All nav links, active state highlighting
- **Mobile navigation**: Menu toggle, link clicks, menu close
- **Back navigation**: Browser back, router.back() buttons
- **Deep linking**: Direct URL access to specific resources

### 2.4 i18n Tests
- **Language switching**: zh <-> en toggle
- **Translation coverage**: All UI text translated
- **Locale persistence**: Language survives navigation

### 2.5 Edge Case Tests
- **Special characters**: Chinese/English/emoji in form fields
- **Long text**: Very long notes/descriptions
- **Boundary values**: Min/max numbers, empty strings
- **Concurrent operations**: Rapid clicks, double submissions
- **Network errors**: API failures, timeout handling

## 3. Test Data Strategy

- Use unique test data with timestamps to avoid conflicts
- Clean up created test data after each test
- Test with both Chinese and English content

## 4. Browser / Device Matrix

| Project | Viewport | Description |
|---------|----------|-------------|
| chromium-desktop | 1280x900 | Desktop Chrome |
| chromium-mobile | Pixel 5 | Mobile Chrome |
