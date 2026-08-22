const { Op, fn, col } = require('sequelize');
const { Employee, Department, Position, Activity } = require('../models');
const { getHeadEmployeeIds, resolvePositionTitle } = require('../utils/headPosition');

/**
 * Format a Date into a relative time string (e.g. "2 hours ago", "yesterday").
 */
function relativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
}

/**
 * GET /dashboard/stats
 * Aggregated counts and metrics for the overview page.
 */
exports.getStats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    // ── Counts ─────────────────────────────────────────────
    const totalEmployees = await Employee.count({ where: { companyId } });
    const activeEmployees = await Employee.count({ where: { status: 'Active', companyId } });
    const inactiveEmployees = await Employee.count({ where: { status: { [Op.ne]: 'Active' }, companyId } });
    const totalDepartments = await Department.count({ where: { companyId } });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newEmployeesThisMonth = await Employee.count({
      where: { hireDate: { [Op.gte]: startOfMonth.toISOString().split('T')[0] }, companyId },
    });

    // ── Status distribution ────────────────────────────────
    const statuses = ['Active', 'Inactive', 'Probation', 'OnLeave', 'Resigned', 'Terminated'];
    const statusCounts = await Promise.all(
      statuses.map((s) => Employee.count({ where: { status: s, companyId } }))
    );
    const statusDistribution = {};
    statuses.forEach((s, i) => {
      statusDistribution[s.toLowerCase()] = statusCounts[i];
    });

    // ── Recent employees (last 5) with correct position title ──
    const recentEmployees = await Employee.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'employmentType', 'status', 'hireDate', 'photoUrl', 'professionalHeadshot'],
      include: [
        { model: Department, as: 'Department', attributes: ['name'] },
        { model: Position, attributes: ['title'] },
      ],
    });

    // Department heads display 'HOD' unless a position is assigned to them.
    const recentHeadIds = await getHeadEmployeeIds(recentEmployees.map((e) => e.id), companyId);

    const recent = recentEmployees.map((e) => {
      const r = e.toJSON();
      r.department = r.Department?.name || null;
      r.position = resolvePositionTitle(r.Position?.title || null, recentHeadIds.has(r.id));
      delete r.Department;
      delete r.Position;
      return r;
    });

    // ── Department Overview ────────────────────────────────
    const departments = await Department.findAll({
      where: { companyId },
      include: [{ model: Employee, as: 'Employees', attributes: [] }],
      attributes: [
        'id',
        'name',
        'abbreviation',
        'head',
        [fn('COUNT', col('Employees.id')), 'employeeCount'],
      ],
      group: ['Department.id', 'Department.name', 'Department.abbreviation', 'Department.head'],
      order: [['name', 'ASC']],
      raw: true,
      nest: true,
    });

    const departmentOverview = departments.map((d) => ({
      id: d.id,
      name: d.name,
      abbreviation: d.abbreviation,
      employeeCount: parseInt(d.employeeCount, 10) || 0,
      head: d.head || 'Not assigned',
    }));

    // ── Recent Activity ────────────────────────────────────
    const activities = await Activity.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    const recentActivity = activities.map((a) => ({
      id: a.id,
      action: a.action,
      timestamp: relativeTime(a.createdAt),
      type: a.type,
    }));

    // ── Response ───────────────────────────────────────────
    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        totalDepartments,
        newEmployeesThisMonth,
        statusDistribution,
        recentEmployees: recent,
        departmentOverview,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};
