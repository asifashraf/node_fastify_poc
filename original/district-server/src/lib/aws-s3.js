const AWS = require('aws-sdk');
const csvToJson = require('csvtojson');
const amazonS3URI = require('amazon-s3-uri');
const multer = require('multer');
const multerS3 = require('multer-s3');

const {
  customerProfilePicture,
  s3: {
    s3AccessKeyId: accessKeyId,
    s3SecretAccessKey: secretAccessKey,
  },
} = require('../../config');

const DEFAULT_PAGINATION_LIMIT = 1000;

const S3 = new AWS.S3({
  accessKeyId,
  secretAccessKey,
});

/**
 *
 * @param bucketName
 * @param fullKey
 */
function getFullS3Link(bucketName, fullKey) {
  return `https://${bucketName}.s3.amazonaws.com/${fullKey}`;
}

function expandObjectKey(bucketName, fullFileKey) {
  const splittedPath = fullFileKey.split('/');
  const fileKey = splittedPath[splittedPath.length - 1];
  return {
    fileKey,
    originalKey: fullFileKey,
    s3Url: getFullS3Link(bucketName, fullFileKey),
  };
}

/**
 *
 * @param bucketName
 * @param filePath leave it undefined for root, folder1/subfolder1... for other type of access
 * @returns {Promise<*>}
 */
async function getFolderFileList(bucketName, filePath) {
  const params = {
    Bucket: bucketName,
    Prefix: filePath,
    MaxKeys: DEFAULT_PAGINATION_LIMIT,
  };
  const rawResponse = await S3.listObjectsV2(params).promise();
  // If ends with / it is the folder
  return rawResponse.Contents.filter(content => !content.Key.endsWith('/')).map(
    content => {
      return expandObjectKey(bucketName, content.Key);
    }
  );
}

async function getBucketFileList(bucketName) {
  const params = {
    Bucket: bucketName,
    MaxKeys: DEFAULT_PAGINATION_LIMIT,
  };
  const rawResponse = await S3.listObjectsV2(params).promise();
  return rawResponse.Contents.filter(content => !content.Key.endsWith('/')).map(
    content => expandObjectKey(bucketName, content.Key)
  );
}

async function uploadCSVFileOnS3Bucket(bucketName, key, body, isPublic = false) {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: body
    };
    if (isPublic) params.ACL = 'public-read';
    await S3.upload(params).promise();
    return true;
  } catch (error) {
    console.log('Error at uploadCSVFileOnS3Bucket function', error);
    return false;
  }
}

async function uploadXmlFileOnS3Bucket(bucketName, key, body) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: body
  };
  await S3.upload(params).promise();
  return true;
}

async function csvToJSON({ uri }) {
  try {
    const { bucket, key } = amazonS3URI(uri);

    const params = {
      Bucket: bucket,
      Key: key,
    };

    // get csv file and create stream
    const stream = S3.getObject(params).createReadStream();
    // convert csv file (stream) to JSON format data
    const json = await csvToJson({ noheader: true, output: 'csv' }).fromStream(
      stream
    );
    return json;
  } catch (err) {
    console.log('Invalid S3 URI');
    return {};
  }
}

const getCustomerProfilePictureKey = (userId) => {
  return `${customerProfilePicture.amazonProperties.folderPath}/${userId}.jpg`;
};

const uploadCustomerPhotoByUserId = multer({
  storage: multerS3({
    s3: S3,
    bucket: customerProfilePicture.amazonProperties.bucketName,
    metadata(req, file, cb) {
      return cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      if (req.user?.id) {
        return cb(null, getCustomerProfilePictureKey(req.user.id));
      }
      return false;
    },
  }),
});

const downloadCustomerPhotoByUserId = async (userId, res, next) => {
  console.time('getCustomerPhotoByUserId');
  const params = {
    Bucket: customerProfilePicture.amazonProperties.bucketName,
    Key: getCustomerProfilePictureKey(userId),
  };
  S3.headObject(params, function (err, data) {
    if (err) {
      // an error occurred
      console.error(err);
      return next();
    }
    const stream = S3.getObject(params).createReadStream();

    stream.on('error', function error(err) {
      return next();
    });

    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Length', data.ContentLength);
    res.set('Last-Modified', data.LastModified);
    res.set('ETag', data.ETag);

    stream.on('end', () => {
      console.timeEnd('getCustomerPhotoByUserId');
    });
    //Pipe the s3 object to the response
    stream.pipe(res);
  });
};

const getObjectPresignedURL = async (bucket, key, signedUrlExpireSeconds) => {
  try {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    await S3.headObject(params).promise();
    params.Expires = signedUrlExpireSeconds;
    const url = S3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    return null;
  }
};

module.exports = {
  csvToJSON,
  uploadCSVFileOnS3Bucket,
  getFullS3Link,
  getFolderFileList,
  getBucketFileList,
  uploadXmlFileOnS3Bucket,
  uploadCustomerPhotoByUserId,
  downloadCustomerPhotoByUserId,
  getObjectPresignedURL
};
