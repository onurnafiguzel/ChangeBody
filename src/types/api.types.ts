/**
 * AUTO-GENERATED TYPE DEFINITIONS
 * Source: openapi.json (BE API Specification)
 * 
 * ❌ MANUEL EDIT YAPMAYıN - Şemaları openapi.json'den kopyalandı
 * Eğer API değişirse, BE ekibinden güncellenmiş openapi.json'i talep edin
 */

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface SignupRequest {
  email: string; // format: email, required
  password: string; // format: password, minLength: 8, required
}

export interface LoginRequest {
  email: string; // format: email, required
  password: string; // format: password, minLength: 8, required
}

export interface AuthTokenResponse {
  userId: string; // UUID
  email: string; // format: email
  role: "User" | "Coach" | "Admin"; // required
  accessToken: string; // JWT (15 min validity)
  refreshToken: string; // JWT (7 day validity)
  expiresIn: number; // seconds (900 = 15 minutes)
}

export interface ChangePasswordRequest {
  currentPassword: string; // format: password, required
  newPassword: string; // format: password, minLength: 8, required
}

// ============================================================================
// USER TYPES
// ============================================================================

// BE: required artık sadece firstName + lastName; diğer her şey opsiyonel/nullable.
export interface CompleteProfileRequest {
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  gender?: "Male" | "Female" | "Other" | null;
  fitnessGoalId?: string | null; // UUID
  fitnessLevel?: "Beginner" | "Intermediate" | "Advanced" | null;
  // ─── Yaşam tarzı & sağlık (opsiyonel) ─────────────────────────────
  dailyWorkLifestyle?: string | null;      // max 2000
  gymDaysPerWeek?: number | null;          // 0-7
  healthConditions?: string | null;        // max 2000
  foodAllergies?: string | null;           // max 2000
  supplementInterest?: string | null;      // max 2000
  wantsSupplementSupport?: boolean | null;
}

export type PhotoViewType = "Front" | "Back" | "Left" | "Right";

