const { formatError, getAuthUser } = require('../../lib/util');
const { brandLocationFacilityPayloadError } = require('./enums');
const { kinesisAdminEventTypes } = require('../../lib/aws-kinesis-logging');

module.exports = {
  Mutation: {
    async brandLocationFacilitySave(
      root,
      {
        facilityInput: { brandLocationId, facilities },
      },
      context
    ) {
      const brandLocation = await context.brandLocation.getById(
        brandLocationId
      );
      if (!brandLocation) {
        return formatError(
          [brandLocationFacilityPayloadError.INVALID_BRAND_LOCATION],
          brandLocationId
        );
      }
      try {
        // Delete existing facilities
        await context.brandLocationFacility.deleteByBrandLocation(
          brandLocationId
        );
        // Save new facilities
        for (let i = 0; i < facilities.length; i++) {
          const facilityType = facilities[i];
          // eslint-disable-next-line no-await-in-loop
          await context.brandLocationFacility.saveFacilityByBrandLocation(
            brandLocationId,
            facilityType
          );
        }
        const adminActivityLog = await getAuthUser(context);
        await context.kinesisLogger.sendLogEvent(
          {...adminActivityLog, facilities, brandLocationId},
          kinesisAdminEventTypes.brandLocationFacilitySaveAdminEvent,
          'Admin'
        );
        return {
          facilities: await context.brandLocationFacility.getByBrandLocation(
            brandLocationId
          ),
        };
      } catch (err) {
        console.log('Brand Location Facility Error : ', err);
        return formatError([brandLocationFacilityPayloadError.SERVICE_ERROR], {
          brandLocationId,
          facilities,
        });
      }
    },
  },
};
