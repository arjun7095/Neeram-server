require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/documentdb');
const authRoutes = require('./routes/auth');

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/V1/auth', authRoutes);

app.get('/', (req, res) => res.json({ message: 'OTP Backend Live' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));