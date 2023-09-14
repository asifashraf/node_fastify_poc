const knexCleaner = require('knex-cleaner');
const casual = require('casual');
const knex = require('../../index');
const { resetTable } = require('../utils');

// Re-seeding casual in between each object generation should help minimize the impact
// seeds have on each other when they are updated
let casualSeed = 1;
const neighborhoods = require('../objects/neighborhoods')();
casual.seed(casualSeed++);
const configuration = require('../objects/configuration')();
casual.seed(casualSeed++);
const cofeDistrictWeeklySchedule = require('../objects/cofe-district-weekly-schedule')();
casual.seed(casualSeed++);
const allergens = require('../objects/allergens')();
casual.seed(casualSeed++);
const towers = require('../objects/towers')();

exports.seed = () =>
  knexCleaner
    .clean(knex, {
      ignoreTables: ['migrations', 'migrations_lock', 'spatial_ref_sys'],
    })
    .then(() => resetTable('neighborhoods', neighborhoods))
    .then(() => resetTable('allergens', allergens))
    .then(() => resetTable('towers', towers))
    .then(() =>
      resetTable('cofe_district_weekly_schedule', cofeDistrictWeeklySchedule)
    )
    .then(() => resetTable('configuration', configuration));
