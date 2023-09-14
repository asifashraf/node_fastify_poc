const express = require('express');
const { uploadImageToS3 } = require('../controllers/upload-image');
const router = express.Router();
const firebase = require('../lib/firebase');

router.post('/upload', firebase.middlewareForPortal, uploadImageToS3);

module.exports = router;
