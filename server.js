const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
const apartmentRoutes = require('./routes/apartments');
const roomRoutes = require('./routes/rooms');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Roommates Rental Platform API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});