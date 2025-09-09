const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  updateProfile,
  getProfile,
  findRoommates,
  expressInterest,
  getMatches
} = require('../controllers/userController');

const router = express.Router();

router.get('/profile', authenticateToken, getProfile);

router.put('/profile', authenticateToken, [
  body('age').optional().isInt({ min: 18, max: 100 }),
  body('budget_min').optional().isFloat({ min: 0 }),
  body('budget_max').optional().isFloat({ min: 0 }),
  body('bio').optional().isLength({ max: 500 })
], updateProfile);

router.get('/roommates', authenticateToken, findRoommates);

router.post('/interest', authenticateToken, [
  body('user_id').isInt()
], expressInterest);

router.get('/matches', authenticateToken, getMatches);

module.exports = router;