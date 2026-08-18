const { Op } = require('sequelize');
const { Employee, Department, Position, Education, Salary, BankAccount, Document, Note } = require('../models');
const AppError = require('../utils/AppError');
const { generateEmployeeId } = require('../utils/generateId');
const logActivity = require('../utils/activityLogger');

// ─── Include helper ─────────────────────────────────────────

const fullInclude = [
  { model: Education },
  { model: Salary },
  { model: BankAccount },
  { model: Document },
  { model: Note },
  { model: Department },
  { model: Position, attributes: ['id', 'title'] },
];

const basicAttributes = [
  'id', 'firstName', 'lastName', 'email', 'phoneNumber',
  'departmentId', 'position', 'employmentType', 'status',
  'hireDate', 'photoUrl', 'reportingManagerId',
];

// ─── Resolve helpers (id-only linking; name/title is display-only) ──

/**
 * Resolve a department by id. Relationships are linked by id only — the
 * department name is display data and is never used to find the record.
 * @returns {Promise<import('../models/Department')|null>}
 */
async function resolveDepartment(companyId, departmentId) {
  if (!departmentId) return null;
  const dept = await Department.findOne({ where: { id: departmentId, companyId } });
  if (!dept) throw new AppError('Department not found', 400);
  return dept;
}

/**
 * Resolve a position by id, scoped to a department.
 * @returns {Promise<import('../models/Position')|null>}
 */
async function resolvePosition(departmentId, positionId) {
  if (!positionId) return null;
  const pos = await Position.findOne({ where: { id: positionId } });
  if (!pos || (departmentId && pos.departmentId !== departmentId)) {
    throw new AppError('Selected position does not exist in this department', 400);
  }
  return pos;
}

/**
 * Resolve a reporting manager by id.
 * @returns {Promise<import('../models/Employee')|null>}
 */
async function resolveReportingManager(companyId, reportingManagerId) {
  if (!reportingManagerId) return null;
  const mgr = await Employee.findOne({ where: { id: reportingManagerId, companyId } });
  if (!mgr) throw new AppError('Reporting manager not found', 400);
  return mgr;
}

// ─── 2.1 List Employees ─────────────────────────────────────

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const { search, department, departmentId, status, sortBy, sortOrder } = req.query;

    // Build where clause
    const where = { companyId: req.user.companyId };
    if (search) {
      // Find position IDs matching the search term for position title search
      const matchingPositions = await Position.findAll({
        where: { title: { [Op.like]: `%${search}%` } },
        attributes: ['id'],
      });
      const positionIds = matchingPositions.map((p) => p.id);

      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { id: { [Op.like]: `%${search}%` } },
      ];

      if (positionIds.length > 0) {
        where[Op.or].push({ position: { [Op.in]: positionIds } });
      }
    }
    if (status) where.status = status;

    // Handle department filter — linked by id (departmentId is authoritative;
    // the `department` name is a legacy fallback for older clients).
    if (departmentId) {
      const dept = await Department.findOne({ where: { id: departmentId, companyId: req.user.companyId } });
      if (!dept) {
        return res.json({
          success: true,
          data: { employees: [], pagination: { page, limit, totalItems: 0, totalPages: 0 } },
        });
      }
      where.departmentId = dept.id;
    } else if (department) {
      const dept = await Department.findOne({ where: { name: department, companyId: req.user.companyId } });
      if (dept) where.departmentId = dept.id;
      else {
        return res.json({
          success: true,
          data: { employees: [], pagination: { page, limit, totalItems: 0, totalPages: 0 } },
        });
      }
    }

    // Sorting
    const order = [];
    const sortField = sortBy || 'firstName';
    const sortDir = sortOrder === 'desc' ? 'DESC' : 'ASC';
    const allowedSortFields = ['firstName', 'lastName', 'departmentId', 'hireDate', 'status'];
    if (allowedSortFields.includes(sortField)) {
      order.push([sortField, sortDir]);
    } else {
      order.push(['firstName', 'ASC']);
    }

    const { count, rows } = await Employee.findAndCountAll({
      where,
      attributes: basicAttributes,
      include: [
        { model: Department, as: 'Department', attributes: ['name'] },
        { model: Position, as: 'Position', attributes: ['id', 'title'] },
      ],
      order,
      limit,
      offset,
    });

    const employees = rows.map((emp) => {
      const e = emp.toJSON();
      const positionId = e.position; // raw position id (Employee.position stores the id)
      e.department = e.Department?.name || null;
      e.position = e.Position?.title || null;
      e.positionId = positionId || e.Position?.id || null;
      delete e.Department;
      delete e.Position;
      // departmentId and reportingManagerId are kept as-is on the row.
      return e;
    });

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page,
          limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.2 Get Single Employee ────────────────────────────────

