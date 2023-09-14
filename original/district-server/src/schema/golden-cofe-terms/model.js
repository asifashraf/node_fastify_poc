const BaseModel = require('../../base-model');
const { addLocalizationField } = require('../../lib/util');
const moment = require('moment');

class GoldenCofe extends BaseModel {
  constructor(db, context) {
    super(db, 'golden_cofe_brands', context);
  }

  async getByCountryCode(countryCode) {
    const brands = addLocalizationField(
      await this.db(this.context.brand.tableName)
        .select(`${this.context.brand.tableName}.*`)
        .join(
          this.tableName,
          `${this.tableName}.brand_id`,
          `${this.context.brand.tableName}.id`
        )
        .join(
          this.context.country.tableName,
          `${this.tableName}.country_id`,
          `${this.context.country.tableName}.id`
        )
        .where(`${this.context.country.tableName}.iso_code`, countryCode),
      'name'
    );

    const goldenTerms = await this.db('golden_cofe_terms')
      .select('golden_cofe_terms.*')
      .join(
        this.context.country.tableName,
        'golden_cofe_terms.country_id',
        `${this.context.country.tableName}.id`
      )
      .where(`${this.context.country.tableName}.iso_code`, countryCode);

    const terms = addLocalizationField(goldenTerms, 'term').map(
      term => term.term
    );
    const imageUrl = addLocalizationField(goldenTerms, 'imageUrl').map(
      term => term.imageUrl
    );
    if (imageUrl.length === 0) {
      imageUrl.push({
        en: '',
        ar: '',
      });
    }
    if (imageUrl[0].en === null) {
      imageUrl[0].en = '';
    }
    if (imageUrl[0].ar === null) {
      imageUrl[0].ar = '';
    }
    if (imageUrl[0].tr === null) {
      imageUrl[0].tr = '';
    }

    const dateRange = goldenTerms.map(term => {
      return { startDate: term.startDate, endDate: term.endDate };
    });
    if (dateRange.length === 0) {
      dateRange.push({
        startDate: moment().format('YYYY-MM-DD'),
        endDate: moment()
          .add(1, 'years')
          .format('YYYY-MM-DD'),
      });
    }
    if (dateRange[0].startDate === null) {
      dateRange[0].startDate = moment().format('YYYY-MM-DD');
    }
    if (dateRange[0].endDate === null) {
      dateRange[0].endDate = moment()
        .add(1, 'years')
        .format('YYYY-MM-DD');
    }
    return {
      imageUrl: imageUrl.length > 0 ? imageUrl[0] : null,
      terms,
      dateRange: dateRange.length > 0 ? dateRange[0] : null,
      brands,
    };
  }

  async save(input) {
    await this.db.raw(
      'DELETE FROM golden_cofe_brands USING countries WHERE golden_cofe_brands.country_id = countries.id and countries.iso_code = :countryCode',
      {
        countryCode: input.countryCode,
      }
    );
    await this.db.raw(
      'DELETE FROM golden_cofe_terms USING countries WHERE golden_cofe_terms.country_id = countries.id and countries.iso_code = :countryCode',
      {
        countryCode: input.countryCode,
      }
    );

    await this.db.raw(
      `INSERT INTO golden_cofe_brands(country_id, brand_id)
          SELECT id as country_id, unnest(string_to_array(:brandIds, ',')::uuid[]) as brand_id from countries where iso_code = :countryCode;
         `,
      {
        countryCode: input.countryCode,
        brandIds: input.brandIds.join(','),
      }
    );

    const separator = '{|{||}|}';
    input.terms = input.terms ? input.terms : [];
    input.dateRange = input.dateRange ? [input.dateRange] : [];
    input.imageUrl = input.imageUrl ? [input.imageUrl] : [];

    const queryObject = { countryCode: input.countryCode, separator };

    let termsInStr = '';
    let termsSelectStr = '';
    if (input.terms.length > 0) {
      termsInStr = ', term, term_ar, term_tr';
      termsSelectStr = `, unnest(string_to_array(:terms, :separator)::varchar(1000)[]) as term,
                        unnest(string_to_array(:arTerms, :separator)::varchar(1000)[]) as term_ar,
                        unnest(string_to_array(:arTerms, :separator)::varchar(1000)[]) as term_tr`;
      queryObject.terms = input.terms.map(term => term.en).join(separator);
      queryObject.arTerms = input.terms.map(term => term.ar).join(separator);
    }

    let drInStr = '';
    let drSelectStr = '';
    if (input.dateRange.length > 0) {
      drInStr = ', start_date, end_date';
      drSelectStr = `, to_date(unnest(string_to_array(:startDates, :separator)), 'YYYY-MM-DD') as start_date,
                    to_date(unnest(string_to_array(:endDates, :separator)), 'YYYY-MM-DD') as end_date`;
      queryObject.startDates = input.dateRange
        .map(term => term.startDate)
        .join(separator);
      queryObject.endDates = input.dateRange
        .map(term => term.endDate)
        .join(separator);
    }

    let imageInStr = '';
    let imageSelectStr = '';
    if (input.imageUrl.length > 0) {
      imageInStr = ', image_url, image_url_ar, image_url_tr';
      imageSelectStr = `, unnest(string_to_array(:imageUrl, :separator)::varchar(1000)[]) as image_url,
                        unnest(string_to_array(:arImageUrl, :separator)::varchar(1000)[]) as image_url_ar,
                        unnest(string_to_array(:trImageUrl, :separator)::varchar(1000)[]) as image_url_tr`;
      queryObject.imageUrl = input.imageUrl
        .map(term => term.en)
        .join(separator);
      queryObject.arImageUrl = input.imageUrl
        .map(term => term.ar)
        .join(separator);
      queryObject.trImageUrl = input.imageUrl
        .map(term => term.tr)
        .join(separator);
    }

    await this.db.raw(
      `INSERT INTO golden_cofe_terms(country_id ${termsInStr} ${drInStr} ${imageInStr})
          SELECT id as country_id
          ${termsSelectStr}
          ${drSelectStr}
          ${imageSelectStr}
          from countries where iso_code = :countryCode;
         `,
      queryObject
    );
  }
}

module.exports = GoldenCofe;
