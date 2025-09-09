const { validationResult } = require('express-validator');
const { promisePool } = require('../config/database');

const createComparison = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { apartment_ids, comparison_notes } = req.body;

    if (apartment_ids.length < 2 || apartment_ids.length > 5) {
      return res.status(400).json({ message: 'Can compare between 2-5 apartments' });
    }

    const [result] = await promisePool.execute(
      'INSERT INTO apartment_comparisons (user_id, apartment_ids, comparison_notes) VALUES (?, ?, ?)',
      [req.user.id, JSON.stringify(apartment_ids), comparison_notes]
    );

    res.status(201).json({
      message: 'Comparison saved successfully',
      comparisonId: result.insertId
    });
  } catch (error) {
    console.error('Create comparison error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getComparisons = async (req, res) => {
  try {
    const [comparisons] = await promisePool.execute(
      'SELECT * FROM apartment_comparisons WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const formattedComparisons = comparisons.map(comp => ({
      ...comp,
      apartment_ids: JSON.parse(comp.apartment_ids)
    }));

    res.json({ comparisons: formattedComparisons });
  } catch (error) {
    console.error('Get comparisons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const compareApartments = async (req, res) => {
  try {
    const { apartment_ids } = req.body;

    if (!apartment_ids || apartment_ids.length < 2) {
      return res.status(400).json({ message: 'At least 2 apartment IDs required' });
    }

    const placeholders = apartment_ids.map(() => '?').join(',');
    const [apartments] = await promisePool.execute(
      `SELECT a.*, u.first_name, u.last_name
       FROM apartments a
       JOIN users u ON a.owner_id = u.id
       WHERE a.id IN (${placeholders}) AND a.status = 'available'`,
      apartment_ids
    );

    if (apartments.length !== apartment_ids.length) {
      return res.status(404).json({ message: 'One or more apartments not found' });
    }

    const comparison = apartments.map(apt => ({
      ...apt,
      amenities: apt.amenities ? JSON.parse(apt.amenities) : [],
      images: apt.images ? JSON.parse(apt.images) : [],
      price_per_sqft: apt.total_area ? (apt.monthly_rent / apt.total_area).toFixed(2) : null
    }));

    const stats = {
      price_range: {
        min: Math.min(...comparison.map(a => a.monthly_rent)),
        max: Math.max(...comparison.map(a => a.monthly_rent)),
        avg: (comparison.reduce((sum, a) => sum + a.monthly_rent, 0) / comparison.length).toFixed(2)
      },
      room_range: {
        min: Math.min(...comparison.map(a => a.total_rooms)),
        max: Math.max(...comparison.map(a => a.total_rooms))
      },
      area_range: comparison.some(a => a.total_area) ? {
        min: Math.min(...comparison.filter(a => a.total_area).map(a => a.total_area)),
        max: Math.max(...comparison.filter(a => a.total_area).map(a => a.total_area)),
        avg: (comparison.filter(a => a.total_area)
                       .reduce((sum, a) => sum + a.total_area, 0) / 
               comparison.filter(a => a.total_area).length).toFixed(2)
      } : null
    };

    res.json({ apartments: comparison, stats });
  } catch (error) {
    console.error('Compare apartments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createComparison,
  getComparisons,
  compareApartments
};