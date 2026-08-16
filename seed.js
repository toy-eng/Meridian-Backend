/**
 * Seed script — populates the database with initial sample data.
 *
 * SAFE by default — will NOT drop existing data.
 * To force a full reset you must pass BOTH --force AND type a confirmation.
 *
 * Usage:
 *   node seed.js                     # seed only if database is empty
 *   node seed.js --force             # will prompt for confirmation first
 *   node seed.js --force --yes       # skip prompt (CI / automation only)
 */
const bcrypt = require('bcryptjs');
const { sequelize, testConnection } = require('./src/config/database');
require('./src/models');
const { Admin, Company, Department, Position, Employee, Salary, BankAccount, Education, Note } = require('./src/models');
const { generateDepartmentId, deriveAbbreviation, generateEmployeeId } = require('./src/utils/generateId');
const readline = require('readline');

/** Ask the user a yes/no question in the terminal. */
function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans.trim().toLowerCase()); }));
}

const seed = async () => {
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot seed: database not connected.');
    process.exit(1);
  }

  const forceMode = process.argv.includes('--force');
  const autoYes  = process.argv.includes('--yes');

  // Ensure tables exist before checking for data. A fresh database has no
  // tables yet, and Admin.count() would otherwise fail with "relation does not
  // exist". (On an existing database this is a no-op.)
  await sequelize.sync();

  // Check if data already exists
  const adminCount = await Admin.count();
  const hasData = adminCount > 0;

  if (hasData && !forceMode) {
    console.log('⚠️  Database already contains data. Skipping seed.');
    console.log('   To re-seed from scratch, run: node seed.js --force');
    console.log('   (You will be asked to confirm before any data is dropped.)');
    process.exit(0);
  }

  if (forceMode && hasData) {
    console.log('\n⚠️  ╔══════════════════════════════════════════════════╗');
    console.log('⚠️  ║   DESTRUCTIVE ACTION — ALL DATA WILL BE LOST    ║');
    console.log('⚠️  ╚══════════════════════════════════════════════════╝');
    console.log('');

    if (!autoYes) {
      const answer = await askQuestion(
        '   Type "delete everything" to confirm: '
      );
      if (answer !== 'delete everything') {
        console.log('   ❌ Confirmation failed. Aborting.');
        process.exit(1);
      }
    }

    console.log('   Dropping all tables and re-seeding...');
    await sequelize.sync({ force: true });
    console.log('✅ Tables recreated');
  } else if (forceMode) {
    // Database is empty, safe to seed without confirmation
    await sequelize.sync({ force: true });
    console.log('✅ Tables recreated');
  } else {
    await sequelize.sync();
    console.log('✅ Tables synced (existing data preserved)');
  }

  // ── Admin ──────────────────────────────────────────────────
  const admin = await Admin.create({
    name: 'Admin Strator',
    email: 'admin@rockscompany.com',
    password: await bcrypt.hash('securePassword123', 12),
    role: 'admin',
    profilePicture: 'https://cdn.staffsync.com/images/admin.jpg',
  });

  // ── Company ────────────────────────────────────────────────
  const company = await Company.create({
    name: 'Rocks Company Ltd',
    email: 'contact@rockscompany.com',
    phoneNumber: '+1 312 908 1234',
    address: '123 Avenue block, Chicago, IL',
    description: 'Corporate Headquarters',
    adminId: admin.id,
  });

  // ── Departments ────────────────────────────────────────────
  const design = await Department.create({
    id: await generateDepartmentId('Design'),
    name: 'Design',
    abbreviation: deriveAbbreviation('Design'),
    description: 'User interface design, experience planning, and product aesthetics research.',
    head: 'Brooklyn Simmons',
    companyId: company.id,
  });

  const dev = await Department.create({
    id: await generateDepartmentId('Development'),
    name: 'Development',
    abbreviation: deriveAbbreviation('Development'),
    description: 'Engineering, stack architecture, DevOps.',
    head: 'Cody Fisher',
    companyId: company.id,
  });

  const hr = await Department.create({
    id: await generateDepartmentId('HR'),
    name: 'HR',
    abbreviation: deriveAbbreviation('HR'),
    description: 'Human resources, recruitment, and employee relations.',
    head: 'Not assigned',
    companyId: company.id,
  });

  const marketing = await Department.create({
    id: await generateDepartmentId('Marketing'),
    name: 'Marketing',
    abbreviation: deriveAbbreviation('Marketing'),
    description: 'Brand strategy, campaigns, and market research.',
    head: 'Not assigned',
    companyId: company.id,
  });

  // ── Positions ──────────────────────────────────────────────
  const creativeDirector = await Position.create({
    id: require('uuid').v4(),
    departmentId: design.id,
    title: 'Creative Director',
    description: 'Leads creative vision and design strategy',
  });
  const uxDesigner = await Position.create({
    id: require('uuid').v4(),
    departmentId: design.id,
    title: 'UX Designer',
    description: 'User experience research and prototyping',
  });

  const leadDeveloper = await Position.create({
    id: require('uuid').v4(),
    departmentId: dev.id,
    title: 'Lead Developer',
    description: 'Technical lead and architecture decisions',
  });
  const softwareEngineer = await Position.create({
    id: require('uuid').v4(),
    departmentId: dev.id,
    title: 'Software Engineer',
    description: 'Full-stack software development',
  });

  const hrManager = await Position.create({
    id: require('uuid').v4(),
    departmentId: hr.id,
    title: 'HR Manager',
    description: 'Human resources and recruitment management',
  });

  const marketingSpecialist = await Position.create({
    id: require('uuid').v4(),
    departmentId: marketing.id,
    title: 'Marketing Specialist',
    description: 'Brand strategy and campaign execution',
  });

  // ── Employees ──────────────────────────────────────────────
  const emp1 = await Employee.create({
    id: await generateEmployeeId(),
    firstName: 'Brooklyn',
    lastName: 'Simmons',
    email: 'brok-simms@mail.com',
    phoneNumber: '+1 312 908 1234',
    gender: 'Female',
    dob: '1992-05-14',
    address: '123 Avenue block, Chicago, IL',
    emergencyContact: 'Mark Simmons (+1 312 908 4321)',
    departmentId: design.id,
    position: creativeDirector.id,
    employmentType: 'Full-time',
    hireDate: '2024-01-10',
    reportingManager: 'Self',
    status: 'Active',
    photoUrl: 'https://cdn.staffsync.com/photos/emp-101.jpg',
    companyId: company.id,
  });

  const emp2 = await Employee.create({
    id: await generateEmployeeId(),
    firstName: 'Cody',
    lastName: 'Fisher',
    email: 'cody.fisher@mail.com',
    phoneNumber: '+1 312 908 5678',
    gender: 'Male',
    departmentId: dev.id,
    position: leadDeveloper.id,
    employmentType: 'Full-time',
    hireDate: '2024-01-12',
    status: 'Active',
    companyId: company.id,
  });

  const emp3 = await Employee.create({
    id: await generateEmployeeId(),
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phoneNumber: '+1 555 123 4567',
    gender: 'Male',
    departmentId: dev.id,
    position: softwareEngineer.id,
    employmentType: 'Full-time',
    hireDate: '2025-07-01',
    status: 'Active',
    companyId: company.id,
  });

  // ── Salary ─────────────────────────────────────────────────
  await Salary.create({ baseSalary: 8500, bonus: 1500, allowances: 500, employeeId: emp1.id });
  await Salary.create({ baseSalary: 7200, bonus: 1000, allowances: 300, employeeId: emp2.id });

  // ── Bank Account ───────────────────────────────────────────
  await BankAccount.create({
    bankName: 'Chase Bank',
    accountName: 'Brooklyn Simmons',
    accountNumber: '1234567890',
    employeeId: emp1.id,
  });

  // ── Education ──────────────────────────────────────────────
  // Map old degree into qualification (migration: degree → qualification)
  await Education.create({
    institutionName: 'Chicago Art Institute',
    qualification: 'BFA',
    fieldOfStudy: 'Graphic Design',
    graduationYear: '2014',
    employeeId: emp1.id,
  });

  // ── Notes ──────────────────────────────────────────────────
  await Note.create({
    title: 'Creative Input',
    text: 'Brooklyn has outstanding creative inputs.',
    employeeId: emp1.id,
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Email:    admin@rockscompany.com');
  console.log('   Password: securePassword123');
  console.log('\n📊 Seeded data: 4 departments, 6 positions, 3 employees, plus salaries, bank, education, notes.\n');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
