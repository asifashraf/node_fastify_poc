const path = require('path');
const moment = require('moment');
const csv = require('fast-csv');
const fs = require('fs');

const { setupAuthContext } = require('../helpers/context-helpers');
const { findIndex } = require('lodash');

const csvCommonProcess = async (req, res, filename) => {
  const csvFilename = path.resolve(
    __dirname,
    `${filename}_${Date.now()}.csv`
  );
  const context = await setupAuthContext(req);
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
  res.statusCode = 200;
  res.attachment(csvFilename);
  csvStream.pipe(res);
  return { context, csvFilename, csvStream };
};

exports.exportQueryTimeLog = async (req, res) => {
  const csvFilename = path.resolve(
    path.join(__dirname, '../../logs'),
    req.query.date
      ? req.query.date
      : `query-time-seconds-${moment().format('YYYY-MM-DD')}.csv`
  );
  console.log('csvFilename', csvFilename);
  return res.download(csvFilename, err => {
    if (err) {
      res.type('text/html').send('Error: File not found');
    }
  });
};

exports.exportVouchersReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'vouchers_report_csv');
  const { countryId, searchTerm, filterType } = req.query;
  context.coupon.getAllToCSV(csvStream, countryId, searchTerm, filterType);
};

exports.exportRewardsReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'rewards_report_csv');
  const { countryId, searchTerm, filterType } = req.query;
  context.reward.getAllToCSV(csvStream, countryId, searchTerm, filterType);
};

exports.exportCreditOrdersReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'credit_orders_report');
  const { sku, startDate, endDate, countryId } = req.query;
  context.loyaltyOrder.getAllToCSV(
    csvStream,
    sku,
    startDate,
    endDate,
    countryId
  );
};

exports.exportBrandsReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'brands_report_csv');
  const { countryId, searchTerm, filterType } = req.query;
  context.brand.getAllToCSV(csvStream, countryId, searchTerm, filterType);
};

exports.exportReferralsReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'referrals_report_csv');
  const { searchText, status } = req.query;
  context.referral.getReferralsCsv(csvStream, { searchText, status });
};

exports.exportBrandLocationsReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'brand_locations_report_csv');
  const { countryId, searchTerm, filterType } = req.query;
  context.brandLocation.getAllToCSV(
    csvStream,
    countryId,
    searchTerm,
    filterType
  );
};

exports.exportOrdersReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'orders_report_csv');
  const {
    searchTerm,
    filterType,
    brandLocationId,
    brandId,
    countryId,
    startDate,
    endDate,
  } = req.query;
  const auth = context.auth;
  const admin = await context.admin.getByAuthoId(auth.id);
  let hasPermission = false;
  if (admin && (auth.permissions.includes('all') || auth.permissions.includes('order:export'))) {
    const isVendorAdmin = auth.roles.includes('CSE');
    const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
    if (isVendorAdmin && brandAdminList.length > 0) {
      if (brandId && brandLocationId) {
        hasPermission = findIndex(brandAdminList, brandAdmin => {
          return brandAdmin.brandId === brandId
            && (brandAdmin.brandLocationId === brandLocationId || brandAdmin.brandLocationId === null);
        }) > -1;
      } else if (brandId) {
        hasPermission = findIndex(brandAdminList, brandAdmin => { return brandAdmin.brandId === brandId && brandAdmin.brandLocationId === null; }) > -1;
      }
    } else if (isVendorAdmin && brandAdminList.length == 0) {
      hasPermission = false;
    } else {
      hasPermission = true;
    }
  }
  if (hasPermission) {
    return context.orderSet.getOrderReport(
      csvStream,
      searchTerm,
      filterType,
      brandLocationId,
      brandId,
      countryId,
      startDate,
      endDate
    );
  } else return res.status(401).send('Insufficient authority');
};

exports.exportGiftCardOrdersReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'gift_card_orders_report_csv');
  const {
    searchTerm,
    collectionId,
    countryId,
    brandId,
    currencyId,
  } = req.query;
  context.giftCardOrder.getAllExportToCSV(csvStream, {
    searchTerm,
    collectionId,
    countryId,
    brandId,
    currencyId,
  });
};

exports.exportCustomersReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'customers_report_csv');
  const { searchTerm, loyaltyTierName, rewardId, rewardTierId } = req.query;
  context.customer.getAllExportToCSV(
    csvStream,
    searchTerm,
    loyaltyTierName,
    rewardId,
    rewardTierId
  );
};

exports.exportFinancialReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'financial_report_csv');
  const {
    searchTerm,
    filterType,
    brandLocationId,
    brandId,
    startDate,
    endDate,
    countryId,
  } = req.query;
  context.orderSet.financialReportExportToCSV(
    csvStream,
    searchTerm,
    filterType,
    brandLocationId,
    brandId,
    startDate,
    endDate,
    countryId
  );
};

exports.exportFinancialReports = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'financial_report_csv');
  const { startDate, endDate } = req.query;
  context.orderSet.defaultReport(csvStream, startDate, endDate);
  res.statusCode = 200;
  csvStream.on('end', res.end).pipe(res);
};

exports.exportStoreOrdersFinancialReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'store_order_financial_report_csv');
  const {
    searchTerm,
    filterType,
    countryId,
    brandId,
    startDate,
    endDate,
  } = req.query;
  context.storeOrder.getAllPaidFinancialReport(csvStream, {
    searchTerm,
    filterType,
    countryId,
    brandId,
    startDate,
    endDate,
  });
};

exports.exportFixPlatformModelReport = async (req, res) => {
  const { context, csvStream } = await csvCommonProcess(req, res, 'fix_platform_order_report_csv');
  const {
    activeOnly,
    countryId,
    searchTerm,
    revenueModel,
    month,
    year,
  } = req.query;
  let ao = false;
  if (activeOnly && activeOnly === 'true') {
    ao = true;
  }
  context.brandSubscriptionModel.getReport(csvStream, {
    activeOnly: ao,
    countryId,
    searchTerm,
    revenueModel,
    month,
    year,
  });
};
