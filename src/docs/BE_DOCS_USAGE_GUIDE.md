# 🎯 FE Ekibi için BE Docslarını Kullanma Rehberi

**Bu dokümanda:** BE tarafından verilen `AUTH_GUIDE.md` ve `openapi.json` dosyalarının FE projesi geliştirimi sırasında nasıl referans alınacağını açıklıyorum.

---

## 📍 Dosya Konumları

BE ekibinden aldığınız dosyalar FE projelerinin **root klasöründe** yer almalı:

```
your-fitness-app/
├── src/
│   ├── pages/
│   ├── components/
│   └── ...
├── docs/                      ← BURAYA KOPYALAYıN
│   ├── AUTH_GUIDE.md         ← Backend Auth & Authorization
│   └── openapi.json          ← Complete API Specification
├── package.json
└── .env
```

**Kurulum:**
```bash
# Proje root'unda
mkdir -p docs
# AUTH_GUIDE.md ve openapi.json dosyalarını docs/ içine kopyalayın
```

---

## 🔍 Dosyaları Ne Zaman Referans Alacaksınız?

### **AUTH_GUIDE.md - Ne için?**

Bu dosyayı açacağınız **4 ana durumda:**

#### 1️⃣ **JWT Token Yapısı Anlamak**

*Dosyadaki bölüm: "JWT Token Structure"*

**Ne zaman kullanacaksınız:**
- Login/Signup sonrası token'ı localStorage'e kaydettiğinizde
- Token claims'ından user bilgisi çıkarmak istediğinizde
- Token expiry kontrolü yaparken

**Örnek:**
```typescript
// src/utils/jwtDecoder.ts
// Dosyadaki "Sample Decoded JWT" tablosundaki yapıyı referans alarak decode edin
interface DecodedToken {
  sub: string;      // User ID (GUID)
  email: string;
  role: "User" | "Coach" | "Admin";
  exp: number;      // Expiry timestamp
  iat: number;      // Issued at
  iss: string;      // Issuer: "ChangeMindApi"
  aud: string;      // Audience: "ChangeMindApp"
}

// Base64 decode
const decoded = JSON.parse(atob(token.split('.')[1]));
```

#### 2️⃣ **Token Refresh Flow'unu Uygulamak**

*Dosyadaki bölüm: "Token Refresh"*

**Ne zaman kullanacaksınız:**
- API çağrısından 401 response aldığınızda
- Proactive olarak token'ı refresh etmek istediğinizde (1 min before expiry)
- Axios interceptor'ında otomatik refresh logic yazarken

**Örnek:**
```typescript
// src/hooks/useTokenRefresh.ts
// Dosyadaki "Implementation Strategy" örneğini takip edin

useEffect(() => {
  const interval = setInterval(async () => {
    if (shouldRefreshToken()) {
      // Call: POST /api/auth/refresh
      // With: { refreshToken: ... }
      // Save: new accessToken + tokenExpiry
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(interval);
}, []);
```

#### 3️⃣ **Authorization Rules (Role-Based)**

*Dosyadaki bölüm: "Authorization Rules"*

**Ne zaman kullanacaksınız:**
- Protected routes oluştururken
- Kullanıcının erişim yetkisini kontrol ederken
- UI'da role'a göre component'ler gösterip gizlerken

**Örnek:**
```typescript
// src/components/shared/ProtectedRoute.tsx
// Dosyadaki tablo referans alın:
// User: GET /users/{id}, GET /packages, GET /exercises, POST /payments
// Coach: POST /training-programs, GET /users/waiting
// Admin: All endpoints

function hasRole(requiredRole: string): boolean {
  const userRole = localStorage.getItem('role');
  const hierarchy = { 'User': 1, 'Coach': 2, 'Admin': 3 };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

// Usage:
if (hasRole('Coach')) {
  // Show coach dashboard
}
```

#### 4️⃣ **Idempotency (Payment) Uygulamak**

