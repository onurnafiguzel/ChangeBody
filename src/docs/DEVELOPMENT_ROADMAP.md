# 🚀 ChangeMind FE - Development Roadmap (Après Auth)

**Status:** Login/Signup ✅ Complete  
**Kalan:** Profile Completion → Dashboard → Exercises → Packages → Payment → Programs → Polish

---

## 📊 **High-Level Timeline**

```
Week 1 (5 days):
  Mon-Tue: Profile Completion + Dashboard + Navigation
  Wed:     Exercises List (with filters)
  Thu:     Packages List + Basic Payment
  Fri:     Programs Display + Progress tracking

Week 2 (5 days):
  Mon-Tue: Payment Idempotency + Error Handling
  Wed:     Program Details + Weekly Schedule
  Thu:     UI Polish + Responsive Design
  Fri:     Testing + Bug Fixes

Total: ~10 days (2 weeks)
```

---

## 📋 **Feature Breakdown**

### **Phase 1: Onboarding → Dashboard (2 days)**

#### Task 1.1: Profile Completion Form
- **Est. Time:** 4 hours
- **Priority:** 🔴 CRITICAL
- **Dependencies:** Auth context (already done)
- **Acceptance Criteria:**
  - [ ] Form renders with all 8 fields
  - [ ] Form validation works (age 13-120, required fields)
  - [ ] Submit calls `PATCH /api/users/{id}/complete-profile`
  - [ ] Success → Redirects to Dashboard
  - [ ] Error → Shows error message
  - [ ] Loading state shows during submission

**Subtasks:**
```
1.1.1 - Create ProfileCompletionForm component
       └─ Fields: firstName, lastName, age, height, weight, gender, fitnessGoal, fitnessLevel
       └─ Validation library: React Hook Form or Formik
       └─ Styling: Match auth pages

1.1.2 - Create ProfileCompletion page wrapper
       └─ Check if profile already complete (skip if yes)
       └─ Call userService.completeProfile()
       └─ Handle loading/error states

1.1.3 - Add form validation schema
       └─ Age: 13-120
       └─ FirstName/LastName: min 1 char
       └─ Height/Weight: positive numbers
       └─ Gender: dropdown (Male, Female, Other)
       └─ FitnessLevel: enum (Beginner, Intermediate, Advanced)
       └─ FitnessGoal: select/input (Muscle Gain, Fat Loss, etc.)

1.1.4 - Test integration
       └─ Test with mock API response
       └─ Test error scenarios (409 conflict, validation errors)
       └─ Test redirect to dashboard
```

**API Reference:**
```
PATCH /api/users/{userId}/complete-profile
Request: CompleteProfileRequest
Response: UserDto
Errors: 400 (validation), 401 (unauthorized), 409 (conflict)
```

---

#### Task 1.2: Dashboard Layout & Navigation
- **Est. Time:** 6 hours
- **Priority:** 🔴 CRITICAL
- **Dependencies:** Profile completion (Task 1.1)
- **Acceptance Criteria:**
  - [ ] Header with user name + logout button
  - [ ] 4 quick-access cards visible (Exercises, Packages, Programs, Profile)
  - [ ] Active program section (if exists)
  - [ ] Responsive on mobile/tablet/desktop
  - [ ] Navigation working (clicking cards routes correctly)

