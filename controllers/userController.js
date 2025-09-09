const { validationResult } = require('express-validator');
const { promisePool } = require('../config/database');

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      bio, age, occupation, budget_min, budget_max, lifestyle_preferences
    } = req.body;

    await promisePool.execute(
      `UPDATE users SET 
        bio = ?, age = ?, occupation = ?, budget_min = ?, budget_max = ?, 
        lifestyle_preferences = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        bio, age, occupation, budget_min, budget_max,
        JSON.stringify(lifestyle_preferences || {}), req.user.id
      ]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT id, email, first_name, last_name, phone, bio, age, occupation,
              budget_min, budget_max, lifestyle_preferences, verification_status
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    const profile = {
      ...rows[0],
      lifestyle_preferences: rows[0].lifestyle_preferences ? 
        JSON.parse(rows[0].lifestyle_preferences) : {}
    };

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const calculateCompatibilityScore = (user1, user2) => {
  let score = 0.5;
  
  if (user1.budget_min && user1.budget_max && user2.budget_min && user2.budget_max) {
    const budgetOverlap = Math.max(0, Math.min(user1.budget_max, user2.budget_max) - 
                                   Math.max(user1.budget_min, user2.budget_min));
    const maxBudgetRange = Math.max(user1.budget_max - user1.budget_min, 
                                   user2.budget_max - user2.budget_min);
    score += (budgetOverlap / maxBudgetRange) * 0.3;
  }

  if (user1.age && user2.age) {
    const ageDiff = Math.abs(user1.age - user2.age);
    const ageScore = Math.max(0, 1 - ageDiff / 20);
    score += ageScore * 0.1;
  }

  if (user1.lifestyle_preferences && user2.lifestyle_preferences) {
    const prefs1 = typeof user1.lifestyle_preferences === 'string' ? 
      JSON.parse(user1.lifestyle_preferences) : user1.lifestyle_preferences;
    const prefs2 = typeof user2.lifestyle_preferences === 'string' ? 
      JSON.parse(user2.lifestyle_preferences) : user2.lifestyle_preferences;

    const compatibleKeys = ['cleanliness', 'noise_level', 'pets', 'smoking', 'guests'];
    let matches = 0;
    let total = 0;

    compatibleKeys.forEach(key => {
      if (prefs1[key] && prefs2[key]) {
        total++;
        if (prefs1[key] === prefs2[key]) {
          matches++;
        }
      }
    });

    if (total > 0) {
      score += (matches / total) * 0.1;
    }
  }

  return Math.min(1, Math.max(0, score));
};

const findRoommates = async (req, res) => {
  try {
    const [currentUser] = await promisePool.execute(
      `SELECT age, budget_min, budget_max, lifestyle_preferences 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (currentUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [potentialRoommates] = await promisePool.execute(
      `SELECT id, first_name, last_name, age, occupation, bio, budget_min, budget_max,
              lifestyle_preferences, verification_status
       FROM users 
       WHERE id != ? AND verification_status = 'verified'`,
      [req.user.id]
    );

    const user = currentUser[0];
    const matches = potentialRoommates.map(roommate => {
      const compatibilityScore = calculateCompatibilityScore(user, roommate);
      
      return {
        ...roommate,
        lifestyle_preferences: roommate.lifestyle_preferences ? 
          JSON.parse(roommate.lifestyle_preferences) : {},
        compatibility_score: Math.round(compatibilityScore * 100)
      };
    }).filter(match => match.compatibility_score >= 60)
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, 20);

    res.json({ matches });
  } catch (error) {
    console.error('Find roommates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const expressInterest = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (user_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot express interest in yourself' });
    }

    const [existing] = await promisePool.execute(
      `SELECT id FROM roommate_matches 
       WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
      [req.user.id, user_id, user_id, req.user.id]
    );

    if (existing.length > 0) {
      await promisePool.execute(
        'UPDATE roommate_matches SET mutual_interest = 1 WHERE id = ?',
        [existing[0].id]
      );
      
      res.json({ message: 'Mutual interest established!', mutual: true });
    } else {
      const [user1] = await promisePool.execute(
        'SELECT age, budget_min, budget_max, lifestyle_preferences FROM users WHERE id = ?',
        [req.user.id]
      );
      const [user2] = await promisePool.execute(
        'SELECT age, budget_min, budget_max, lifestyle_preferences FROM users WHERE id = ?',
        [user_id]
      );

      const compatibilityScore = calculateCompatibilityScore(user1[0], user2[0]);

      await promisePool.execute(
        'INSERT INTO roommate_matches (user1_id, user2_id, compatibility_score) VALUES (?, ?, ?)',
        [req.user.id, user_id, compatibilityScore]
      );

      res.json({ message: 'Interest expressed successfully', mutual: false });
    }
  } catch (error) {
    console.error('Express interest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMatches = async (req, res) => {
  try {
    const [matches] = await promisePool.execute(
      `SELECT rm.*, 
              CASE 
                WHEN rm.user1_id = ? THEN u2.first_name
                ELSE u1.first_name
              END as first_name,
              CASE 
                WHEN rm.user1_id = ? THEN u2.last_name
                ELSE u1.last_name
              END as last_name,
              CASE 
                WHEN rm.user1_id = ? THEN u2.email
                ELSE u1.email
              END as email,
              CASE 
                WHEN rm.user1_id = ? THEN u2.age
                ELSE u1.age
              END as age,
              CASE 
                WHEN rm.user1_id = ? THEN u2.occupation
                ELSE u1.occupation
              END as occupation,
              CASE 
                WHEN rm.user1_id = ? THEN u2.bio
                ELSE u1.bio
              END as bio
       FROM roommate_matches rm
       JOIN users u1 ON rm.user1_id = u1.id
       JOIN users u2 ON rm.user2_id = u2.id
       WHERE (rm.user1_id = ? OR rm.user2_id = ?) AND rm.mutual_interest = 1
       ORDER BY rm.created_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );

    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  updateProfile,
  getProfile,
  findRoommates,
  expressInterest,
  getMatches
};