# StaffSync — Backend API Specification

> **Project:** StaffSync Employee Management Dashboard  
> **Base URL:** `https://api.staffsync.com/v1`  
> **Auth:** All endpoints except `/auth/*` require a `Bearer <token>` header.  
> **Content-Type:** `application/json`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Employees](#2-employees)
3. [Departments](#3-departments)
4. [Department Positions](#3-department-positions)
5. [Dashboard](#5-dashboard)
6. [Reports](#6-reports)
7. [Settings](#7-settings)
8. [Health](#8-health)
9. [Data Models](#9-data-models)

---

## 1. Authentication

---

### 1.1 Login

Authenticate an admin user and return a JWT token.

**`POST /auth/login`**

**Request Body:**

```json
{
  "email": "admin@rockscompany.com",
  "password": "securePassword123",
  "rememberMe": true
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400,
    "user": {
      "id": "usr-1",
      "name": "Admin Strator",
      "email": "admin@rockscompany.com",
      "role": "admin",
      "profilePicture": "https://cdn.staffsync.com/images/admin.jpg"
    }
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Validation:**
| Field | Type | Rules |
|-------------|---------|------------------------------|
| email | string | Required, valid email format |
| password | string | Required, min 6 characters |
| rememberMe | boolean | Optional, defaults to false |

---

### 1.2 Register / Create Account

Register a new organisation / admin account.

**`POST /auth/register`**

**Request Body:**

```json
{
  "companyName": "Rocks Company Ltd",
  "email": "admin@rockscompany.com",
  "description": "Corporate Headquarters",
  "phone": "+2348129887896",
  "address": {
    "state": "FCT",
    "lga": "Municipal",
    "settlement": "Wuse 2",
    "street": "42 Michael Okpara Street, House 7"
  },
  "password": "securePassword123",
  "agreeTerms": true
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr-1",
      "name": "Admin",
      "email": "admin@rockscompany.com",
      "role": "admin"
    },
    "company": {
      "id": "comp-1",
      "name": "Rocks Company Ltd",
      "description": "Corporate Headquarters",
      "phoneNumber": "+2348129887896",
      "address": {
        "state": "FCT",
        "lga": "Municipal",
        "settlement": "Wuse 2",
        "street": "42 Michael Okpara Street, House 7"
      }
    }
  }
}
```

**Validation:**
| Field | Type | Rules |
|----------------|---------|--------------------------------------------------------|
| companyName | string | Required, min 2 characters |
| email | string | Required, valid email format, must be unique |
| description | string | Required, one of predefined company types |
| phone | string | Required, must be a valid Nigerian number starting with +234 |
| address | object | Required, must include `state`, `lga`, `settlement`, and `street` |
| password | string | Required, min 6 characters |
| agreeTerms | boolean | Required, must be `true` |

---

### 1.5 Get Current User

Return the currently authenticated user's company details.

**`GET /auth/me`**

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "company": {
      "id": "comp-1",
      "name": "Rocks Company Ltd",
      "description": "Corporate Headquarters",
      "email": "admin@rockscompany.com",
      "phoneNumber": "+2348129887896",
      "address": {
        "state": "FCT",
        "lga": "Municipal",
        "settlement": "Wuse 2",
        "street": "42 Michael Okpara Street, House 7"
      }
    }
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

### 1.6 Send OTP

Send a 6-digit OTP to the user's email for registration verification.

**`POST /auth/send-otp`**

**Request Body:**

```json
{
  "email": "admin@rockscompany.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "OTP sent to email"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "An account with this email already exists"
}
```

**Validation:**
| Field | Type | Rules |
|-------|------|-------|
| email | string | Required, valid email format, must not already be registered |

---

### 1.7 Verify OTP

Verify the 6-digit OTP sent to the user's email.

**`POST /auth/verify-otp`**

**Request Body:**

```json
{
  "email": "admin@rockscompany.com",
  "otp": "483291"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Email verified",
  "data": {
    "verificationToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Validation:**
| Field | Type | Rules |
|-------|------|-------|
| email | string | Required, must match the email used to request the OTP |
| otp | string | Required, 6-digit numeric code |

---

### 1.3 Forgot Password

Send a password reset link to the user's email.

**`POST /auth/forgot-password`**

**Request Body:**

```json
{
  "email": "admin@rockscompany.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

### 1.4 Change Password

Update the authenticated user's password.

**`PUT /auth/change-password`**

**Request Body:**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePass456"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 1.8 Delete Account

Permanently delete the authenticated admin's account **and ALL associated company data** (departments, positions, employees, education, salary, bank accounts, documents, notes, activity). This action is **irreversible**. Requires the current password to confirm.

**`DELETE /auth/account`**

**Auth:** `Bearer <token>` required.

**Request Body:**

```json
{
  "password": "securePassword123"
}
```

**Validation:**
| Field | Type | Rules |
|-------|------|-------|
| password | string | Required, must match the current password |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account and all associated data deleted successfully"
}
```

**Error Responses (all `400`):**

```json
{ "success": false, "message": "Password is required to delete your account" }
```

```json
{ "success": false, "message": "Incorrect password" }
```

---

## 2. Employees

---

### 2.1 List Employees

Get a paginated, searchable, filterable, sortable list of employees.

**`GET /employees`**

**Query Parameters:**
| Parameter | Type | Default | Description |
|-------------|---------|----------|------------------------------------------------------|
| page | integer | 1 | Page number for pagination |
| limit | integer | 10 | Items per page |
| search | string | — | Search by name, ID, or position (partial match) |
| department | string | — | Filter by department name (exact match) |
| status | string | — | Filter by status: `Active`, `Inactive`, `Probation`, `OnLeave`, `Resigned`, `Terminated` |
| sortBy | string | `name` | Sort field: `name`, `dept`, `joined` |
| sortOrder | string | `asc` | Sort direction: `asc` or `desc` |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "EMP-26-07-001",
        "firstName": "Brooklyn",
        "lastName": "Simmons",
        "email": "brok-simms@mail.com",
        "phoneNumber": "+1 312 908 1234",
        "department": "Design",
        "position": "Creative Director",
        "employmentType": "Full-time",
        "status": "Active",
        "hireDate": "2024-01-10",
        "photoUrl": "https://cdn.staffsync.com/photos/EMP-26-07-001.jpg"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 34,
      "totalPages": 4
    }
  }
}
```

---

### 2.2 Get Single Employee

Get full employee profile including all nested data.

**`GET /employees/:id`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "EMP-26-07-001",
      "firstName": "Brooklyn",
      "lastName": "Simmons",
      "email": "brok-simms@mail.com",
      "phoneNumber": "+1 312 908 1234",
      "gender": "Female",
      "dob": "1992-05-14",
      "address": "123 Avenue block, Chicago, IL",
      "emergencyContact": "Mark Simmons (+1 312 908 4321)",
      "department": "Design",
      "position": "Creative Director",
      "employmentType": "Full-time",
      "hireDate": "2024-01-10",
      "reportingManager": "Self",
      "status": "Active",
      "photoUrl": "https://cdn.staffsync.com/photos/EMP-26-07-001.jpg",
      "education": [
        {
          "id": "edu-1",
          "institutionName": "Chicago Art Institute",
          "qualification": "BFA",
          "fieldOfStudy": "Graphic Design",
          "graduationYear": "2014"
        }
      ],
      "salary": {
        "baseSalary": 8500,
        "bonus": 1500,
        "allowances": 500
      },
      "bankAccount": {
        "bankName": "Chase Bank",
        "accountName": "Brooklyn Simmons",
        "accountNumber": "1234567890"
      },
      "documents": [
        {
          "id": "doc-1",
          "name": "Resume_Brooklyn.pdf",
          "type": "Resume",
          "uploadDate": "2024-01-09",
          "fileUrl": "https://cdn.staffsync.com/documents/doc-1.pdf"
        }
      ],
      "notes": [
        {
          "id": "n-1",
          "title": "Creative Input",
          "text": "Brooklyn has outstanding creative inputs.",
          "createdDate": "2024-02-10"
        }
      ],
      "createdAt": "2024-01-10T08:00:00Z",
      "updatedAt": "2024-06-15T14:30:00Z"
    }
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Employee not found"
}
```

---

### 2.3 Create Employee

Register a new employee in the system.

**`POST /employees`**

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phoneNumber": "+1 555 123 4567",
  "gender": "Male",
  "department": "Development",
  "position": "Software Engineer",
  "employmentType": "Full-time",
  "hireDate": "2025-07-01",
  "status": "Active"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "id": "EMP-26-07-002",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "department": "Development",
    "position": "Software Engineer",
    "status": "Active"
  }
}
```

**Validation:**
| Field | Type | Rules |
|----------------|--------|-------------------------------------------------------------|
| firstName | string | Required, min 2 characters |
| lastName | string | Required, min 2 characters |
| email | string | Required, valid email format |
| phoneNumber | string | Required, min 6 characters |
| gender | string | Required, one of: `Male`, `Female`, `Other` |
| department | string | Optional, must match an existing department name |
| position | string | Optional, name of the Position (e.g. `"Software Engineer"`; must belong to the selected department) |
| employmentType | string | Required, one of: `Full-time`, `Part-time`, `Contract`, `Intern`, `Remote` |
| hireDate | string | Optional, ISO date format (YYYY-MM-DD), defaults to today |
| status | string | Optional, one of: `Active`, `Inactive`, `Probation`, `OnLeave`, `Resigned`, `Terminated`; defaults to `Active` |

---

### 2.4 Update Employee

Update one or more fields of an employee record. Supports partial updates.

**`PUT /employees/:id`**

**Request Body (partial — any combination):**

```json
{
  "firstName": "Jonathan",
  "lastName": "Doe",
  "email": "jonathan.doe@company.com",
  "phoneNumber": "+1 555 987 6543",
  "gender": "Male",
  "dob": "1990-03-15",
  "address": "456 Oak St, New York, NY",
  "emergencyContact": "Jane Doe (+1 555 987 6542)",
  "department": "Design",
  "position": "Senior UX Designer",
  "employmentType": "Full-time",
  "hireDate": "2024-06-01",
  "reportingManager": "Brooklyn Simmons",
  "status": "Active",
  "photoUrl": "https://cdn.staffsync.com/photos/EMP-26-07-002.jpg"
}
```

> **Note:** If `department` is changed, `position` **must** also be provided — the position will be reset to match the new department's available positions. Setting `department` to `null` or empty clears both department and position.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "EMP-26-07-002",
      "firstName": "Jonathan",
      "lastName": "Doe",
      "email": "jonathan.doe@company.com",
      "status": "Active"
    }
  }
}
```

---

### 2.5 Delete Employee

Remove an employee record from the system.

**`DELETE /employees/:id`**

**Success Response (200):**

```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Employee not found"
}
```

---

### 2.6 Update Employee Salary

Update an employee's compensation details.

**`PUT /employees/:id/salary`**

**Request Body:**

```json
{
  "baseSalary": 9500,
  "bonus": 2000,
  "allowances": 500
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "salary": {
      "baseSalary": 9500,
      "bonus": 2000,
      "allowances": 500
    }
  }
}
```

---

### 2.7 Update Employee Bank Account

Update an employee's bank details for payroll.

**`PUT /employees/:id/bank`**

**Request Body:**

```json
{
  "bankName": "Chase Bank",
  "accountName": "Brooklyn Simmons",
  "accountNumber": "1234567890"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "bankAccount": {
      "bankName": "Chase Bank",
      "accountName": "Brooklyn Simmons",
      "accountNumber": "1234567890"
    }
  }
}
```

---

### 2.8 Employee Education Records

#### 2.8.1 Add Education Record

**`POST /employees/:id/education`**

**Request Body:**

```json
{
  "institutionName": "MIT",
  "qualification": "M.Sc.",
  "fieldOfStudy": "Artificial Intelligence",
  "graduationYear": "2020"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "education": {
      "id": "edu-3",
      "institutionName": "MIT",
      "qualification": "M.Sc.",
      "fieldOfStudy": "Artificial Intelligence",
      "graduationYear": "2020"
    }
  }
}
```

#### 2.8.2 Delete Education Record

**`DELETE /employees/:id/education/:educationId`**

**Success Response (200):**

```json
{
  "success": true,
  "message": "Education record deleted successfully"
}
```

---

### 2.9 Employee Documents

#### 2.9.1 Add Document

**`POST /employees/:id/documents`**

> **Content-Type:** `application/json` > **Note:** Upload the file to Cloudinary (or similar) from the frontend first, then send the returned URL here.

**Request Body:**

```json
{
  "name": "Resume 2026.pdf",
  "type": "Resume",
  "fileUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1/documents/abc123.pdf"
}
```

**Validation:**
| Field | Type | Rules |
|-------|------|-------|
| name | string | Required, document display name |
| type | string | Required: `Resume`, `Employment Letter`, `Certificates`, `Other Documents` |
| fileUrl | string | Required, the URL returned from your cloud upload service |

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc-5",
      "name": "Resume 2026.pdf",
      "type": "Resume",
      "uploadDate": "2025-07-01",
      "fileUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1/documents/abc123.pdf"
    }
  }
}
```

#### 2.9.2 Delete Document

**`DELETE /employees/:id/documents/:documentId`**

**Success Response (200):**

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### 2.9.3 Download Document

Proxy a document file from Cloudinary and return it as a download.

**`GET /employees/:id/documents/:documentId/download`**

**Success Response (200):**

The file is returned as a binary download with the following headers:

- `Content-Type: application/pdf` (or the file's actual MIME type)
- `Content-Disposition: attachment; filename="{document.name}"`

**Error Response (404):**

```json
{
  "success": false,
  "message": "Employee not found"
}
```

```json
{
  "success": false,
  "message": "Document not found"
}
```

```json
{
  "success": false,
  "message": "Document has no file URL"
}
```

**Error Response (500):**

```json
{
  "success": false,
  "message": "Failed to fetch file from storage"
}
```

---

### 2.10 Employee Professional Headshot

> The professional headshot is stored the same way as documents — the image
> bytes are stored directly in Postgres (bytea) and served via a dedicated
> endpoint. No external/Cloudinary storage is needed on the frontend; it just
> uploads the file as `multipart/form-data` with a single `file` field.
> `professionalHeadshot` is a separate field from `photoUrl` and is returned
> (string URL/path, nullable) on all employee reads.

#### 2.10.1 Upload Professional Headshot

**`POST /employees/:id/headshot`**

> **Content-Type:** `multipart/form-data`

**Request Form Field:**

| Field | Type | Rules |
|-------|------|-------|
| file | file | Required, **PNG/JPG/JPEG only**, max **1 MB** |

Replaces any existing headshot (the old image bytes are overwritten).

**Success Response (200):** returns the **updated employee object** so the frontend can refresh.

```json
{
  "success": true,
  "message": "Professional headshot uploaded successfully",
  "data": {
    "employee": {
      "id": "EMP-26-07-001",
      "firstName": "Brooklyn",
      "lastName": "Simmons",
      "email": "brok-simms@mail.com",
      "phoneNumber": "+1 312 908 1234",
      "department": "Design",
      "position": "Creative Director",
      "employmentType": "Full-time",
      "status": "Active",
      "hireDate": "2024-01-10",
      "photoUrl": null,
      "professionalHeadshot": "/api/employees/EMP-26-07-001/headshot"
    }
  }
}
```

**Error Responses:**

```json
{ "success": false, "message": "Only PNG, JPG, and JPEG images are allowed." }
```

```json
{ "success": false, "message": "File is too large. Maximum size is 1 MB." }
```

```json
{ "success": false, "message": "File is required" }
```

#### 2.10.2 Get Professional Headshot

**`GET /employees/:id/headshot`**

Returns the stored headshot image bytes with the correct `Content-Type`
(`image/png` or `image/jpeg`). This is the URL the `professionalHeadshot`
field points to.

**Success Response (200):** image binary.

**Error Responses:**

```json
{ "success": false, "message": "Employee not found" }
```

```json
{ "success": false, "message": "No headshot available" }
```

#### 2.10.3 Remove Professional Headshot

**`DELETE /employees/:id/headshot`**

Deletes the stored headshot image and resets `professionalHeadshot` to `null`.
Idempotent — succeeds even if there is no headshot, so the frontend never
sees an error. Returns the **updated employee object** (200).

```json
{
  "success": true,
  "message": "Professional headshot removed successfully",
  "data": {
    "employee": {
      "id": "EMP-26-07-001",
      "professionalHeadshot": null
    }
  }
}
```

---

### 2.11 Employee Notes

#### 2.11.1 Add Note

**`POST /employees/:id/notes`**

**Request Body:**

```json
{
  "title": "Performance Note",
  "text": "Employee is performing exceptionally well this quarter."
}
```

**Validation:**
| Field | Type | Rules |
|-------|------|-------|
| title | string | Required |
| text | string | Required |

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "note": {
      "id": "n-15",
      "title": "Performance Note",
      "text": "Employee is performing exceptionally well this quarter.",
      "createdDate": "2025-07-01"
    }
  }
}
```

