// backend/src/index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const identityRoutes = require('./routes/identity');
const dataRoutes = require('./routes/data');
const { verifySignature } = require('./services/wallet/verification');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Signature verification middleware
app.use(async (req, res, next) => {
  if (req.path.includes('/verify') || req.method === 'GET') {
    return next();
  }
  
  const { address, signature } = req.body;
  
  if (!address || !signature) {
    return next();
  }
  
  try {
    const isValid = await verifySignature(address, signature);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid signature' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Signature verification failed' });
  }
});

// Routes
app.use('/api/identity', identityRoutes);
app.use('/api/data', dataRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
