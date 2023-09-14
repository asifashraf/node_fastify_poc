const BaseModel = require('../../base-model');
const { pick } = require('lodash');

class NutritionalInfo extends BaseModel {
  constructor(db) {
    super(db, 'nutritional_info');
  }

  async getAllergensByNutritionalInfo(nutritionalInfoId) {
    return this.db('allergens')
      .select('allergens.*')
      .join(
        'nutritional_info_allergens',
        'nutritional_info_allergens.allergen_id',
        'allergens.id'
      )
      .join(
        'nutritional_info',
        'nutritional_info_allergens.nutritional_info_id',
        'nutritional_info.id'
      )
      .where('nutritional_info.id', nutritionalInfoId)
      .orderBy('allergens.name', 'ASC');
  }

  removeAllergensByNutritionalIds(ids) {
    return this.db('nutritional_info_allergens')
      .whereIn('nutritional_info_id', ids)
      .del();
  }

  createAllergens(data) {
    // NOTE: data here is an array of objects so we can do a single insert
    // [{ nutritional_info_id: <string>, allergen_id: <string>}]
    return this.db('nutritional_info_allergens').insert(data);
  }

  save(nutritionalInfo) {
    const pluckedData = pick(nutritionalInfo, [
      'id',
      'calories',
      'fat',
      'carbohydrates',
      'sugar',
      'protein',
      'deleted',
    ]);

    return super.save(pluckedData);
  }
}

module.exports = NutritionalInfo;