#### 2.11.2 Delete Note

**`DELETE /employees/:id/notes/:noteId`**

**Success Response (200):**

```json
{
  "success": true,
  "message": "Note deleted successfully"
}
```

---

## 3. Departments

---

### 3.1 List Departments

Get all departments with employee counts.

**`GET /departments`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "DES-26-07-001",
        "name": "Design",
        "abbreviation": "DES",
        "description": "User interface design, experience planning, and product aesthetics research.",
        "head": "Brooklyn Simmons",
        "employeeCount": 12,
        "dateCreated": "2024-01-10"
      },
      {
        "id": "DEV-26-07-002",
        "name": "Development",
        "abbreviation": "DEV",
        "description": "Engineering, stack architecture, DevOps.",
        "head": "Cody Fisher",
        "employeeCount": 8,
        "dateCreated": "2024-01-12"
      }
    ]
  }
}
```

---

### 3.2 Get Single Department

Get department details and its members.

**`GET /departments/:id`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "department": {
      "id": "DES-26-07-001",
      "name": "Design",
      "abbreviation": "DES",
      "description": "User interface design, experience planning, and product aesthetics research.",
      "head": "Brooklyn Simmons",
      "dateCreated": "2024-01-10"
    },
    "members": [
      {
        "id": "EMP-26-07-001",
        "firstName": "Brooklyn",
        "lastName": "Simmons",
        "email": "brok-simms@mail.com",
        "position": "Creative Director",
        "status": "Active",
        "hireDate": "2024-01-10",
        "photoUrl": "https://cdn.staffsync.com/photos/EMP-26-07-001.jpg"
      }
    ]
  }
}
```