**Subtasks:**
```
1.2.1 - Create Dashboard layout
       └─ Header component (user greeting, logout)
       └─ Active program card (if exists)
       └─ 4 quick-access cards grid
       └─ Responsive grid (1 col mobile, 2 col tablet, 4 col desktop)

1.2.2 - Create Header component
       └─ Display: "Welcome, [FirstName] [LastName]"
       └─ Logout button (clears tokens, redirects to login)
       └─ User avatar placeholder
       └─ Styling consistent with brand

1.2.3 - Create DashboardCard component (reusable)
       └─ Props: title, description, icon, path, action
       └─ Click → navigate to path
       └─ Styling: card design with hover effect

1.2.4 - Create ActiveProgramCard component
       └─ Fetch: GET /api/users/{userId}/active-program
       └─ Display: Program name, coach name, progress bar, dates
       └─ Button: "View Details" → /programs
       └─ If no program: Show "No active program" message

1.2.5 - Create Navigation/TabBar
       └─ Bottom tab bar (mobile) or Left sidebar (desktop)
       └─ Tabs: Dashboard, Exercises, Packages, Programs, Profile
       └─ Active tab highlight
       └─ Responsive layout switcher

1.2.6 - Setup routing
       └─ Dashboard as main route
       └─ Protect dashboard with ProtectedRoute
       └─ Redirect to profile-completion if profile incomplete
```

**API Reference:**
```
GET /api/users/{userId}/active-program
Response: ActiveProgramDetailDto | null
```

---

### **Phase 2: Exercises List (3 days)**

#### Task 2.1: Exercise List with Pagination
- **Est. Time:** 4 hours
- **Priority:** 🟠 HIGH
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] List displays exercises in paginated table/cards
  - [ ] Default page size: 10
  - [ ] Pagination controls working (prev/next, page numbers)
  - [ ] Loading state shows while fetching
  - [ ] Error handling for failed requests

**Subtasks:**
```
2.1.1 - Create ExerciseList page structure
       └─ Filters section (top)
       └─ Exercise list/table (middle)
       └─ Pagination controls (bottom)

2.1.2 - Create ExerciseCard component
       └─ Display: name, muscleGroup, difficultyLevel
       └─ Styling: card with image placeholder
       └─ Click → Open ExerciseDetail modal/page

2.1.3 - Implement pagination
       └─ State: { page: 1, pageSize: 10, totalCount: 0 }
       └─ API call: GET /api/exercises?page={page}&pageSize={pageSize}
       └─ Update state on response
       └─ Disable prev on page 1, disable next on last page

2.1.4 - Add loading/error states
       └─ Loading spinner while fetching
       └─ Error message if request fails
       └─ Retry button on error
```

**API Reference:**
```
GET /api/exercises
Query: page=1, pageSize=10
Response: PagedResultExerciseDto
  - items: ExerciseDto[]
  - totalCount: number
  - pageSize: number
  - currentPage: number
```

---

#### Task 2.2: Exercise Filtering (Muscle Group + Difficulty)
- **Est. Time:** 3 hours
- **Priority:** 🟠 HIGH
- **Dependencies:** Task 2.1
- **Acceptance Criteria:**
  - [ ] Muscle group filter dropdown works
  - [ ] Difficulty filter dropdown works
  - [ ] Filters apply immediately (reset pagination to page 1)
  - [ ] Multiple filters can be combined
  - [ ] "Clear filters" button resets all

**Subtasks:**
```
2.2.1 - Create FilterBar component
       └─ MuscleGroup select (from enum)
       └─ DifficultyLevel select (from enum)
       └─ Clear filters button
       └─ Apply button (or auto-apply on change)

2.2.2 - Add filter state
       └─ State: { muscleGroup: "", difficultyLevel: "" }
       └─ onChange → Update state
       └─ Trigger re-fetch with new filters

2.2.3 - Update API call with filters
       └─ GET /api/exercises?page=1&pageSize=10&muscleGroup={value}&difficultyLevel={value}
       └─ Reset currentPage to 1 when filters change
       └─ Update list with filtered results

2.2.4 - Filter persistence (optional)
       └─ Save filters to localStorage
       └─ Load filters on page reload
```

**Enum Values from api.types.ts:**
```typescript
MuscleGroup: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Legs, Glutes, Core, Cardio
DifficultyLevel: Beginner, Intermediate, Advanced
```

---

#### Task 2.3: Exercise Search (Text Search)
- **Est. Time:** 2 hours
- **Priority:** 🟡 MEDIUM
- **Dependencies:** Task 2.1
- **Acceptance Criteria:**
  - [ ] Search input field visible
  - [ ] Search triggers API call (debounced)
  - [ ] Results filter by exercise name
  - [ ] Clear search button

