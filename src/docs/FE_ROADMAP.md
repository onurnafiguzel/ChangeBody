# ChangeMind FE - Detaylı Yol Haritası

**Referans:** 
- `docs/AUTH_GUIDE.md` - BE authentication & authorization
- `openapi.json` - Complete API specification

---

## 📋 **Prooje Özeti**

- **Framework:** React.js + TypeScript
- **Auth:** JWT (15 min access, 7 day refresh)
- **API Base:** `http://localhost:5000` (dev) | `https://api.changemind.com` (prod)
- **Roles:** User, Coach, Admin

---

## 🎯 **User Flow (Adım Adım)**

```
┌─────────────┐
│   Auth      │
│  (1. Adım)  │
└──────┬──────┘
       │ Signup/Login
       ↓
┌─────────────────────────────┐
│   Profile Completion         │
│   (2. Adım - Onboarding)     │
│ - firstName, lastName        │
│ - age, height, weight        │
│ - gender, fitnessGoal        │
│ - fitnessLevel               │
└──────┬──────────────────────┘
       │ Profile Complete
       ↓
┌─────────────────────────────┐
│   Dashboard (Home)           │
│   (3. Adım)                  │
│ - Quick access cards         │
│ - Active program (if any)    │
└──────┬──────────────────────┘
       │
       ├─→ Exercises List  (4. Adım)
       ├─→ Packages List   (5. Adım)
       ├─→ My Programs     (6. Adım)
       └─→ Profile Edit
```

---

## 📁 **Project Folder Structure**

```
src/
├── pages/
│   ├── auth/
│   │   ├── Login.tsx              # POST /api/auth/login
│   │   └── Signup.tsx             # POST /api/auth/signup
│   │
│   ├── onboarding/
│   │   └── ProfileCompletion.tsx   # PATCH /api/users/{id}/complete-profile
│   │
│   ├── dashboard/
│   │   └── Dashboard.tsx           # Main hub (GET /api/users/{id}/active-program)
│   │
│   ├── exercises/
│   │   ├── ExerciseList.tsx       # GET /api/exercises (with filters)
│   │   └── ExerciseDetail.tsx     # GET /api/exercises/{id}
│   │
│   ├── packages/
│   │   ├── PackageList.tsx        # GET /api/packages
│   │   ├── PackageDetail.tsx      # GET /api/packages/{id}
│   │   └── PaymentPage.tsx        # POST /api/payments (with Idempotency-Key)
│   │
│   ├── programs/
│   │   ├── MyPrograms.tsx         # GET /api/users/{id}/active-program
│   │   ├── ProgramDetail.tsx      # Display coach-assigned program
│   │   └── CreateCustomProgram.tsx# User creates own program (Future)
│   │
│   └── profile/
│       └── UserProfile.tsx        # PUT /api/users/{id}
│
├── components/
│   ├── shared/
│   │   ├── Header.tsx             # Navigation + User menu
│   │   ├── Navigation.tsx         # Tab/Sidebar navigation
│   │   ├── ProtectedRoute.tsx     # Auth guard (check token + role)
│   │   └── LoadingSpinner.tsx
│   │
│   ├── forms/
│   │   ├── ProfileCompletionForm.tsx
│   │   ├── PaymentForm.tsx
│   │   └── ProgramForm.tsx (future)
│   │
│   ├── cards/
│   │   ├── ExerciseCard.tsx
│   │   ├── PackageCard.tsx
│   │   ├── DashboardCard.tsx
│   │   └── ProgramCard.tsx
│   │
│   └── modals/
│       ├── PaymentModal.tsx       # Confirm payment + Idempotency
│       └── ConfirmDialog.tsx
│
├── hooks/
│   ├── useAuth.ts                 # Auth context consumer
│   ├── useApi.ts                  # Generic API call hook
│   ├── useFetch.ts                # Fetch + Loading + Error
│   └── useTokenRefresh.ts         # Token refresh logic
│
├── context/
│   ├── AuthContext.tsx            # User, tokens, auth state
│   ├── UserContext.tsx            # Active program, profile
│   └── ErrorContext.tsx           # Global error handling
│
├── services/
│   ├── api.client.ts              # Axios instance + interceptors
│   ├── auth.service.ts            # /api/auth/* endpoints
│   ├── user.service.ts            # /api/users/* endpoints
│   ├── exercise.service.ts        # /api/exercises/* endpoints
│   ├── package.service.ts         # /api/packages/* endpoints
│   ├── program.service.ts         # /api/training-programs/* endpoints
│   └── payment.service.ts         # /api/payments/* with idempotency
│
├── types/
│   ├── api.types.ts               # Request/Response types
│   ├── auth.types.ts              # Auth-related types
│   ├── user.types.ts              # UserDto, CompleteProfileRequest
│   ├── exercise.types.ts          # ExerciseDto
│   ├── package.types.ts           # PackageDto
│   ├── program.types.ts           # TrainingProgramDto
│   ├── payment.types.ts           # PaymentDto
│   └── common.types.ts            # Shared enums (fitnessLevel, muscleGroup)
│
├── utils/
│   ├── tokenManager.ts            # localStorage token handling
│   ├── jwtDecoder.ts              # Decode JWT for debugging
│   ├── errorHandler.ts            # Parse API errors
│   └── validators.ts              # Form validation
│
├── constants/
│   ├── api.constants.ts           # API URLs, timeouts
│   ├── enums.ts                   # FitnessLevel, Gender, MuscleGroup
│   └── messages.ts                # Toast/error messages
│
├── App.tsx                        # Main app + routing
├── index.tsx                      # Entry point
└── docs/
    ├── AUTH_GUIDE.md              # (Reference from BE)
    └── openapi.json               # (Reference from BE)
```

