const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { setupAuthContext } = require('../helpers/context-helpers');
const { uploadFile } = require('../../config');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');

const pathKey = (filePath) => {
  const newFilePath = filePath.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const combine = `${Date.now()}_${(Math.random() + 1).toString(36).substring(5).toUpperCase()}_${newFilePath}`;
  return `${uploadFile.s3.folderPath}/${combine}`;
};

exports.uploadFileToS3 = async (req, res) => {
  const context = await setupAuthContext(req);

  const s3Object = new AWS.S3({
    accessKeyId: uploadFile.s3.accessKeyId,
    secretAccessKey: uploadFile.s3.secretAccessKey,
  });

  const objectMulter = multer({
    storage: multerS3({
      s3: s3Object,
      bucket: uploadFile.s3.bucket,
      acl: 'public-read',
      metadata(req, file, cb) {
        return cb(null, { fieldName: file.fieldname });
      },
      key(req, file, cb) {
        return cb(null, pathKey(file.originalname));
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedFileTypes = uploadFile.allowedExtensions;
      if (allowedFileTypes.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Invalid file type'));
    },
    limits: { fileSize: uploadFile.sizeInBytes },
  });

  try {
    const upload = objectMulter.single('file');
    upload(req, res, async (error, data) => {
      if (error) {
        context.kinesisLogger.sendLogEvent(
          {
            error: error.message,
            stack: JSON.stringify(error.stack || {}),
          },
          'uploadFileToS3-error',
        );
        return res.status(400).json({
          message: error.message || 'Error uploading file',
        });
      }
      const { location } = req?.file;
      if (location) {
        await SlackWebHookManager.sendTextAndObjectAndImage({
          text: `[S3-UPLOADER_SUCCESS]\nEmail: ${req?.user?.email}\nId: ${req?.user?.user_id}\nFileUrl: ${location}`
        });
      }
      return res.json({
        message: 'File uploaded successfully',
        file: req.file,
      });
    });
  } catch (error) {
    await SlackWebHookManager.sendTextAndObjectAndImage({
      text: `[S3-UPLOADER_FAIL]\nEmail: ${req?.user?.email}\nId: ${req?.user?.user_id}\nError: ${error?.message}]`,
    });
    await context.kinesisLogger.sendLogEvent(
      {
        error: error.message,
        stack: JSON.stringify(error.stack || {}),
      },
      'uploadFileToS3-error',
    );
    return res.status(400).send({
      message: error.message || 'Something looks wrong',
    });
  }
};
