const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emergencyContact: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'positions',
      key: 'id',
    },
  },
  employmentType: {
    type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Intern', 'Remote'),
    allowNull: false,
  },
  hireDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  reportingManager: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reportingManagerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Probation', 'OnLeave', 'Resigned', 'Terminated'),
    defaultValue: 'Active',
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  departmentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  companyId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Employee;
