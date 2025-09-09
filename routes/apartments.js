const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  createApartment,
  getApartments,
  getApartmentById,
  updateApartment
} = require('../controllers/apartmentController');
const {
  createComparison,
  getComparisons,
  compareApartments
} = require('../controllers/comparisonController');

const router = express.Router();

router.get('/', getApartments);
router.get('/:id', getApartmentById);

router.post('/', authenticateToken, [
  body('title').notEmpty().trim(),
  body('address').notEmpty().trim(),
  body('city').notEmpty().trim(),
  body('total_rooms').isInt({ min: 1 }),
  body('total_bathrooms').isInt({ min: 1 }),
  body('monthly_rent').isFloat({ min: 0 })
], createApartment);

router.put('/:id', authenticateToken, updateApartment);

router.post('/compare', compareApartments);
router.post('/comparisons', authenticateToken, [
  body('apartment_ids').isArray({ min: 2, max: 5 })
], createComparison);
router.get('/comparisons', authenticateToken, getComparisons);

module.exports = router;