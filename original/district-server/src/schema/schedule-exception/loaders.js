const DataLoader = require('dataloader');
const { DateTime } = require('luxon');
const { map } = require('lodash');
const { dateTimeConfig } = require('../../lib/util');

function createLoaders(model) {
  return {
    byLocation: new DataLoader(async brandLocationIds => {
      // Get the start of the day, in the configured timezone
      const begin = DateTime.fromObject({}, dateTimeConfig.obj).startOf('day');
      const beginIso = begin.toISO();
      const endIso = begin.plus({ months: 1 }).toISO();
      const exceptions = await model
        .db(model.tableName)
        .whereIn('brand_location_id', brandLocationIds)
        .andWhere(function () {
          this.where(function () {
            this.where('start_time', '>=', beginIso).andWhere(
              'start_time',
              '<=',
              endIso
            );
          })
            .orWhere(function () {
              this.where('end_time', '>=', beginIso).andWhere(
                'end_time',
                '<=',
                endIso
              );
            })
            .orWhere(function () {
              this.where('start_time', '<=', beginIso).andWhere(
                'end_time',
                '>=',
                endIso
              );
            });
        });

      return map(brandLocationIds, brandLocationId =>
        exceptions.filter(
          schedule => schedule.brandLocationId === brandLocationId
        )
      );
    }),
  };
}

module.exports = { createLoaders };