exports.getById = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: fullInclude,
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const result = employee.toJSON();
    // Flatten department name (keep departmentId)
    if (result.Department) {
      result.department = result.Department.name;
      result.departmentId = result.Department.id;
      delete result.Department;
    }
    // Flatten position title (keep positionId)
    if (result.Position) {
      result.position = result.Position.title;
      result.positionId = result.Position.id;
      delete result.Position;
    }

    res.json({
      success: true,
      data: { employee: result },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.3 Create Employee ────────────────────────────────────

exports.create = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, phoneNumber, gender,
      department: deptName, departmentId,
      position, positionId,
      reportingManager, reportingManagerId,
      employmentType, hireDate, status,
    } = req.body;

    // Validate required fields
    if (!firstName || firstName.length < 2) throw new AppError('First name must be at least 2 characters', 400);
    if (!lastName || lastName.length < 2) throw new AppError('Last name must be at least 2 characters', 400);
    if (!email) throw new AppError('Email is required', 400);
    if (!phoneNumber || phoneNumber.length < 6) throw new AppError('Phone number must be at least 6 characters', 400);
    if (!gender) throw new AppError('Gender is required', 400);
    if (!['Male', 'Female', 'Other'].includes(gender)) throw new AppError('Gender must be Male, Female, or Other', 400);
    if (!employmentType) throw new AppError('Employment type is required', 400);
    if (!['Full-time', 'Part-time', 'Contract', 'Intern', 'Remote'].includes(employmentType)) {
      throw new AppError('Invalid employment type', 400);
    }
    if (status && !['Active', 'Inactive', 'Probation', 'OnLeave', 'Resigned', 'Terminated'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Check unique email
    const existingEmail = await Employee.findOne({ where: { email } });
    if (existingEmail) throw new AppError('An employee with this email already exists', 400);

    // Check unique phone number
    const existingPhone = await Employee.findOne({ where: { phoneNumber } });
    if (existingPhone) throw new AppError('An employee with this phone number already exists', 400);

    // Reject name-only linking — an id is required to establish a relationship.
    if (deptName && !departmentId) throw new AppError('departmentId is required to assign a department', 400);
    if (position && !positionId) throw new AppError('positionId is required to assign a position', 400);
    if (reportingManager && !reportingManagerId) throw new AppError('reportingManagerId is required to set a reporting manager', 400);

    // Resolve department (optional) — linked by id only
    const dept = await resolveDepartment(req.user.companyId, departmentId);
    const resolvedDepartmentId = dept ? dept.id : null;

    // Resolve position (optional) — linked by id only
    const pos = await resolvePosition(resolvedDepartmentId, positionId);
    const resolvedPositionId = pos ? pos.id : null;

    // Resolve reporting manager (optional) — linked by id only
    const mgr = await resolveReportingManager(req.user.companyId, reportingManagerId);

    const id = await generateEmployeeId();

    const employee = await Employee.create({
      id,
      firstName, lastName, email, phoneNumber, gender,
      departmentId: resolvedDepartmentId,
      position: resolvedPositionId,
      reportingManager: mgr ? `${mgr.firstName} ${mgr.lastName}` : null,
      reportingManagerId: mgr ? mgr.id : null,
      employmentType,
      hireDate: hireDate || new Date().toISOString().split('T')[0],
      status: status || 'Active',
      companyId: req.user.companyId,
    });

    await logActivity({
      action: `You created employee ${employee.firstName} ${employee.lastName}`,
      type: 'employee',
      companyId: req.user.companyId,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: dept ? dept.name : null,
        departmentId: resolvedDepartmentId,
        position: pos ? pos.title : null,
        positionId: resolvedPositionId,
        reportingManager: employee.reportingManager,
        reportingManagerId: employee.reportingManagerId,
        status: employee.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.4 Update Employee ────────────────────────────────────

exports.update = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const updatableFields = [
      'firstName', 'lastName', 'email', 'phoneNumber', 'gender',
      'dob', 'address', 'emergencyContact',
      'employmentType', 'hireDate', 'status', 'photoUrl',
    ];

    const updates = {};
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Handle reporting manager update — linked by id only
    if (req.body.reportingManagerId !== undefined) {
      if (req.body.reportingManager && !req.body.reportingManagerId) {
        throw new AppError('reportingManagerId is required to set a reporting manager', 400);
      }
      const mgr = await resolveReportingManager(req.user.companyId, req.body.reportingManagerId);
      updates.reportingManager = mgr ? `${mgr.firstName} ${mgr.lastName}` : null;
      updates.reportingManagerId = mgr ? mgr.id : null;
    }

    // Resolve the target department (linked by id only). Defaults to the
    // employee's current department when only a position is being changed.
    let newDepartmentId = employee.departmentId;
    let departmentChanged = false;

    if (req.body.departmentId !== undefined) {
      if (req.body.department && !req.body.departmentId) {
        throw new AppError('departmentId is required to assign a department', 400);
      }
      const dept = await resolveDepartment(req.user.companyId, req.body.departmentId);
      newDepartmentId = dept ? dept.id : null;
      departmentChanged = newDepartmentId !== employee.departmentId;
      updates.departmentId = newDepartmentId;
    }

    // Resolve the target position (linked by id only). When the department
    // changes, the position must be re-specified and belong to the new one.
    if (req.body.positionId !== undefined) {
      if (req.body.position && !req.body.positionId) {
        throw new AppError('positionId is required to assign a position', 400);
      }

      if (!req.body.positionId) {
        // position explicitly set to empty/null — clear it
        updates.position = null;
      } else {
        if (!newDepartmentId) {
          throw new AppError('Cannot set position — employee has no department assigned', 400);
        }
        const pos = await resolvePosition(newDepartmentId, req.body.positionId);
        if (!pos) {
          throw new AppError('Selected position does not exist in this department', 400);
        }
        updates.position = pos.id;
      }
    } else if (departmentChanged) {
      // Department changed without a new position — the old position no longer
      // belongs to the new department, so require an explicit re-specification.
      if (!newDepartmentId) {
        updates.position = null;
      } else {
        throw new AppError(
          'Department changed — position must be re-specified for the new department',
          400
        );
      }
    }

    await employee.update(updates);

    // Re-fetch with department name and position title
    const updated = await Employee.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'Department', attributes: ['id', 'name'] },
        { model: Position, as: 'Position', attributes: ['id', 'title'] },
      ],
    });

    const result = updated.toJSON();
    const rawDepartmentId = result.departmentId;
    const rawPositionId = result.position;
    result.department = result.Department?.name || null;
    result.departmentId = result.Department?.id || rawDepartmentId || null;
    result.position = result.Position?.title || null;
    result.positionId = result.Position?.id || rawPositionId || null;
    delete result.Department;
    delete result.Position;

    res.json({
      success: true,
      data: { employee: result },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.5 Delete Employee ────────────────────────────────────

exports.remove = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const { firstName, lastName } = employee;
    await employee.destroy();

    await logActivity({
      action: `You removed employee ${firstName} ${lastName}`,
      type: 'employee_delete',
      companyId: req.user.companyId,
    });

    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.6 Update Salary ──────────────────────────────────────

exports.updateSalary = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const { baseSalary, bonus, allowances } = req.body;

    const [salary, created] = await Salary.findOrCreate({
      where: { employeeId: employee.id },
      defaults: { baseSalary: baseSalary || 0, bonus: bonus || 0, allowances: allowances || 0, employeeId: employee.id },
    });

    if (!created) {
      await salary.update({ baseSalary, bonus, allowances });
    }

    await logActivity({
      action: `You updated salary for ${employee.firstName} ${employee.lastName}`,
      type: 'salary',
      companyId: req.user.companyId,
    });

    res.json({
      success: true,
      data: {
        salary: {
          baseSalary: parseFloat(salary.baseSalary),
          bonus: parseFloat(salary.bonus),
          allowances: parseFloat(salary.allowances),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.7 Update Bank Account ────────────────────────────────

exports.updateBank = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const { bankName, accountName, accountNumber } = req.body;

    const [bank, created] = await BankAccount.findOrCreate({
      where: { employeeId: employee.id },
      defaults: { bankName, accountName, accountNumber, employeeId: employee.id },
    });

    if (!created) {
      await bank.update({ bankName, accountName, accountNumber });
    }

    res.json({
      success: true,
      data: {
        bankAccount: {
          bankName: bank.bankName,
          accountName: bank.accountName,
          accountNumber: bank.accountNumber,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.8.1 Add Education Record ─────────────────────────────

exports.addEducation = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const { institutionName, qualification, fieldOfStudy, graduationYear } = req.body;

    const education = await Education.create({
      institutionName, qualification, fieldOfStudy, graduationYear,
      employeeId: employee.id,
    });

    await logActivity({
      action: `You added an education record for ${employee.firstName} ${employee.lastName}`,
      type: 'education',
      companyId: req.user.companyId,
    });

    res.status(201).json({
      success: true,
      data: {
        education: {
          id: education.id,
          institutionName: education.institutionName,
          qualification: education.qualification,
          fieldOfStudy: education.fieldOfStudy,
          graduationYear: education.graduationYear,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.8.2 Delete Education Record ──────────────────────────

exports.deleteEducation = async (req, res, next) => {
  try {
    const education = await Education.findOne({
      where: { id: req.params.educationId, employeeId: req.params.id },
    });
    if (!education) throw new AppError('Education record not found', 404);

    await education.destroy();

    res.json({
      success: true,
      message: 'Education record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.9.1 Add Document ─────────────────────────────────────

exports.addDocument = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const { name, type, fileUrl } = req.body;
    if (!name) throw new AppError('Document name is required', 400);
    if (!type) throw new AppError('Document type is required', 400);
    if (!fileUrl) throw new AppError('fileUrl is required — upload the file to a cloud service and provide the URL', 400);

    const document = await Document.create({
      name,
      type,
      fileUrl,
      employeeId: employee.id,
    });

    await logActivity({
      action: `You uploaded a ${type} for ${employee.firstName} ${employee.lastName}`,
      type: 'document',
      companyId: req.user.companyId,
    });

    res.status(201).json({
      success: true,
      data: {
        document: {
          id: document.id,
          name: document.name,
          type: document.type,
          uploadDate: document.uploadDate,
          fileUrl: document.fileUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.9.2 Delete Document ──────────────────────────────────

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.documentId, employeeId: req.params.id },
    });
    if (!document) throw new AppError('Document not found', 404);

    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.9.3 Download Document (proxy from Cloudinary) ────────

exports.downloadDocument = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const document = await Document.findOne({
      where: { id: req.params.documentId, employeeId: req.params.id },
    });
    if (!document) throw new AppError('Document not found', 404);
    if (!document.fileUrl) throw new AppError('Document has no file URL', 404);

    const response = await fetch(document.fileUrl);
    if (!response.ok) {
      throw new AppError('Failed to fetch file from storage', 500);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Pipe the Cloudinary response to the client
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    next(error);
  }
};

// ─── 2.10.1 Add Note ────────────────────────────────────────

exports.addNote = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const { title, text } = req.body;
    if (!title) throw new AppError('Note title is required', 400);
    if (!text) throw new AppError('Note text is required', 400);

    const note = await Note.create({ title, text, employeeId: employee.id });

    await logActivity({
      action: `You added a note for ${employee.firstName} ${employee.lastName}`,
      type: 'note',
      companyId: req.user.companyId,
    });

    res.status(201).json({
      success: true,
      data: {
        note: {
          id: note.id,
          title: note.title,
          text: note.text,
          createdDate: note.createdDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2.10.2 Delete Note ─────────────────────────────────────

exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({
      where: { id: req.params.noteId, employeeId: req.params.id },
    });
    if (!note) throw new AppError('Note not found', 404);

    await note.destroy();

    res.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