---

## 🔐 **Authentication Flow (Detailed)**

### 1️⃣ **Signup (Auto-Login)**

**File:** `src/pages/auth/Signup.tsx`

```typescript
// Request (user form input)
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePassword123!" // min 8 chars
}

// Response (201 Created)
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "User",
  "accessToken": "eyJ...",           // 15 min TTL
  "refreshToken": "eyJ...",          // 7 day TTL
  "expiresIn": 900
}

// Action: Save tokens → Redirect to ProfileCompletion
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
localStorage.setItem('userId', userId);
localStorage.setItem('role', role);
localStorage.setItem('tokenExpiry', Date.now() + expiresIn * 1000);

// Check: if (!profileComplete) → /onboarding/profile-completion
```

---

### 2️⃣ **Login**

**File:** `src/pages/auth/Login.tsx`

```typescript
// Same flow as Signup
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

// Response: Same as signup
// Then:
// - If profileComplete → /dashboard
// - Else → /onboarding/profile-completion
```

---

### 3️⃣ **Token Refresh (Auto)**

**File:** `src/hooks/useTokenRefresh.ts`

```typescript
// Strategy: Proactive + Reactive

// Proactive: Check expiry before every request
if (Date.now() > tokenExpiry - 60000) {
  // Refresh 1 min before expiry
  POST /api/auth/refresh (not yet in openapi.json, coming soon)
  {
    "refreshToken": localStorage.getItem('refreshToken')
  }
  // Response:
  {
    "accessToken": "new_jwt...",
    "expiresIn": 900
  }
}

// Reactive: On 401 response
// API Interceptor catches 401 → auto-refresh → retry request
```

---

### 4️⃣ **Protected Routes**

**File:** `src/components/shared/ProtectedRoute.tsx`

```typescript
function ProtectedRoute({ element, requiredRole = 'User' }) {
  const { isAuthorized, userRole } = useAuth();
  
  if (!isAuthorized()) {
    return <Navigate to="/login" />;
  }
  
  if (!hasRole(userRole, requiredRole)) {
    return <Navigate to="/access-denied" />;
  }
  
  return element;
}

// Usage:
<Route 
  path="/dashboard" 
  element={<ProtectedRoute element={<Dashboard />} requiredRole="User" />}
/>
```

---

## 📝 **Step-by-Step User Screens**

### **Step 1️⃣ : Profile Completion (Onboarding)**

**File:** `src/pages/onboarding/ProfileCompletion.tsx`