**Subtasks:**
```
2.3.1 - Create SearchInput component
       └─ Text input with clear button
       └─ Debounce: 300ms (avoid too many API calls)

2.3.2 - Add search to API call
       └─ If search backend supports: Add ?search={query} param
       └─ If not: Filter on frontend (less efficient)
       └─ Clear results when search is empty

2.3.3 - Handle search results
       └─ Show "No results" message if empty
       └─ Reset pagination when searching
```

---

#### Task 2.4: Exercise Detail Modal/Page
- **Est. Time:** 3 hours
- **Priority:** 🟠 HIGH
- **Dependencies:** Task 2.1
- **Acceptance Criteria:**
  - [ ] Click exercise → Opens detail view
  - [ ] Shows full description
  - [ ] Shows video (if available) or placeholder
  - [ ] Shows muscle group + difficulty
  - [ ] Can close detail view
  - [ ] Can add exercise to custom program (future)

**Subtasks:**
```
2.4.1 - Create ExerciseDetail component
       └─ Display in modal or separate page
       └─ Props: exerciseId
       └─ Fetch: GET /api/exercises/{id}

2.4.2 - Show exercise details
       └─ Name, muscleGroup, difficultyLevel (badges)
       └─ Description (formatted text)
       └─ VideoUrl (if present): embed video player or link
       └─ Created/updated dates (optional)

2.4.3 - Add close mechanism
       └─ Close button
       └─ Backdrop click (if modal)
       └─ ESC key (if modal)

2.4.4 - Video display
       └─ If videoUrl exists: Show video player (embed or link)
       └─ If not: Show "No video available" placeholder
```

**API Reference:**
```
GET /api/exercises/{exerciseId}
Response: ExerciseDto
```

---

### **Phase 3: Packages & Payment (2-3 days)**

#### Task 3.1: Package List
- **Est. Time:** 3 hours
- **Priority:** 🔴 CRITICAL
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] List shows all packages
  - [ ] Cards show: name, description, price, duration
  - [ ] Pagination working
  - [ ] Click package → Opens details

**Subtasks:**
```
3.1.1 - Create PackageList page
       └─ Fetch: GET /api/packages?page=1&pageSize=10
       └─ Display packages in card grid

3.1.2 - Create PackageCard component
       └─ Display: name, description, price, durationDays, type
       └─ Show pricing: "$99.99/month"
       └─ Features list (if type determines features)
       └─ "Select" button → Opens payment modal

3.1.3 - Add pagination
       └─ Same logic as Exercise list
       └─ Default pageSize: 10
```

**API Reference:**
```
GET /api/packages
Query: page=1, pageSize=10
Response: PagedResultPackageDto
```

---

#### Task 3.2: Payment Modal & Flow
- **Est. Time:** 4 hours
- **Priority:** 🔴 CRITICAL
- **Dependencies:** Task 3.1
- **Acceptance Criteria:**
  - [ ] Click "Select" → Opens payment confirmation modal
  - [ ] Shows package details + price
  - [ ] "Confirm Payment" button submits to API
  - [ ] Loading state during payment
  - [ ] Success → Shows success message + redirects
  - [ ] Error → Shows error message + retry option
  - [ ] ⚠️ Idempotency-Key generated correctly

