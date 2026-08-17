const { Sequelize } = require('sequelize');
const { Department, Employee, Position } = require('../models');
const AppError = require('../utils/AppError');
const { generateDepartmentId, deriveAbbreviation } = require('../utils/generateId');
const logActivity = require('../utils/activityLogger');

// ─── 3.1 List Departments ───────────────────────────────────

exports.list = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      where: { companyId: req.user.companyId },
      attributes: {
        include: [
          [
            Sequelize.literal(`(SELECT COUNT(*) FROM employees WHERE employees.department_id = "Department"."id")`),
            'employeeCount',
          ],
        ],
      },
    });

    res.json({
      success: true,
      data: {
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          abbreviation: d.abbreviation,
          description: d.description,
          head: d.head,
          employeeCount: Number(d.get('employeeCount')) || 0,
          dateCreated: d.dateCreated,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3.2 Get Single Department ──────────────────────────────

exports.getById = async (req, res, next) => {
  try {
    const department = await Department.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!department) throw new AppError('Department not found', 404);

    const members = await Employee.findAll({
      where: { departmentId: department.id, companyId: req.user.companyId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'position', 'status', 'hireDate', 'photoUrl'],
      include: [{ model: Position, as: 'Position', attributes: ['title'] }],
    });

    const membersWithPosition = members.map((m) => {
      const json = m.toJSON();
      json.position = json.Position?.title || json.position;
      delete json.Position;
      return json;
    });

    res.json({
      success: true,
      data: {
        department: {
          id: department.id,
          name: department.name,
          abbreviation: department.abbreviation,
          description: department.description,
          head: department.head,
          dateCreated: department.dateCreated,
        },
        members: membersWithPosition,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3.3 Create Department ──────────────────────────────────

exports.create = async (req, res, next) => {
  try {
    const { name, description, head } = req.body;

    if (!name) throw new AppError('Department name is required', 400);

    const existing = await Department.findOne({ where: { name, companyId: req.user.companyId } });
    if (existing) throw new AppError('Department with this name already exists', 400);

    const abbreviation = deriveAbbreviation(name);
    const id = await generateDepartmentId(name);

    const department = await Department.create({
      id,
      name,
      abbreviation,
      description: description || null,
      head: head || 'Not assigned',
      companyId: req.user.companyId,
    });

    await logActivity({
      action: `You created the ${department.name} department`,
      type: 'department',
      companyId: req.user.companyId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: department.id,
        name: department.name,
        abbreviation: department.abbreviation,
        description: department.description,
        head: department.head,
        dateCreated: department.dateCreated,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3.4 Update Department ──────────────────────────────────

exports.update = async (req, res, next) => {
  try {
    const department = await Department.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!department) throw new AppError('Department not found', 404);

    const updatableFields = ['name', 'description', 'head'];
    const updates = {};
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.name) {
      const existing = await Department.findOne({ where: { name: updates.name, companyId: req.user.companyId } });
      if (existing && existing.id !== department.id) {
        throw new AppError('Department with this name already exists', 400);
      }
    }

    await department.update(updates);

    await logActivity({
      action: `You updated the ${department.name} department`,
      type: 'department_edit',
      companyId: req.user.companyId,
    });

    res.json({
      success: true,
      message: 'Department updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3.5 Delete Department ──────────────────────────────────

exports.remove = async (req, res, next) => {
  try {
    const department = await Department.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!department) throw new AppError('Department not found', 404);

    // Check if employees are assigned
    const employeeCount = await Employee.count({ where: { departmentId: department.id } });
    if (employeeCount > 0) {
      throw new AppError('Cannot delete department with assigned employees. Reassign them first.', 400);
    }

    await department.destroy();

    res.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3.6 Employee Count By Department ───────────────────────

exports.employeeCount = async (req, res, next) => {
  try {
    const { fn, col } = require('sequelize');
    const companyId = req.user.companyId;

    const departments = await Department.findAll({
      where: { companyId },
      attributes: [
        'name',
        [fn('COUNT', col('Employees.id')), 'employeeCount'],
      ],
      include: [
        {
          model: Employee,
          as: 'Employees',
          attributes: [],
          where: { companyId },
          required: false,
        },
      ],
      group: ['Department.id', 'Department.name'],
      order: [['name', 'ASC']],
      raw: true,
      nest: true,
    });

    const result = departments.map((d) => ({
      department: d.name,
      employeeCount: parseInt(d.employeeCount, 10) || 0,
    }));

    // Count employees without a department
    const noDeptCount = await Employee.count({
      where: { departmentId: null, companyId },
    });

    if (noDeptCount > 0) {
      result.push({
        department: 'Others',
        employeeCount: noDeptCount,
      });
    }

    res.json({
      success: true,
      data: { departments: result },
    });
  } catch (error) {
    next(error);
  }
};
