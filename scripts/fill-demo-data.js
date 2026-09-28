/**
 * Demo data filler for the StaffSync backend.
 *
 * Fills ONE company account (default: contact@rockscompany.com) with a
 * realistic, roughly one-year-old dataset so every dashboard widget and
 * report graph has data:
 *
 *   - 4 departments, each with a head
 *   - 25 employees, every one holding a position that is unique inside
 *     their own department
 *   - 2 resigned, 2 on leave, 3 on probation, the rest active
 *   - salaries, bank accounts, education, notes
 *   - a backdated activity feed spread across the whole year
 *
 * The write is scoped to a single company. No other company is touched.
 *
 * By default it REPLACES that company's employees / departments / positions /
 * activity after you confirm. Flags:
 *
 *   --yes                 skip the confirmation prompt
 *   --keep                add without deleting anything first
 *   --company=a@b.com     target a different company account
 *
 * Usage:
 *   node scripts/fill-demo-data.js
 */
'use strict';

const readline = require('readline');
const { Op, fn, col } = require('sequelize');
const { sequelize, testConnection } = require('../src/config/database');
const {
  Company,
  Department,
  Position,
  Employee,
  Salary,
  BankAccount,
  Document,
  Education,
  Note,
  Activity,
} = require('../src/models');
const { deriveAbbreviation } = require('../src/utils/generateId');

const DEFAULT_COMPANY_EMAIL = 'contact@rockscompany.com';

// ---------------------------------------------------------------------------
// The dataset
// ---------------------------------------------------------------------------

// Monthly pay, in Naira, keyed by seniority.
const SALARY_BANDS = {
  lead: { base: 1250000, spread: 150000 },
  senior: { base: 850000, spread: 90000 },
  mid: { base: 600000, spread: 70000 },
  junior: { base: 380000, spread: 50000 },
};