**API:**
```
PATCH /api/users/{userId}/complete-profile
Authorization: Bearer {accessToken}

Request:
{
  "firstName": "John",
  "lastName": "Doe",
  "age": 30,                    // min 13, max 120
  "height": 180,                // cm
  "weight": 75,                 // kg
  "gender": "Male",             // Male | Female | Other
  "fitnessGoal": "Muscle Gain",
  "fitnessLevel": "Intermediate" // Beginner | Intermediate | Advanced
}

Response (200 OK):
{
  "id": "...",
  "email": "...",
  "firstName": "John",
  "lastName": "Doe",
  "age": 30,
  "height": 180,
  "weight": 75,
  "gender": "Male",
  "fitnessGoal": "Muscle Gain",
  "fitnessLevel": "Intermediate",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

**Form Fields:**
```typescript
interface CompleteProfileRequest {
  firstName: string;        // required, min 1
  lastName: string;         // required, min 1
  age: number;              // required, 13-120
  height: number;           // required, cm (decimal)
  weight: number;           // required, kg (decimal)
  gender: "Male" | "Female" | "Other"; // required
  fitnessGoal: string;      // required (examples: "Muscle Gain", "Fat Loss", "General Health")
  fitnessLevel: "Beginner" | "Intermediate" | "Advanced"; // required
}
```

**UI Components Needed:**
- Text inputs: firstName, lastName
- Number inputs: age, height, weight
- Select: gender, fitnessLevel
- Select/Autocomplete: fitnessGoal
- Submit button (disabled until all fields filled)
- Error messages

---

### **Step 2️⃣ : Dashboard (Home)**

**File:** `src/pages/dashboard/Dashboard.tsx`

**API Calls:**
```typescript
// 1. Get current user profile
GET /api/users/{userId}
Authorization: Bearer {accessToken}

// 2. Get active program (if assigned by coach)
GET /api/users/{userId}/active-program
Authorization: Bearer {accessToken}
Response:
{
  "id": "...",
  "name": "12-Week Strength Program",
  "description": "...",
  "durationWeeks": 12,
  "coachName": "John Coach",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-03-25T00:00:00Z",
  "difficulty": "Intermediate",
  "status": "InProgress",      // InProgress | Completed
  "dailyExercises": { 
    "Day-1": [ ... ],
    "Day-2": [ ... ]
  }
}
```

**Dashboard Layout:**
```
┌──────────────────────────────────────────┐
│ Header: "Welcome, John Doe"              │
├──────────────────────────────────────────┤
│ 📊 Active Program (if exists)            │
│ ┌────────────────────────────────────┐   │
│ │ 12-Week Strength Program           │   │
│ │ Coach: John Coach                  │   │
│ │ Progress: Week 5/12 ████░░░░░░░░░ │   │
│ │ [View Details] [Continue]          │   │
│ └────────────────────────────────────┘   │
├──────────────────────────────────────────┤
│ 🎯 Quick Access (4 Cards)                │
│                                          │
│ ┌──────────┐ ┌──────────┐               │
│ │ 💪       │ │ 📚       │               │
│ │Exercises │ │ Packages │               │
│ │ Explore  │ │  Explore │               │
│ └──────────┘ └──────────┘               │
│                                          │
│ ┌──────────┐ ┌──────────┐               │
│ │ 📋       │ │ 👤       │               │
│ │ Programs │ │ Profile  │               │
│ │   View   │ │   Edit   │               │
│ └──────────┘ └──────────┘               │
├──────────────────────────────────────────┤
│ 📌 Statistics (Optional)                 │
│ Current Weight: 75 kg | Height: 180 cm  │
└──────────────────────────────────────────┘
```

---

### **Step 3️⃣ : Exercises List**

**File:** `src/pages/exercises/ExerciseList.tsx`

**API:**
```typescript
GET /api/exercises
Authorization: Bearer {accessToken} (optional for public read)

Query Params:
- page=1 (default)
- pageSize=10 (default)