export interface UserPhotoDto {
  id: string;
  userId: string;
  viewType: PhotoViewType;
  imageUrl: string;   // BE: relative path (e.g. "/uploads/photos/.../front/xxx.jpg"); BASE_URL ile birleştirilmeli
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface UserHealthBlockDto {
  dailyWorkLifestyle?: string | null;
  gymDaysPerWeek?: number | null;
  healthConditions?: string | null;
  foodAllergies?: string | null;
  supplementInterest?: string | null;
  wantsSupplementSupport: boolean;
}

// PUT /api/users/{id} — tüm alanlar opsiyonel (diff güncelleme)
export interface UpdateUserRequest {
  firstName?: string;  // minLength: 1
  lastName?: string;   // minLength: 1
  age?: number;        // 13-120
  height?: number;     // decimal (cm), > 0
  weight?: number;     // decimal (kg), > 0
  gender?: "Male" | "Female" | "Other";
  fitnessGoal?: string; // FitnessGoalDto.id (UUID)
  fitnessLevel?: "Beginner" | "Intermediate" | "Advanced";
}

export interface UserDto {
  id: string; // UUID
  email: string; // format: email
  firstName: string;
  lastName: string;
  age?: number; // nullable
  height?: number; // decimal, nullable (cm)
  weight?: number; // decimal, nullable (kg)
  gender?: "Male" | "Female" | "Other"; // nullable
  fitnessGoal?: string; // nullable
  fitnessLevel?: "Beginner" | "Intermediate" | "Advanced"; // nullable
  isCompletedProfile?: boolean;
  isActive?: boolean;
  healthProfile?: UserHealthBlockDto | null;
  createdAt: string; // date-time
}

export interface UserAssignmentDto {
  id: string; // UUID
  email: string; // format: email
  firstName: string;
  lastName: string;
  age?: number; // nullable
  height?: number; // decimal, nullable
  weight?: number; // decimal, nullable
  gender?: string; // nullable
  fitnessGoal?: string; // nullable
  fitnessLevel?: "Beginner" | "Intermediate" | "Advanced"; // nullable
  createdAt: string; // date-time
  hasTrainingProgram?: boolean; // BE: true => training already assigned
  hasNutritionPlan?: boolean;   // BE: true => nutrition plan already assigned
}

export interface CreateUserRequest {
  email: string; // format: email, required
  password: string; // format: password, minLength: 8, required
  firstName: string; // minLength: 1, maxLength: 100, required
  lastName: string; // minLength: 1, maxLength: 100, required
}

// ============================================================================
// COACH TYPES
// ============================================================================

export interface CreateCoachRequest {
  email: string; // format: email, required
  password: string; // format: password, minLength: 8, required
  firstName: string; // minLength: 1, required
  lastName: string; // minLength: 1, required
  specialization: string; // e.g., "Strength", "Cardio", "Flexibility", required
}

export interface UpdateCoachRequest {
  firstName?: string; // minLength: 1
  lastName?: string; // minLength: 1
  specialization?: string;
}

export interface CoachDto {
  id: string; // UUID
  email: string; // format: email
  firstName: string;
  lastName: string;
  specialization?: string; // nullable
  isActive: boolean;
  createdAt: string; // date-time
  updatedAt?: string; // date-time, nullable
}

// GET /api/coaches/{coachId}/programs response item
export interface CoachProgramListItemDto {
  id: string; // UUID
  name: string;
  description?: string | null;
  durationWeeks: number;
  completedWeeks: number;
  progressPercentage: number; // 0-100, BE-calculated
  difficulty?: "Beginner" | "Intermediate" | "Advanced" | null;
  startDate?: string | null; // date-time
  endDate?: string | null; // date-time
  createdAt: string; // date-time
  isCompleted: boolean;
  userId: string; // assigned user UUID
  userAge?: number | null;
  userHeight?: number | null; // cm
  userWeight?: number | null; // kg
  userGender?: "Male" | "Female" | "Other" | null;
}

// ============================================================================
// PACKAGE TYPES
// ============================================================================

export interface CreatePackageRequest {
  name: string; // minLength: 1, maxLength: 200, required
  description: string; // minLength: 1, required
  price: number; // decimal, minimum: 0 (exclusive), required
  durationDays: number; // int32, minimum: 1, required
  type: string; // e.g., "Basic", "Premium", "Elite", required
}

export interface UpdatePackageRequest {
  name: string; // minLength: 1, required
  description: string; // minLength: 1, required
  price: number; // decimal, minimum: 0 (exclusive), required
  durationDays: number; // int32, minimum: 1, required
  type: string; // required
}

export interface PackageDto {
  id: string; // UUID
  name: string;
  description: string;
  price: number; // decimal
  durationDays: number; // int32
  type: string; // "Basic", "Premium", "Elite"
  isActive: boolean;
  createdAt: string; // date-time
  updatedAt?: string; // date-time, nullable
}

// ============================================================================
// EXERCISE TYPES
// ============================================================================

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

export interface CreateExerciseRequest {
  name: string; // minLength: 1, maxLength: 200, required
  muscleGroup: MuscleGroup; // enum, required
  difficultyLevel: DifficultyLevel; // enum, required
  description?: string; // nullable
  videoUrl?: string; // format: uri, nullable
}

export interface UpdateExerciseRequest {
  name: string; // minLength: 1, required
  muscleGroup: MuscleGroup; // enum, required
  difficultyLevel: DifficultyLevel; // enum, required
  description?: string; // nullable
  videoUrl?: string; // format: uri, nullable
}

export interface ExerciseDto {
  id: string; // UUID
  name: string;
  muscleGroup: MuscleGroup;
  difficultyLevel?: DifficultyLevel; // nullable
  description?: string; // nullable
  videoUrl?: string; // format: uri, nullable
  isActive: boolean;
  createdAt: string; // date-time
  updatedAt?: string; // date-time, nullable
}

// ============================================================================
// FITNESS GOAL TYPES
// ============================================================================

export interface FitnessGoalDto {
  id: string; // UUID
  name: string;
  description?: string; // nullable
  isActive: boolean;
  createdAt: string; // date-time
  updatedAt?: string; // date-time, nullable
}

export interface CreateFitnessGoalRequest {
  name: string; // minLength: 1, maxLength: 200, required
  description?: string; // nullable, maxLength: 1000
}

export interface UpdateFitnessGoalRequest {
  name?: string;
  description?: string;
}

// ============================================================================
// TRAINING PROGRAM TYPES
// ============================================================================

export interface ExerciseDetail {
  exerciseId: string; // UUID, required
  sets: number; // int32, minimum: 1, required
  reps: string; // e.g., "10-12", "8-10", "AMRAP", required
  explanation?: string; // nullable
}

export interface ProgramExerciseDetail {
  exerciseId: string; // UUID
  sets: number; // int32
  reps: string; // "8-10", "AMRAP", etc.
  explanation?: string; // nullable
}

export interface CreateTrainingProgramRequest {
  name: string; // minLength: 1, required
  description?: string; // nullable
  userId: string; // UUID, required (atanan sporcu)
  coachId: string; // UUID, required (programı oluşturan koç)
  durationWeeks: number; // int32, minimum: 1, required
  difficulty: DifficultyLevel; // enum, required
}

export interface UpdateDailyProgramRequest {
  // additionalProperties: Record<string, ExerciseDetail[]>
  // Key format: "Day-1", "Day-2", etc.
  // Example:
  // {
  //   "Day-1": [
  //     {
  //       "exerciseId": "uuid",
  //       "sets": 3,
  //       "reps": "10-12",
  //       "explanation": "Focus on form"
  //     }
  //   ]
  // }
  [dayKey: string]: ExerciseDetail[];
}

export interface UpdateProgressRequest {
  completedWeeks: number; // int32, minimum: 0, required
}

// ─── Workout Sessions ────────────────────────────────────────────────────

export interface WorkoutSetInput {
  setNumber: number;  // min 1
  weight: number;     // kg, min 0
  reps: number;       // min 1
}

export interface WorkoutExerciseInput {
  exerciseId: string; // UUID
  sets: WorkoutSetInput[]; // min 1
}

export interface CreateWorkoutSessionRequest {
  userId: string;                       // UUID
  trainingProgramId?: string | null;    // UUID, opsiyonel
  dayKey: string;                        // regex ^Day-\d+$
  recordDate: string;                    // "YYYY-MM-DD"
  exercises: WorkoutExerciseInput[];     // min 1
}

export interface WorkoutSetDto {
  setNumber: number;
  weight: number; // kg
  reps: number;
}

export interface WorkoutExerciseDto {
  exerciseId: string;
  sets: WorkoutSetDto[];
}

export interface WorkoutSessionDto {
  id: string;
  userId: string;
  trainingProgramId?: string | null;
  dayKey: string;
  recordDate: string;   // "YYYY-MM-DD"
  createdAt: string;    // ISO date-time
  exercises: WorkoutExerciseDto[];
}

export interface ActiveProgramDetailDto {
  id: string; // UUID
  name: string;
  description?: string; // nullable
  durationWeeks: number; // int32
  coachName: string; // Coach full name (FirstName + LastName)
  startDate?: string; // date-time, nullable
  endDate?: string; // date-time, nullable
  difficulty: DifficultyLevel;
  status: "InProgress" | "Completed";
  dailyExercises?: Record<string, ProgramExerciseDetail[]>; // nullable
  // Atanan sporcu bilgileri (BE programa join'leyip döndürüyor)
  userId?: string; // UUID
  userAge?: number | null;
  userHeight?: number | null; // cm
  userWeight?: number | null; // kg
  userGender?: "Male" | "Female" | "Other" | null;
}

// ============================================================================
// DASHBOARD AGGREGATE TYPES
// ============================================================================

export interface CoachSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  specialization?: string | null;
}

