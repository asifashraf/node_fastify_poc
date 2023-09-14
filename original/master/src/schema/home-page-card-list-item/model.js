const BaseModel = require('../../base-model');
const { addLocalizationField } = require('../../lib/util');
const { iconPlacementEnum } = require('./enum');

class CardListItem extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_locations', context);
  }

  async getAllItems({ refQueryId, countryId, location, paging }) {
    if (refQueryId === 'NEARBY') {
      return this.getNearby({ refQueryId, countryId, location, paging });
    }
  }

  async getNearby(input) {
    const branches = await this.context.brandLocation.getBrandLocationsAroundMe({ ...input, filters: { isCheckStoreStatus: true } });
    const fulFillmentIcons = [
      {
        type: 'DELIVERY',
        sortOrder: 3,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_1.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_4.png'
      },
      {
        type: 'CAR',
        sortOrder: 2,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_2.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_curbside_passive.png'
      },
      {
        type: 'EXPRESS_DELIVERY',
        sortOrder: 4,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_3.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_1.png'
      },
      {
        type: 'PICKUP',
        sortOrder: 1,
        iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_4.png',
        disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_delivery_passive.png'

      },
    ];

    const lst = [];
    for (const branch of branches) {
      addLocalizationField(branch.brand, 'name');
      const retVal = {};
      retVal.id = branch.id;
      retVal.image = branch.brand?.coverImage;
      retVal.title = branch.brand.name;
      let distanceTextEn = branch.distance + ' m';
      let distanceTextAr = branch.distance + ' المسافة م';
      if (branch.distance > 1000) {
        distanceTextEn = parseFloat(branch.distance / 1000).toFixed(1) + ' km';
        distanceTextAr = parseFloat(branch.distance / 1000).toFixed(1) + ' المسافة كم';
      }
      retVal.subtitle = {};
      retVal.subtitle.en = branch.name.en + ' ' + distanceTextEn;
      retVal.subtitle.ar = branch.name.ar + ' ' + distanceTextAr;
      retVal.subtitle.tr = branch.name.tr + ' ' + distanceTextEn;
      retVal.description = {
        en: branch.brand?.branchDescription ?? '',
        ar: branch.brand?.branchDescription?.ar ?? '',
        tr: branch.brand?.branchDescription?.tr ?? '',
      };
      retVal.storeStatus = branch.storeStatus;
      retVal.branchStatusInfo = branch.branchStatusInfo;
      const iconList = [];
      const fullAvailableFulfillmentTypes = this.context.brandLocation.getAllAvailableFulfillmentTypes(branch);
      fullAvailableFulfillmentTypes.forEach(fulFillmentType => {
        const fulfillmentIcon = fulFillmentIcons.find(icon => icon.type == fulFillmentType);
        if (fulfillmentIcon) {
          let url = '';
          let status = 2;
          if (branch.currentAvailableFulfillments.includes(fulfillmentIcon.type)) {
            url = fulfillmentIcon.iconUrl;
            status = 1;
          } else {
            url = fulfillmentIcon.disableIconUrl;
            status = 2;
          }
          iconList.push({
            url,
            placement: iconPlacementEnum.FOOTER,
            status,
            sortOrder: fulfillmentIcon.sortOrder
          });
        }
      });
      retVal.icons = iconList.sort((a, b) => a.sortOrder - b.sortOrder);
      lst.push(retVal);
    }
    return lst;
  }
}

module.exports = CardListItem;