// `monthsAgo` is counted back from the current month (0 = this month).
// Together the 25 values cover all 12 months of the last year, with two
// hires in the current month, so the hiring-trend chart has a bar per month.
const PLAN = [
  {
    name: 'Development',
    description: 'Engineering, platform architecture and developer operations.',
    positions: [
      'Engineering Manager',
      'Lead Developer',
      'Senior Software Engineer',
      'Software Engineer',
      'Frontend Engineer',
      'Backend Engineer',
      'DevOps Engineer',
    ],
    people: [
      { first: 'Cody', last: 'Fisher', position: 'Engineering Manager', isHead: true, monthsAgo: 11, day: 6, status: 'Active', seniority: 'lead', gender: 'Male' },
      { first: 'Chiamaka', last: 'Eze', position: 'Lead Developer', monthsAgo: 10, day: 13, status: 'Active', seniority: 'lead', gender: 'Female' },
      { first: 'Samuel', last: 'Adeyemi', position: 'Senior Software Engineer', monthsAgo: 9, day: 4, status: 'Active', seniority: 'senior', gender: 'Male' },
      { first: 'Fatima', last: 'Bello', position: 'Software Engineer', monthsAgo: 8, day: 19, status: 'Active', seniority: 'mid', gender: 'Female' },
      { first: 'Ngozi', last: 'Umeh', position: 'Backend Engineer', monthsAgo: 6, day: 11, status: 'Active', seniority: 'mid', gender: 'Female' },
      { first: 'Ibrahim', last: 'Suleiman', position: 'DevOps Engineer', monthsAgo: 5, day: 26, status: 'Resigned', seniority: 'senior', gender: 'Male' },
      { first: 'Tunde', last: 'Balogun', position: 'Frontend Engineer', monthsAgo: 1, day: 8, status: 'Probation', seniority: 'mid', gender: 'Male' },
    ],
  },
  {
    name: 'Design',
    description: 'Product design, user research and brand systems.',
    positions: [
      'Creative Director',
      'Senior Product Designer',
      'UX Designer',
      'UI Designer',
      'Visual Designer',
      'Design Systems Specialist',
    ],
    people: [
      { first: 'Brooklyn', last: 'Simmons', position: 'Creative Director', isHead: true, monthsAgo: 11, day: 9, status: 'Active', seniority: 'lead', gender: 'Female' },
      { first: 'Daniel', last: 'Okonkwo', position: 'Senior Product Designer', monthsAgo: 10, day: 21, status: 'Active', seniority: 'senior', gender: 'Male' },
      { first: 'Zainab', last: 'Yusuf', position: 'UX Designer', monthsAgo: 9, day: 15, status: 'Active', seniority: 'mid', gender: 'Female' },
      { first: 'Michael', last: 'Adeleke', position: 'UI Designer', monthsAgo: 7, day: 2, status: 'Active', seniority: 'mid', gender: 'Male' },
      { first: 'Grace', last: 'Nwosu', position: 'Visual Designer', monthsAgo: 4, day: 23, status: 'OnLeave', seniority: 'mid', gender: 'Female' },
      { first: 'Hassan', last: 'Ibrahim', position: 'Design Systems Specialist', monthsAgo: 0, day: 3, status: 'Probation', seniority: 'junior', gender: 'Male' },
    ],
  },
  {
    name: 'HR',
    description: 'People operations, recruitment and employee relations.',
    positions: [
      'HR Manager',
      'Talent Acquisition Specialist',
      'HR Officer',
      'People Operations Analyst',
      'Compensation Analyst',
      'Learning & Development Specialist',
    ],
    people: [
      { first: 'Amina', last: 'Abubakar', position: 'HR Manager', isHead: true, monthsAgo: 11, day: 17, status: 'Active', seniority: 'lead', gender: 'Female' },
      { first: 'Oluwaseun', last: 'Adebisi', position: 'Talent Acquisition Specialist', monthsAgo: 8, day: 7, status: 'Active', seniority: 'mid', gender: 'Male' },
      { first: 'Blessing', last: 'Etim', position: 'HR Officer', monthsAgo: 7, day: 25, status: 'Active', seniority: 'mid', gender: 'Female' },
      { first: 'Yusuf', last: 'Danjuma', position: 'People Operations Analyst', monthsAgo: 5, day: 12, status: 'Active', seniority: 'mid', gender: 'Male' },
      { first: 'Kelechi', last: 'Obi', position: 'Compensation Analyst', monthsAgo: 3, day: 28, status: 'Resigned', seniority: 'senior', gender: 'Male' },
      { first: 'Aisha', last: 'Mohammed', position: 'Learning & Development Specialist', monthsAgo: 2, day: 14, status: 'Active', seniority: 'junior', gender: 'Female' },
    ],
  },
  {
    name: 'Marketing',
    description: 'Brand strategy, content and growth marketing.',
    positions: [
      'Marketing Manager',
      'Content Strategist',
      'SEO Specialist',
      'Marketing Specialist',
      'Social Media Manager',
      'Brand Analyst',
    ],
    people: [
      { first: 'Adaeze', last: 'Nnamdi', position: 'Marketing Manager', isHead: true, monthsAgo: 10, day: 5, status: 'Active', seniority: 'lead', gender: 'Female' },
      { first: 'Emeka', last: 'Obi', position: 'Content Strategist', monthsAgo: 6, day: 20, status: 'Active', seniority: 'senior', gender: 'Male' },
      { first: 'Sarah', last: 'Johnson', position: 'SEO Specialist', monthsAgo: 4, day: 9, status: 'Active', seniority: 'mid', gender: 'Female' },
      { first: 'David', last: 'Adeoye', position: 'Marketing Specialist', monthsAgo: 3, day: 16, status: 'Active', seniority: 'mid', gender: 'Male' },
      { first: 'Halima', last: 'Sani', position: 'Social Media Manager', monthsAgo: 2, day: 27, status: 'OnLeave', seniority: 'junior', gender: 'Female' },
      { first: 'Peter', last: 'Ogunleye', position: 'Brand Analyst', monthsAgo: 0, day: 15, status: 'Probation', seniority: 'junior', gender: 'Male' },
    ],
  },
];