*Dosyadaki bölüm: "Idempotency for Payments"*

**⚠️ BU ÖNEMLİ - ÖDEME DÜPLİKASYONUNUN ÖNÜNE GEÇMEZSE SORUN OLUR!**

**Ne zaman kullanacaksınız:**
- Ödeme formundan submit ettiğinizde
- Retry logicinde

**Örnek:**
```typescript
// src/services/payment.service.ts
import { v4 as uuidv4 } from 'uuid';

export async function processPayment(userId: string, packageId: string) {
  // ⚠️ HER ÇA
ĞRIDA YENİ UUID ÜRET
  const idempotencyKey = uuidv4();

  // Dosyadaki "Implementation" örneğini takip edin:
  const response = await apiClient.post(
    '/api/payments',
    { userId, packageId },
    {
      headers: {
        'Idempotency-Key': idempotencyKey  // ← CRITICAL!
      }
    }
  );

  // Handle responses:
  // 200 OK: Success
  // 409 Conflict: Retry after "Retry-After" header
  // 400/401: Don't retry
}
```

---

### **openapi.json - Ne için?**

Bu dosya **API endpoint'lerinin tam spesifikasyonudur.** Aşağıdaki durumlarda açacaksınız:

#### 1️⃣ **Hangi Endpoint'i Çağırmalıyım?**

**Örnek:** "User profili güncellemek istiyorum"

```json
// openapi.json'de ara:
// Path: "/api/users/{id}"
// Method: "PUT"

PUT /api/users/{id}
Authorization: Bearer {accessToken}

Request body schema: tanımlanmış
Response schema: tanımlanmış
```

**Dosyada bul:**
```bash
grep -n '"\/api\/users\/{id}"' openapi.json
# Satır 247'de bulacaksınız
# PUT, DELETE, GET methodlarını gör
```

#### 2️⃣ **Request Body Neyi Almakta?**

**Örnek:** "Packages listesini almak istiyorum, hangi query params lazım?"

```json
// openapi.json'de "/api/packages"'ı arayın
GET /api/packages

Query Parameters:
  - page (integer, default: 1)
  - pageSize (integer, default: 10)

Response Schema: PackageDto[] içinde:
  - id (UUID)
  - name (string)
  - description (string)
  - price (decimal)
  - durationDays (integer)
  - type (string) - e.g., "Basic", "Premium", "Elite"
  - isActive (boolean)
  - createdAt (date-time)
```

#### 3️⃣ **Hangi Şema (Type) Neyi İçermekte?**

**Örnek:** "ProfileCompletion form'u ne alanları almalı?"

```bash
# openapi.json'de:
grep -n '"CompleteProfileRequest"' openapi.json
# Satır 1750 civarında

# Şu alanları görürsünüz:
- firstName (string, required)
- lastName (string, required)
- age (integer, required, min: 13, max: 120)
- height (number, decimal, required) - cm
- weight (number, decimal, required) - kg
- gender (string enum: ["Male", "Female", "Other"], required)
- fitnessGoal (string, required)
- fitnessLevel (string enum: ["Beginner", "Intermediate", "Advanced"], required)
```

**React type oluştururken:**
```typescript
// src/types/user.types.ts
export interface CompleteProfileRequest {
  firstName: string;
  lastName: string;
  age: number; // 13-120
  height: number; // cm
  weight: number; // kg
  gender: "Male" | "Female" | "Other";
  fitnessGoal: string;
  fitnessLevel: "Beginner" | "Intermediate" | "Advanced";
}
```

#### 4️⃣ **Response Formatı Ne Döndürüyor?**

**Örnek:** "Exercise endpoint'inde neler dönüyor?"

```bash
grep -n '"ExerciseDto"' openapi.json
# Satır 2137'de
```

