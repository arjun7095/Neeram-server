const dotenv =require('dotenv');  // ← ADD THIS AT TOP
const mongoose = require('mongoose');
dotenv.config();

const uri = process.env.DOCUMENTDB_URI;

if (!uri) {
  console.error('ERROR: DOCUMENTDB_URI is missing in .env file!');
  process.exit(1);
}

// const connectDB = async () => {
//   try {
//     await mongoose.connect(uri, {
//       ssl: true,
//       tlsAllowInvalidCertificates: true, // Remove in production
//       retryWrites: false,
//     });
//     console.log('DocumentDB Connected Successfully');
//   } catch (err) {
//     console.error('DB Connection Failed:', err.message);
//     process.exit(1);
//   }
// };
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DOCUMENTDB_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;