// Pools used to build the profile data that is not hand-written above.
const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City', 'Abeokuta'];
const STREETS = [
  'Adeola Odeku Street',
  'Marina Road',
  'Ahmadu Bello Way',
  'Ring Road',
  'Ogunlana Drive',
  'Ademola Adetokunbo Crescent',
  'Zik Avenue',
  'Bode Thomas Street',
];
const BANKS = [
  'Guaranty Trust Bank',
  'Access Bank',
  'Zenith Bank',
  'First Bank of Nigeria',
  'United Bank for Africa',
  'Fidelity Bank',
  'Stanbic IBTC',
];
const SCHOOLS = [
  'University of Lagos',
  'Covenant University',
  'Obafemi Awolowo University',
  'University of Ibadan',
  'Ahmadu Bello University',
  'University of Nigeria, Nsukka',
  'Lagos State University',
  'Federal University of Technology, Akure',
];
const DEPT_FIELDS = {
  Development: ['Computer Science', 'Software Engineering', 'Information Technology'],
  Design: ['Graphic Design', 'Visual Communication', 'Industrial Design'],
  HR: ['Human Resource Management', 'Industrial Relations', 'Business Administration'],
  Marketing: ['Marketing', 'Mass Communication', 'Business Administration'],
};
const QUALIFICATIONS = ['B.Sc', 'B.A', 'B.Tech', 'HND', 'M.Sc'];
const MANAGER_FIRST_NAMES = ['Musa', 'Ifeoma', 'Segun', 'Rebecca', 'Bashir', 'Chinwe'];

const NOTE_TEMPLATES = [
  { title: 'Performance review', text: 'Consistently exceeds expectations. Recommended for the leadership track this year.' },
  { title: 'Promotion recommendation', text: 'Delivered the quarterly goals ahead of schedule and mentors the junior team.' },
  { title: 'Onboarding note', text: 'Settled in quickly and has already shipped their first independent task.' },
  { title: 'Leave request', text: 'Approved annual leave. Handover plan shared with the department head.' },
  { title: 'Attrition risk', text: 'Flagged a desire for more ownership. Discussing a stretch assignment.' },
  { title: 'Recognition', text: 'Called out by stakeholders for excellent cross-team communication.' },
  { title: 'Exit interview', text: 'Departed on good terms; eligible for rehire.' },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); }));
}

const pad = (value, size) => String(value).padStart(size, '0');

function monthStart(monthsAgo) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