---

### 3.3 Create Department

**`POST /departments`**

**Request Body:**

```json
{
  "name": "DevOps",
  "description": "Infrastructure, CI/CD, and cloud services management.",
  "head": "John Doe"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "DEV-26-07-003",
    "name": "DevOps",
    "abbreviation": "DEV",
    "description": "Infrastructure, CI/CD, and cloud services management.",
    "head": "John Doe",
    "dateCreated": "2025-07-01"
  }
}
```

**Validation:**
| Field | Type | Rules |
|------------|--------|--------------------------------------------|
| name | string | Required, unique department name (abbreviation auto-generated) |
| description| string | Optional |
| head | string | Required, defaults to `"Not assigned"` |

---

### 3.4 Update Department

**`PUT /departments/:id`**

**Request Body (partial):**

```json
{
  "name": "Design & UX",
  "description": "Updated description for Design department.",
  "head": "Jane Smith"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Department updated successfully"
}
```

---

### 3.5 Delete Department

**`DELETE /departments/:id`**

**Success Response (200):**

```json
{
  "success": true,
  "message": "Department deleted successfully"
}
```

### 3.5 Employee Count by Department

Returns department names with their total employee counts. Counts **all** employees — not filtered by salary assignment.

**`GET /departments/employee-count`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "department": "Design",
        "employeeCount": 12
      },
      {
        "department": "Development",
        "employeeCount": 8
      },
      {
        "department": "HR",
        "employeeCount": 5
      },
      {
        "department": "Marketing",
        "employeeCount": 9
      }
    ]
  }
}
```

---

### 3.6 List Department Positions

Get all positions belonging to a department. Used to populate the position dropdown in employee creation/editing.

**`GET /departments/:departmentId/positions`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Software Engineer",
        "description": "Full-stack software development",
        "createdAt": "2025-07-01T08:00:00.000Z",
        "updatedAt": "2025-07-01T08:00:00.000Z"
      },
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "title": "Lead Developer",
        "description": "Technical lead and architecture decisions",
        "createdAt": "2025-07-01T08:00:00.000Z",
        "updatedAt": "2025-07-01T08:00:00.000Z"
      }
    ]
  }
}
```

