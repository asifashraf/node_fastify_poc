const path = require('path');
const CustomersFormatter = require('./customers-formatter');
const BranchesFormatter = require('./branches-formatter');
const { uploadCSVFileOnS3Bucket, getFullS3Link } = require('../../lib/aws-s3');
const {env} = require('../../../config');
const csv = require('fast-csv');
const fs = require('fs');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

async function generateCustomersCSVFile(offerId, customerList) {
  const bucketName = 'content.cofeadmin.com';
  const key = `cofelytics/${env}/${offerId}-customers.csv`;
  try {
    const csvFilename = path.resolve(
      __dirname,
      `${offerId}-customers.csv`
    );
    const csvStream = csv.format({ headers: true });
    csvStream.on('end', () => {
      fs.unlink(csvFilename, function (err) {
        if (err) {
          console.error(err.toString());
        } else {
          console.warn(csvFilename + ' deleted');
        }
      });
    });
    csvStream.pipe(fs.createWriteStream(csvFilename, { flags: 'a' }));
    const select = 'c.id, c.first_name, c.last_name, c.phone_number, c.email, c.allow_sms, c.allow_email';
    const query = this.db('customers as c')
      .select(this.db.raw(select))
      .whereIn('c.id', customerList);
    query
      .stream(s => s.pipe(new CustomersFormatter())
        .pipe(csvStream))
      .catch(console.error);
    uploadCSVFileOnS3Bucket(bucketName, key, csvStream, true);
    const url = getFullS3Link(bucketName, key);
    return url;
  } catch (error) {
    await SlackWebHookManager.sendTextAndObjectToSlack('Can not generating cofelytics customers CSV File!', {offerId, bucketName, key});
    return null;
  }
}

async function generateBranchesCSVFile(offerId, branchList) {
  const bucketName = 'content.cofeadmin.com';
  const key = `cofelytics/${env}/${offerId}-branches.csv`;
  try {
    const csvFilename = path.resolve(
      __dirname,
      `${offerId}-branches.csv`
    );
    const csvStream = csv.format({ headers: true });
    csvStream.on('end', () => {
      fs.unlink(csvFilename, function (err) {
        if (err) {
          console.error(err.toString());
        } else {
          console.warn(csvFilename + ' deleted');
        }
      });
    });
    csvStream.pipe(fs.createWriteStream(csvFilename, { flags: 'a' }));
    const select = 'bl.id, bl.name, bl.name_ar, bl.status';
    const query = this.db('brand_locations as bl')
      .select(this.db.raw(select))
      .whereIn('bl.id', branchList);
    query
      .stream(s => s.pipe(new BranchesFormatter())
        .pipe(csvStream))
      .catch(console.error);
    uploadCSVFileOnS3Bucket(bucketName, key, csvStream, true);
    const url = getFullS3Link(bucketName, key);
    return url;
  } catch (error) {
    await SlackWebHookManager.sendTextAndObjectToSlack('Can not generating cofelytics branches CSV File!', {offerId, bucketName, key});
    return null;
  }
}

async function generateBranchesCSVFileByBrandId(offerId, brandId) {
  const bucketName = 'content.cofeadmin.com';
  const key = `cofelytics/${env}/${offerId}-branches.csv`;
  try {
    const csvFilename = path.resolve(
      __dirname,
      `${offerId}-branches.csv`
    );
    const csvStream = csv.format({ headers: true });
    csvStream.on('end', () => {
      fs.unlink(csvFilename, function (err) {
        if (err) {
          console.error(err.toString());
        } else {
          console.warn(csvFilename + ' deleted');
        }
      });
    });
    csvStream.pipe(fs.createWriteStream(csvFilename, { flags: 'a' }));
    const select = 'bl.id, bl.name, bl.name_ar, bl.status';
    const query = this.db('brand_locations as bl')
      .select(this.db.raw(select))
      .where('bl.brand_id', brandId);
    query
      .stream(s => s.pipe(new BranchesFormatter())
        .pipe(csvStream))
      .catch(console.error);
    uploadCSVFileOnS3Bucket(bucketName, key, csvStream, true);
    const url = getFullS3Link(bucketName, key);
    return url;
  } catch (error) {
    await SlackWebHookManager.sendTextAndObjectToSlack('Can not generating cofelytics branches CSV File!', {offerId, bucketName, key});
    return null;
  }
}

module.exports = {
  generateCustomersCSVFile,
  generateBranchesCSVFile,
  generateBranchesCSVFileByBrandId
};
