const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StaffSync API',
      version: '1.0.0',
      description: 'Employee Management Dashboard — Backend API',
      contact: {
        email: 'admin@rockscompany.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.staffsync.com/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ─── Error ──────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error description' },
            errors: {
              type: 'object',
              example: { fieldName: ['Validation error message'] },
            },
          },
        },

        // ─── Auth ───────────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@rockscompany.com' },
            password: { type: 'string', minLength: 6, example: 'securePassword123' },
            rememberMe: { type: 'boolean', default: false },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                expiresIn: { type: 'integer', example: 86400 },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['companyName', 'email', 'description', 'phone', 'address', 'password', 'agreeTerms'],
          properties: {
            companyName: { type: 'string', minLength: 2, example: 'Rocks Company Ltd' },
            email: { type: 'string', format: 'email', example: 'admin@rockscompany.com' },
            description: { type: 'string', example: 'Corporate Headquarters' },
            phone: { type: 'string', example: '+2348129887896' },
            address: {
              type: 'object',
              required: ['state', 'lga', 'settlement', 'street'],
              properties: {
                state: { type: 'string', example: 'FCT' },
                lga: { type: 'string', example: 'Municipal' },
                settlement: { type: 'string', example: 'Wuse 2' },
                street: { type: 'string', example: '42 Michael Okpara Street, House 7' },
              },
            },
            password: { type: 'string', minLength: 6, example: 'securePassword123' },
            agreeTerms: { type: 'boolean', example: true },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Account created successfully' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                user: { $ref: '#/components/schemas/User' },
                company: { $ref: '#/components/schemas/Company' },
              },
            },
          },
        },
        SendOtpRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@rockscompany.com' },
          },
        },
        VerifyOtpRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@rockscompany.com' },
            otp: { type: 'string', example: '483291' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr-1' },
            name: { type: 'string', example: 'Admin Strator' },
            email: { type: 'string', example: 'admin@rockscompany.com' },
            role: { type: 'string', example: 'admin' },
            profilePicture: { type: 'string', nullable: true, example: 'https://cdn.staffsync.com/images/admin.jpg' },
          },
        },

        // ─── Company ────────────────────────────────────────
        Company: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'comp-1' },
            name: { type: 'string', example: 'Rocks Company Ltd' },
            email: { type: 'string', example: 'contact@rockscompany.com' },
            phoneNumber: { type: 'string', example: '+1 312 908 1234' },
            address: { type: 'string', example: '123 Avenue block, Chicago, IL' },
            description: { type: 'string', example: 'Corporate Headquarters' },
          },
        },

        // ─── Employee ───────────────────────────────────────
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'EMP-26-07-001' },
            firstName: { type: 'string', example: 'Brooklyn' },
            lastName: { type: 'string', example: 'Simmons' },
            email: { type: 'string', example: 'brok-simms@mail.com' },
            phoneNumber: { type: 'string', example: '+1 312 908 1234' },
            department: { type: 'string', example: 'Design' },
            position: { type: 'string', example: 'Creative Director' },
            positionId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            employmentType: { type: 'string', enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Remote'] },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Probation', 'Resigned', 'Terminated'] },
            hireDate: { type: 'string', format: 'date', example: '2024-01-10' },
            photoUrl: { type: 'string', nullable: true },
            professionalHeadshot: { type: 'string', nullable: true, description: 'URL/path to the employee\'s professional headshot (served by GET /employees/{id}/headshot)' },
          },
        },
        EmployeeDetail: {
          allOf: [
            { $ref: '#/components/schemas/Employee' },
            {
              type: 'object',
              properties: {
                gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
                dob: { type: 'string', format: 'date', nullable: true },
                address: { type: 'string', nullable: true },
                emergencyContact: { type: 'string', nullable: true },
                reportingManager: { type: 'string', nullable: true },
                education: { type: 'array', items: { $ref: '#/components/schemas/Education' } },
                salary: { $ref: '#/components/schemas/Salary' },
                bankAccount: { $ref: '#/components/schemas/BankAccount' },
                documents: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
                notes: { type: 'array', items: { $ref: '#/components/schemas/Note' } },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        CreateEmployeeRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'phoneNumber', 'gender', 'employmentType'],
          properties: {
            firstName: { type: 'string', minLength: 2, example: 'John' },
            lastName: { type: 'string', minLength: 2, example: 'Doe' },
            email: { type: 'string', format: 'email' },
            phoneNumber: { type: 'string', minLength: 6 },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
            department: { type: 'string', example: 'Development' },
            position: { type: 'string', description: 'UUID of the Position (must belong to the selected department)' },
            employmentType: { type: 'string', enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Remote'] },
            hireDate: { type: 'string', format: 'date', description: 'Defaults to today if not provided' },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Probation', 'OnLeave', 'Resigned', 'Terminated'], description: 'Defaults to Active if not provided' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalItems: { type: 'integer', example: 34 },
            totalPages: { type: 'integer', example: 4 },
          },
        },

        // ─── Education ──────────────────────────────────────
        Education: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'edu-1' },
            institutionName: { type: 'string', example: 'MIT' },
            qualification: { type: 'string', example: 'M.Sc.' },
            fieldOfStudy: { type: 'string', example: 'Artificial Intelligence' },
            graduationYear: { type: 'string', example: '2020' },
          },
        },

        // ─── Salary ─────────────────────────────────────────
        Salary: {
          type: 'object',
          properties: {
            baseSalary: { type: 'number', example: 8500 },
            bonus: { type: 'number', example: 1500 },
            allowances: { type: 'number', example: 500 },
          },
        },

        // ─── Bank Account ───────────────────────────────────
        BankAccount: {
          type: 'object',
          properties: {
            bankName: { type: 'string', example: 'Chase Bank' },
            accountName: { type: 'string', example: 'Brooklyn Simmons' },
            accountNumber: { type: 'string', example: '1234567890' },
          },
        },

        // ─── Document ───────────────────────────────────────
        Document: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'doc-1' },
            name: { type: 'string', example: 'Resume_Brooklyn.pdf' },
            type: { type: 'string', enum: ['Resume', 'Employment Letter', 'Certificates', 'Other Documents'] },
            uploadDate: { type: 'string', format: 'date', example: '2024-01-09' },
            fileUrl: { type: 'string', example: 'https://cdn.staffsync.com/documents/doc-1.pdf' },
          },
        },

        // ─── Note ───────────────────────────────────────────
        Note: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'n-1' },
            title: { type: 'string', example: 'Performance Note' },
            text: { type: 'string', example: 'Employee is performing exceptionally well.' },
            createdDate: { type: 'string', format: 'date', example: '2025-07-01' },
          },
        },

        // ─── Department ─────────────────────────────────────
        Department: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'DES-26-07-001' },
            name: { type: 'string', example: 'Design' },
            abbreviation: { type: 'string', example: 'DES' },
            description: { type: 'string', example: 'User interface design and experience planning.' },
            head: { type: 'string', example: 'Brooklyn Simmons' },
            employeeCount: { type: 'integer', example: 12 },
            dateCreated: { type: 'string', format: 'date', example: '2024-01-10' },
          },
        },

        // ─── Department Member ──────────────────────────────
        DepartmentMember: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'EMP-26-07-001' },
            firstName: { type: 'string', example: 'Brooklyn' },
            lastName: { type: 'string', example: 'Simmons' },
            email: { type: 'string', example: 'brok-simms@mail.com' },
            position: { type: 'string', example: 'Creative Director' },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Probation', 'OnLeave', 'Resigned', 'Terminated'] },
            hireDate: { type: 'string', format: 'date', example: '2024-01-10' },
            photoUrl: { type: 'string', nullable: true, example: 'https://cdn.staffsync.com/photos/emp-101.jpg' },
          },
        },
        DepartmentDetail: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                department: { $ref: '#/components/schemas/Department' },
                members: { type: 'array', items: { $ref: '#/components/schemas/DepartmentMember' } },
              },
            },
          },
        },

        // ─── Report: Employee Summary ──────────────────────
        EmployeeSummaryResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                totalEmployees: { type: 'integer', example: 34 },
                activeEmployees: { type: 'integer', example: 28 },
                inactiveEmployees: { type: 'integer', example: 6 },
                totalDepartments: { type: 'integer', example: 4 },
                employeesPerDepartment: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      department: { type: 'string', example: 'Design' },
                      count: { type: 'integer', example: 12 },
                      percentage: { type: 'number', example: 35.3 },
                    },
                  },
                },
              },
            },
          },
        },

        // ─── Report: Salary Summary ────────────────────────
        SalarySummaryResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                totalMonthlyPayroll: { type: 'number', example: 245000 },
                averageCompensation: { type: 'number', example: 7205 },
                highestPaid: { type: 'number', example: 10500 },
                salaryDistributionByDepartment: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      department: { type: 'string', example: 'Design' },
                      averageSalary: { type: 'number', example: 8200 },
                      totalPayroll: { type: 'number', example: 98400 },
                      employeeCount: { type: 'integer', example: 12 },
                    },
                  },
                },
              },
            },
          },
        },

        // ─── Report: Hiring Trend ──────────────────────────
        HiringTrendResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                },
                data: {
                  type: 'array',
                  items: { type: 'integer' },
                  example: [3, 1, 0, 2, 4, 1, 5, 2, 3, 0, 1, 2],
                },
              },
            },
          },
        },

        // ─── Position ───────────────────────────────────────
        Position: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            title: { type: 'string', example: 'Software Engineer' },
            description: { type: 'string', example: 'Full-stack software development' },
            departmentId: { type: 'string', example: 'DEV-26-07-001' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreatePositionRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 2, example: 'Software Engineer' },
            description: { type: 'string', example: 'Full-stack software development' },
          },
        },

        PositionStats: {
          type: 'object',
          properties: {
            positionId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            title: { type: 'string', example: 'Software Engineer' },
            employeeCount: { type: 'integer', example: 5 },
          },
        },

        // ─── Dashboard Stats ────────────────────────────────
        RecentEmployee: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'EMP-26-07-001' },
            firstName: { type: 'string', example: 'Brooklyn' },
            lastName: { type: 'string', example: 'Simmons' },
            email: { type: 'string', example: 'brooklyn@mail.com' },
            phoneNumber: { type: 'string', example: '+1 312 908 1234' },
            department: { type: 'string', example: 'Design' },
            position: { type: 'string', example: 'Senior UI Designer' },
            employmentType: { type: 'string', example: 'Full-time' },
            status: { type: 'string', example: 'Active' },
            hireDate: { type: 'string', format: 'date', example: '2024-01-10' },
            photoUrl: { type: 'string', nullable: true, example: 'https://cdn.staffsync.com/photos/emp-101.jpg' },
            professionalHeadshot: { type: 'string', nullable: true, example: '/api/employees/EMP-26-07-001/headshot' },
          },
        },
        DepartmentOverview: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'DES-26-07-001' },
            name: { type: 'string', example: 'Design' },
            abbreviation: { type: 'string', example: 'DES' },
            employeeCount: { type: 'integer', example: 12 },
            head: { type: 'string', example: 'Sarah Johnson' },
          },
        },
        RecentActivity: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'act-001' },
            action: { type: 'string', example: 'You added a note for Brooklyn Simmons' },
            timestamp: { type: 'string', example: '2 hours ago' },
            type: { type: 'string', enum: ['note', 'document', 'department', 'department_edit', 'employee', 'employee_delete', 'education', 'salary'] },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalEmployees: { type: 'integer', example: 34 },
            activeEmployees: { type: 'integer', example: 28 },
            inactiveEmployees: { type: 'integer', example: 6 },
            totalDepartments: { type: 'integer', example: 4 },
            newEmployeesThisMonth: { type: 'integer', example: 3 },
            statusDistribution: {
              type: 'object',
              properties: {
                active: { type: 'integer', example: 28 },
                inactive: { type: 'integer', example: 1 },
                probation: { type: 'integer', example: 2 },
                onLeave: { type: 'integer', example: 1 },
                resigned: { type: 'integer', example: 2 },
                terminated: { type: 'integer', example: 1 },
              },
            },
            recentEmployees: { type: 'array', items: { $ref: '#/components/schemas/RecentEmployee' } },
            departmentOverview: { type: 'array', items: { $ref: '#/components/schemas/DepartmentOverview' } },
            recentActivity: { type: 'array', items: { $ref: '#/components/schemas/RecentActivity' } },
          },
        },
      },
    },
    paths: {
      // ════════════════════════════════════════════════════════
      // AUTH
      // ════════════════════════════════════════════════════════
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login',
          description: 'Authenticate an admin user and return a JWT token.',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
            401: { description: 'Invalid email or password', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register',
          description: 'Register a new organisation / admin account.',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
          responses: {
            201: { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterResponse' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get Current User',
          description: 'Return the currently authenticated user\'s profile including company details.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User profile', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { user: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' }, profilePicture: { type: 'string' }, company: { $ref: '#/components/schemas/Company' } } } } } } } } } },
            401: { description: 'Authentication required' },
          },
        },
      },
      '/auth/send-otp': {
        post: {
          tags: ['Authentication'],
          summary: 'Send OTP',
          description: 'Send a 6-digit OTP to the user\'s email for registration verification.',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/SendOtpRequest' } } } },
          responses: {
            200: { description: 'OTP sent', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },
            400: { description: 'Validation error or email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/verify-otp': {
        post: {
          tags: ['Authentication'],
          summary: 'Verify OTP',
          description: 'Verify the 6-digit OTP sent to the user\'s email.',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOtpRequest' } } } },
          responses: {
            200: { description: 'Email verified', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { verificationToken: { type: 'string' } } } } } } } },
            400: { description: 'Invalid or expired OTP', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Forgot Password',
          description: 'Send a 6-digit OTP to the user\'s email for password reset.',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } }, required: ['email'] } } },
          },
          responses: {
            200: { description: 'OTP sent to email', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },
          },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Reset Password',
          description: 'Verify OTP and set a new password.',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp', 'newPassword'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'admin@rockscompany.com' },
                    otp: { type: 'string', example: '123456' },
                    newPassword: { type: 'string', example: 'newSecurePassword123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password reset successfully' },
            400: { description: 'Invalid or expired OTP', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/change-password': {
        put: {
          tags: ['Authentication'],
          summary: 'Change Password',
          description: 'Update the authenticated user\'s password.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string', example: 'oldPassword123' },
                    newPassword: { type: 'string', minLength: 6, example: 'newSecurePass456' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password changed' },
            401: { description: 'Current password is incorrect' },
          },
        },
      },
      '/auth/account': {
        delete: {
          tags: ['Authentication'],
          summary: 'Delete Account',
          description: 'Permanently delete the authenticated admin\'s account and ALL associated company data (departments, positions, employees and their sub-resources). Requires the current password to confirm. This is irreversible.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['password'],
                  properties: {
                    password: { type: 'string', example: 'securePassword123', description: 'Current password to confirm deletion' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Account and all associated data deleted' },
            400: { description: 'Password is required to delete your account' },
            401: { description: 'Incorrect password' },
            404: { description: 'Account not found' },
          },
        },
      },

      // ════════════════════════════════════════════════════════
      // EMPLOYEES
      // ════════════════════════════════════════════════════════
      '/employees': {
        get: {
          tags: ['Employees'],
          summary: 'List Employees',
          description: 'Get a paginated, searchable, filterable, sortable list of employees.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page' },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, ID, or position' },
            { name: 'department', in: 'query', schema: { type: 'string' }, description: 'Filter by department name' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['Active', 'Inactive', 'Probation', 'OnLeave', 'Resigned', 'Terminated'] } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['name', 'dept', 'joined'], default: 'name' } },
            { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          ],
          responses: {
            200: {
              description: 'Paginated employee list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          employees: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
                          pagination: { $ref: '#/components/schemas/Pagination' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Employees'],
          summary: 'Create Employee',
          description: 'Register a new employee in the system.',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEmployeeRequest' } } } },
          responses: {
            201: { description: 'Employee created' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/employees/{id}': {
        get: {
          tags: ['Employees'],
          summary: 'Get Employee',
          description: 'Get full employee profile including all nested data.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'EMP-26-07-001' }],
          responses: {
            200: { description: 'Employee details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { employee: { $ref: '#/components/schemas/EmployeeDetail' } } } } } } } },
            404: { description: 'Employee not found' },
          },
        },
        put: {
          tags: ['Employees'],
          summary: 'Update Employee',
          description: 'Update one or more fields of an employee record. Supports partial updates.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    phoneNumber: { type: 'string' },
                    gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
                    dob: { type: 'string', format: 'date' },
                    address: { type: 'string' },
                    emergencyContact: { type: 'string' },
                    department: { type: 'string', description: 'Department name' },
                    position: { type: 'string', description: 'UUID of the Position (must belong to the department). Required if department changes.' },
                    employmentType: { type: 'string', enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Remote'] },
                    hireDate: { type: 'string', format: 'date' },
                    reportingManager: { type: 'string' },
                    status: { type: 'string', enum: ['Active', 'Inactive', 'Probation', 'OnLeave', 'Resigned', 'Terminated'] },
                    photoUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Employee updated' }, 404: { description: 'Employee not found' } },
        },
        delete: {
          tags: ['Employees'],
          summary: 'Delete Employee',
          description: 'Remove an employee record from the system.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Employee deleted' }, 404: { description: 'Employee not found' } },
        },
      },
      '/employees/{id}/salary': {
        put: {
          tags: ['Employees - Salary & Bank'],
          summary: 'Update Salary',
          description: 'Update an employee\'s compensation details.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Salary' } } } },
          responses: { 200: { description: 'Salary updated' } },
        },
      },
      '/employees/{id}/bank': {
        put: {
          tags: ['Employees - Salary & Bank'],
          summary: 'Update Bank Account',
          description: 'Update an employee\'s bank details for payroll.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/BankAccount' } } } },
          responses: { 200: { description: 'Bank account updated' } },
        },
      },
      '/employees/{id}/education': {
        post: {
          tags: ['Employees - Education'],
          summary: 'Add Education Record',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Education' } } } },
          responses: { 201: { description: 'Education record added' } },
        },
      },
      '/employees/{id}/education/{educationId}': {
        delete: {
          tags: ['Employees - Education'],
          summary: 'Delete Education Record',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'educationId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Education record deleted' } },
        },
      },
      '/employees/{id}/documents': {
        post: {
          tags: ['Employees - Documents'],
          summary: 'Add Document',
          description: 'Accepts a fileUrl — upload the file to Cloudinary (or similar) from the frontend first, then send the returned URL here.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Document display name' },
                    type: { type: 'string', enum: ['Resume', 'Employment Letter', 'Certificates', 'Other Documents'] },
                    fileUrl: { type: 'string', description: 'Cloudinary URL of the uploaded file' },
                  },
                  required: ['name', 'type', 'fileUrl'],
                },
              },
            },
          },
          responses: { 201: { description: 'Document added' } },
        },
      },
      '/employees/{id}/documents/{documentId}/download': {
        get: {
          tags: ['Employees - Documents'],
          summary: 'Download Document',
          description: 'Proxies the file from Cloudinary and returns it as a download attachment.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'File streamed as download' },
            404: { description: 'Employee or document not found' },
            500: { description: 'Failed to fetch file from storage' },
          },
        },
      },
      '/employees/{id}/documents/{documentId}': {
        delete: {
          tags: ['Employees - Documents'],
          summary: 'Delete Document',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Document deleted' } },
        },
      },
      '/employees/{id}/headshot': {
        post: {
          tags: ['Employees - Headshot'],
          summary: 'Upload Professional Headshot',
          description: 'Upload the employee\'s professional headshot (multipart/form-data, field `file`). PNG/JPG/JPEG only, max 1 MB. Replaces any existing headshot. Returns the updated employee object.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: { type: 'string', format: 'binary', description: 'PNG/JPG/JPEG image, max 1 MB' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Headshot uploaded — updated employee returned',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { employee: { $ref: '#/components/schemas/EmployeeDetail' } } } } } } },
            },
            400: { description: 'Invalid file type/size, or no file provided', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Employee not found' },
          },
        },
        get: {
          tags: ['Employees - Headshot'],
          summary: 'Get Professional Headshot',
          description: 'Returns the employee\'s headshot image bytes (served from Postgres bytea) with the correct Content-Type.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Headshot image bytes', content: { 'image/*': {} } },
            404: { description: 'Employee or headshot not found' },
          },
        },
        delete: {
          tags: ['Employees - Headshot'],
          summary: 'Remove Professional Headshot',
          description: 'Delete the employee\'s headshot image and reset `professionalHeadshot` to null. Idempotent — succeeds even if there is no headshot. Returns the updated employee object.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Headshot removed — updated employee returned',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { employee: { $ref: '#/components/schemas/EmployeeDetail' } } } } } } },
            },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/employees/{id}/notes': {
        post: {
          tags: ['Employees - Notes'],
          summary: 'Add Note',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['title', 'text'], properties: { title: { type: 'string' }, text: { type: 'string' } } } } } },
          responses: { 201: { description: 'Note added' } },
        },
      },
      '/employees/{id}/notes/{noteId}': {
        delete: {
          tags: ['Employees - Notes'],
          summary: 'Delete Note',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'noteId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Note deleted' } },
        },
      },

      // ════════════════════════════════════════════════════════
      // DEPARTMENTS
      // ════════════════════════════════════════════════════════
      '/departments': {
        get: {
          tags: ['Departments'],
          summary: 'List Departments',
          description: 'Get all departments with employee counts.',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Department list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { departments: { type: 'array', items: { $ref: '#/components/schemas/Department' } } } } } } } } } },
        },
        post: {
          tags: ['Departments'],
          summary: 'Create Department',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, head: { type: 'string' } } } } } },
          responses: { 201: { description: 'Department created' } },
        },
      },
      '/departments/employee-count': {
        get: {
          tags: ['Departments'],
          summary: 'Employee Count by Department',
          description: 'Returns department names with their total employee counts. Counts all employees — not filtered by salary assignment.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Employee counts per department',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          departments: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                department: { type: 'string', example: 'Design' },
                                employeeCount: { type: 'integer', example: 12 },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/departments/{id}': {
        get: {
          tags: ['Departments'],
          summary: 'Get Department',
          description: 'Get department details and its members.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Department with members',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DepartmentDetail' },
                },
              },
            },
          },
        },
        put: {
          tags: ['Departments'],
          summary: 'Update Department',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, head: { type: 'string' } } } } } },
          responses: { 200: { description: 'Department updated' } },
        },
        delete: {
          tags: ['Departments'],
          summary: 'Delete Department',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Department deleted' } },
        },
      },

      // ════════════════════════════════════════════════════════
      // DEPARTMENT POSITIONS
      // ════════════════════════════════════════════════════════
      '/departments/{departmentId}/positions': {
        get: {
          tags: ['Department Positions'],
          summary: 'List Positions',
          description: 'Get all positions belonging to a department. Used to populate the position dropdown in employee creation/editing.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Position list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          positions: { type: 'array', items: { $ref: '#/components/schemas/Position' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Department Positions'],
          summary: 'Create Position',
          description: 'Create a new position in a department.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePositionRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Position created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Position' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Validation error — duplicate title or invalid data',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
          },
        },
      },
      '/departments/{departmentId}/positions/stats': {
        get: {
          tags: ['Department Positions'],
          summary: 'Position Headcount Stats',
          description: 'Return position-level headcount summary for a department.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Position stats',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          stats: { type: 'array', items: { $ref: '#/components/schemas/PositionStats' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/departments/{departmentId}/positions/{positionId}': {
        put: {
          tags: ['Department Positions'],
          summary: 'Update Position',
          description: 'Update a position (rename title, update description).',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'positionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePositionRequest' } } } },
          responses: {
            200: { description: 'Position updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { $ref: '#/components/schemas/Position' } } } } } },
            404: { description: 'Position not found' },
          },
        },
        delete: {
          tags: ['Department Positions'],
          summary: 'Delete Position',
          description: 'Delete a position. Blocked if employees are actively assigned to it.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'positionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Position deleted' },
            400: { description: 'Cannot delete — employees are assigned to this position', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Position not found' },
          },
        },
      },

      // ════════════════════════════════════════════════════════
      // DASHBOARD
      // ════════════════════════════════════════════════════════
      '/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get Dashboard Statistics',
          description: 'Aggregated counts and metrics for the overview page.',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Dashboard stats', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/DashboardStats' } } } } } } },
        },
      },

      // ════════════════════════════════════════════════════════
      // REPORTS
      // ════════════════════════════════════════════════════════
      '/reports/employee-summary': {
        get: {
          tags: ['Reports'],
          summary: 'Employee Summary Report',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Employee summary data',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeSummaryResponse' } } },
            },
          },
        },
      },
      '/reports/salary-summary': {
        get: {
          tags: ['Reports'],
          summary: 'Salary Summary Report',
          description: 'Get payroll and compensation data.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Salary summary data',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SalarySummaryResponse' } } },
            },
          },
        },
      },
      '/reports/hiring-trend': {
        get: {
          tags: ['Reports'],
          summary: 'Hiring Trend Report',
          description: 'Get employee growth data over time.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'months', in: 'query', schema: { type: 'integer', default: 12 }, description: 'Number of months to look back' },
          ],
          responses: {
            200: {
              description: 'Hiring trend data',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HiringTrendResponse' } } },
            },
          },
        },
      },
      '/reports/export': {
        get: {
          tags: ['Reports'],
          summary: 'Export Full Report',
          description: 'Download the complete report (Employee Summary + Salary Summary + Hiring Trend) as CSV or PDF.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'pdf'], default: 'csv' } },
          ],
          responses: {
            200: { description: 'File download. CSV: text/csv. PDF: application/pdf. Both with Content-Disposition: attachment.' },
          },
        },
      },

      // ════════════════════════════════════════════════════════
      // SETTINGS
      // ════════════════════════════════════════════════════════
      '/settings': {
        get: {
          tags: ['Settings'],
          summary: 'Get Settings',
          description: 'Get company information.',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Settings data' } },
        },
      },
      '/settings/company': {
        put: {
          tags: ['Settings'],
          summary: 'Update Company Information',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, email: { type: 'string' }, phoneNumber: { type: 'string' }, address: { type: 'object', properties: { state: { type: 'string' }, lga: { type: 'string' }, settlement: { type: 'string' }, street: { type: 'string' } } } } } } } },
          responses: { 200: { description: 'Company info updated' } },
        },
      },



      // ════════════════════════════════════════════════════════
      // HEALTH
      // ════════════════════════════════════════════════════════
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health Check',
          description: 'Check if the API is running.',
          responses: {
            200: {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      uptime: { type: 'number' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