Response:
{
  "items": [
    {
      "id": "uuid",
      "name": "Bench Press",
      "muscleGroup": "Chest",            // Chest | Back | Shoulders | ...
      "difficultyLevel": "Intermediate",  // Beginner | Intermediate | Advanced
      "description": "Classic chest exercise...",
      "videoUrl": "https://...",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    ...
  ],
  "totalCount": 150,
  "pageSize": 10,
  "currentPage": 1
}
```

**Features:**
- List all exercises (paginated)
- **Filters:**
  - Muscle Group: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Legs, Glutes, Core, Cardio
  - Difficulty: Beginner, Intermediate, Advanced
  - Search: Exercise name
- **Display:**
  - Exercise card with name, muscle group, difficulty badge
  - Click to see details (description, video)
- **Pagination:** Load more or page buttons

**Types:**
```typescript
export interface ExerciseDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  difficultyLevel: DifficultyLevel;
  description?: string;
  videoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export enum MuscleGroup {
  Chest = "Chest",
  Back = "Back",
  Shoulders = "Shoulders",
  Biceps = "Biceps",
  Triceps = "Triceps",
  Forearms = "Forearms",
  Legs = "Legs",
  Glutes = "Glutes",
  Core = "Core",
  Cardio = "Cardio"
}
```

---

### **Step 4️⃣ : Packages List**

**File:** `src/pages/packages/PackageList.tsx`

**API:**
```typescript
GET /api/packages
(Public - no auth required)

Query Params:
- page=1
- pageSize=10

Response:
{
  "items": [
    {
      "id": "uuid",
      "name": "Basic Package",
      "description": "Perfect for beginners...",
      "price": 49.99,
      "durationDays": 30,
      "type": "Basic",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Premium Package",
      "description": "Includes coach support...",
      "price": 99.99,
      "durationDays": 30,
      "type": "Premium",
      "isActive": true
    },
    ...
  ],
  "totalCount": 3
}
```

**Package Types (Examples):**
- **Basic:** Self-guided exercises, no coach
- **Premium:** Includes coach-created program + nutrition plan
- **Elite:** Full support, personalized coaching

**UI:**
```
┌─────────────────────────────────────────┐
│ 📦 Choose Your Package                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Basic        │  │ Premium      │   │
│  │ $49.99/month │  │ $99.99/month │   │
│  │              │  │              │   │
│  │ • 30-day ... │  │ • Coach prog │   │
│  │              │  │ • Nutrition  │   │
│  │ [Select]     │  │ [Select]     │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌──────────────┐                       │
│  │ Elite        │                       │
│  │ $199.99/month                       │
│  │              │                       │
│  │ • All above  │                       │
│  │ • 1-on-1 sup │                       │
│  │ [Select]     │                       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

**Types:**
```typescript
export interface PackageDto {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  type: string; // "Basic", "Premium", "Elite"
  isActive: boolean;
  createdAt: Date;
}
```

---

### **Step 5️⃣ : Payment (Package Purchase)**

**File:** `src/pages/packages/PaymentPage.tsx`

**API:**
```typescript
POST /api/payments
Authorization: Bearer {accessToken}

Headers:
  Idempotency-Key: {UUID} // ⚠️ CRITICAL: New UUID each time to prevent duplicate charges

Request:
{
  "userId": "{currentUserId}",
  "packageId": "{selectedPackageId}",
  "description": "Premium Package - 30 days"
}

Response (200 OK):
{
  "success": true,
  "paymentId": "payment-uuid",
  "message": "Payment processed successfully"
}

Response Headers:
  X-Idempotent-Replayed: true | false
  // true = response from cache (duplicate call), false = newly processed

Errors:
  409 Conflict: Payment in-flight (locked)
    Retry-After: 5  // Wait 5 seconds
```

**Payment Flow:**
```
1. User selects package
2. Click "Purchase"
3. Show PaymentModal (confirmation)
4. Generate Idempotency-Key (UUID) → POST /api/payments
5. Handle responses:
   - 200 OK: Show success → Assign coach → Redirect to dashboard
   - 409 Conflict: Retry after Retry-After seconds
   - 400/401/etc: Show error, don't retry
```

**⚠️ Idempotency Key Implementation:**

```typescript
// src/services/payment.service.ts
import { v4 as uuidv4 } from 'uuid';

export async function processPayment(
  userId: string, 
  packageId: string
): Promise<PaymentResponse> {
  const idempotencyKey = uuidv4(); // 🔴 NEW UUID each time!

  const response = await apiClient.post(
    '/api/payments',
    {
      userId,
      packageId,
      description: `Package Purchase - ${packageId}`
    },
    {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    }
  );

  return response.data; // { success, paymentId, message }
}
```

**Important Notes:**
- ✅ Generate **NEW UUID** for each payment attempt
- ✅ Same UUID = idempotent (no duplicate charge)
- ✅ Different UUID = new payment
- ✅ On 409: Respect `Retry-After` header before retrying
- ✅ After successful payment → **Assign coach program** (next API call from BE)

---

### **Step 6️⃣ : My Programs**

**File:** `src/pages/programs/MyPrograms.tsx`

**API Calls:**

#### A. Get Active Program (Coach-Assigned)
```typescript
GET /api/users/{userId}/active-program
Authorization: Bearer {accessToken}

Response:
{
  "id": "program-uuid",
  "name": "12-Week Strength Building",
  "description": "...",
  "durationWeeks": 12,
  "coachName": "Coach John Smith",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-03-25T00:00:00Z",
  "difficulty": "Intermediate",
  "status": "InProgress",
  "dailyExercises": {
    "Day-1": [
      {
        "exerciseId": "ex-uuid",
        "sets": 4,
        "reps": "8-10",
        "explanation": "Heavy weight, focus on form"
      },
      {
        "exerciseId": "ex-uuid-2",
        "sets": 3,
        "reps": "10-12",
        "explanation": "Control the movement"
      }
    ],
    "Day-2": [
      // Rest day or cardio
    ],
    ...
  }
}
```

#### B. Update Progress (Track Weeks Completed)
```typescript
PUT /api/training-programs/{programId}/progress
Authorization: Bearer {accessToken}

Request:
{
  "completedWeeks": 5  // User completed week 5
}

Response:
{
  "success": true,
  "message": "Progress updated"
}
```

**UI Layout:**
```
┌──────────────────────────────────────────┐
│ 📋 My Programs                           │
├──────────────────────────────────────────┤
│                                          │
│ ✅ ACTIVE PROGRAM                        │
│ ┌────────────────────────────────────┐   │
│ │ 12-Week Strength Building          │   │
│ │ Coach: John Smith                  │   │
│ │ Status: In Progress                │   │
│ │ Progress: ████████░░░░░░░░░ 5/12   │   │
│ │                                    │   │
│ │ 📅 Start: Jan 1, 2024              │   │
│ │ 📅 End: Mar 25, 2024               │   │
│ │                                    │   │
│ │ 💪 Difficulty: Intermediate        │   │
│ │                                    │   │
│ │ [View Detailed Schedule]           │   │
│ │ [Log Progress]                     │   │
│ │ [Message Coach]                    │   │
│ └────────────────────────────────────┘   │
│                                          │
│ 📌 WEEKLY SCHEDULE (Expandable)          │
│ ┌────────────────────────────────────┐   │
│ │ Day-1 (Monday): Push Day           │   │
│ │  • Bench Press - 4x8-10            │   │
│ │  • Incline Dumbbell - 3x10-12      │   │
│ │  • Tricep Dips - 3x8-10            │   │
│ │ [Details]                          │   │
│ │                                    │   │
│ │ Day-2 (Tuesday): Pull Day          │   │
│ │  • Barbell Rows - 4x8-10           │   │
│ │  • Pull-ups - 3xAMRAP              │   │
│ │  • Lat Pulldown - 3x10-12          │   │
│ │ [Details]                          │   │
│ │                                    │   │
│ │ ...more days...                    │   │
│ │                                    │   │
│ │ Day-7 (Sunday): Rest               │   │
│ └────────────────────────────────────┘   │
│                                          │
│ 🎯 (Future) Custom Programs             │
│ [Create Your Own Program]               │
└──────────────────────────────────────────┘
```

**Types:**
```typescript
export interface ActiveProgramDetailDto {
  id: string;
  name: string;
  description?: string;
  durationWeeks: number;
  coachName: string;
  startDate?: Date;
  endDate?: Date;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  status: "InProgress" | "Completed";
  dailyExercises?: Record<string, ProgramExerciseDetail[]>;
}

export interface ProgramExerciseDetail {
  exerciseId: string;
  sets: number;
  reps: string; // "8-10", "AMRAP", etc.
  explanation?: string;
}
```

---

## 🛠️ **Core Services Implementation**

### **1. API Client Setup**

**File:** `src/services/api.client.ts`

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

interface CustomAxiosError extends AxiosError {
  config: InternalAxiosRequestConfig & {
    _retry?: boolean;
  };
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add JWT Token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response Interceptor: Handle 401 + Auto-Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: CustomAxiosError) => {
    const originalRequest = error.config;

    // 401 Unauthorized + Not yet retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/api/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, expiresIn } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('tokenExpiry', 
          (Date.now() + expiresIn * 1000).toString()
        );

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed → Logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### **2. Auth Service**

**File:** `src/services/auth.service.ts`

```typescript
import apiClient from './api.client';
import { AuthTokenResponse } from '../types/auth.types';

export const authService = {
  signup: async (email: string, password: string): Promise<AuthTokenResponse> => {
    const response = await apiClient.post('/api/auth/signup', {
      email,
      password,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthTokenResponse> => {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> => {
    const response = await apiClient.post('/api/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  logout: (): void => {
    localStorage.clear();
  },
};
```

---

### **3. User Service**

**File:** `src/services/user.service.ts`

```typescript
import apiClient from './api.client';
import { UserDto, CompleteProfileRequest } from '../types/user.types';

export const userService = {
  getProfile: async (userId: string): Promise<UserDto> => {
    const response = await apiClient.get(`/api/users/${userId}`);
    return response.data;
  },

  completeProfile: async (
    userId: string,
    data: CompleteProfileRequest
  ): Promise<UserDto> => {
    const response = await apiClient.patch(
      `/api/users/${userId}/complete-profile`,
      data
    );
    return response.data;
  },

  updateProfile: async (userId: string, data: Partial<UserDto>): Promise<UserDto> => {
    const response = await apiClient.put(`/api/users/${userId}`, data);
    return response.data;
  },

  changePassword: async (
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/api/users/${userId}/change-password`, {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};
```

---

### **4. Exercise Service**

**File:** `src/services/exercise.service.ts`

```typescript
import apiClient from './api.client';
import { ExerciseDto } from '../types/exercise.types';

interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export const exerciseService = {
  listExercises: async (
    page: number = 1,
    pageSize: number = 10,
    filters?: { muscleGroup?: string; difficultyLevel?: string }
  ): Promise<PagedResponse<ExerciseDto>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters?.muscleGroup) {
      params.append('muscleGroup', filters.muscleGroup);
    }
    if (filters?.difficultyLevel) {
      params.append('difficultyLevel', filters.difficultyLevel);
    }

    const response = await apiClient.get(`/api/exercises?${params.toString()}`);
    return response.data;
  },

  getExercise: async (exerciseId: string): Promise<ExerciseDto> => {
    const response = await apiClient.get(`/api/exercises/${exerciseId}`);
    return response.data;
  },
};
```

---

### **5. Package Service**

**File:** `src/services/package.service.ts`

```typescript
import apiClient from './api.client';
import { PackageDto } from '../types/package.types';