export interface CoachDashboardAssignedUserDto {
  userId: string;
  fullName: string;
  hasTrainingProgram: boolean;
  hasNutritionPlan: boolean;
}

export interface CoachDashboardDto {
  coach: CoachSummaryDto;
  assignedUserCount: number;
  activeProgramCount: number;
  pendingWaitingUserCount: number;
  recentPrograms: CoachProgramListItemDto[];
  assignedUsers: CoachDashboardAssignedUserDto[];
}

export interface UserDashboardProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  gender?: "Male" | "Female" | "Other" | null;
  fitnessLevel?: "Beginner" | "Intermediate" | "Advanced" | null;
  isCompletedProfile: boolean;
}

export interface PackageProgressDto {
  paymentId: string;
  packageId: string;
  packageName: string;
  startDate: string;        // ISO date-time
  endDate: string;          // ISO date-time
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  progressPercentage: number; // 0..100, BE clamped
  isExpired: boolean;
}

export interface UserDashboardDto {
  profile: UserDashboardProfileDto;
  activeTrainingProgram?: ActiveProgramDetailDto | null;
  activeNutritionPlan?: NutritionPlanDetailDto | null;
  waitingStatus?: WaitingUserStatusDto | null;
  packageProgress?: PackageProgressDto | null;
}