**Subtasks:**
```
3.2.1 - Create PaymentModal component
       └─ Props: packageId, packageName, price, onConfirm, onCancel
       └─ Display package summary
       └─ "Confirm" and "Cancel" buttons
       └─ Loading state during submission

3.2.2 - Implement payment logic
       └─ Generate UUID: const idempotencyKey = uuidv4()
       └─ Call: POST /api/payments with Idempotency-Key header
       └─ Handle response: { success, paymentId, message }
       └─ Handle errors: 200 OK, 400 validation, 409 conflict, 401 unauthorized

3.2.3 - Handle 409 Conflict (in-flight payment)
       └─ Read Retry-After header
       └─ Wait specified seconds
       └─ Retry automatically (with same idempotencyKey)
       └─ Max 3 retries, then show error

3.2.4 - Success handling
       └─ Show: "Payment successful!"
       └─ After 2 seconds: Redirect to dashboard
       └─ Optional: Show confetti animation

3.2.5 - Error handling
       └─ 400: "Invalid request. Check package/user ID."
       └─ 401: "Session expired. Please login again."
       └─ 409: Auto-retry (handled in 3.2.3)
       └─ Other: "Payment failed. Please try again."
       └─ Retry button (generates new UUID)

3.2.6 - Add toast notifications
       └─ Success, error, info toasts
       └─ Auto-dismiss after 3 seconds
```

**⚠️ IDEMPOTENCY CRITICAL:**
```typescript
// CORRECT Implementation:
const idempotencyKey = uuidv4(); // NEW UUID
const response = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify({ userId, packageId })
});

// If 409 Conflict:
const retryAfter = response.headers['Retry-After'] || '5';
setTimeout(() => {
  // Retry with SAME idempotencyKey
  // Server will return cached response (no new charge)
}, retryAfter * 1000);

// If user clicks retry button:
const newIdempotencyKey = uuidv4(); // DIFFERENT UUID = new payment
// This should only happen if previous payment failed (not 409)
```

**API Reference:**
```
POST /api/payments
Headers: Idempotency-Key: {uuid}
Request: { userId, packageId, description? }
Response: { success: boolean, paymentId: uuid, message?: string }
Errors:
  - 200 OK: Success (check X-Idempotent-Replayed header)
  - 400: Validation error
  - 409: Conflict (in-flight, retry after Retry-After)
  - 401: Unauthorized
Response Headers:
  - X-Idempotent-Replayed: true|false
  - Retry-After: integer (on 409 only)
```

---

### **Phase 4: Programs Display (2 days)**

#### Task 4.1: My Programs Page
- **Est. Time:** 3 hours
- **Priority:** 🟠 HIGH
- **Dependencies:** Dashboard (Task 1.2)
- **Acceptance Criteria:**
  - [ ] Shows active program (if exists)
  - [ ] Displays program details: name, coach, dates, status
  - [ ] Shows progress bar (weeks completed / total)
  - [ ] Can access program details/schedule

**Subtasks:**
```
4.1.1 - Create MyPrograms page
       └─ Fetch: GET /api/users/{userId}/active-program
       └─ Display main program card
       └─ If no program: Show "No active program" message

4.1.2 - Create ProgramCard component
       └─ Display: name, description, coach name
       └─ Dates: start date, end date, duration
       └─ Status: InProgress | Completed
       └─ Progress bar: completed weeks / total weeks
       └─ Button: "View Schedule" or "Details"

4.1.3 - Add program metadata
       └─ Calculate remaining weeks
       └─ Calculate % progress
       └─ Color-code status (green=active, gray=completed)
```

**API Reference:**
```
GET /api/users/{userId}/active-program
Response: ActiveProgramDetailDto | null
```

---

#### Task 4.2: Program Schedule (Weekly Breakdown)
- **Est. Time:** 4 hours
- **Priority:** 🟠 HIGH
- **Dependencies:** Task 4.1
- **Acceptance Criteria:**
  - [ ] Shows Day-1 through Day-7
  - [ ] Each day shows exercises with sets/reps
  - [ ] Can expand/collapse days
  - [ ] Shows explanations if provided
  - [ ] Links to exercise details