```json
"ExerciseDto": {
  "id": "uuid",
  "name": "string",
  "muscleGroup": "string" (Chest|Back|Shoulders|Biceps|...), 
  "difficultyLevel": "string" (Beginner|Intermediate|Advanced),
  "description": "string (nullable)",
  "videoUrl": "uri (nullable)",
  "isActive": "boolean",
  "createdAt": "date-time",
  "updatedAt": "date-time (nullable)"
}
```

---

## 🛠️ **Pratik Örnekler: Dosyaları Kullanarak Code Yazma**

### **Örnek 1: Login Service Yazma**

**AUTH_GUIDE.md'den:**
```
Section: "Authentication Flow" → "2. Login (Obtain Tokens)"
- Endpoint: POST /api/auth/login
- Request: email, password
- Response: AuthTokenResponse (userId, email, role, accessToken, refreshToken, expiresIn)
```

**openapi.json'den:**
```
Path: /api/auth/login
Method: POST
Schema Ref: LoginRequest, AuthTokenResponse
Responses: 200 (success), 401 (invalid), 400 (validation error)
```

**Yazacağınız Code:**
```typescript
// src/services/auth.service.ts
import apiClient from './api.client';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', {
      email,    // From openapi.json: LoginRequest schema
      password, // min 8 chars (also in openapi.json)
    });
    
    const data = response.data; // AuthTokenResponse from openapi.json
    
    // From AUTH_GUIDE.md: Store these
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('tokenExpiry', 
      (Date.now() + data.expiresIn * 1000).toString()
    );
    
    return data;
  },
};
```

---

### **Örnek 2: Exercise List Filtresi Yazma**

**openapi.json'den:**
```
Path: /api/exercises
Method: GET
Parameters:
  - page (query, integer)
  - pageSize (query, integer)
  - muscleGroup (query, string)
  - difficultyLevel (query, string)
Response: PagedResultExerciseDto (items, totalCount, pageSize, currentPage)
```

**openapi.json'den Enums:**
```json
MuscleGroup: [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", 
  "Forearms", "Legs", "Glutes", "Core", "Cardio"
]
DifficultyLevel: ["Beginner", "Intermediate", "Advanced"]
```

**Yazacağınız Code:**
```typescript
// src/types/exercise.types.ts
export enum MuscleGroup {
  Chest = "Chest",
  Back = "Back",
  Shoulders = "Shoulders",
  // ... from openapi.json
}

// src/services/exercise.service.ts
export const exerciseService = {
  listExercises: async (
    page = 1,
    pageSize = 10,
    filters?: { muscleGroup?: string; difficultyLevel?: string }
  ) => {
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

    return apiClient.get(`/api/exercises?${params.toString()}`);
  },
};

// src/pages/exercises/ExerciseList.tsx
function ExerciseList() {
  const [filters, setFilters] = useState({
    muscleGroup: '',
    difficultyLevel: '',
  });

  // openapi.json'deki enum'ları select'e at
  const muscleGroupOptions = [
    { label: 'Chest', value: 'Chest' },
    { label: 'Back', value: 'Back' },
    // ... tüm options
  ];

  return (
    <div>
      <Select 
        options={muscleGroupOptions}
        onChange={(val) => setFilters({ ...filters, muscleGroup: val })}
      />
      {/* ... */}
    </div>
  );
}
```

---

### **Örnek 3: Payment ile Idempotency**

**AUTH_GUIDE.md'den:**
```
Section: "Idempotency for Payments"
- Generate UUID: const idempotencyKey = uuidv4()
- Header: 'Idempotency-Key': idempotencyKey
- Responses: 
  - 200 OK: Success
  - 409 Conflict: Retry after Retry-After header
```

**openapi.json'den:**
```
Path: /api/payments
Method: POST
Headers Required:
  - Authorization: Bearer {token}
  - Idempotency-Key: {uuid}  ← CRITICAL
Request: ProcessPaymentRequest (userId, packageId)
Response: PaymentProcessResponse (success, paymentId, message)
Response Headers:
  - X-Idempotent-Replayed: boolean
  - Retry-After: integer (on 409)
```