---

### 3.7 Create Position

**`POST /departments/:departmentId/positions`**

**Request Body:**

```json
{
  "title": "Software Engineer",
  "description": "Full-stack software development"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Software Engineer",
    "description": "Full-stack software development",
    "departmentId": "DEV-26-07-001",
    "createdAt": "2025-07-01T08:00:00.000Z",
    "updatedAt": "2025-07-01T08:00:00.000Z"
  }
}
```

**Validation:**
| Field | Type | Rules |
|-------------|--------|----------------------------------------------------------|
| title | string | Required, min 2 characters, must be unique within the department (case-insensitive) |
| description | string | Optional |

**Error Response (400) — duplicate title:**

```json
{
  "success": false,
  "message": "Position \"Software Engineer\" already exists in this department"
}
```

---

### 3.8 Update Position

**`PUT /departments/:departmentId/positions/:positionId`**

**Request Body (partial):**

```json
{
  "title": "Senior Software Engineer",
  "description": "Senior full-stack software development role"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Position updated successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Senior Software Engineer",
    "description": "Senior full-stack software development role",
    "departmentId": "DEV-26-07-001",
    "createdAt": "2025-07-01T08:00:00.000Z",
    "updatedAt": "2025-07-02T10:00:00.000Z"
  }
}
```

