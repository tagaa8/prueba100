const { validationResult } = require('express-validator');
const { promisePool } = require('../config/database');

const createRoom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      apartment_id, room_number, room_type, area, monthly_rent,
      deposit, private_bathroom, furnished, description, available_from
    } = req.body;

    const [apartment] = await promisePool.execute(
      'SELECT owner_id FROM apartments WHERE id = ?',
      [apartment_id]
    );

    if (apartment.length === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    if (apartment[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add rooms to this apartment' });
    }

    const [result] = await promisePool.execute(
      `INSERT INTO rooms (
        apartment_id, room_number, room_type, area, monthly_rent,
        deposit, private_bathroom, furnished, description, available_from
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        apartment_id, room_number, room_type, area, monthly_rent,
        deposit, private_bathroom, furnished, description, available_from
      ]
    );

    res.status(201).json({
      message: 'Room created successfully',
      roomId: result.insertId
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRooms = async (req, res) => {
  try {
    const {
      city, min_price, max_price, room_type, furnished,
      private_bathroom, page = 1, limit = 10
    } = req.query;

    let query = `
      SELECT r.*, a.title as apartment_title, a.address, a.city, a.neighborhood,
             a.amenities as apartment_amenities, u.first_name, u.last_name
      FROM rooms r
      JOIN apartments a ON r.apartment_id = a.id
      JOIN users u ON a.owner_id = u.id
      WHERE r.status = 'available' AND a.status = 'available'
    `;
    const queryParams = [];

    if (city) {
      query += ' AND a.city LIKE ?';
      queryParams.push(`%${city}%`);
    }

    if (min_price) {
      query += ' AND r.monthly_rent >= ?';
      queryParams.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ' AND r.monthly_rent <= ?';
      queryParams.push(parseFloat(max_price));
    }

    if (room_type) {
      query += ' AND r.room_type = ?';
      queryParams.push(room_type);
    }

    if (furnished === 'true') {
      query += ' AND r.furnished = 1';
    }

    if (private_bathroom === 'true') {
      query += ' AND r.private_bathroom = 1';
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await promisePool.execute(query, queryParams);

    const rooms = rows.map(room => ({
      ...room,
      images: room.images ? JSON.parse(room.images) : [],
      apartment_amenities: room.apartment_amenities ? JSON.parse(room.apartment_amenities) : []
    }));

    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await promisePool.execute(
      `SELECT r.*, a.title as apartment_title, a.description as apartment_description,
              a.address, a.city, a.neighborhood, a.amenities as apartment_amenities,
              a.pet_friendly, a.parking_available, u.first_name, u.last_name, u.email, u.phone
       FROM rooms r
       JOIN apartments a ON r.apartment_id = a.id
       JOIN users u ON a.owner_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const room = {
      ...rows[0],
      images: rows[0].images ? JSON.parse(rows[0].images) : [],
      apartment_amenities: rows[0].apartment_amenities ? JSON.parse(rows[0].apartment_amenities) : []
    };

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const applyForRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const [room] = await promisePool.execute(
      'SELECT apartment_id FROM rooms WHERE id = ? AND status = "available"',
      [id]
    );

    if (room.length === 0) {
      return res.status(404).json({ message: 'Room not found or not available' });
    }

    const [existing] = await promisePool.execute(
      'SELECT id FROM room_applications WHERE room_id = ? AND applicant_id = ?',
      [id, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You have already applied for this room' });
    }

    await promisePool.execute(
      'INSERT INTO room_applications (room_id, applicant_id, message) VALUES (?, ?, ?)',
      [id, req.user.id, message]
    );

    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Apply for room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRoomApplications = async (req, res) => {
  try {
    const { id } = req.params;

    const [room] = await promisePool.execute(
      `SELECT r.id, a.owner_id 
       FROM rooms r 
       JOIN apartments a ON r.apartment_id = a.id 
       WHERE r.id = ?`,
      [id]
    );

    if (room.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const [applications] = await promisePool.execute(
      `SELECT ra.*, u.first_name, u.last_name, u.email, u.phone, u.bio, u.age, u.occupation
       FROM room_applications ra
       JOIN users u ON ra.applicant_id = u.id
       WHERE ra.room_id = ?
       ORDER BY ra.created_at DESC`,
      [id]
    );

    res.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [application] = await promisePool.execute(
      `SELECT ra.room_id, a.owner_id
       FROM room_applications ra
       JOIN rooms r ON ra.room_id = r.id
       JOIN apartments a ON r.apartment_id = a.id
       WHERE ra.id = ?`,
      [applicationId]
    );

    if (application.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await promisePool.execute(
      'UPDATE room_applications SET status = ? WHERE id = ?',
      [status, applicationId]
    );

    if (status === 'approved') {
      await promisePool.execute(
        'UPDATE rooms SET status = "rented" WHERE id = ?',
        [application[0].room_id]
      );
    }

    res.json({ message: `Application ${status} successfully` });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  applyForRoom,
  getRoomApplications,
  updateApplicationStatus
};