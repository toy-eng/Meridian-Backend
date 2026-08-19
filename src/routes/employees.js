const { Router } = require('express');
const employeeController = require('../controllers/employeeController');
const authenticate = require('../middleware/auth');

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// CRUD
router.get('/', employeeController.list);
router.get('/:id', employeeController.getById);
router.post('/', employeeController.create);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.remove);

// Sub-resources
router.put('/:id/salary', employeeController.updateSalary);
router.put('/:id/bank', employeeController.updateBank);

router.post('/:id/education', employeeController.addEducation);
router.delete('/:id/education/:educationId', employeeController.deleteEducation);

router.post('/:id/documents', employeeController.documentUpload, employeeController.addDocument);
router.get('/:id/documents/:documentId/download', employeeController.downloadDocument);
router.delete('/:id/documents/:documentId', employeeController.deleteDocument);

// Professional headshot (same storage approach as documents)
router.post('/:id/headshot', employeeController.headshotUpload, employeeController.addHeadshot);
router.get('/:id/headshot', employeeController.getHeadshot);
router.delete('/:id/headshot', employeeController.deleteHeadshot);

router.post('/:id/notes', employeeController.addNote);
router.delete('/:id/notes/:noteId', employeeController.deleteNote);

module.exports = router;
