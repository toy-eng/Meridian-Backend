const PDFDocument = require('pdfkit');
const { Op, fn, col } = require('sequelize');
const { Employee, Department, Salary } = require('../models');

/**
 * GET /reports/employee-summary
 */
exports.employeeSummary = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const totalEmployees = await Employee.count({ where: { companyId } });
    const activeEmployees = await Employee.count({ where: { status: 'Active', companyId } });
    const inactiveEmployees = await Employee.count({ where: { status: { [Op.ne]: 'Active' }, companyId } });
    const totalDepartments = await Department.count({ where: { companyId } });

    const departments = await Department.findAll({
      where: { companyId },
      include: [{ model: Employee, as: 'Employees', attributes: [] }],
      attributes: ['name', [fn('COUNT', col('Employees.id')), 'count']],
      group: ['Department.id', 'Department.name'],
      raw: true,
      nest: true,
    });

    const employeesPerDepartment = departments.map((d) => ({
      department: d.name,
      count: parseInt(d.count, 10) || 0,
      percentage: totalEmployees > 0 ? parseFloat(((d.count / totalEmployees) * 100).toFixed(1)) : 0,
    }));

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        totalDepartments,
        employeesPerDepartment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /reports/salary-summary
 */
exports.salarySummary = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    // Get all departments for this company (including those with 0 employees)
    const departments = await Department.findAll({
      where: { companyId },
      attributes: ['id', 'name'],
    });

    // Get all salaries for this company, with employee and department info
    const salaries = await Salary.findAll({
      include: [{
        model: Employee,
        as: 'Employee',
        where: { companyId },
        include: [{ model: Department, as: 'Department', attributes: ['name'] }],
      }],
    });

    // Build a map: department name → salary stats
    const deptMap = {};
    let totalMonthlyPayroll = 0;

    for (const s of salaries) {
      const base = parseFloat(s.baseSalary) || 0;
      const bonus = parseFloat(s.bonus) || 0;
      const allowances = parseFloat(s.allowances) || 0;
      const total = base + bonus + allowances;
      totalMonthlyPayroll += total;

      const deptName = s.Employee?.Department?.name || 'Others';
      if (!deptMap[deptName]) {
        deptMap[deptName] = { totalPayroll: 0, count: 0 };
      }
      deptMap[deptName].totalPayroll += total;
      deptMap[deptName].count += 1;
    }

    // Build the distribution — start with all known departments, then add Others
    const salaryDistributionByDepartment = [];

    for (const dept of departments) {
      const existing = deptMap[dept.name];
      salaryDistributionByDepartment.push({
        department: dept.name,
        averageSalary: existing ? parseFloat((existing.totalPayroll / existing.count).toFixed(2)) : 0,
        totalPayroll: existing ? parseFloat(existing.totalPayroll.toFixed(2)) : 0,
        employeeCount: existing ? existing.count : 0,
      });
    }

    // Add "Others" group (employees without a department) if any exist
    if (deptMap['Others']) {
      salaryDistributionByDepartment.push({
        department: 'Others',
        averageSalary: parseFloat((deptMap['Others'].totalPayroll / deptMap['Others'].count).toFixed(2)),
        totalPayroll: parseFloat(deptMap['Others'].totalPayroll.toFixed(2)),
        employeeCount: deptMap['Others'].count,
      });
    }

    const employeeCount = salaries.length;
    const avgCompensation = employeeCount > 0
      ? parseFloat((totalMonthlyPayroll / employeeCount).toFixed(2))
      : 0;

    const allValues = salaries.map((s) => {
      const base = parseFloat(s.baseSalary) || 0;
      const bonus = parseFloat(s.bonus) || 0;
      const allowances = parseFloat(s.allowances) || 0;
      return base + bonus + allowances;
    });
    const highestPaid = allValues.length > 0 ? Math.max(...allValues) : 0;

    res.json({
      success: true,
      data: {
        totalMonthlyPayroll: parseFloat(totalMonthlyPayroll.toFixed(2)),
        averageCompensation: avgCompensation,
        highestPaid,
        salaryDistributionByDepartment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /reports/hiring-trend
 */
exports.hiringTrend = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const months = parseInt(req.query.months, 10) || 12;

    const labels = [];
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthLabel = date.toLocaleString('default', { month: 'short' });
      labels.push(monthLabel);

      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await Employee.count({
        where: {
          companyId,
          hireDate: {
            [Op.between]: [
              startOfMonth.toISOString().split('T')[0],
              endOfMonth.toISOString().split('T')[0],
            ],
          },
        },
      });
      data.push(count);
    }

    res.json({
      success: true,
      data: { labels, data },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /reports/export
 * Export the full report (employee summary + salary summary + hiring trend)
 * as either CSV or PDF.
 */
exports.exportReport = async (req, res, next) => {
  try {
    const format = req.query.format || 'csv';
    const companyId = req.user.companyId;

    // ── Gather all data ────────────────────────────────────
    const employees = await Employee.findAll({
      where: { companyId },
      include: [{ model: Department, as: 'Department', attributes: ['name'] }],
      order: [['createdAt', 'DESC']],
    });

    const salaries = await Salary.findAll({
      include: [{
        model: Employee,
        as: 'Employee',
        where: { companyId },
      }],
    });

    const hiringLabels = [];
    const hiringData = [];
    const months = 12;
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      hiringLabels.push(label);
      const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      const count = await Employee.count({ where: { hireDate: { [Op.between]: [start, end] }, companyId } });
      hiringData.push(count);
    }

    const filename = `StaffSync-Report-${Date.now()}.${format}`;

    // ── CSV export ─────────────────────────────────────────
    if (format === 'csv') {
      let csv = '';

      // Section 1: Employee Summary
      csv += '=== EMPLOYEE SUMMARY ===\n';
      csv += 'ID,First Name,Last Name,Email,Department,Position,Status,Hire Date\n';
      employees.forEach((e) => {
        csv += `${e.id},${e.firstName},${e.lastName},${e.email},${e.Department?.name || ''},${e.position},${e.status},${e.hireDate}\n`;
      });

      csv += '\n\n';

      // Section 2: Salary Summary
      csv += '=== SALARY SUMMARY ===\n';
      csv += 'Employee ID,Name,Base Salary,Bonus,Allowances,Total\n';
      salaries.forEach((s) => {
        const total = (parseFloat(s.baseSalary) || 0) + (parseFloat(s.bonus) || 0) + (parseFloat(s.allowances) || 0);
        csv += `${s.employeeId},${s.Employee?.firstName || ''} ${s.Employee?.lastName || ''},${s.baseSalary},${s.bonus},${s.allowances},${total}\n`;
      });

      csv += '\n\n';

      // Section 3: Hiring Trend
      csv += '=== HIRING TREND ===\n';
      csv += 'Period,Hires\n';
      hiringLabels.forEach((label, i) => {
        csv += `${label},${hiringData[i]}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    // ── PDF export ─────────────────────────────────────────
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Helper: draw a table row
    function drawRow(docRef, columns, x, y, bold) {
      let curX = x;
      const colWidths = columns.map((c) => c.width);
      columns.forEach((col, i) => {
        if (bold) docRef.font('Helvetica-Bold');
        else docRef.font('Helvetica');
        docRef.fontSize(8).text(col.text, curX, y, { width: colWidths[i], align: 'left' });
        curX += colWidths[i];
      });
    }

    // Helper: draw a simple table
    function drawTable(docRef, headers, rows, startY) {
      const marginX = 40;
      const colWidths = headers.map((h) => h.width);
      let y = startY;

      // Header row
      docRef.font('Helvetica-Bold').fontSize(8);
      let hx = marginX;
      headers.forEach((h, i) => {
        docRef.text(h.label, hx, y, { width: colWidths[i], align: 'left' });
        hx += colWidths[i];
      });
      y += 14;
      docRef.moveTo(marginX, y - 4).lineTo(marginX + colWidths.reduce((a, b) => a + b, 0), y - 4).stroke();
      y += 4;

      // Data rows
      docRef.font('Helvetica').fontSize(8);
      for (const row of rows) {
        if (y > 750) {
          docRef.addPage();
          y = 40;
          // Re-draw header on new page
          docRef.font('Helvetica-Bold').fontSize(8);
          let rx = marginX;
          headers.forEach((h, i) => {
            docRef.text(h.label, rx, y, { width: colWidths[i], align: 'left' });
            rx += colWidths[i];
          });
          y += 14;
          docRef.moveTo(marginX, y - 4).lineTo(marginX + colWidths.reduce((a, b) => a + b, 0), y - 4).stroke();
          y += 4;
          docRef.font('Helvetica').fontSize(8);
        }
        let cx = marginX;
        row.forEach((val, i) => {
          docRef.text(String(val), cx, y, { width: colWidths[i], align: 'left' });
          cx += colWidths[i];
        });
        y += 14;
      }
      return y;
    }

    // ── Page 1: Employee Summary ───────────────────────────
    doc.font('Helvetica-Bold').fontSize(18).text('StaffSync Report', 40, 40);
    doc.font('Helvetica').fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 40, 65);
    doc.moveTo(40, 85).lineTo(550, 85).stroke();
    doc.font('Helvetica-Bold').fontSize(14).text('Employee Summary', 40, 100);

    let currentY = 120;
    const empHeaders = [
      { label: 'ID', width: 80 },
      { label: 'Name', width: 120 },
      { label: 'Email', width: 140 },
      { label: 'Department', width: 80 },
      { label: 'Status', width: 60 },
      { label: 'Hire Date', width: 70 },
    ];
    const empRows = employees.map((e) => [
      e.id,
      `${e.firstName} ${e.lastName}`,
      e.email,
      e.Department?.name || '',
      e.status,
      e.hireDate,
    ]);
    currentY = drawTable(doc, empHeaders, empRows, currentY);

    // ── Page 2: Salary Summary ────────────────────────────
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('Salary Summary', 40, 40);
    currentY = 60;
    const salHeaders = [
      { label: 'Employee', width: 120 },
      { label: 'Base Salary', width: 80 },
      { label: 'Bonus', width: 70 },
      { label: 'Allowances', width: 80 },
      { label: 'Total', width: 80 },
    ];
    const salRows = salaries.map((s) => {
      const name = s.Employee ? `${s.Employee.firstName} ${s.Employee.lastName}` : 'Unknown';
      const total = (parseFloat(s.baseSalary) || 0) + (parseFloat(s.bonus) || 0) + (parseFloat(s.allowances) || 0);
      return [name, `₦${s.baseSalary}`, `₦${s.bonus}`, `₦${s.allowances}`, `₦${total.toFixed(2)}`];
    });
    currentY = drawTable(doc, salHeaders, salRows, currentY);

    // ── Page 3: Hiring Trend ──────────────────────────────
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('Hiring Trend', 40, 40);
    currentY = 60;
    const trendHeaders = [
      { label: 'Period', width: 120 },
      { label: 'Hires', width: 80 },
    ];
    const trendRows = hiringLabels.map((label, i) => [label, hiringData[i]]);
    drawTable(doc, trendHeaders, trendRows, currentY);

    doc.end();
  } catch (error) {
    next(error);
  }
};