// ============================================================================
// NUTRITION / FOOD TYPES
// ============================================================================

export type NutritionDayType = "WorkoutDay" | "OffDay";

export type FoodUnit = "Grams" | "Piece";

export interface FoodDto {
  id: string;
  name: string;
  unit: FoodUnit;
  // unit === "Grams" ise dolu
  caloriesPer100g?: number | null;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  // unit === "Piece" ise dolu
  caloriesPerPiece?: number | null;
  proteinPerPiece?: number | null;
  carbsPerPiece?: number | null;
  fatPerPiece?: number | null;
  pieceLabel?: string | null;     // "1 adet (orta)", "1 dilim"
  gramsPerPiece?: number | null;  // bilgilendirme amaçlı
  isActive: boolean;
}

export interface MealItemInput {
  foodId: string;
  grams?: number;   // unit === "Grams" ise zorunlu
  pieces?: number;  // unit === "Piece" ise zorunlu
}

// `unit`'e göre koşullu: Grams ise *Per100g zorunlu; Piece ise *PerPiece + pieceLabel zorunlu
export interface CreateFoodRequest {
  name: string;
  unit: FoodUnit;
  caloriesPer100g?: number | null;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  caloriesPerPiece?: number | null;
  proteinPerPiece?: number | null;
  carbsPerPiece?: number | null;
  fatPerPiece?: number | null;
  pieceLabel?: string | null;
  gramsPerPiece?: number | null;
}
export type UpdateFoodRequest = CreateFoodRequest;

export interface MealInput {
  name: string;
  items: MealItemInput[];
}

export interface CreateNutritionPlanRequest {
  userId: string;
  title: string;
  description?: string | null;
  days: Partial<Record<NutritionDayType, MealInput[]>>;
}

export interface UpdateNutritionPlanRequest {
  title: string;
  description?: string | null;
  days: Partial<Record<NutritionDayType, MealInput[]>>;
}

export type MealItemQuantityUnit = "g" | "adet";