**Subtasks:**
```
4.2.1 - Create ScheduleView component
       └─ Display dailyExercises (Day-1, Day-2, etc.)
       └─ Accordion: expandable days
       └─ If no exercises for a day: Show "Rest day" or "-"

4.2.2 - Create ExerciseRow component
       └─ Display: Exercise name, Sets, Reps, Explanation
       └─ Click → Open ExerciseDetail
       └─ Styling: table row or list item

4.2.3 - Add data mapping
       └─ Map dailyExercises object to array
       └─ Sort by day order
       └─ Handle missing days gracefully

4.2.4 - Add progress tracking UI
       └─ Show: "Week 5/12"
       └─ "Log Workout" button (future feature)
       └─ "Update Progress" link for week completion
```

**Data Structure:**
```typescript
dailyExercises: {
  "Day-1": [
    { exerciseId: "uuid", sets: 4, reps: "8-10", explanation: "Heavy focus" },
    { exerciseId: "uuid", sets: 3, reps: "10-12", explanation: "..." }
  ],
  "Day-2": [...]
}
```

---

#### Task 4.3: Progress Tracking
- **Est. Time:** 2 hours
- **Priority:** 🟡 MEDIUM
- **Dependencies:** Task 4.2
- **Acceptance Criteria:**
  - [ ] "Log Progress" or "Mark Week Complete" button works
  - [ ] Calls API to update completed weeks
  - [ ] Success → Updates progress bar immediately
  - [ ] Loading state during update

**Subtasks:**
```
4.3.1 - Create ProgressForm/Modal
       └─ Input: Completed weeks (number)
       └─ Validate: <= total weeks
       └─ Button: "Save"

4.3.2 - Add progress update logic
       └─ Call: PUT /api/training-programs/{programId}/progress
       └─ Send: { completedWeeks: number }
       └─ Handle success/error

4.3.3 - Update UI after save
       └─ Recalculate progress %
       └─ Update progress bar
       └─ Show success toast
       └─ Auto-close modal
```

**API Reference:**
```
PUT /api/training-programs/{programId}/progress
Request: { completedWeeks: number }
Response: { success: boolean }
```

---

### **Phase 5: Polish & Testing (2-3 days)**

#### Task 5.1: Error Handling & User Feedback
- **Est. Time:** 4 hours
- **Priority:** 🟠 HIGH
- **Acceptance Criteria:**
  - [ ] All API errors handled gracefully
  - [ ] Toast notifications for all actions (success/error/info)
  - [ ] Loading spinners on all async operations
  - [ ] User-friendly error messages

**Subtasks:**
```
5.1.1 - Create error handler utility
       └─ Parse API errors (ProblemDetails, ValidationProblemDetails)
       └─ Return user-friendly messages
       └─ Log errors for debugging

5.1.2 - Add global error boundary
       └─ Catch React component errors
       └─ Show fallback UI
       └─ Log to console (dev) or sentry (prod)

5.1.3 - Add toast notification system
       └─ Toast component
       └─ useToast hook
       └─ Queue management (multiple toasts)
       └─ Auto-dismiss after 3-5 seconds

5.1.4 - Add loading states everywhere
       └─ Loading spinners in modals
       └─ Disabled buttons while loading
       └─ Skeleton loaders (optional)

5.1.5 - Create error messages constants
       └─ API errors → friendly messages
       └─ Validation errors → field-specific hints
```

---

#### Task 5.2: Responsive Design
- **Est. Time:** 3 hours
- **Priority:** 🟠 HIGH
- **Acceptance Criteria:**
  - [ ] Mobile: All layouts work on <480px
  - [ ] Tablet: Optimized for 480-1024px
  - [ ] Desktop: Full layout on >1024px
  - [ ] Touch-friendly buttons/inputs
  - [ ] No horizontal scrolling

**Subtasks:**
```
5.2.1 - Mobile breakpoints (Tailwind/CSS)
       └─ sm: 640px
       └─ md: 768px
       └─ lg: 1024px
       └─ xl: 1280px

5.2.2 - Adjust layouts
       └─ Stack cards vertically on mobile
       └─ Hide non-essential content on mobile
       └─ Full-width modals on mobile
       └─ Bottom sheet style modals on mobile

5.2.3 - Touch UX
       └─ Button size: min 44x44px (mobile)
       └─ Input size: min 44px height
       └─ Spacing: min 8px between touch targets
       └─ No hover-only content

5.2.4 - Navigation responsiveness
       └─ Bottom tab bar on mobile
       └─ Sidebar nav on desktop
       └─ Hamburger menu toggle on mobile
```

