const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

/**
 * Generate a short unique ID with a prefix.
 * @param {string} prefix - e.g. 'emp', 'edu', 'doc', 'n', 'comp'
 * @returns {string} e.g. 'emp-a1b2c3d4'
 */
const generateId = (prefix) => {
  const short = uuidv4().split('-')[0];
  return `${prefix}-${short}`;
};

/**
 * Derive an abbreviation from a department name.
 *
 * Rules:
 *  - Split on whitespace, `/`, `&`, `-`, `–`, `,` to handle names like "UI/UX"
 *  - Filter out common stop words ("and", "or", "the", "of", "for", "in", "at", "to", "by", "&")
 *  - Single meaningful word → first 3 chars uppercase (e.g. "Engineering" → "ENG")
 *  - Multiple meaningful words → first letter of each, max 4 chars (e.g. "Human Resources" → "HR")
 *  - Fallback: if filtering leaves nothing, use the first word's first 3 chars
 *
 * The abbreviation is a human-friendly shorthand — uniqueness comes from the
 * full ID (ABB-YY-MM-SEQ), so two departments can share the same abbreviation
 * without collision.
 *
 * @param {string} name
 * @returns {string}
 */
const deriveAbbreviation = (name) => {
  // Normalise special characters to spaces
  const cleaned = name.replace(/[\/\&\-–—,]+/g, ' ');
  const words = cleaned.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'DEF'; // defensive fallback

  const stopWords = new Set(['and', 'or', 'the', 'of', 'for', 'in', 'at', 'to', 'by', '&']);
  const meaningful = words.filter((w) => !stopWords.has(w.toLowerCase()));

  // If all words were stop words, fall back to the first word
  if (meaningful.length === 0) {
    return words[0].slice(0, 3).toUpperCase();
  }

  // Single meaningful word → first 3 chars uppercase
  if (meaningful.length === 1) {
    return meaningful[0].slice(0, 3).toUpperCase();
  }

  // Multiple words → first letter of each, max 4 chars
  return meaningful
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
};

/**
 * Generate a department ID in the format {ABB}-{YY}-{MM}-{SEQ}.
 * Queries the database to find the next sequence number.
 * @param {string} name - Department name (used to derive abbreviation)
 * @returns {Promise<string>} e.g. 'ENG-26-07-001'
 */
const generateDepartmentId = async (name) => {
  const abb = deriveAbbreviation(name);
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${abb}-${yy}-${mm}-`;

  // Find the highest sequence for the same prefix
  const [rows] = await sequelize.query(
    `SELECT id FROM departments WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
    { replacements: [`${prefix}%`] }
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const lastId = rows[0].id;
    const lastSeq = parseInt(lastId.split('-').pop(), 10);
    nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
};

/**
 * Generate an employee ID in the format EMP-{YY}-{MM}-{SEQ}.
 * @returns {Promise<string>} e.g. 'EMP-26-07-001'
 */
const generateEmployeeId = async () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `EMP-${yy}-${mm}-`;

  const [rows] = await sequelize.query(
    `SELECT id FROM employees WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
    { replacements: [`${prefix}%`] }
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const lastId = rows[0].id;
    const lastSeq = parseInt(lastId.split('-').pop(), 10);
    nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
};

module.exports = generateId;
module.exports.deriveAbbreviation = deriveAbbreviation;
module.exports.generateDepartmentId = generateDepartmentId;
module.exports.generateEmployeeId = generateEmployeeId;