export interface MealItemDto {
  foodId: string;
  foodName: string;
  quantity: number;
  quantityUnit: MealItemQuantityUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealDto {
  name: string;
  items: MealItemDto[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface NutritionDayDto {
  dayType: NutritionDayType;
  meals: MealDto[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface NutritionPlanListItemDto {
  id: string;
  title: string;
  isActive: boolean;
  coachName: string;
  createdAt: string;
}

export interface NutritionPlanDetailDto {
  id: string;
  userId: string;
  coachId: string;
  coachName: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  versionNumber: number;
  createdAt: string;
  updatedAt?: string | null;
  days: NutritionDayDto[];
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface ProcessPaymentRequest {
  userId: string; // UUID, required
  packageId: string; // UUID, required
  amount: number; // decimal, > 0, required (BE validasyonu: "Ödeme tutarı sıfırdan büyük olmalıdır")
  description?: string; // nullable
}

export interface PaymentProcessResponse {
  success: boolean;
  paymentId: string; // UUID
  message?: string; // nullable
}

export interface PaymentDto {
  id: string; // UUID
  userId: string; // UUID
  packageId: string; // UUID
  amount: number; // decimal
  status: "Pending" | "Completed" | "Failed" | "Cancelled";
  transactionId?: string; // nullable
  description?: string; // nullable
  createdAt: string; // date-time
  updatedAt?: string; // date-time, nullable
}

// ============================================================================
// WAITING USER TYPES
// ============================================================================

export interface WaitingUserStatusDto {
  isWaitingForAssignment: boolean;
  createdAt: string; // date-time
  hasTrainingProgram?: boolean; // BE: dashboard aggregate response'unda geliyor
  hasNutritionPlan?: boolean;
}

// ============================================================================
// PAGINATION & LIST RESPONSE TYPES
// ============================================================================

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export interface PagedResultUserDto extends PagedResponse<UserDto> {}
export interface PagedResultPackageDto extends PagedResponse<PackageDto> {}
export interface PagedResultExerciseDto extends PagedResponse<ExerciseDto> {}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ProblemDetails {
  type: string; // e.g., "https://tools.ietf.org/html/rfc7807"
  title: string; // e.g., "Unauthorized", "Forbidden", "Not Found"
  status: number; // HTTP status code
  detail: string; // Error message
  instance?: string; // nullable
}

export interface ValidationProblemDetails extends ProblemDetails {
  errors?: Record<string, string[]>; // Field-level errors
  // Example:
  // {
  //   "age": ["Age must be between 13 and 120"],
  //   "email": ["Email is already registered"]
  // }
}

// ============================================================================
// CUSTOM TYPES (FE-ONLY, not in openapi.json)
// ============================================================================

export interface AuthContextType {
  user: AuthTokenResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface UserContextType {
  profile: UserDto | null;
  activeProgram: ActiveProgramDetailDto | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  fetchActiveProgram: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<UserDto>) => Promise<void>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ProblemDetails | ValidationProblemDetails;
  status: number;
  headers?: Record<string, string>;
}

export interface FilterOptions {
  muscleGroup?: MuscleGroup;
  difficultyLevel?: DifficultyLevel;
  page?: number;
  pageSize?: number;
  search?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type UserRole = "User" | "Coach" | "Admin";

export type Gender = "Male" | "Female" | "Other";

export type FitnessGoal = 
  | "Muscle Gain"
  | "Fat Loss"
  | "General Health"
  | "Strength"
  | "Endurance"
  | "Flexibility";

export type PaymentStatus = 
  | "Pending"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type ProgramStatus = "InProgress" | "Completed";

export type PackageType = "Basic" | "Premium" | "Elite";

// ============================================================================
// EXPORT ENUMS FOR EASY ACCESS
// ============================================================================

export const MUSCLE_GROUPS = Object.values(MuscleGroup);
export const DIFFICULTY_LEVELS = Object.values(DifficultyLevel);
export const USER_ROLES: UserRole[] = ["User", "Coach", "Admin"];
export const GENDERS: Gender[] = ["Male", "Female", "Other"];
export const FITNESS_LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["Pending", "Completed", "Failed", "Cancelled"];
export const PROGRAM_STATUSES: ProgramStatus[] = ["InProgress", "Completed"];
export const PACKAGE_TYPES: PackageType[] = ["Basic", "Premium", "Elite"];

// ============================================================================
// API CONSTANTS
// ============================================================================

export const API_BASE_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_BASE_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  // Auth
  AUTH_SIGNUP: "/api/auth/signup",
  AUTH_LOGIN: "/api/auth/login",
  AUTH_REFRESH: "/api/auth/refresh",

  // Users
  USERS_LIST: "/api/users",
  USER_DETAIL: (userId: string) => `/api/users/${userId}`,
  USER_COMPLETE_PROFILE: (userId: string) => `/api/users/${userId}/complete-profile`,
  USER_CHANGE_PASSWORD: (userId: string) => `/api/users/${userId}/change-password`,
  USERS_WAITING: "/api/users/waiting",
  USER_ACTIVE_PROGRAM: (userId: string) => `/api/users/${userId}/active-program`,
  USER_DASHBOARD: (userId: string) => `/api/users/${userId}/dashboard`,
  USER_PHOTOS: (userId: string) => `/api/users/${userId}/photos`,

  // Coaches
  COACHES_LIST: "/api/coaches",
  COACH_DETAIL: (coachId: string) => `/api/coaches/${coachId}`,
  COACH_CREATE: "/api/coaches",
  COACH_UPDATE: (coachId: string) => `/api/coaches/${coachId}`,
  COACH_CHANGE_PASSWORD: (coachId: string) => `/api/coaches/${coachId}/change-password`,
  COACH_PROGRAMS_LIST: (coachId: string) => `/api/coaches/${coachId}/programs`,
  COACH_DASHBOARD: (coachId: string) => `/api/coaches/${coachId}/dashboard`,

  // Exercises
  EXERCISES_LIST: "/api/exercises",
  EXERCISE_DETAIL: (exerciseId: string) => `/api/exercises/${exerciseId}`,
  EXERCISE_CREATE: "/api/exercises",
  EXERCISE_UPDATE: (exerciseId: string) => `/api/exercises/${exerciseId}`,

  // Fitness Goals
  FITNESS_GOALS_LIST: "/api/fitness-goals",
  FITNESS_GOAL_DETAIL: (goalId: string) => `/api/fitness-goals/${goalId}`,

  // Packages
  PACKAGES_LIST: "/api/packages",
  PACKAGE_DETAIL: (packageId: string) => `/api/packages/${packageId}`,
  PACKAGE_CREATE: "/api/packages",
  PACKAGE_UPDATE: (packageId: string) => `/api/packages/${packageId}`,

  // Training Programs
  PROGRAMS_CREATE: "/api/training-programs",
  PROGRAM_DETAIL: (programId: string) => `/api/training-programs/${programId}`,
  PROGRAM_ACTIVATE: (programId: string) => `/api/training-programs/${programId}/activate`,
  PROGRAM_DEACTIVATE: (programId: string) => `/api/training-programs/${programId}/deactivate`,
  PROGRAM_UPDATE_DAILY: (programId: string) => `/api/training-programs/${programId}/daily-program`,
  PROGRAM_UPDATE_PROGRESS: (programId: string) => `/api/training-programs/${programId}/progress`,
  PROGRAM_COMPLETE: (programId: string) => `/api/training-programs/${programId}/complete`,

  // Workout Sessions
  WORKOUT_SESSIONS_CREATE: "/api/workout-sessions",
  USER_WORKOUT_SESSIONS: (userId: string) => `/api/users/${userId}/workout-sessions`,

  // Foods & Nutrition Plans
  FOODS_LIST: "/api/foods",
  FOOD_DETAIL: (foodId: string) => `/api/foods/${foodId}`,
  NUTRITION_PLANS_CREATE: "/api/nutrition-plans",
  NUTRITION_PLAN_DETAIL: (planId: string) => `/api/nutrition-plans/${planId}`,
  NUTRITION_PLAN_ACTIVATE: (planId: string) => `/api/nutrition-plans/${planId}/activate`,
  NUTRITION_PLAN_DEACTIVATE: (planId: string) => `/api/nutrition-plans/${planId}/deactivate`,
  USER_ACTIVE_NUTRITION_PLAN: (userId: string) => `/api/users/${userId}/active-nutrition-plan`,
  USER_NUTRITION_PLANS: (userId: string) => `/api/users/${userId}/nutrition-plans`,

  // Payments
  PAYMENTS_PROCESS: "/api/payments",
  PAYMENT_DETAIL: (paymentId: string) => `/api/payments?id=${paymentId}`,

  // Waiting Users
  WAITING_USERS_LIST: "/api/waiting-users",
  WAITING_USER_STATUS: (userId: string) => `/api/waiting-users/${userId}`,

  // Profile Completion Check
  PROFILE_COMPLETE_CHECK: (userId: string) => `/api/users/${userId}/profile-complete`,
};

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// ============================================================================
// TOKEN CLAIMS (JWT Decoded)
// ============================================================================

export interface DecodedToken {
  sub: string; // User ID (GUID)
  email: string;
  role: UserRole;
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration time (Unix timestamp)
  iss: string; // Issuer (always "ChangeMindApi")
  aud: string; // Audience (always "ChangeMindApp")
  jti?: string; // JWT ID
}

// ============================================================================
// FORM STATE TYPES
// ============================================================================

export interface FormErrors {
  [field: string]: string | string[];
}

export interface FormState {
  values: Record<string, any>;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ============================================================================
// API REQUEST/RESPONSE INTERCEPTOR TYPES
// ============================================================================

export interface ApiRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export interface ApiErrorResponse {
  status: number;
  data: ProblemDetails | ValidationProblemDetails;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  page: number; // 1-indexed
  pageSize: number;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// ASYNC OPERATION STATE
// ============================================================================

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

/**
 * Usage:
 * const [state, setState] = useState<AsyncState<UserDto>>({
 *   data: null,
 *   isLoading: false,
 *   error: null,
 *   isSuccess: false,
 * });
 */