**Yazacağınız Code:**
```typescript
// src/services/payment.service.ts
import { v4 as uuidv4 } from 'uuid';

export const paymentService = {
  processPayment: async (userId: string, packageId: string) => {
    // AUTH_GUIDE.md: "Generate unique UUID"
    const idempotencyKey = uuidv4();

    try {
      const response = await apiClient.post(
        '/api/payments',
        {
          userId,
          packageId,
        },
        {
          // openapi.json: Header zorunlu
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      // Response 200: Success
      return response.data;
    } catch (error: any) {
      // AUTH_GUIDE.md: Handle 409 Conflict
      if (error.response?.status === 409) {
        const retryAfter = error.response.headers['retry-after'] || '5';
        console.log(`Payment in-flight. Retry after ${retryAfter}s`);
        
        // Exponential backoff retry
        setTimeout(() => {
          // Tekrar çağır - FAKAT YENİ UUID ÜRET!
          // const newKey = uuidv4(); // İşte bu!
        }, retryAfter * 1000);
      }
    }
  },
};

// src/pages/packages/PaymentModal.tsx
function PaymentModal({ packageId }) {
  const handlePayment = async () => {
    try {
      const result = await paymentService.processPayment(userId, packageId);
      // openapi.json Response: { success, paymentId, message }
      if (result.success) {
        toast.success('Payment successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    }
  };

  return (
    <Modal>
      {/* ... */}
      <button onClick={handlePayment}>Confirm Payment</button>
    </Modal>
  );
}
```

---

## 📋 **Checklist: Dosyalardan Bilgi Toplamak**

Yeni bir sayfa/feature yazarken şu adımları takip edin:

### **1. Endpoint'i Belirle**

**Soru:** "Bu feature için hangi API endpoint'ini çağırmalıyım?"

**Cevabı bul:** openapi.json → "paths" → endpoint adı

---

### **2. Request Formatını Kontrol Et**

**Soru:** "Bu endpoint'e ne göndermeli?"

**Cevabı bul:** openapi.json → endpoint → "requestBody" → schema referansını takip et

---

### **3. Response Formatını Anla**

**Soru:** "Response ne geri döndürecek?"

**Cevabı bul:** openapi.json → endpoint → "responses" → "200" → schema

---

### **4. Authentication Kontrol Et**

**Soru:** "Bu endpoint'e JWT token lazım mı?"

**Cevabı bul:** 
- openapi.json → endpoint → "security" (varsa, lazım demektir)
- AUTH_GUIDE.md → "Endpoint Protection" tablosunda kontrol et

---

### **5. Özel Gereksinimler**

**Soru:** "Bu endpoint için özel header/logic var mı?"

**Cevabı bul:**
- Payment → `Idempotency-Key` header (AUTH_GUIDE.md)
- Refresh → `POST /api/auth/refresh` (AUTH_GUIDE.md)
- Role kontrol → "Authorization Rules" (AUTH_GUIDE.md)

---

## 🔧 **Hızlı Referans: Sık Kullandığınız Alanlar**

### **Enum/Constants için openapi.json sections:**

```bash
# MuscleGroup
grep -A10 '"muscleGroup"' openapi.json | grep enum

# DifficultyLevel
grep -A5 '"difficultyLevel"' openapi.json | grep enum

# Gender
grep -A5 '"gender"' openapi.json | grep enum

# FitnessLevel
grep -A5 '"fitnessLevel"' openapi.json | grep enum

# UserRole
grep -A5 '"role"' openapi.json | grep enum
```

### **Pagination Constants:**

```json
// openapi.json'de default values:
page: 1 (default)
pageSize: 10 (default)
```

### **Validation Rules:**

```json
// openapi.json'de:
password: minLength 8
age: minimum 13, maximum 120
height: decimal (cm)
weight: decimal (kg)
```

