const express = require('express');
const { uploadFileToS3 } = require('../controllers/upload-file');
const router = express.Router();
const firebase = require('../lib/firebase');

router.post('/upload', firebase.middlewareForPortal, uploadFileToS3);

module.exports = router;
