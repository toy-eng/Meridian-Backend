const { Sequelize } = require('sequelize');
const { Department, Employee, Position } = require('../models');
const AppError = require('../utils/AppError');
const { generateDepartmentId, deriveAbbreviation } = require('../utils/generateId');
const logActivity = require('../utils/activityLogger');

/**
 * Resolve the department-head employee by id.
 *
 * The head ↔ employee relationship is linked by employee id only. The `head`
 * name is display data and is never used to find the employee.
 * @returns {Promise<import('../models/Employee')|null>}
 */
async function resolveHeadEmployee(headId, companyId) {
  if (!headId) return null;
  const byId = await Employee.findOne({ where: { id: headId, companyId } });
  if (!byId) throw new AppError('Department head employee not found', 400);
  return byId;
}

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
          headId: d.headId,
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
          headId: department.headId,
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
    const { name, description, head, headId } = req.body;

    if (!name) throw new AppError('Department name is required', 400);

    const existing = await Department.findOne({ where: { name, companyId: req.user.companyId } });
    if (existing) throw new AppError('Department with this name already exists', 400);

    const abbreviation = deriveAbbreviation(name);
    const id = await generateDepartmentId(name);

    if (head && !headId) {
      throw new AppError('headId is required to set a department head', 400);
    }

    const headEmployee = await resolveHeadEmployee(headId, req.user.companyId);

    const department = await Department.create({
      id,
      name,
      abbreviation,
      description: description || null,
      head: headEmployee
        ? `${headEmployee.firstName} ${headEmployee.lastName}`
        : 'Not assigned',
      headId: headEmployee ? headEmployee.id : null,
      companyId: req.user.companyId,
    });

    // Bi-directional: assign the head employee to this department.
    if (headEmployee) {
      await headEmployee.update({ departmentId: department.id });
    }

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
        headId: department.headId,
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

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;

    if (updates.name) {
      const existing = await Department.findOne({ where: { name: updates.name, companyId: req.user.companyId } });
      if (existing && existing.id !== department.id) {
        throw new AppError('Department with this name already exists', 400);
      }
    }

    // Reassign the head — linked by headId only.
    if (req.body.headId !== undefined || req.body.head !== undefined) {
      if (req.body.head && !req.body.headId) {
        throw new AppError('headId is required to set a department head', 400);
      }

      const newHead = await resolveHeadEmployee(req.body.headId, req.user.companyId);

      // Unassign the previous head if it's a different employee.
      const oldHeadId = department.headId;
      if (oldHeadId && (!newHead || oldHeadId !== newHead.id)) {
        await Employee.update(
          { departmentId: null },
          { where: { id: oldHeadId, companyId: req.user.companyId } }
        );
      }

      if (newHead) {
        await newHead.update({ departmentId: department.id });
        updates.head = `${newHead.firstName} ${newHead.lastName}`;
        updates.headId = newHead.id;
      } else {
        updates.head = 'Not assigned';
        updates.headId = null;
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