---

### 3.9 Delete Position

**`DELETE /departments/:departmentId/positions/:positionId`**

**Success Response (200):**

**Success Response (200):**

```json
{
  "success": true,
  "message": "Position deleted successfully"
}
```

**Error Response (400) — employees assigned:**

```json
{
  "success": false,
  "message": "Cannot delete — 3 employee(s) are assigned to this position. Reassign them first."
}
```

---

### 3.10 Position Headcount Stats

Get a headcount summary for each position in a department.

**`GET /departments/:departmentId/positions/stats`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "positionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Software Engineer",
        "employeeCount": 5
      },
      {
        "positionId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "title": "Lead Developer",
        "employeeCount": 1
      }
    ]
  }
}
```

---

## 5. Dashboard

### 5.1 Get Dashboard Statistics

Aggregated counts and metrics for the overview page.

**`GET /dashboard/stats`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalEmployees": 34,
    "activeEmployees": 28,
    "inactiveEmployees": 6,
    "totalDepartments": 4,
    "newEmployeesThisMonth": 3,
    "statusDistribution": {
      "active": 28,
      "inactive": 3,
      "probation": 2,
      "resigned": 1,
      "terminated": 0
    },
    "recentEmployees": [
      {
        "id": "EMP-26-07-002",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@mail.com",
        "phoneNumber": "+1 555 123 4567",
        "department": "Development",
        "position": "Software Engineer",
        "employmentType": "Full-time",
        "status": "Active",
        "hireDate": "2025-07-01",
        "photoUrl": null
      }
    ],
    "departmentOverview": [
      {
        "id": "DES-26-07-001",
        "name": "Design",
        "abbreviation": "DES",
        "employeeCount": 12,
        "head": "Brooklyn Simmons"
      },
      {
        "id": "DEV-26-07-001",
        "name": "Development",
        "abbreviation": "DEV",
        "employeeCount": 8,
        "head": "Cody Fisher"
      }
    ],
    "recentActivity": [
      {
        "id": "act-001",
        "action": "You added a note for Brooklyn Simmons",
        "timestamp": "2 hours ago",
        "type": "note"
      },
      {
        "id": "act-002",
        "action": "You uploaded a Resume for Cody Fisher",
        "timestamp": "yesterday",
        "type": "document"
      },
      {
        "id": "act-003",
        "action": "You created the Design department",
        "timestamp": "2 days ago",
        "type": "department"
      },
      {
        "id": "act-004",
        "action": "You updated salary for Ralph Edwards",
        "timestamp": "3 days ago",
        "type": "salary"
      },
      {
        "id": "act-005",
        "action": "You created employee Martin Cooper",
        "timestamp": "5 days ago",
        "type": "employee"
      }
    ]
  }
}
```

