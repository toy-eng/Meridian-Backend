const { Op } = require('sequelize');
const { Department } = require('../models');

/**
 * Return the set of employee ids that are currently heads of a department,
 * scoped to a company.
 *
 * @param {string[]} employeeIds
 * @param {string} companyId
 * @returns {Promise<Set<string>>}
 */
const getHeadEmployeeIds = async (employeeIds, companyId) => {
  if (!employeeIds || employeeIds.length === 0) return new Set();

  const depts = await Department.findAll({
    where: { headId: { [Op.in]: employeeIds }, companyId },
    attributes: ['headId'],
  });

  return new Set(depts.map((d) => d.headId));
};

/**
 * Resolve an employee's display position title.
 *
 * Rule: a personally assigned position always wins; otherwise, if the
 * employee is the head of a department, they display as 'HOD'.
 *
 * @param {string|null} assignedTitle - resolved Position.title, if any
 * @param {boolean} isDepartmentHead
 * @returns {string|null}
 */
const resolvePositionTitle = (assignedTitle, isDepartmentHead) => {
  if (assignedTitle) return assignedTitle;
  if (isDepartmentHead) return 'HOD';
  return null;
};

module.exports = { getHeadEmployeeIds, resolvePositionTitle };