---

#### Task 5.3: Form Validation & UX
- **Est. Time:** 2 hours
- **Priority:** 🟡 MEDIUM
- **Acceptance Criteria:**
  - [ ] All forms validate before submission
  - [ ] Field-level error messages
  - [ ] Prevent double-submit
  - [ ] Clear error states after fix

**Subtasks:**
```
5.3.1 - Form validation library
       └─ Use: React Hook Form + Zod / Yup
       └─ Validate: On blur, on change, on submit

5.3.2 - Error message display
       └─ Below each field: red text
       └─ Red border on invalid fields
       └─ Persist until field is fixed

5.3.3 - Prevent double-submit
       └─ Disable submit button while submitting
       └─ Show loading state
       └─ Prevent enter key on focused button

5.3.4 - Clear errors on success
       └─ Reset form after successful submission
       └─ Clear field-level errors
       └─ Show success message
```

---

#### Task 5.4: Testing Checklist
- **Est. Time:** 4 hours
- **Priority:** 🟠 HIGH

**Manual Testing Flows:**

```
FLOW 1: New User Journey
├─ Signup with email/password
├─ Complete profile (all fields required)
├─ Redirect to dashboard (success)
├─ Dashboard shows: exercises, packages, programs, profile buttons
└─ ✓ PASS

FLOW 2: Exercise Discovery
├─ Click "Exercises" on dashboard
├─ See exercise list with pagination
├─ Filter by muscle group (e.g., "Chest")
├─ Filter by difficulty (e.g., "Beginner")
├─ Click exercise → See details + video placeholder
├─ Pagination: go to next page → see different exercises
└─ ✓ PASS

FLOW 3: Package Purchase
├─ Click "Packages" on dashboard
├─ See package list (Basic, Premium, Elite)
├─ Click "Select" on Premium package
├─ See payment confirmation modal
├─ Click "Confirm Payment"
├─ See loading state
├─ Success: "Payment successful!" toast + redirect to dashboard
└─ ✓ PASS

FLOW 4: Payment Idempotency Test
├─ Process payment (Premium: $99.99)
├─ Payment successful (1st charge: $99.99)
├─ Manually retry same payment (simulating network retry)
├─ Server returns cached response (no 2nd charge)
├─ Verify billing: only $99.99 charged once
└─ ✓ PASS

FLOW 5: Program Viewing
├─ After payment, coach assigns program
├─ Click "Programs" on dashboard
├─ See active program: "12-Week Strength"
├─ See progress: "Week 5/12" with progress bar
├─ Expand "Day-1": See exercises (Bench Press, Incline DB, etc.)
├─ Click exercise → See details
├─ Click "Update Progress" → Mark week 6 complete
├─ Progress bar updates: Week 6/12
└─ ✓ PASS

FLOW 6: Error Handling
├─ Try login with wrong password → "Invalid email or password"
├─ Try fill profile with invalid age (50) → Error message
├─ Try payment with no internet → "Network error. Retry?"
├─ Try access protected route without auth → Redirect to login
└─ ✓ PASS

FLOW 7: Token Expiry & Refresh
├─ Login successfully
├─ Wait for token expiry (or manually set expiry to now)
├─ Make an API call
├─ Should auto-refresh token (no manual login)
├─ Request succeeds
└─ ✓ PASS

FLOW 8: Logout
├─ Click "Logout" from dashboard header
├─ Tokens cleared from localStorage
├─ Redirect to login page
├─ Cannot access protected routes without re-login
└─ ✓ PASS
```

**Automated Testing (Unit + Integration):**

