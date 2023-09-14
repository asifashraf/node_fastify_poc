const config = require('../../../config');
const { crons } = config;
const cronJobs = require('./jobs');
const CronJob = require('cron').CronJob;

const processName = process.env.name || 'primary';

module.exports = function CofeAppCrons(queryContext) {

    if (processName !== 'primary') return false;

    console.info(`Starting up CofeAppCrons >`, crons.enableCronJobs);

    const {
        brandLocationStatusCacher,
        autoStockRefresher,
        branchAvailabilityCacher,
        branchOpenedNotification,
        customerAccountDeleter,
        checkReminderStatuses,
        checkSubscriptionsAutoRenewalReminderStatus,
        checkSubscriptionsExpired15DaysLaterReminderStatus,
        checkSubscriptionsExpired3DaysLaterReminderStatus,
        checkSubscriptionsExpired30DaysLaterReminderStatus,
        checkSubscriptionsExpired7DaysLaterReminderStatus,
        checkSubscriptionsExpiredTodayReminderStatus,
        checkSubscriptionsExpiryDateNearReminderStatus,
    } = crons;

    let jobs = [];

    if (crons.enableCronJobs) {
        if (customerAccountDeleter.enable) {
            console.info(`Starting up > ${customerAccountDeleter.job}`, customerAccountDeleter);
            jobs.push(
                new CronJob(
                    customerAccountDeleter.interval,
                    cronJobs[customerAccountDeleter.job](customerAccountDeleter, queryContext, config),
                    null,
                    false
                )
            )
        }

        if (branchOpenedNotification.enable) {
            console.info(`Starting up > ${branchOpenedNotification.job}`, branchOpenedNotification);
            jobs.push(
                new CronJob(
                    branchOpenedNotification.interval,
                    cronJobs[branchOpenedNotification.job](branchOpenedNotification, queryContext),
                    null,
                    false
                )
            )
        }

        if (branchAvailabilityCacher.enable) {
            console.info(`Starting up > ${branchAvailabilityCacher.job}`, branchAvailabilityCacher);
            jobs.push(
                new CronJob(
                    branchAvailabilityCacher.interval,
                    cronJobs[branchAvailabilityCacher.job](branchAvailabilityCacher, queryContext),
                    null,
                    false
                )
            )
        }

        if (brandLocationStatusCacher.enable) {
            console.info(`Starting up > ${brandLocationStatusCacher.job}`, brandLocationStatusCacher);
            jobs.push(
                new CronJob(
                    brandLocationStatusCacher.interval,
                    cronJobs[brandLocationStatusCacher.job](brandLocationStatusCacher, queryContext),
                    null,
                    false
                )
            )
        }

        if (autoStockRefresher.enable) {
            console.info(`Starting up > ${autoStockRefresher.job}`, autoStockRefresher);
            jobs.push(
                new CronJob(
                    autoStockRefresher.interval,
                    cronJobs[autoStockRefresher.job](queryContext),
                    null,
                    false
                )
            )
        }
       
        if (checkReminderStatuses.enable) {
            console.info(`Starting up > ${checkReminderStatuses.job}`, checkReminderStatuses);
            jobs.push(
                new CronJob(
                    checkReminderStatuses.interval,
                    cronJobs[checkReminderStatuses.job](checkReminderStatuses, queryContext),
                    null,
                    false
                )
            )
        }
       
        if (checkSubscriptionsAutoRenewalReminderStatus.enable) {
            console.info(`Starting up > ${checkSubscriptionsAutoRenewalReminderStatus.job}`, checkSubscriptionsAutoRenewalReminderStatus);
            jobs.push(
                new CronJob(
                    checkSubscriptionsAutoRenewalReminderStatus.interval,
                    cronJobs[checkSubscriptionsAutoRenewalReminderStatus.job](checkSubscriptionsAutoRenewalReminderStatus, queryContext),
                    null,
                    false
                )
            )
        }
        
        if (checkSubscriptionsExpired15DaysLaterReminderStatus.enable) {
            console.info(`Starting up > ${checkSubscriptionsExpired15DaysLaterReminderStatus.job}`, checkSubscriptionsExpired15DaysLaterReminderStatus);
            jobs.push(
                new CronJob(
                    checkSubscriptionsExpired15DaysLaterReminderStatus.interval,
                    cronJobs[checkSubscriptionsExpired15DaysLaterReminderStatus.job](queryContext),
                    null,
                    false
                )
            )
        }
        
        if (checkSubscriptionsExpired3DaysLaterReminderStatus.enable) {
            console.info(`Starting up > ${checkSubscriptionsExpired3DaysLaterReminderStatus.job}`, checkSubscriptionsExpired3DaysLaterReminderStatus);
            jobs.push(
                new CronJob(
                    checkSubscriptionsExpired3DaysLaterReminderStatus.interval,
                    cronJobs[checkSubscriptionsExpired3DaysLaterReminderStatus.job](queryContext),
                    null,
                    false
                )
            )
        }
        
        if (checkSubscriptionsExpired7DaysLaterReminderStatus.enable) {
            console.info(`Starting up > ${checkSubscriptionsExpired7DaysLaterReminderStatus.job}`, checkSubscriptionsExpired7DaysLaterReminderStatus);
            jobs.push(
                new CronJob(
                    checkSubscriptionsExpired7DaysLaterReminderStatus.interval,
                    cronJobs[checkSubscriptionsExpired7DaysLaterReminderStatus.job](queryContext),
                    null,
                    false
                )
            )
        }
        
        if (checkSubscriptionsExpired30DaysLaterReminderStatus.enable) {
            console.info(`Starting up > ${checkSubscriptionsExpired30DaysLaterReminderStatus.job}`, checkSubscriptionsExpired30DaysLaterReminderStatus);
            jobs.push(
                new CronJob(
                    checkSubscriptionsExpired30DaysLaterReminderStatus.interval,
                    cronJobs[checkSubscriptionsExpired30DaysLaterReminderStatus.job](queryContext),
                    null,
                    false
                )
            )
        }
        
        if (checkSubscriptionsExpiredTodayReminderStatus.enable) {
            console.info(`Starting up > ${checkSubscriptionsExpiredTodayReminderStatus.job}`, checkSubscriptionsExpiredTodayReminderStatus);
            jobs.push(
                new CronJob(
                    checkSubscriptionsExpiredTodayReminderStatus.interval,
                    cronJobs[checkSubscriptionsExpiredTodayReminderStatus.job](queryContext),
                    null,
                    false
                )
            )
        }
        
        if (checkSubscriptionsExpiryDateNearReminderStatus.enable) {
            console.info(`Starting up > ${checkSubscriptionsExpiryDateNearReminderStatus.job}`, checkSubscriptionsExpiryDateNearReminderStatus);
            jobs.push(
                new CronJob(
                    checkSubscriptionsExpiryDateNearReminderStatus.interval,
                    cronJobs[checkSubscriptionsExpiryDateNearReminderStatus.job](checkSubscriptionsExpiryDateNearReminderStatus, queryContext),
                    null,
                    false
                )
            )
        }
    }

    if (jobs.length > 0) {
        jobs.forEach(job => job.start());
    }

    console.info(`CofeAppCrons Startup Finished >`);

    return true;
}