// backend/src/routes/identity.js
const express = require('express');
const multer = require('multer');
const { createIdentity, getIdentity } = require('../controllers/identityController');

const router = express.Router();
const upload = multer({ dest: './uploads/profiles/' });

router.post('/create', upload.single('profileImage'), createIdentity);
router.get('/:address', getIdentity);

module.exports = router;

// backend/src/routes/data.js
const express = require('express');
const multer = require('multer');
const { uploadData, getUserData } = require('../controllers/dataController');

const router = express.Router();
const upload = multer({ dest: './uploads/data/' });

router.post('/upload', upload.single('file'), uploadData);
router.get('/:address', getUserData);

module.exports = router;