```
Unit Tests:
├─ authService.login() → correct token storage
├─ exerciseService.listExercises() → pagination params
├─ paymentService.processPayment() → idempotency key generated
├─ TokenManager → expiry calculation
└─ TokenManager → refresh logic

Integration Tests:
├─ Login → ProfileCompletion → Dashboard flow
├─ Exercise filter → API call with params
├─ Payment → Success → Program assignment
└─ Token refresh → Auto-retry on 401

E2E Tests (Cypress/Playwright):
├─ Complete user journey: Signup → Profile → Payment → Program
├─ Exercise list with all filters
├─ Payment success/error scenarios
└─ Program display and progress update
```

---

## 📅 **Daily Sprint Breakdown**

### **Day 1 (Mon): Profile Completion + Dashboard Setup**
```
Morning (3 hours):
  - Implement ProfileCompletionForm
  - Validation schema
  - User service integration
  
Afternoon (3 hours):
  - Create Dashboard layout
  - Header component + logout
  - 4 quick-access cards
  - Navigation/TabBar
  
End of day:
  - ✓ ProfileCompletion works
  - ✓ Dashboard renders
  - ✓ Can logout
```

---

### **Day 2 (Tue): Dashboard + Active Program**
```
Morning (2 hours):
  - Complete dashboard styling
  - Responsive design
  - Mobile layout
  
Afternoon (4 hours):
  - Fetch & display active program
  - ActiveProgramCard component
  - Progress bar calculation
  
End of day:
  - ✓ Dashboard fully functional
  - ✓ Active program displays (if exists)
```

---

### **Day 3 (Wed): Exercise List + Filters**
```
Morning (3 hours):
  - ExerciseList page setup
  - Pagination logic
  - ExerciseCard component
  
Afternoon (3 hours):
  - FilterBar component
  - Muscle group + difficulty filters
  - Search input (debounced)
  
End of day:
  - ✓ Exercises display with pagination
  - ✓ Filters working
  - ✓ Search working
```

---

### **Day 4 (Thu): Exercise Details + Packages**
```
Morning (2 hours):
  - ExerciseDetail modal/page
  - Video display placeholder
  
Afternoon (4 hours):
  - PackageList page
  - PackageCard component
  - Pagination for packages
  
End of day:
  - ✓ Can view exercise details
  - ✓ Packages display correctly
```

---

### **Day 5 (Fri): Payment Flow**
```
Full day (6+ hours):
  - PaymentModal component
  - Payment submission logic
  - Idempotency-Key implementation ⚠️
  - 409 Conflict handling + auto-retry
  - Success/error handling
  - Loading states
  
End of day:
  - ✓ Payment flow works
  - ✓ Idempotency tested
  - ✓ Error handling complete
```

---

### **Day 6 (Mon W2): Programs Schedule**
```
Morning (2 hours):
  - MyPrograms page refinement
  - ScheduleView component structure
  
Afternoon (4 hours):
  - Daily exercises display (Day-1 to Day-7)
  - Accordion expand/collapse
  - Exercise row styling
  
End of day:
  - ✓ Program schedule displays
  - ✓ Can expand/collapse days
```

---

### **Day 7 (Tue): Progress Tracking**
```
Morning (2 hours):
  - ProgressForm/Modal
  - Week completion logic
  
Afternoon (2 hours):
  - Progress update API call
  - UI update after save
  - Progress bar recalculation
  
Evening (2 hours):
  - Testing complete flow
  - Bug fixes
```

---

### **Day 8-9 (Wed-Thu): Polish + Responsive Design**
```
Day 8:
  - Error handling everywhere
  - Toast notifications
  - Error boundary
  
Day 9:
  - Mobile responsive layouts
  - Tablet optimization
  - Touch-friendly UX
  - Form validation UX
```

---

### **Day 10 (Fri): Testing + Final Polish**
```
Morning:
  - Manual testing all flows
  - Bug fixes
  
Afternoon:
  - Final responsive design check
  - Performance optimization
  - Final review & deployment prep
```