interface PagedResponse<T> {
  items: T[];
  totalCount: number;
}

export const packageService = {
  listPackages: async (page: number = 1, pageSize: number = 10): Promise<PagedResponse<PackageDto>> => {
    const response = await apiClient.get('/api/packages', {
      params: { page, pageSize },
    });
    return response.data;
  },

  getPackage: async (packageId: string): Promise<PackageDto> => {
    const response = await apiClient.get(`/api/packages/${packageId}`);
    return response.data;
  },
};
```

---

### **6. Payment Service (⚠️ WITH IDEMPOTENCY)**

**File:** `src/services/payment.service.ts`

```typescript
import apiClient from './api.client';
import { v4 as uuidv4 } from 'uuid';
import { ProcessPaymentRequest, PaymentProcessResponse } from '../types/payment.types';

export const paymentService = {
  processPayment: async (
    userId: string,
    packageId: string,
    description?: string
  ): Promise<PaymentProcessResponse> => {
    const idempotencyKey = uuidv4(); // ⚠️ CRITICAL: New UUID each call

    const payload: ProcessPaymentRequest = {
      userId,
      packageId,
      ...(description && { description }),
    };

    const response = await apiClient.post('/api/payments', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });

    return response.data;
  },

  getPayment: async (paymentId: string): Promise<any> => {
    const response = await apiClient.get('/api/payments', {
      params: { id: paymentId },
    });
    return response.data;
  },
};
```

---

### **7. Program Service**

**File:** `src/services/program.service.ts`

```typescript
import apiClient from './api.client';
import { ActiveProgramDetailDto } from '../types/program.types';