---

## 6. Reports

### 6.1 Employee Summary Report

Get aggregate employee data for the reports page.

**`GET /reports/employee-summary`**

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalEmployees": 34,
    "activeEmployees": 28,
    "inactiveEmployees": 6,
    "totalDepartments": 4,
    "employeesPerDepartment": [
      {
        "department": "Design",
        "count": 12,
        "percentage": 35.3
      }
    ]
  }
}
```

---

### 6.2 Salary Summary Report

Get payroll and compensation data.

**`GET /reports/salary-summary`**

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalMonthlyPayroll": 245000,
    "averageCompensation": 7205,
    "highestPaid": 10500,
    "salaryDistributionByDepartment": [
      {
        "department": "Design",
        "averageSalary": 8200,
        "totalPayroll": 98400,
        "employeeCount": 12
      },
      {
        "department": "Development",
        "averageSalary": 6800,
        "totalPayroll": 54400,
        "employeeCount": 8
      }
    ]
  }
}
```

---

### 6.3 Hiring Trend Report

Get employee growth data over time.

**`GET /reports/hiring-trend`**

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|--------|---------|------------------------------------------|
| months | integer | 12 | Number of months to look back |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "labels": [
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun"
    ],
    "data": [3, 1, 0, 2, 4, 1, 5, 2, 3, 0, 1, 2]
  }
}
```

The `labels` array contains month abbreviations (e.g. `"Jan"`, `"Feb"`). The `data` array contains the number of employees hired in each corresponding month.

---

### 6.4 Export Full Report

Download the complete report — **Employee Summary** + **Salary Summary** + **Hiring Trend** — all in one file.

**`GET /reports/export`**

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|--------|---------|------------------------------------------|
| format | string | `csv` | Export format: `csv` or `pdf` |

**Success Response (200) — CSV:**

Returns a single CSV file with three sections separated by headers and blank lines.

**Headers:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="StaffSync-Report-<timestamp>.csv"`

```csv
=== EMPLOYEE SUMMARY ===
ID,First Name,Last Name,Email,Department,Position,Status,Hire Date
EMP-26-07-001,Brooklyn,Simmons,brok-simms@mail.com,Design,Creative Director,Active,2024-01-10
EMP-26-07-002,Cody,Fisher,cody.fisher@mail.com,Development,Lead Developer,Active,2024-01-12

=== SALARY SUMMARY ===
Employee ID,Name,Base Salary,Bonus,Allowances,Total
EMP-26-07-001,Brooklyn Simmons,8500,1500,500,10500
EMP-26-07-002,Cody Fisher,7200,1000,300,8500

=== HIRING TREND ===
Period,Hires
Jul 2025,3
Aug 2025,1
```

**Success Response (200) — PDF:**

Returns a multi-page PDF with formatted tables.

**Headers:** `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="StaffSync-Report-<timestamp>.pdf"`

- **Page 1:** Employee Summary table (ID, Name, Email, Department, Status, Hire Date)
- **Page 2:** Salary Summary table (Employee, Base Salary, Bonus, Allowances, Total)
- **Page 3:** Hiring Trend table (Period, Hires)

---

## 7. Settings

### 7.1 Get Settings

