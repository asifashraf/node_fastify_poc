const DataLoader = require('dataloader');
const { map, find } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    assessment: new DataLoader(async assessmentIds => {
      const select = `ma.*, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.id as brand_id,
        bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr, bl.id as brand_location_id`;
      const assessments = addLocalizationField((addLocalizationField(await model
        .db('maintenance_assessments as ma')
        .select(model.db.raw(select))
        .leftJoin('brand_location_maintenances as blm', 'blm.id', 'ma.maintenance_id')
        .leftJoin('brand_locations as bl', 'bl.id', 'blm.brand_location_id')
        .leftJoin('brands as b', 'b.id', 'bl.brand_id')
        .whereIn('ma.id', assessmentIds), 'brandName')), 'brandLocationName');
      return map(assessmentIds, assessmentId =>
        find(assessments, assessment => assessment.id === assessmentId)
      );
    }),
  };
}

module.exports = { createLoaders };
