const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  createRoom,
  getRooms,
  getRoomById,
  applyForRoom,
  getRoomApplications,
  updateApplicationStatus
} = require('../controllers/roomController');

const router = express.Router();

router.get('/', getRooms);
router.get('/:id', getRoomById);

router.post('/', authenticateToken, [
  body('apartment_id').isInt(),
  body('room_type').isIn(['bedroom', 'studio', 'shared_bedroom']),
  body('monthly_rent').isFloat({ min: 0 })
], createRoom);

router.post('/:id/apply', authenticateToken, [
  body('message').optional().isLength({ max: 500 })
], applyForRoom);

router.get('/:id/applications', authenticateToken, getRoomApplications);

router.put('/applications/:applicationId', authenticateToken, [
  body('status').isIn(['approved', 'rejected'])
], updateApplicationStatus);

module.exports = router;