**`GET /settings`**

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "company": {
      "id": "comp-1",
      "name": "Rocks Company Ltd",
      "description": "Corporate Headquarters",
      "email": "contact@rockscompany.com",
      "phoneNumber": "+2348129887896",
      "address": {
        "state": "FCT",
        "lga": "Municipal",
        "settlement": "Wuse 2",
        "street": "42 Michael Okpara Street, House 7"
      }
    }
  }
}
```

---

### 7.2 Update Company Information

**`PUT /settings/company`**

**Request Body:**

```json
{
  "name": "Rocks Company Ltd",
  "description": "Corporate Headquarters",
  "email": "contact@rockscompany.com",
  "phoneNumber": "+2348129887896",
  "address": {
    "state": "FCT",
    "lga": "Municipal",
    "settlement": "Wuse 2",
    "street": "42 Michael Okpara Street, House 7"
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Company information updated successfully",
  "data": {
    "company": {
      "name": "Rocks Company Ltd",
      "description": "Corporate Headquarters",
      "email": "contact@rockscompany.com",
      "phoneNumber": "+2348129887896",
      "address": {
        "state": "FCT",
        "lga": "Municipal",
        "settlement": "Wuse 2",
        "street": "42 Michael Okpara Street, House 7"
      }
    }
  }
}
```

---

## 8. Health

### 10.1 Health Check

Check if the API is running.

**`GET /api/health`**

**Success Response (200):**

```json
{
  "success": true,
  "message": "StaffSync API is running",
  "uptime": 190.48,
  "timestamp": "2026-07-16T21:57:26.582Z"
}
```

---

## 9. Data Models

### Employee

```json
{
  "id": "string (auto-generated, format: EMP-YY-MM-SEQ)",
  "firstName": "string",
  "lastName": "string",
  "email": "string (unique)",
  "phoneNumber": "string",
  "gender": "string (Male | Female | Other)",
  "dob": "string (ISO date, optional)",
  "address": "string (optional)",
  "emergencyContact": "string (optional)",
  "department": "string (references Department.name, optional)",
  "position": "string (resolved position title from Position model; 'HOD' when the employee is a department head with no personally assigned position)",
  "positionId": "string (UUID, FK to Position.id, returned in responses)",
  "employmentType": "string (Full-time | Part-time | Contract | Intern | Remote)",
  "hireDate": "string (ISO date)",
  "reportingManager": "string (optional)",
  "status": "string (Active | Inactive | Probation | OnLeave | Resigned | Terminated)",
  "photoUrl": "string (optional, URL to image)",
  "professionalHeadshot": "string (optional, nullable — URL/path served by GET /employees/:id/headshot)",
  "education": "Education[]",
  "salary": "Salary",
  "bankAccount": "BankAccount",
  "documents": "Document[]",
  "notes": "Note[]",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)"
}
```

### Department

```json
{
  "id": "string (auto-generated, format: ABB-YY-MM-SEQ, e.g. DES-26-07-001)",
  "name": "string (unique)",
  "abbreviation": "string (auto-derived, e.g. DES)",
  "description": "string",
  "head": "string",
  "employeeCount": "integer",
  "dateCreated": "string (ISO date)"
}
```

### Position

```json
{
  "id": "string (UUID, auto-generated)",
  "departmentId": "string (FK to Department.id)",
  "title": "string (unique per department, case-insensitive)",
  "description": "string (optional)",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)"
}
```

- A department can have many positions.
- Position titles must be unique within a department (case-insensitive).
- Deleting a department cascade-deletes all its positions.
- Employees reference positions via `positionId` (FK to `Position.id`).

### Education

```json
{
  "id": "string (auto-generated, format: edu-xxx)",
  "institutionName": "string",
  "qualification": "string (abbreviation, e.g. \"B.Sc.\", \"RN\", \"HND\", \"NCE\")",
  "fieldOfStudy": "string",
  "graduationYear": "string (year)"
}
```

### Salary

```json
{
  "baseSalary": "number (monthly)",
  "bonus": "number (monthly)",
  "allowances": "number (monthly)"
}
```

### BankAccount

```json
{
  "bankName": "string",
  "accountName": "string",
  "accountNumber": "string"
}
```

### Document

```json
{
  "id": "string (auto-generated, format: doc-xxx)",
  "name": "string",
  "type": "string (Resume | Employment Letter | Certificates | Other Documents)",
  "uploadDate": "string (ISO date)",
  "fileUrl": "string (URL to file)"
}
```

### Note

```json
{
  "id": "string (auto-generated, format: n-xxx)",
  "title": "string",
  "text": "string",
  "createdDate": "string (ISO date)"
}
```

### Admin Profile

```json
{
  "name": "string",
  "email": "string",
  "profilePicture": "string (URL)"
}
```

### Company Info

```json
{
  "name": "string",
  "email": "string",
  "phoneNumber": "string",
  "address": {
    "state": "string",
    "lga": "string",
    "settlement": "string",
    "street": "string"
  }
}
```

### Common Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": {
    "fieldName": ["Validation error message"]
  }
}
```

