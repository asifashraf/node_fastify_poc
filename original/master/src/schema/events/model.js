const BaseModel = require('../../base-model');
const {
  transformToCamelCase,
} = require('../../lib/util');
const { eventTypeForReport } = require('../root/enums');
const moment = require('moment');
const {
  omit,
} = require('lodash');
class Events extends BaseModel {
  constructor(db, context) {
    super(db, 'events', context);
  }

  async saveOperatingHours({ brandLocationId }) {
    if (brandLocationId) {
      const {id, email} = this.context.auth;
      if (Array.isArray(brandLocationId)) {
        const branchInfo = await this.roDb('view_branch_brand')
          .select(
            this.roDb.raw(
              'id as branch_id, brand_id, name as branch_name, brand_name, country_id'))
          .whereIn('id', brandLocationId);
        branchInfo.forEach(async elem => {
          const countryId = elem.countryId;
          elem.changerAccount = email;
          elem.changerId = id;
          delete elem.countryId;
          const event = {
            countryId,
            eventType: eventTypeForReport.OPERATING_HOURS_CHANGE,
            eventData: JSON.stringify(elem)
          };
          await this.save(event);
        });
      } else {
        const query = `select id as branch_id, brand_id, name as branch_name, brand_name, country_id
        from view_branch_brand
        where id = ?`;
        const branchInfo = await this.roDb.raw(query, [brandLocationId]).then(result => transformToCamelCase(result.rows));
        branchInfo.forEach(async elem => {
          const countryId = elem.countryId;
          delete elem.countryId;
          elem.changerAccount = email;
          elem.changerId = id;
          const event = {
            countryId,
            eventType: eventTypeForReport.OPERATING_HOURS_CHANGE,
            eventData: JSON.stringify(elem)
          };
          await this.save(event);
        });
      }
    }
  }

  async saveTotalClosingHours(brandLocationId, acceptingOrder) {
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);
    if (brandLocation.acceptingOrders !== acceptingOrder) {
      const {id, email} = this.context.auth;
      const startDate = moment().startOf('day');
      const now = moment();
      const event = await this.db(this.tableName)
        .where('brand_location_id', brandLocationId)
        .andWhere('event_type', eventTypeForReport.TOTAL_ONLINE_TIME)
        .andWhere('created_at', '>=', startDate)
        .first();
      if (event) {
        const eventData = event.eventData;
        if (eventData.currentAcceptingOrder !== acceptingOrder) {
          const openTime = moment(eventData.openTime, 'HH:mm:ss');
          const closingTime = openTime.clone().add(eventData.openDuration, 'm');
          now.add(eventData.timeOffset, 'm');
          if (acceptingOrder) {
            let offlineDuration = eventData.offlineDuration;
            const lastUpdatedTimeOnGMT = moment(eventData.startTime, 'HH:mm:ss');
            if (now.isBefore(openTime)) {
              offlineDuration = 0; // Logical
            } else if (now.isBefore(closingTime)) {
              offlineDuration += parseInt(moment.duration(now.diff(lastUpdatedTimeOnGMT.isBefore(openTime) ? openTime : lastUpdatedTimeOnGMT)).asMinutes(), 10);
            } else {
              if (lastUpdatedTimeOnGMT.isBefore(openTime)) {
                offlineDuration = eventData.openDuration;
              } else if (lastUpdatedTimeOnGMT.isBefore(closingTime)) {
                offlineDuration += parseInt(moment.duration(closingTime.diff(lastUpdatedTimeOnGMT)).asMinutes(), 10);
              }
            }
            eventData.offlineDuration = offlineDuration;
            eventData.expectedOfflineDuration = 0;
          } else {
            let offlineDuration = eventData.offlineDuration;
            let expectedOfflineDuration = 0;
            if (now.isBefore(openTime)) {
              offlineDuration = 0;
              expectedOfflineDuration = eventData.openDuration;
            } else if (now.isBefore(closingTime)) {
              expectedOfflineDuration = parseInt(moment.duration(closingTime.diff(now)).asMinutes(), 10);
            }
            eventData.offlineDuration = offlineDuration;
            eventData.expectedOfflineDuration = expectedOfflineDuration;
          }
          eventData.startTime = now.format('HH:mm:ss');
          eventData.currentAcceptingOrder = acceptingOrder;
          const changerAccounts = eventData.changerAccount;
          const changerIds = eventData.changerId;
          changerAccounts.push(email);
          changerIds.push(id);
          eventData.changerAccount = changerAccounts;
          eventData.changerId = changerIds;
          event.eventData = eventData;
          await this.save(event);
        }
      } else {
        const weekDay = now.day() + 1;
        let brand = await this.roDb('view_branch_brand as vbb')
          .select('vbb.brand_id', 'vbb.brand_name', 'vbb.country_id', 'vbb.name as branch_name', 'vbb.id as branch_id', 'vbb.accepting_orders', 'vbb.time_zone_identifier', 'ws.open_time', 'ws.open_duration', 'ws.open_all_day')
          .joinRaw(
            `left join weekly_schedules as ws ON ws.brand_location_id = vbb.id AND ws.day = ${weekDay}`
          )
          .where('vbb.id', brandLocationId).first();
        if (acceptingOrder !== brand.acceptingOrders && brand.openAllDay !== null) {
          const countryId = brand.countryId;
          //Time Offset between server side and local time
          const timeOffset = moment.tz(brand.timeZoneIdentifier).utcOffset() - moment().utcOffset();
          // What if allDayOpen is true, how can be calculate?
          if (brand.openAllDay) {
            brand.openTime = '00:00:00';
            brand.openDuration = 1440;
          }
          const openingTime = moment(brand.openTime, 'HH:mm:ss');
          const closingTime = openingTime.clone().add(brand.openDuration, 'm');
          now.add(timeOffset, 'm');
          const isWorkingHour = now.isBetween(openingTime, closingTime);
          brand = omit(brand, ['countryId', 'timeZoneIdentifier', 'acceptingOrders']);
          const eventDataModel = {
            currentAcceptingOrder: acceptingOrder,
            startTime: now.format('HH:mm:ss'),
            offlineDuration: acceptingOrder && isWorkingHour ? parseInt(moment.duration(now.diff(openingTime)).asMinutes(), 10) : 0,
            expectedOfflineDuration: acceptingOrder ? 0 : (isWorkingHour ? parseInt(moment.duration(closingTime.diff(now)).asMinutes(), 10) : now.isBefore(closingTime) ? brand.openDuration : 0),
            timeOffset,
            changerAccount: [email],
            changerId: [id]
          };
          const newEvent = {
            countryId,
            brandLocationId,
            eventType: eventTypeForReport.TOTAL_ONLINE_TIME,
            eventData: {...brand, ...eventDataModel}
          };
          await this.save(newEvent);
        }
      }
    }
  }
}

module.exports = Events;
