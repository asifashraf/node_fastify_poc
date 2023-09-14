const BaseModel = require('../../base-model');
const moment = require('moment');
const {
  brandLocationActivityEventType,
  branchActivityEventSaveError,
  brandLocationActivityQueryError,
} = require('../root/enums');
const { addPaging } = require('../../lib/util');

class BrandLocationActivityLogs extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_activity_logs', context);
  }

  async validate(event) {
    const errors = [];
    if (event.eventType) {
      if (
        !Object.prototype.hasOwnProperty.call(
          brandLocationActivityEventType,
          event.eventType
        )
      ) {
        errors.push(branchActivityEventSaveError.INVALID_EVENT_TYPE);
      }
    }
    return errors;
  }

  async findEventLogsInRange(rangeInput, pagingInput) {
    const { rangeBegin, rangeEnd } = rangeInput;
    const paging = pagingInput || {};
    const query = this.roDb(this.tableName)
      .where('branch_id', rangeInput.brandLocationId)
      .andWhereBetween('created', [rangeBegin, rangeEnd]);
    if (rangeInput.eventTypes && rangeInput.eventTypes.length !== 0) {
      query.andWhere(query => {
        rangeInput.eventTypes.forEach(eventType => {
          query.orWhere('event_type', eventType);
        });
      });
    }
    query.orderBy('created', 'asc');
    return addPaging(query, paging);
  }

  async validateRangeInput(rangeInput) {
    const errors = [];
    if (!rangeInput.brandLocationId) {
      errors.push(brandLocationActivityQueryError.MISSING_BRAND_LOCATION_ID);
    }
    if (moment(rangeInput.beginDate) > moment(rangeInput.endDate)) {
      errors.push(
        brandLocationActivityQueryError.END_DATE_IS_PRIOR_TO_BEGIN_DATE
      );
    }
    return errors;
  }

  async save(brandLocationLog) {
    const validationErrors = await this.validate(brandLocationLog);
    if (validationErrors.length > 0) {
      return { error: validationErrors[0], errors: validationErrors };
    }
    await super.save(brandLocationLog);
    return { isSaved: true };
  }
}

module.exports = BrandLocationActivityLogs;
