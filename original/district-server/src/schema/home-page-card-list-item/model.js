const BaseModel = require('../../base-model');
const { addLocalizationField } = require('../../lib/util');
const { iconPlacementEnum } = require('./enum');

class CardListItem extends BaseModel {
  constructor(db, context) {
    // Note: this model is virtual, there is no db table, that's why we can keep brand_locations
    super(db, 'brand_locations', context);
  }

  async getAllItems({ refQueryId, countryId, location, paging, branchRating }) {
    if (refQueryId === 'NEARBY') {
      return this.getNearby({ refQueryId, countryId, location, paging, branchRating });
    }
  }

  async getNearby(input) {
    const branchRating = input.branchRating || undefined;
    delete input.branchRating;
    const branches = await this.context.brandLocation.getBrandLocationsAroundMe({ ...input, filters: { isCheckStoreStatus: true, branchRating } });
    const fulFillmentIcons = [
      {
        type: 'PICKUP',
        sortOrder: 1,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_pickup_active.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_pickup_disable.png',
      },
      {
        type: 'CAR',
        sortOrder: 2,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_car_active.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_car_disable.png',
      },
      {
        type: 'DELIVERY',
        sortOrder: 3,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_delivery_active.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_delivery_disable.png',
      },
      {
        type: 'EXPRESS_DELIVERY',
        sortOrder: 4,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_10_minutes_active.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_10_minutes_disable.png',
      },
    ];

    const createBranchList = branches => {
      return branches.map((branch) => {
        const {id, distance, brand = {}, name = {}, storeStatus, branchStatusInfo, currentAvailableFulfillments} = branch;
        const {coverImage, branchDescription = {}} = brand;
        const distanceInKm = (distance / 1000).toFixed(1);
        const isDistanceInKm = distance > 1000;

        const distanceLabel = {
          en: `${isDistanceInKm ? distanceInKm : distance} ${isDistanceInKm ? 'km' : 'm'}`.trim(),
          ar: `${isDistanceInKm ? distanceInKm : distance} ${isDistanceInKm ? 'كم' : 'م'}`.trim(),
          tr: `${isDistanceInKm ? distanceInKm : distance} ${isDistanceInKm ? 'km' : 'm'}`.trim(),
        };

        const subtitle = {
          en: name.en?.trim() ?? '',
          ar: name.ar?.trim() ?? '',
          tr: name.tr?.trim() ?? '',
        };

        const description = {
          en: branchDescription.en ?? '',
          ar: branchDescription.ar ?? '',
          tr: branchDescription.tr ?? '',
        };

        const icons = this.context?.brandLocation?.getAllAvailableFulfillmentTypes(branch)
          .map(fulFillmentType => fulFillmentIcons.find(icon => icon.type === fulFillmentType))
          .filter(Boolean)
          .map(fulfillmentIcon => {
            const isActive = currentAvailableFulfillments?.includes(fulfillmentIcon.type);
            return {
              url: isActive ? fulfillmentIcon.iconUrl : fulfillmentIcon.disableIconUrl,
              placement: iconPlacementEnum.FOOTER,
              status: isActive ? 1 : 2,
              sortOrder: fulfillmentIcon.sortOrder,
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

        return {
          id,
          image: coverImage ?? null,
          title: addLocalizationField(brand, 'name')?.name ?? '',
          distanceLabel,
          subtitle,
          description,
          storeStatus: storeStatus ?? null,
          branchStatusInfo: branchStatusInfo ?? null,
          icons,
          rating: branch.rating
        };
      });
    };

    return createBranchList(branches);
  }
}

module.exports = CardListItem;
