const BaseModel = require('../../base-model');
const { tagSaveError, tagScheduleStatus } = require('./enums');
const { formatError } = require('../../lib/util');
const { sortBy } = require('lodash');
const moment = require('moment');
const { transformToCamelCase } = require('../../lib/util');
class TagSchedules extends BaseModel {
  constructor(db, context) {
    super(db, 'tag_schedules', context);
  }

  async getSchedulesByTagId(id) {
    return this.db(this.tableName)
      .select('*')
      .where('status', tagScheduleStatus.ACTIVE)
      .where('tag_id', id);
  }

  async validateTagSchedules(isScheduled, schedulesToAdd = [], isMandotory, tagId) {
    const errors = [];
    if (isScheduled) {
      if (schedulesToAdd.length == 0) {
        errors.push(tagSaveError.MISSING_SCHEDULES_IF_IS_SCHEDULED_PASSED);
      } else {
        schedulesToAdd = sortBy(schedulesToAdd, ['startTime']);
        const checkScheduleIds = [];
        let endTime = null;

        for (let index = 0; index < schedulesToAdd.length; index++) {
          const schedule = schedulesToAdd[index];
          if (!schedule.startTime || !schedule.endTime || !schedule.status) {
            errors.push(tagSaveError.MISSING_TAG_SCHEDULE_PARAMETERS);
            break;
          } else if (schedule.status == tagScheduleStatus.DELETED) {
            if (!schedule.tagScheduleId) {
              errors.push(tagSaveError.MISSING_FIELD_SCHEDULE_ID_FOR_DELETING_SCHEDULE);
              break;
            }
          } else {
            if (moment(schedule.startTime).isSameOrAfter(moment(schedule.endTime))) {
              errors.push(tagSaveError.START_TIME_MUST_BE_BEFORE_END_TIME);
              break;
            } else if (index > 0 && !endTime && moment(endTime).isSameOrAfter(moment(schedule.startTime))) {
              errors.push(tagSaveError.START_TIME_MUST_BE_BEFORE_END_TIME);
              break;
            }
            endTime = schedule.endDate;
          }
          if (schedule.tagScheduleId) {
            checkScheduleIds.push(schedule.tagScheduleId);
          }
        }
        if (checkScheduleIds.length > 0) {
          if (!tagId) {
            errors.push(tagSaveError.TAG_AND_TAG_SCHEDULE_NOT_MATCHED);
          } else {
            const {count} = await this.db(this.tableName)
              .count()
              .where('tag_id', tagId)
              .whereIn('id', checkScheduleIds)
              .whereNot('status', tagScheduleStatus.DELETED)
              .first();
            if (count != checkScheduleIds.length) {
              errors.push(tagSaveError.TAG_AND_TAG_SCHEDULE_NOT_MATCHED);
            }
          }
        }
      }
    } else if (isMandotory) {
      errors.push(tagSaveError.SCHEDULE_MUST_BE_ENTERING);
    }
    return errors;
  }

  async processSchedules(schedulesToAdd, tag, timeZoneIdentifier) {
    const updatedActive = schedulesToAdd.filter(schedule => schedule.status == tagScheduleStatus.ACTIVE && schedule.id);
    const insertSchedule = schedulesToAdd.filter(schedule => !schedule.id);
    await this.db(this.tableName)
      .whereNotIn('id', updatedActive.map(schedule => schedule.id))
      .where('tag_id', tag.id)
      .whereNot('status', tagScheduleStatus.DELETED)
      .update({ status: tagScheduleStatus.DELETED });

    const allProcess = [];
    if (updatedActive.length > 0) {
      updatedActive.map(async (schedule) => {
        allProcess.push(
          this.save({
            id: schedule.id,
            startTime: moment(schedule.startTime).tz(timeZoneIdentifier, true),
            endTime: moment(schedule.endTime).tz(timeZoneIdentifier, true),
            status: schedule.status,
            tagId: tag.id
          })
        );
      });
    }

    if (insertSchedule.length > 0) {
      insertSchedule.map(async (schedule) => {
        allProcess.push(
          this.save({
            tagId: tag.id,
            startTime: moment(schedule.startTime).tz(timeZoneIdentifier, true),
            endTime: moment(schedule.endTime).tz(timeZoneIdentifier, true),
            status: schedule.status,
          })
        );
      });
    }
    if (allProcess.length > 0) await Promise.all(allProcess);
  }

  async getSchedulesByDateRange(dateRange, tagId) {
    const { startDate, endDate } = dateRange;
    return this.db.raw(`select * from tag_schedules
      where date(start_time) = ? and date(end_time) <= ?
      and "tag_id" = ? and status = ?`,
    [moment(startDate).format('YYYY-MM-DD'), moment(endDate).format('YYYY-MM-DD'), tagId, tagScheduleStatus.ACTIVE])
      .then(({ rows }) => transformToCamelCase(rows));
  }

  async validate(tagInput) {
    const errors = [];
    if (!tagInput) {
      errors.push(tagSaveError.INVALID_INPUT);
    }

    if (!tagInput.tagId) {
      errors.push(tagSaveError.MISSING_FIELD_ID);
    }

    if (!tagInput.startTime) {
      errors.push(tagSaveError.MISSING_FIELD_START_TIME);
    }
    if (!tagInput.endTime) {
      errors.push(tagSaveError.MISSING_FIELD_END_TIME);
    }

    return errors;
  }

  async save(tagInput) {
    const errors = await this.validate(tagInput);
    if (errors.length > 0) {
      return formatError(errors);
    }
    const id = await super.save(tagInput);
    const tagFromDb = await this.getById(id);
    return {
      tagFromDb
    };
  }
}

module.exports = TagSchedules;
