const { validationResult } = require('express-validator');
const { promisePool } = require('../config/database');

const createApartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, description, address, city, neighborhood, postal_code,
      latitude, longitude, total_rooms, total_bathrooms, total_area,
      monthly_rent, deposit, utilities_included, pet_friendly,
      furnished, parking_available, amenities, available_from,
      lease_duration_months
    } = req.body;

    const [result] = await promisePool.execute(
      `INSERT INTO apartments (
        owner_id, title, description, address, city, neighborhood, postal_code,
        latitude, longitude, total_rooms, total_bathrooms, total_area,
        monthly_rent, deposit, utilities_included, pet_friendly,
        furnished, parking_available, amenities, available_from,
        lease_duration_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, title, description, address, city, neighborhood, postal_code,
        latitude, longitude, total_rooms, total_bathrooms, total_area,
        monthly_rent, deposit, utilities_included, pet_friendly,
        furnished, parking_available, JSON.stringify(amenities || []),
        available_from, lease_duration_months
      ]
    );

    res.status(201).json({
      message: 'Apartment created successfully',
      apartmentId: result.insertId
    });
  } catch (error) {
    console.error('Create apartment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getApartments = async (req, res) => {
  try {
    const {
      city, min_price, max_price, rooms, furnished,
      pet_friendly, parking, page = 1, limit = 10
    } = req.query;

    let query = `
      SELECT a.*, u.first_name, u.last_name, u.email as owner_email
      FROM apartments a
      JOIN users u ON a.owner_id = u.id
      WHERE a.status = 'available'
    `;
    const queryParams = [];

    if (city) {
      query += ' AND a.city LIKE ?';
      queryParams.push(`%${city}%`);
    }

    if (min_price) {
      query += ' AND a.monthly_rent >= ?';
      queryParams.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ' AND a.monthly_rent <= ?';
      queryParams.push(parseFloat(max_price));
    }

    if (rooms) {
      query += ' AND a.total_rooms >= ?';
      queryParams.push(parseInt(rooms));
    }

    if (furnished === 'true') {
      query += ' AND a.furnished = 1';
    }

    if (pet_friendly === 'true') {
      query += ' AND a.pet_friendly = 1';
    }

    if (parking === 'true') {
      query += ' AND a.parking_available = 1';
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await promisePool.execute(query, queryParams);

    const apartments = rows.map(apartment => ({
      ...apartment,
      amenities: apartment.amenities ? JSON.parse(apartment.amenities) : [],
      images: apartment.images ? JSON.parse(apartment.images) : []
    }));

    res.json({ apartments });
  } catch (error) {
    console.error('Get apartments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getApartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await promisePool.execute(
      `SELECT a.*, u.first_name, u.last_name, u.email as owner_email, u.phone as owner_phone
       FROM apartments a
       JOIN users u ON a.owner_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    const apartment = {
      ...rows[0],
      amenities: rows[0].amenities ? JSON.parse(rows[0].amenities) : [],
      images: rows[0].images ? JSON.parse(rows[0].images) : []
    };

    const [roomRows] = await promisePool.execute(
      'SELECT * FROM rooms WHERE apartment_id = ? AND status = "available"',
      [id]
    );

    apartment.available_rooms = roomRows.map(room => ({
      ...room,
      images: room.images ? JSON.parse(room.images) : []
    }));

    res.json({ apartment });
  } catch (error) {
    console.error('Get apartment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateApartment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [apartment] = await promisePool.execute(
      'SELECT owner_id FROM apartments WHERE id = ?',
      [id]
    );

    if (apartment.length === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    if (apartment[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowedFields = [
      'title', 'description', 'monthly_rent', 'deposit',
      'utilities_included', 'pet_friendly', 'furnished',
      'parking_available', 'amenities', 'status'
    ];

    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(key === 'amenities' ? JSON.stringify(updates[key]) : updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateValues.push(id);

    await promisePool.execute(
      `UPDATE apartments SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Apartment updated successfully' });
  } catch (error) {
    console.error('Update apartment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createApartment,
  getApartments,
  getApartmentById,
  updateApartment
};