| HTTP Status | Meaning                              |
| ----------- | ------------------------------------ |
| 200         | OK — Success                         |
| 201         | Created — Resource created           |
| 400         | Bad Request — Validation error       |
| 401         | Unauthorized — Missing/invalid token |
| 403         | Forbidden — Insufficient permissions |
| 404         | Not Found — Resource doesn't exist   |
| 500         | Internal Server Error                |

---

## Endpoints Summary

| #   | Method | Endpoint                                   | Description                               |
| --- | ------ | ------------------------------------------ | ----------------------------------------- |
| 1   | POST   | `/auth/login`                              | User login                                |
| 2   | POST   | `/auth/register`                           | Create account / register org             |
| 3   | POST   | `/auth/forgot-password`                    | Request password reset                    |
| 4   | PUT    | `/auth/change-password`                    | Change password                           |
| 5   | GET    | `/employees`                               | List employees (paginated)                |
| 6   | GET    | `/employees/:id`                           | Get employee full profile                 |
| 7   | POST   | `/employees`                               | Create new employee                       |
| 8   | PUT    | `/employees/:id`                           | Update employee                           |
| 9   | DELETE | `/employees/:id`                           | Delete employee                           |
| 10  | PUT    | `/employees/:id/salary`                    | Update salary                             |
| 11  | PUT    | `/employees/:id/bank`                      | Update bank account                       |
| 12  | POST   | `/employees/:id/education`                 | Add education record                      |
| 13  | DELETE | `/employees/:id/education/:eduId`          | Delete education record                   |
| 14  | POST   | `/employees/:id/documents`                 | Add document (send fileUrl)               |
| 15  | GET    | `/employees/:id/documents/:docId/download` | Download document (proxy from Cloudinary) |
| 16  | DELETE | `/employees/:id/documents/:docId`          | Delete document                           |
| 16  | POST   | `/employees/:id/notes`                     | Add note                                  |
| 17  | DELETE | `/employees/:id/notes/:noteId`             | Delete note                               |
| 18  | GET    | `/departments`                             | List departments                          |
| 19  | GET    | `/departments/employee-count`              | Employee count by department              |
| 20  | GET    | `/departments/:id`                         | Get department + members                  |
| 20  | POST   | `/departments`                             | Create department                         |
| 21  | PUT    | `/departments/:id`                         | Update department                         |
| 22  | DELETE | `/departments/:id`                         | Delete department                         |
| 23  | GET    | `/departments/:deptId/positions`           | List department positions                 |
| 24  | POST   | `/departments/:deptId/positions`           | Create position in department             |
| 25  | PUT    | `/departments/:deptId/positions/:posId`    | Update position                           |
| 26  | DELETE | `/departments/:deptId/positions/:posId`    | Delete position                           |
| 27  | GET    | `/departments/:deptId/positions/stats`     | Position headcount stats                  |
| 28  | GET    | `/dashboard/stats`                         | Dashboard overview statistics             |
| 30  | GET    | `/reports/employee-summary`                | Employee summary report                   |
| 31  | GET    | `/reports/salary-summary`                  | Salary/payroll report                     |
| 32  | GET    | `/reports/hiring-trend`                    | Hiring growth trend data                  |
| 33  | GET    | `/reports/export`                          | Export full report (CSV or PDF)           |
| 34  | GET    | `/settings`                                | Get company settings                      |
| 35  | PUT    | `/settings/company`                        | Update company info                       |

---

> **Notes for the Backend Team:**
>
> - Employee IDs follow the format `EMP-YY-MM-SEQ`, Department IDs follow `ABB-YY-MM-SEQ`.
> - The `department` field on an employee references `Department.name` (not the ID).
> - `department` and `position` are optional on employee create/update. When department is provided, `GET /departments/:deptId/positions` can be used to populate the position dropdown.
> - If an employee's department is changed, the position **must be re-specified** (the old position likely doesn't exist in the new department).
> - Deleting a position is **blocked** if employees are currently assigned to it.
> - Deleting a department cascade-deletes all its positions.
> - The `photoUrl` on employees can be a file upload URL or an external URL (e.g., from Unsplash).
> - File uploads are handled client-side (Cloudinary or similar). The backend only stores the URL string.
> - Use the frontend helper `uploadImageToCloudinary(file)` to upload, then send the returned `secure_url` to the backend.
> - The `reports/export` endpoint should stream the file for download.
> - Pagination metadata (`page`, `limit`, `totalItems`, `totalPages`) is expected on all list endpoints.
> - All timestamps should be in ISO 8601 format (UTC).