function hireDateFor(monthsAgo, day) {
  const start = monthStart(monthsAgo);
  const date = new Date(start.getFullYear(), start.getMonth(), day);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function makeEmployeeId(hireDate, counters) {
  const year = hireDate.slice(2, 4);
  const month = hireDate.slice(5, 7);
  const key = `${year}-${month}`;
  counters[key] = (counters[key] || 0) + 1;
  return `EMP-${year}-${month}-${pad(counters[key], 3)}`;
}

function profileFor(index, person, departmentName) {
  const city = CITIES[index % CITIES.length];
  const street = STREETS[index % STREETS.length];
  const emergencyFirst = MANAGER_FIRST_NAMES[index % MANAGER_FIRST_NAMES.length];
  return {
    dob: `${1985 + (index % 12)}-${pad((index * 5) % 12 + 1, 2)}-${pad((index * 7) % 27 + 1, 2)}`,
    phoneNumber: `+234 80${(index % 9) + 1} ${pad(120 + index * 11, 3)} ${pad(1000 + index * 137, 4).slice(-4)}`,
    address: `${street}, ${city}`,
    emergencyContact: `${emergencyFirst} ${person.last} (+234 81${(index % 9) + 1} ${pad(200 + index * 13, 3)} ${pad(5000 + index * 211, 4).slice(-4)})`,
    bankName: BANKS[index % BANKS.length],
    institutionName: SCHOOLS[index % SCHOOLS.length],
    fieldOfStudy: (DEPT_FIELDS[departmentName] || ['Business Administration'])[index % (DEPT_FIELDS[departmentName] || ['Business Administration']).length],
    qualification: QUALIFICATIONS[index % QUALIFICATIONS.length],
    graduationYear: String(2008 + (index % 12)),
    accountNumber: pad(1000000000 + index * 13577, 10),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const args = process.argv.slice(2);
  const autoYes = args.includes('--yes');
  const keepMode = args.includes('--keep');
  const companyArg = args.find((a) => a.startsWith('--company='));
  const companyEmail = companyArg ? companyArg.slice('--company='.length) : DEFAULT_COMPANY_EMAIL;

  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot fill demo data: database not connected.');
    process.exit(1);
  }
  await sequelize.sync();

  const company = await Company.findOne({ where: { email: companyEmail } });
  if (!company) {
    console.error(`No company found with email "${companyEmail}".`);
    console.error('Nothing was written. Check the email, or run the main seed first.');
    process.exit(1);
  }

  console.log(`\nTarget account: ${company.name} <${company.email}>  [${company.id}]`);

  if (!keepMode && !autoYes) {
    console.log('\nThis will DELETE the existing employees, departments, positions and');
    console.log('activity for THIS account only, then rebuild them with demo data.');
    const answer = await ask('Type "fill it" to continue: ');
    if (answer !== 'fill it') {
      console.log('Aborted. Nothing was changed.');
      process.exit(0);
    }
  }

  // ---- 1. Clear this company's existing records (replace mode) ------------
  if (!keepMode) {
    const existingEmployees = await Employee.findAll({ where: { companyId: company.id }, attributes: ['id'], raw: true });
    const employeeIds = existingEmployees.map((e) => e.id);
    const existingDepartments = await Department.findAll({ where: { companyId: company.id }, attributes: ['id'], raw: true });
    const departmentIds = existingDepartments.map((d) => d.id);

    if (employeeIds.length) {
      await Note.destroy({ where: { employeeId: { [Op.in]: employeeIds } } });
      await Education.destroy({ where: { employeeId: { [Op.in]: employeeIds } } });
      await Salary.destroy({ where: { employeeId: { [Op.in]: employeeIds } } });
      await BankAccount.destroy({ where: { employeeId: { [Op.in]: employeeIds } } });
      await Document.destroy({ where: { employeeId: { [Op.in]: employeeIds } } });
      await Employee.destroy({ where: { companyId: company.id } });
    }
    if (departmentIds.length) {
      await Position.destroy({ where: { departmentId: { [Op.in]: departmentIds } } });
      await Department.destroy({ where: { companyId: company.id } });
    }
    await Activity.destroy({ where: { companyId: company.id } });
    console.log(`Cleared ${employeeIds.length} employee(s) and ${departmentIds.length} department(s).`);
  }

  const counters = {};
  const created = [];

  // ---- 2. Departments, positions and employees ----------------------------
  const now = new Date();
  const deptYear = String(now.getFullYear()).slice(2);
  const deptMonth = pad(now.getMonth() + 1, 2);
  let departmentSequence = 0;
  let index = 0;

  for (const plan of PLAN) {
    let department = await Department.findOne({ where: { companyId: company.id, name: plan.name } });
    if (!department) {
      departmentSequence += 1;
      department = await Department.create({
        id: `${deriveAbbreviation(plan.name)}-${deptYear}-${deptMonth}-${pad(departmentSequence, 3)}`,
        name: plan.name,
        abbreviation: deriveAbbreviation(plan.name),
        description: plan.description,
        head: 'Not assigned',
        companyId: company.id,
        dateCreated: hireDateFor(12, 1),
      });
      console.log(`+ department ${department.name} (${department.id})`);
    }

    const positionsByTitle = {};
    for (const title of plan.positions) {
      let position = await Position.findOne({ where: { departmentId: department.id, title } });
      if (!position) {
        position = await Position.create({ departmentId: department.id, title, description: `${title} in ${plan.name}` });
      }
      positionsByTitle[title] = position;
    }

    let headPerson = null;
    for (const person of plan.people) {
      const email = `${person.first}.${person.last}@rockscompany.com`.toLowerCase();
      const existing = await Employee.findOne({ where: { email } });
      if (existing) {
        console.log(`= employee ${email} already exists, skipping`);
        if (person.isHead) {
          headPerson = existing;
          await department.update({ head: `${person.first} ${person.last}`, headId: existing.id });
        }
        index += 1;
        continue;
      }

      const hireDate = hireDateFor(person.monthsAgo, person.day);
      const profile = profileFor(index, person, plan.name);
      const isHead = Boolean(person.isHead);
      const reportingName = headPerson ? `${headPerson.first} ${headPerson.last}` : 'Self';
      const reportingId = headPerson ? headPerson.id : null;

      const employee = await Employee.create({
        id: makeEmployeeId(hireDate, counters),
        firstName: person.first,
        lastName: person.last,
        email,
        phoneNumber: profile.phoneNumber,
        gender: person.gender,
        dob: profile.dob,
        address: profile.address,
        emergencyContact: profile.emergencyContact,
        departmentId: department.id,
        position: positionsByTitle[person.position].id,
        employmentType: 'Full-time',
        hireDate,
        reportingManager: isHead ? 'Self' : reportingName,
        reportingManagerId: isHead ? null : reportingId,
        status: person.status,
        companyId: company.id,
        createdAt: new Date(`${hireDate}T09:00:00`),
        updatedAt: new Date(`${hireDate}T09:00:00`),
      });

      const band = SALARY_BANDS[person.seniority];
      const base = roundTo(band.base + ((index * 13711) % band.spread) - band.spread / 2, 1000);
      await Salary.create({
        baseSalary: base,
        bonus: roundTo(base * 0.08, 1000),
        allowances: roundTo(base * 0.12, 1000),
        employeeId: employee.id,
      });
      await BankAccount.create({
        bankName: profile.bankName,
        accountName: `${person.first} ${person.last}`,
        accountNumber: profile.accountNumber,
        employeeId: employee.id,
      });
      await Education.create({
        institutionName: profile.institutionName,
        qualification: profile.qualification,
        fieldOfStudy: profile.fieldOfStudy,
        graduationYear: profile.graduationYear,
        employeeId: employee.id,
      });

      const noteTemplate = NOTE_TEMPLATES[index % NOTE_TEMPLATES.length];
      if (index % 3 === 0 || person.status === 'Resigned') {
        await Note.create({
          title: person.status === 'Resigned' ? 'Exit interview' : noteTemplate.title,
          text: noteTemplate.text,
          createdDate: hireDateFor(Math.max(person.monthsAgo - 1, 0), Math.min(person.day, 28)),
          employeeId: employee.id,
        });
      }

      if (isHead) {
        headPerson = employee;
        await department.update({ head: `${person.first} ${person.last}`, headId: employee.id });
      }

      created.push({ employee, person, department, hireDate, status: person.status });
      index += 1;
    }
  }

  console.log(`Created ${created.length} employee(s).`);

  // ---- 3. Activity feed ---------------------------------------------------
  const activities = [];

  for (const row of created) {
    const name = `${row.person.first} ${row.person.last}`;
    activities.push({
      action: `You created employee ${name}`,
      type: 'employee',
      companyId: company.id,
      createdAt: new Date(`${row.hireDate}T10:15:00`),
      updatedAt: new Date(`${row.hireDate}T10:15:00`),
    });
  }

  for (const plan of PLAN) {
    const department = await Department.findOne({ where: { companyId: company.id, name: plan.name } });
    if (!department) continue;
    activities.push({
      action: `You created the ${plan.name} department`,
      type: 'department',
      companyId: company.id,
      createdAt: new Date(`${hireDateFor(12, 2)}T08:30:00`),
    });
    activities.push({
      action: `You updated ${plan.name} department details`,
      type: 'department_edit',
      companyId: company.id,
      createdAt: daysAgo(20 + PLAN.indexOf(plan) * 9),
    });
  }

  for (const row of created) {
    const name = `${row.person.first} ${row.person.last}`;
    if (row.status === 'Resigned') {
      activities.push({
        action: `You recorded the resignation of ${name}`,
        type: 'employee_delete',
        companyId: company.id,
        createdAt: daysAgo(38),
      });
    } else if (row.status === 'OnLeave') {
      activities.push({
        action: `You approved leave for ${name}`,
        type: 'note',
        companyId: company.id,
        createdAt: daysAgo(12),
      });
    }
  }

  const recentFeed = [
    { action: 'You added a note for Amina Abubakar', type: 'note', days: 2 },
    { action: 'You updated the salary record for Chiamaka Eze', type: 'salary', days: 5 },
    { action: 'You uploaded a document for Daniel Okonkwo', type: 'document', days: 9 },
    { action: 'You updated education details for Sarah Johnson', type: 'education', days: 14 },
    { action: 'You added a note for Peter Ogunleye', type: 'note', days: 18 },
  ];
  for (const item of recentFeed) {
    activities.push({
      action: item.action,
      type: item.type,
      companyId: company.id,
      createdAt: daysAgo(item.days),
    });
  }

  await Activity.bulkCreate(activities);
  console.log(`Created ${activities.length} activity record(s).`);

  // ---- 4. Verify ---------------------------------------------------------
  console.log('\n-------------------------------------------------');
  console.log('VERIFICATION');
  console.log('-------------------------------------------------');

  const totalEmployees = await Employee.count({ where: { companyId: company.id } });
  const totalDepartments = await Department.count({ where: { companyId: company.id } });
  console.log(`Employees:   ${totalEmployees}`);
  console.log(`Departments: ${totalDepartments}`);

  const byStatus = await Employee.findAll({
    where: { companyId: company.id },
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    raw: true,
  });
  console.log('\nStatus breakdown:');
  for (const row of byStatus) console.log(`  ${row.status.padEnd(11)} ${row.count}`);

  const departments = await Department.findAll({ where: { companyId: company.id }, raw: true });
  console.log('\nDepartments:');
  for (const dept of departments) {
    const count = await Employee.count({ where: { companyId: company.id, departmentId: dept.id } });
    const positions = await Position.count({ where: { departmentId: dept.id } });
    console.log(`  ${dept.name.padEnd(12)} employees=${pad(count, 2)} positions=${positions}  head=${dept.head}`);
  }

  const salaries = await Salary.findAll({
    include: [{ model: Employee, as: 'Employee', where: { companyId: company.id }, attributes: ['id'] }],
  });
  let payroll = 0;
  let highest = 0;
  for (const salary of salaries) {
    const total = Number(salary.baseSalary) + Number(salary.bonus) + Number(salary.allowances);
    payroll += total;
    if (total > highest) highest = total;
  }
  console.log(`\nSalary records: ${salaries.length}`);
  console.log(`Monthly payroll: NGN ${payroll.toLocaleString()}`);
  console.log(`Highest paid:    NGN ${highest.toLocaleString()}`);

  console.log('\nHiring trend (last 12 months):');
  for (let i = 11; i >= 0; i--) {
    const start = monthStart(i);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
    const count = await Employee.count({
      where: { companyId: company.id, hireDate: { [Op.between]: [iso(start), iso(end)] } },
    });
    const label = start.toLocaleString('default', { month: 'short', year: 'numeric' });
    console.log(`  ${label.padEnd(9)} ${pad(count, 2)}  ${'#'.repeat(count) || '.'}`);
  }

  const activityCount = await Activity.count({ where: { companyId: company.id } });
  console.log(`\nActivity records: ${activityCount}`);

  console.log('\nDone. Log in as contact@rockscompany.com to see the data.');
  process.exit(0);
};

if (require.main === module) {
  main().catch((error) => {
    console.error('\nFill failed:', error);
    process.exit(1);
  });
}

module.exports = { PLAN, SALARY_BANDS, hireDateFor, monthStart, makeEmployeeId, profileFor };