---

## 🐛 **Debugging: Hata Aldığında**

**Hata:** "401 Unauthorized"
**Kontrol et:** 
- AUTH_GUIDE.md → "Authorization Errors" 
- Token localStorage'te mi?
- Token expired mi?

**Hata:** "409 Conflict on Payment"
**Kontrol et:**
- AUTH_GUIDE.md → "Idempotency for Payments" → "States"
- Retry-After header'ını oku

**Hata:** "400 Bad Request"
**Kontrol et:**
- openapi.json → endpoint → "requestBody" → validation rules
- Form validasyonunu kontrol et

**Hata:** "403 Forbidden"
**Kontrol et:**
- AUTH_GUIDE.md → "Authorization Rules"
- Kullanıcının role'u doğru mu?

---

## 🎓 **Best Practices**

### ✅ DO

1. **İlk geliştirme başlamadan openapi.json'i oku:**
   ```bash
   # Tüm available endpoints'leri anlamak için
   grep -n '"paths"' openapi.json
   ```

2. **Type'ları openapi.json'den türet:**
   ```typescript
   // ❌ Yanlış:
   interface User {
     name: string;
     age: number;
   }

   // ✅ Doğru:
   // openapi.json'de UserDto'yu bul ve tam aynısını türet
   ```

3. **Enum'ları openapi.json'den al:**
   ```typescript
   // ❌ Yanlış:
   const muscleGroups = ['chest', 'back', 'legs'];

   // ✅ Doğru:
   // openapi.json'deki exact enum values'ı kullan
   const muscleGroups = ["Chest", "Back", "Legs"];
   ```

4. **Idempotency'yi test et:**
   ```typescript
   // Aynı UUID'yi 2 kez gönder
   // Sonuç: Same response, no duplicate charge
   ```

### ❌ DON'T

1. **Speculation yapma:**
   ```typescript
   // ❌ Doğru değil:
   const response = apiClient.post('/api/users/update'); // Bu endpoint'i nereden biliyorsun?

   // ✅ Doğru:
   // openapi.json'de kontrol et: PUT /api/users/{id}
   ```

2. **Auth token'ı query param'de gönderme:**
   ```typescript
   // ❌ Yanlış:
   get('/api/exercises?token=abc123');

   // ✅ Doğru:
   // AUTH_GUIDE.md: Bearer header kullan
   headers: { 'Authorization': 'Bearer abc123' }
   ```

3. **Idempotency'yi skip etme:**
   ```typescript
   // ❌ Yanlış:
   processPayment(); // Idempotency-Key yok

   // ✅ Doğru:
   // AUTH_GUIDE.md: Idempotency-Key zorunlu
   ```

---

## 📞 **BE Ekibiyle İletişim**

Eğer dosyalarda anlamadığınız birşey varsa:

1. **BE ekibine sorun:**
   > "openapi.json'de `/api/training-programs/{id}` PUT endpoint'i var mı? 
   > Custom program oluştururken kullanabileceğim?"

2. **Missing endpoint rapor edin:**
   > "AUTH_GUIDE.md sayfasında `/api/auth/refresh` endpoint'i yazılı ama 
   > openapi.json'de yok. Implemented mi?"

3. **Clarification iste:**
   > "ProcessPaymentRequest'te description field optional mi?"
   > (openapi.json'de "required" listesinde yok, yani evet)

---

## 🎉 **Hazırsınız!**

Artık:
- ✅ Backend'in API'si tam olarak ne sunduğunu biliyorsunuz
- ✅ Her endpoint'in request/response formatını görebiliyorsunuz
- ✅ Auth flow'unu ve token management'ı anlıyorsunuz
- ✅ Idempotency logic'ini uygulayabiliyorsunuz
- ✅ Type-safe React + TypeScript kod yazabiliyorsunuz

**Frontend kodunuzu yazarken bu dokümanı her zaman açık tutun!** 🚀