export const programService = {
  getActiveProgram: async (userId: string): Promise<ActiveProgramDetailDto | null> => {
    try {
      const response = await apiClient.get(`/api/users/${userId}/active-program`);
      return response.data;
    } catch (error: any) {
      // 404 = no active program
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  updateProgress: async (
    programId: string,
    completedWeeks: number
  ): Promise<{ success: boolean }> => {
    const response = await apiClient.put(
      `/api/training-programs/${programId}/progress`,
      { completedWeeks }
    );
    return response.data;
  },
};
```

---

## 📚 **Type Definitions**

### **auth.types.ts**

```typescript
export interface AuthTokenResponse {
  userId: string;
  email: string;
  role: "User" | "Coach" | "Admin";
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}
```

### **user.types.ts**

```typescript
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  gender?: "Male" | "Female" | "Other";
  fitnessGoal?: string;
  fitnessLevel?: "Beginner" | "Intermediate" | "Advanced";
  createdAt: Date;
}

export interface CompleteProfileRequest {
  firstName: string;
  lastName: string;
  age: number;
  height: number;
  weight: number;
  gender: "Male" | "Female" | "Other";
  fitnessGoal: string;
  fitnessLevel: "Beginner" | "Intermediate" | "Advanced";
}
```

### **exercise.types.ts**

```typescript
export enum MuscleGroup {
  Chest = "Chest",
  Back = "Back",
  Shoulders = "Shoulders",
  Biceps = "Biceps",
  Triceps = "Triceps",
  Forearms = "Forearms",
  Legs = "Legs",
  Glutes = "Glutes",
  Core = "Core",
  Cardio = "Cardio",
}

export enum DifficultyLevel {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
}

export interface ExerciseDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  difficultyLevel: DifficultyLevel;
  description?: string;
  videoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
```

### **package.types.ts**

```typescript
export interface PackageDto {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  type: string; // "Basic", "Premium", "Elite"
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
```

### **program.types.ts**

```typescript
export interface ActiveProgramDetailDto {
  id: string;
  name: string;
  description?: string;
  durationWeeks: number;
  coachName: string;
  startDate?: Date;
  endDate?: Date;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  status: "InProgress" | "Completed";
  dailyExercises?: Record<string, ProgramExerciseDetail[]>;
}

export interface ProgramExerciseDetail {
  exerciseId: string;
  sets: number;
  reps: string; // "8-10", "AMRAP", etc.
  explanation?: string;
}
```

### **payment.types.ts**

```typescript
export interface ProcessPaymentRequest {
  userId: string;
  packageId: string;
  description?: string;
}

export interface PaymentProcessResponse {
  success: boolean;
  paymentId: string;
  message?: string;
}

export interface PaymentDto {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  status: "Pending" | "Completed" | "Failed" | "Cancelled";
  transactionId?: string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

---

## 🔄 **Authentication Context (AuthContext)**

**File:** `src/context/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthTokenResponse } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: AuthTokenResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthTokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role') as any;

    if (accessToken && userId && email) {
      setUser({
        userId,
        email,
        role,
        accessToken,
        refreshToken: localStorage.getItem('refreshToken') || '',
        expiresIn: 900,
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      setUser(response);

      // Store in localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('email', response.email);
      localStorage.setItem('role', response.role);
      localStorage.setItem(
        'tokenExpiry',
        (Date.now() + response.expiresIn * 1000).toString()
      );

      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.signup(email, password);
      setUser(response);

      // Store tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('email', response.email);
      localStorage.setItem('role', response.role);
      localStorage.setItem(
        'tokenExpiry',
        (Date.now() + response.expiresIn * 1000).toString()
      );

      // Redirect to profile completion
      navigate('/onboarding/profile-completion');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Signup failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    localStorage.clear();
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 🚀 **Development Roadmap (Priority Order)**

### **Phase 1: Auth & Infrastructure (Week 1)**
- [ ] Setup React Router + TypeScript
- [ ] Create API client with axios + interceptors
- [ ] Implement AuthContext + token storage
- [ ] Create Login/Signup pages
- [ ] Create ProtectedRoute component
- [ ] Setup environment variables

### **Phase 2: Onboarding (Week 1-2)**
- [ ] Build ProfileCompletion form
- [ ] Integrate `/api/users/{id}/complete-profile`
- [ ] Add redirect logic (profile incomplete → onboarding)
- [ ] Form validation

### **Phase 3: Dashboard & Navigation (Week 2)**
- [ ] Create Dashboard layout
- [ ] Build quick-access cards
- [ ] Display active program (if exists)
- [ ] Create responsive header/navigation

### **Phase 4: Exercises (Week 2-3)**
- [ ] Build ExerciseList with pagination
- [ ] Add filters (muscle group, difficulty)
- [ ] Create ExerciseCard component
- [ ] Build ExerciseDetail page
- [ ] Add search functionality

### **Phase 5: Packages & Payments (Week 3-4)**
- [ ] Build PackageList page
- [ ] Create PackageCard component
- [ ] Build PaymentModal with idempotency logic
- [ ] Integrate payment flow
- [ ] Add success/error handling
- [ ] **Verify idempotency-key implementation**

### **Phase 6: Programs (Week 4-5)**
- [ ] Build MyPrograms page
- [ ] Display coach-assigned program
- [ ] Show weekly schedule (Day-1, Day-2, etc.)
- [ ] Add progress tracking UI
- [ ] Integrate `/api/training-programs/{id}/progress`

### **Phase 7: Polish & Testing (Week 5-6)**
- [ ] Error handling & toast notifications
- [ ] Loading states
- [ ] Form validation
- [ ] Mobile responsiveness
- [ ] E2E testing (Cypress/Playwright)
- [ ] Performance optimization

---

## 🧪 **Testing Checklist**

- [ ] Test signup → redirects to profile completion
- [ ] Test profile completion with validation
- [ ] Test token refresh on 401
- [ ] Test protected routes (redirect if not authenticated)
- [ ] Test exercise filtering (by muscle group, difficulty)
- [ ] Test package selection & payment flow
- [ ] **Test payment idempotency:** 
  - Same UUID = no duplicate charge ✅
  - Different UUID = new charge ✅
- [ ] Test 409 Conflict + Retry-After header
- [ ] Test program display & progress update
- [ ] Test logout + token clearing

---

## 📞 **Backend API Reference**

**Location:** `docs/openapi.json`

**Key Endpoints (For Users):**
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `PATCH /api/users/{id}/complete-profile` - Update profile
- `GET /api/users/{id}` - Get user
- `GET /api/exercises` - List exercises
- `GET /api/packages` - List packages
- `POST /api/payments` - Process payment ⚠️ **Idempotency-Key required**
- `GET /api/users/{userId}/active-program` - Get assigned program
- `PUT /api/training-programs/{id}/progress` - Update progress

---

## 🔐 **Security Notes**

1. **Token Storage:**
   - `accessToken` → localStorage (short-lived, acceptable)
   - `refreshToken` → httpOnly cookie (ideal) or localStorage
   - `tokenExpiry` → localStorage (for client-side checks)

2. **HTTPS Only:**
   - All tokens transmitted over HTTPS in production
   - API enforces HTTPS

3. **Idempotency:**
   - Payment endpoint MUST include `Idempotency-Key` header
   - New UUID each payment attempt
   - Same UUID = cached response (no duplicate charge)

4. **CORS:**
   - Frontend origin must be whitelisted in API CORS config

5. **Rate Limiting:**
   - API enforces rate limits per endpoint
   - Handle 429 responses gracefully

---

## 📚 **References**

- **AUTH_GUIDE.md** - Detailed authentication flow, JWT claims, idempotency
- **openapi.json** - Complete API specification with all endpoints

---

**Happy Coding! 🚀**