---

## 🎯 **Story Points & Team Allocation**

```
If working solo (2 weeks):
  Ideal: 1 person working 8 hours/day
  Estimate: 15-20 story points
  
If 2 developers (1 week):
  Dev A: Frontend UI/Components
  Dev B: API Integration/Services
  Parallel work reduces time
  
If 3+ developers:
  Dev A: Exercises + Programs
  Dev B: Packages + Payment
  Dev C: Dashboard + Navigation
```

---

## 🔍 **Definition of Done (For Each Task)**

Before marking a task complete:

- [ ] Code written and reviewed
- [ ] All acceptance criteria met
- [ ] Manual testing passed
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Responsive design checked
- [ ] No console errors/warnings
- [ ] TypeScript: No `any` types
- [ ] API calls tested with mock data
- [ ] Error scenarios tested (404, 500, timeout, etc.)

---

## 🚨 **Critical Checkpoints**

| Checkpoint | Day | What | Why |
|-----------|-----|------|-----|
| **Profile Completion** | Day 1 | ✓ Works | Gate to dashboard |
| **Dashboard** | Day 2 | ✓ Works | Main navigation hub |
| **Exercises List** | Day 3 | ✓ Works | Showcase API data |
| **Payment Idempotency** | Day 5 | ✓ Verified | Prevent double charge ⚠️ |
| **Programs Display** | Day 7 | ✓ Works | Complete user journey |
| **Error Handling** | Day 8 | ✓ Comprehensive | User experience |

---

## 📊 **Progress Tracking Template**

```
Weekly Status:
┌─────────────────────────────────────────────┐
│ Week 1: Auth + Core Features                │
├─────────────────────────────────────────────┤
│ Profile Completion       ████████░░ 80%     │
│ Dashboard              ████████████ 100%    │
│ Exercises List         ██████░░░░░░ 60%     │
│ Packages               ██░░░░░░░░░░ 20%     │
│ Payment                ░░░░░░░░░░░░  0%     │
├─────────────────────────────────────────────┤
│ Total:                 ████████░░░░ 52%     │
└─────────────────────────────────────────────┘

Blockers:
- None

Next steps:
- Complete Payment flow
- Start Programs display
```

---

## 🔧 **Technical Debt & Future Tasks**

```
Must-do:
- [ ] Form validation (React Hook Form + Zod)
- [ ] Error boundary component
- [ ] Toast notification system
- [ ] Loading skeleton loaders

Nice-to-have (Post-MVP):
- [ ] User can create custom programs
- [ ] Nutrition plan display
- [ ] Workout logging
- [ ] Progress analytics charts
- [ ] Social features (friend requests, etc.)
- [ ] Push notifications
- [ ] Offline mode
- [ ] Dark theme
```

---

## 📞 **Blockers & Support**

**If stuck on:**

| Issue | Who to Ask | What Info |
|-------|-----------|-----------|
| API response format differs from openapi.json | BE team | "The /api/exercises response doesn't match schema" |
| Payment keeps failing | BE team | "409 Conflict - is Retry-After working?" |
| Token not refreshing | BE team | "Is /api/auth/refresh endpoint implemented?" |
| Filter params not working | BE team | "Does /api/exercises accept &muscleGroup param?" |

---

## ✅ **Final Checklist Before Release**

- [ ] All features implemented
- [ ] All tests passing
- [ ] No console errors
- [ ] Mobile responsive ✓
- [ ] Touch-friendly UI ✓
- [ ] Error handling complete ✓
- [ ] Loading states everywhere ✓
- [ ] Idempotency verified ✓
- [ ] Token refresh working ✓
- [ ] All flows tested manually ✓
- [ ] Code reviewed ✓
- [ ] Performance acceptable ✓
- [ ] Ready for QA/staging ✓

---

**Estimated Total Time:** 10 days (2 weeks with one developer)

**Next Steps:** Start with Task 1.1 (Profile Completion)

Good luck! 🚀
