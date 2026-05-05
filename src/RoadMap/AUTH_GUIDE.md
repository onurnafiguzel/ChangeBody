# ChangeMind API - Authentication & Authorization Guide

## Table of Contents
1. [Overview](#overview)
2. [JWT Token Structure](#jwt-token-structure)
3. [Authentication Flow](#authentication-flow)
4. [Authorization Rules](#authorization-rules)
5. [Error Handling](#error-handling)
6. [Implementation Examples](#implementation-examples)
7. [Token Refresh](#token-refresh)
8. [Idempotency for Payments](#idempotency-for-payments)

---

## Overview

ChangeMind API uses **JWT (JSON Web Tokens)** for authentication and **Role-Based Access Control (RBAC)** for authorization.

### Key Points
- **Authentication Protocol:** HTTP Bearer Token (JWT)
- **Token Format:** Bearer `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **HTTPS Required:** Tokens must only be transmitted over HTTPS in production
- **Stateless:** No server-side session storage; all user info is encoded in the token

---

## JWT Token Structure

### Token Claims
Each JWT contains the following standard claims:

| Claim | Type | Example | Description |
|-------|------|---------|-------------|
| `sub` | string | "550e8400-e29b-41d4-a716-446655440000" | Subject (User ID - GUID) |
| `email` | string | "user@example.com" | User email address |
| `role` | string | "User" \| "Coach" \| "Admin" | User role (one per token) |
| `iat` | number | 1704067200 | Issued at (Unix timestamp) |
| `exp` | number | 1704068100 | Expiration time (Unix timestamp) |
| `iss` | string | "ChangeMindApi" | Issuer (API name) |
| `aud` | string | "ChangeMindApp" | Audience (frontend app name) |
| `jti` | string | "unique-id" | JWT ID (unique token identifier) |

### Token Validity

| Token Type | Expiry | Use Case |
|------------|--------|----------|
| **Access Token** | 15 minutes | API requests; used in `Authorization: Bearer` header |
| **Refresh Token** | 7 days | Long-lived; used to obtain new access token without re-login |

### Sample Decoded JWT (Access Token)
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "role": "User",
  "iat": 1704067200,
  "exp": 1704068100,
  "iss": "ChangeMindApi",
  "aud": "ChangeMindApp"
}
```

---

## Authentication Flow

### 1. Signup (Register + Auto-Login)

**Endpoint:** `POST /api/auth/signup`

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201 Created):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@example.com",
  "role": "User",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Key Points:**
- Creates a new `User` account and returns tokens immediately (no separate login step needed).
- After signup, call `PATCH /api/users/{id}/complete-profile` to set name, age, gender, etc.
- Returns `409 Conflict` if the email is already registered.

---

### 2. Login (Obtain Tokens)

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "User",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Key Points:**
- `accessToken`: Short-lived (15 min). Use this for API requests.
- `refreshToken`: Long-lived (7 days). Store securely (httpOnly cookie preferred).
- `expiresIn`: Token expiry in seconds (900 = 15 minutes).
- `role`: Determines API permissions ("User", "Coach", "Admin").

### 2. API Request (Use Access Token)

**All subsequent API requests must include the access token:**

```
Authorization: Bearer {accessToken}
```

**Example:**
```bash
curl -X GET https://api.changemind.com/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
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

### 3. Token Expiry & Refresh

**When Access Token Expires:**
- API returns `401 Unauthorized`
- Error response includes hint to refresh token

**Refresh Access Token:**

**Endpoint:** `POST /api/auth/refresh` *(not yet in openapi.json, to be implemented)*

**Request:**
```json
{
  "refreshToken": "{refreshToken}"
}
```

**Response:**
```json
{
  "accessToken": "new_jwt_token...",
  "expiresIn": 900
}
```

---

## Authorization Rules

### User Roles

| Role | Permissions | API Access |
|------|-------------|-----------|
| **User** | View own profile, view packages, view exercises, view assigned training programs, make payments | GET /users/{id}, GET /packages, GET /exercises, GET /training-programs/*, POST /payments |
| **Coach** | Create training programs for users, manage user assignments, view user profiles | POST /training-programs, GET /users/waiting, GET /users/* |
| **Admin** | Full system access: CRUD all resources | All endpoints |

### Endpoint Protection

#### Public Endpoints (No Authentication Required)
```
POST   /api/auth/signup                         - Register new user (public)
POST   /api/auth/login                          - Any user
POST   /api/users                               - User registration (public)
GET    /api/users                               - List all users
GET    /api/users/{id}                          - Get user by ID
GET    /api/coaches                             - List coaches
GET    /api/coaches/{id}                        - Get coach by ID
GET    /api/packages                            - List packages
GET    /api/packages/{id}                       - Get package by ID
GET    /api/exercises                           - List exercises
GET    /api/exercises/{id}                      - Get exercise by ID
GET    /api/training-programs/{id}              - Get training program
GET    /api/users/{userId}/active-program      - Get user's active program
```

#### Protected Endpoints (JWT Required)

**User Role (or higher):**
```
POST   /api/payments                            - Process payment (with Idempotency-Key header)
GET    /api/payments                            - Get payment details
PUT    /api/users/{id}                          - Update own profile
DELETE /api/users/{id}                          - Deactivate own account
POST   /api/users/{id}/change-password          - Change own password
POST   /api/users/{id}/complete-profile         - Complete own profile
```

**Coach Role (or Admin):**
```
POST   /api/training-programs                   - Create training program
GET    /api/users/waiting                       - Get users awaiting assignment
PUT    /api/training-programs/{id}/daily-program     - Update program exercises
POST   /api/training-programs/{id}/activate         - Activate program
POST   /api/training-programs/{id}/deactivate       - Deactivate program
POST   /api/training-programs/{id}/complete         - Mark program complete
PUT    /api/training-programs/{id}/progress         - Update user progress
```

**Admin Role Only:**
```
POST   /api/coaches                             - Create coach
PUT    /api/coaches/{id}                        - Update coach profile
DELETE /api/coaches/{id}                        - Deactivate coach
POST   /api/coaches/{id}/change-password        - Change coach password
POST   /api/packages                            - Create package
PUT    /api/packages/{id}                       - Update package
DELETE /api/packages/{id}                       - Deactivate package
POST   /api/exercises                           - Create exercise
PUT    /api/exercises/{id}                      - Update exercise
DELETE /api/exercises/{id}                      - Deactivate exercise
```

### Authorization Errors

**Missing Token → 401 Unauthorized:**
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Authorization header is missing or token is invalid."
}
```

**Insufficient Permissions → 403 Forbidden:**
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Forbidden",
  "status": 403,
  "detail": "User does not have permission to access this resource."
}
```

**Invalid/Expired Token → 401 Unauthorized:**
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Token validation failed: Token has expired."
}
```

---

## Error Handling

### Common Authentication/Authorization Errors

| Status | Scenario | Response |
|--------|----------|----------|
| **400 Bad Request** | Invalid email format, password too short | `ValidationProblemDetails` with field-level errors |
| **401 Unauthorized** | Invalid password, missing/expired token | `ProblemDetails` with auth error message |
| **403 Forbidden** | User role insufficient for endpoint | `ProblemDetails` with "Forbidden" title |
| **404 Not Found** | User/resource not found | `ProblemDetails` with "Not Found" title |
| **409 Conflict** | Email already registered, duplicate resource | `ProblemDetails` with conflict message |

### Response Format (RFC 7807)
All errors follow the **Problem Details for HTTP APIs** standard:
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Error Title",
  "status": 400,
  "detail": "Detailed error message",
  "instance": "/api/path"
}
```

---

## Implementation Examples

### React.js + TypeScript Example

#### 1. Login & Store Tokens
```typescript
// auth.service.ts
import axios from 'axios';

interface AuthResponse {
  userId: string;
  email: string;
  role: 'User' | 'Coach' | 'Admin';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>('http://localhost:5000/api/auth/login', {
    email,
    password
  });

  // Store tokens
  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);
  localStorage.setItem('userId', response.data.userId);
  localStorage.setItem('role', response.data.role);

  // Set token expiry timer
  const expiryTime = Date.now() + response.data.expiresIn * 1000;
  localStorage.setItem('tokenExpiry', expiryTime.toString());

  return response.data;
}
```

#### 2. API Client with Auto-Refresh
```typescript
// api.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE = 'http://localhost:5000'; // Gateway — production: 'https://api.changemind.com'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE
});

// Request interceptor: Add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 + auto-refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE}/api/auth/refresh`, {
          refreshToken
        });

        const newToken = response.data.accessToken;
        localStorage.setItem('accessToken', newToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
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

#### 3. Get User Profile
```typescript
// users.service.ts
import apiClient from './api.client';

interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  fitnessGoal?: string;
  fitnessLevel?: string;
  createdAt: string;
}

export async function getUserById(userId: string): Promise<UserDto> {
  const response = await apiClient.get<UserDto>(`/api/users/${userId}`);
  return response.data;
}

export async function updateUser(userId: string, data: Partial<UserDto>): Promise<void> {
  await apiClient.put(`/api/users/${userId}`, data);
  // Returns 204 No Content
}
```

#### 4. Process Payment (with Idempotency)
```typescript
// payments.service.ts
import apiClient from './api.client';
import { v4 as uuidv4 } from 'uuid';

interface PaymentRequest {
  userId: string;
  packageId: string;
  description?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId: string;
  message?: string;
}

export async function processPayment(data: PaymentRequest): Promise<PaymentResponse> {
  // Generate unique idempotency key
  const idempotencyKey = uuidv4();

  const response = await apiClient.post<PaymentResponse>(
    '/api/payments',
    data,
    {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    }
  );

  return response.data;
}
```

#### 5. Check User Role (Frontend Authorization)
```typescript
// auth.guard.ts
export type UserRole = 'User' | 'Coach' | 'Admin';

export function hasRole(requiredRole: UserRole): boolean {
  const userRole = localStorage.getItem('role') as UserRole | null;
  
  // Role hierarchy: User < Coach < Admin
  const roleHierarchy: Record<UserRole, number> = {
    'User': 1,
    'Coach': 2,
    'Admin': 3
  };

  return userRole ? roleHierarchy[userRole] >= roleHierarchy[requiredRole] : false;
}

export function isAuthorized(): boolean {
  const token = localStorage.getItem('accessToken');
  const expiry = localStorage.getItem('tokenExpiry');
  
  if (!token || !expiry) return false;
  
  return Date.now() < parseInt(expiry);
}

// React component example
import { useNavigate } from 'react-router-dom';

function CoachDashboard() {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthorized() || !hasRole('Coach')) {
      navigate('/login');
    }
  }, [navigate]);

  return <div>Coach Dashboard</div>;
}
```

---

## Token Refresh

### When to Refresh
- **Proactive:** Refresh token 1 minute before expiry (optional but recommended)
- **Reactive:** On 401 response, automatically refresh and retry (recommended)

### Implementation Strategy
```typescript
// Check token expiry before API calls
function shouldRefreshToken(): boolean {
  const expiry = localStorage.getItem('tokenExpiry');
  if (!expiry) return false;
  
  // Refresh if less than 1 minute left
  const bufferMs = 60 * 1000;
  return Date.now() > parseInt(expiry) - bufferMs;
}

// Periodic refresh (e.g., every 5 minutes)
React.useEffect(() => {
  const interval = setInterval(async () => {
    if (shouldRefreshToken()) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('tokenExpiry', 
          (Date.now() + response.data.expiresIn * 1000).toString()
        );
      } catch (error) {
        // Refresh failed, logout user
        localStorage.clear();
      }
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(interval);
}, []);
```

---

## Idempotency for Payments

### Problem Solved
Prevents duplicate payment charges if the network request is retried (e.g., network timeout, accidental double-click).

### How It Works

1. **Client generates UUID:** Before calling `POST /api/payments`, generate a unique `Idempotency-Key` (UUID v4).
2. **Server stores key:** On first request, server processes payment and caches response for 24 hours using the key.
3. **Duplicate detection:** If same key is sent again within 24 hours, server returns cached response immediately (idempotent).
4. **Fresh call:** New UUID = new payment processing.

### Implementation

```typescript
export async function processPayment(packageId: string): Promise<void> {
  const idempotencyKey = uuidv4(); // NEW UUID each time
  
  try {
    const response = await apiClient.post(
      '/api/payments',
      {
        userId: localStorage.getItem('userId'),
        packageId: packageId
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      }
    );

    console.log('Payment success:', response.data);
    return response.data;
  } catch (error: AxiosError) {
    if (error.response?.status === 409) {
      // Payment is in-flight (Idempotency-Key still locked)
      const retryAfter = error.response.headers['retry-after'] ?? '5';
      console.log(`Wait ${retryAfter}s and retry...`);
      // Exponential backoff retry
    } else {
      // Other error, don't retry
      throw error;
    }
  }
}
```

### Response Headers

| Header | Value | Meaning |
|--------|-------|---------|
| `X-Idempotent-Replayed` | `true` \| `false` | true = response from cache, false = newly processed |
| `Retry-After` | `5` | (409 only) Seconds to wait before retrying in-flight request |

### States

| Status | Meaning | Action |
|--------|---------|--------|
| **200 OK** | Payment processed/cached | Success, payment completed |
| **409 Conflict** | Payment in-flight (locked) | Retry after `Retry-After` header seconds |
| **400 Bad Error** | Validation failed | Don't retry, fix request |

---

## Security Best Practices

### For Frontend (React.js)

1. **Store tokens securely:**
   - `accessToken`: In-memory or localStorage (short-lived = acceptable risk)
   - `refreshToken`: httpOnly cookie OR secure localStorage (longer-lived)

2. **HTTPS only:** All tokens must be transmitted over HTTPS in production.

3. **Never expose in URL:** Don't pass tokens as query parameters (use Bearer header).

4. **Logout:** Clear tokens on logout
   ```typescript
   function logout() {
     localStorage.clear();
     navigate('/login');
   }
   ```

5. **CORS:** API should only accept requests from your frontend origin.

6. **Rate limiting:** API enforces rate limits per endpoint; handle 429 responses gracefully.

### Server Validation (Already Implemented)
- Token signature validation (HS256)
- Token expiration check (15 min)
- Issuer/Audience verification
- Clock skew tolerance: 0 seconds (strict)
- Role-based endpoint protection

---

## Troubleshooting

### "Token has expired" Error
**Solution:** Refresh token or re-login
```typescript
// Automatic refresh via interceptor (already implemented in api.client.ts)
// Or manually:
const response = await axios.post('/api/auth/refresh', { refreshToken });
localStorage.setItem('accessToken', response.data.accessToken);
```

### "Insufficient permissions" (403 Forbidden)
**Solution:** Check user role matches endpoint requirements
```typescript
const role = localStorage.getItem('role');
if (role === 'User') {
  // Can only access user-level endpoints
}
```

### "Invalid email or password" (401 Unauthorized on login)
**Solution:** Verify credentials are correct (emails are case-insensitive)

### Duplicate Payment Issue
**Solution:** Use idempotency key; same UUID = no duplicate charge
```typescript
const same_key = uuidv4(); // First call
await processPayment(packageId, same_key); // Succeeds
await processPayment(packageId, same_key); // Returns cached result (no new charge)
```

---

## Summary Table

| Feature | Details |
|---------|---------|
| **Auth Type** | JWT (JSON Web Token) |
| **Token Scheme** | Bearer token in `Authorization` header |
| **Access Token TTL** | 15 minutes |
| **Refresh Token TTL** | 7 days |
| **Algorithm** | HS256 (HMAC SHA-256) |
| **Stateless** | Yes (no server-side sessions) |
| **Role Types** | User, Coach, Admin (hierarchy-based) |
| **Idempotency** | Yes (Payments only, via UUID header) |
| **Error Format** | RFC 7807 ProblemDetails |
| **HTTPS** | Required in production |

