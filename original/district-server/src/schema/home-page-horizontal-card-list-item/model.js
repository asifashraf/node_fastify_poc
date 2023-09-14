const BaseModel = require('../../base-model');
const { uniq, groupBy } = require('lodash');
const { horizontalCardListItemStatus, horizontalCardListItemType, horizontalCardListItemError } = require('./enum');
const { homePageSectionItemTypeEnum } = require('../home-page-section/enum');
const { orderFulfillmentTypes } = require('../order-set/enums');
const { brandLocationStatus } = require('../root/enums');
const { addLocalizationField, addLocalizationMultipleFields, uuid } = require('../../lib/util');

class HorizontalCardListItem extends BaseModel {
  constructor(db, context) {
    super(db, 'home_page_horizontal_card_list_items', context);
  }

  async getAllItems({ sectionMetadata, refQueryId, countryId, location, paging }) {
    if (sectionMetadata.itemType === homePageSectionItemTypeEnum.EXPRESS_DELIVERY_HORIZONTAL_CARD_LIST_ITEM) {
      return this.getExpressZone({ refQueryId, countryId, location, paging });
    } else {
      if (sectionMetadata.hasExpressZoneCheck) {
        const customerInZone = await this.context.brandLocation.checkLocationInExpressZone(location);
        if (customerInZone) return [];
      }
      return this.getItemsWithSection(sectionMetadata, location);
    }
  }

  async getExpressZone(input) {
    const branches = await this.context.brandLocation.getBrandLocationsAroundMe({
      ...input,
      filters: {
        isCheckStoreStatus: true,
        fulfillmentType: orderFulfillmentTypes.EXPRESS_DELIVERY,
      },
    });
    function processBranches(branches) {
      // const getDistanceText = (distance) => {
      //   const unit = distance > 1000 ? 'km' : 'm';
      //   const value = distance > 1000 ? parseFloat(distance / 1000).toFixed(1) : distance;
      //   return { en: `${value} ${unit}`, ar: `${value} المسافة ${unit === 'km' ? 'كم' : 'م'}` };
      // };

      return branches.map((branch) => {
        addLocalizationField(branch.brand, 'name');
        // const distanceText = getDistanceText(branch.distance);

        return {
          id: branch.id,
          image: branch.brand?.coverImage,
          title: branch.brand.name,
          subtitle: {
            en: `${branch.name.en}`,
            ar: `${branch.name.ar}`,
            tr: `${branch.name.tr}`,
          },
          description: {
            en: branch.brand?.branchDescription?.en ?? '',
            ar: branch.brand?.branchDescription?.ar ?? '',
            tr: branch.brand?.branchDescription?.tr ?? '',
          },
        };
      });
    }

    return processBranches(branches);
  }

  async getItemsWithSection(sectionMetadata, location) {
    let keepType = null;
    switch (sectionMetadata.itemType) {
      case homePageSectionItemTypeEnum.BRAND_HORIZONTAL_CARD_LIST_ITEM:
        keepType = horizontalCardListItemType.BRAND;
        break;
      case homePageSectionItemTypeEnum.BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM:
        keepType = horizontalCardListItemType.BRAND_LOCATION;
        break;
      case homePageSectionItemTypeEnum.SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM:
        keepType = horizontalCardListItemType.SUBSCRIPTION;
        break;
      default:
        break;
    }
    if (!keepType) return [];
    let itemIds = await this.db(this.tableName)
      .select('item_id')
      .where('item_type', keepType)
      .where('status', horizontalCardListItemStatus.ACTIVE)
      .where('section_id', sectionMetadata.id)
      .then(result => {
        return result.map(row => row.itemId);
      });

    const { longitude, latitude } = location;
    if (keepType == horizontalCardListItemType.BRAND_LOCATION) {
      const brandLocations = await this.context.brandLocation.getBranchesByIds(latitude, longitude, itemIds);
      const brandLocationIds = brandLocations.map(brandLocation => brandLocation.branchId);
      if (brandLocationIds.length != itemIds.length) {
        const diff = itemIds.filter(x => !brandLocationIds.includes(x));
        itemIds = brandLocationIds.concat(diff);
      } else itemIds = brandLocationIds;
    } else {
      const brandLocations = await this.context.brandLocation.getBranchesOfBrand(latitude, longitude, itemIds);
      if (keepType == horizontalCardListItemType.BRAND) {
        itemIds = brandLocations.map(brandLocation => brandLocation.branchId);
      } else {
        const listedBrandIds = Object.keys(groupBy(brandLocations, 'brandId'));
        if (listedBrandIds.length != itemIds.length) {
          const diff = itemIds.filter(x => !listedBrandIds.includes(x));
          itemIds = listedBrandIds.concat(diff);
        } else itemIds = listedBrandIds;
      }
    }


    let items = null;
    function processItem(items) {
      if (keepType == horizontalCardListItemType.SUBSCRIPTION) {
        return items.map((item) => {
          return {
            id: item.id,
            image: item.coverImage,
            title: item.name,
            subtitle: {
              en: `${item.subsNumber} ${item.subsNumber > 1 ? 'plans' : 'plan'} available`,
              ar: `${item.subsNumber} ${item.subsNumber > 1 ? 'plans' : 'plan'} available`,
              tr: `${item.subsNumber} ${item.subsNumber > 1 ? 'plans' : 'plan'} available`,
            },
            description: item.brandDescription,
          };
        });
      } else {
        return items.map((item) => {
          return {
            id: item.id,
            image: item.brand.coverImage,
            title: item.name,
            subtitle: item.brand.name,
            description: item.brand.brandDescription,
          };
        });
      }
    }

    if (sectionMetadata.itemType == homePageSectionItemTypeEnum.SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM) {
      items = await this.context.brand.getById(itemIds);
      const subs = await this.context.cSubscription.getSubscriptionByBrandId(itemIds);
      items.map(item => {
        addLocalizationMultipleFields(item, ['name', 'brandDescription']);
        const brandSubs = subs.filter(sub => sub.brandId == item.id);
        item.subsNumber = brandSubs.length;
        return item;
      });
    } else {
      items = await this.db(this.context.brandLocation.tableName)
        .whereIn('id', itemIds)
        .where('status', brandLocationStatus.ACTIVE);
      const brandIds = uniq(items.map(item => item.brandId));
      const brands = await this.context.brand.getById(brandIds);
      items.map(item => {
        addLocalizationField(item, 'name');
        const brand = brands.find(brand => brand.id == item.brandId);
        item.brand = addLocalizationMultipleFields(brand, ['name', 'brandDescription']);
        return item;
      });
    }

    if (items.length > 0) {
      items = itemIds.map(itemId => {
        return items.find(item => item.id == itemId);
      });
      return processItem(items);
    }
    return [];
  }

  async getAllItemsForAdmin({countryId, status, type}) {
    const query = this.db({hcli: this.tableName})
      .select('hcli.*')
      .leftJoin({hpss: this.context.homePageSectionSetting.tableName}, 'hpss.section_id', 'hcli.section_id')
      .leftJoin({hps: this.context.homePageSection.tableName}, 'hpss.section_id', 'hps.id')
      .where('hpss.country_id', countryId)
      .whereIn('hps.item_type',
        [
          homePageSectionItemTypeEnum.BRAND_HORIZONTAL_CARD_LIST_ITEM,
          homePageSectionItemTypeEnum.SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM,
          homePageSectionItemTypeEnum.BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM
        ]
      );
    if (status) {
      query.where('hcli.status', status);
    } else {
      query.whereNot('hcli.status', horizontalCardListItemStatus.DELETED);
    }
    if (type) {
      query.where('hcli.item_type', type);
    }
    const items = await query;
    const groupedWithSection = groupBy(items, 'sectionId');
    const sectionIds = Object.keys(groupedWithSection);
    const sections = await this.context.homePageSection.getById(sectionIds);
    const response = [];
    sections.map(section => {
      section = addLocalizationField(section, 'header');
      const items = groupedWithSection[section.id];
      response.push({
        section,
        itemType: items[0].itemType,
        items
      });
    });
    return response;
  }

  async save(horizontalCardListInput) {
    return await this.db.transaction(async trx => {
      const section = await this.context.homePageSection.getById(horizontalCardListInput.sectionId);

      const items = await trx.table(this.tableName)
        .where('section_id', section.id)
        .whereNot('status', horizontalCardListItemStatus.DELETED);

      const deletedItems = [];
      const inactiveItems = [];
      const activeItems = [];
      const activeItemIds = [];

      const cardItemIds = uniq(horizontalCardListInput.cardItemIds);
      let keepType = null;
      switch (section.itemType) {
        case homePageSectionItemTypeEnum.BRAND_HORIZONTAL_CARD_LIST_ITEM:
          keepType = horizontalCardListItemType.BRAND;
          break;
        case homePageSectionItemTypeEnum.BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM:
          keepType = horizontalCardListItemType.BRAND_LOCATION;
          break;
        case homePageSectionItemTypeEnum.SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM:
          keepType = horizontalCardListItemType.SUBSCRIPTION;
          break;
        default:
          break;
      }
      const valuesTobeInserted = [];

      if (items.length > 0) {
        items.map(item => {
          if (item.itemType != keepType) {
            deletedItems.push(item.id);
          } else if (!cardItemIds.includes(item.itemId)) {
            inactiveItems.push(item.id);
          } else {
            activeItems.push(item.id);
            activeItemIds.push(item.itemId);
          }
        });
      }

      cardItemIds.map(cardItemId => {
        if (!activeItemIds.includes(cardItemId)) {
          valuesTobeInserted.push({
            id: uuid.get(),
            section_id: section.id,
            item_id: cardItemId,
            status: horizontalCardListItemStatus.ACTIVE,
            item_type: keepType,
          });
        }
      });

      if (activeItems.length > 0) {
        await trx.table(this.tableName).whereIn('id', activeItems).update({ status: horizontalCardListItemStatus.ACTIVE });
      }
      if (inactiveItems.length > 0) {
        await trx.table(this.tableName).whereIn('id', inactiveItems).update({ status: horizontalCardListItemStatus.INACTIVE });
      }
      if (deletedItems.length > 0) {
        await trx.table(this.tableName).whereIn('id', deletedItems).update({ status: horizontalCardListItemStatus.DELETED });
      }
      if (valuesTobeInserted.length > 0) {
        const chunkSize = 250;
        await trx.batchInsert(this.tableName, valuesTobeInserted, chunkSize);
      }
    }).then(async () => {
      return {horiziontalCardListItems: await this.getBySectionId(horizontalCardListInput.sectionId)};
    }).catch((error) => {
      return { errors: [horizontalCardListItemError.TRANSACTIONAL_ERROR]};
    });
  }

  async validate(horizontalCardListInput) {
    const errors = [];
    const section = await this.context.homePageSection.getById(horizontalCardListInput.sectionId);
    if (section) {
      const uniqItemIds = uniq(horizontalCardListInput.cardItemIds);
      switch (section.itemType) {
        case homePageSectionItemTypeEnum.BRAND_HORIZONTAL_CARD_LIST_ITEM:
          const { count: countBrand } = await this.db('brands')
            .where('country_id', horizontalCardListInput.countryId)
            .whereIn('id', uniqItemIds)
            .count()
            .first();
          if (countBrand != uniqItemIds.length) {
            errors.push(horizontalCardListItemError.INVALID_BRAND);
          }
          break;
        case homePageSectionItemTypeEnum.BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM:
          const { count: countBrandLocation } = await this.db('brand_locations as bl')
            .leftJoin('brands as b', 'b.id', 'bl.brand_id')
            .where('b.country_id', horizontalCardListInput.countryId)
            .whereIn('bl.id', uniqItemIds)
            .count()
            .first();
          if (countBrandLocation != uniqItemIds.length) {
            errors.push(horizontalCardListItemError.INVALID_BRAND_LOCATION);
          }
          break;
        case homePageSectionItemTypeEnum.SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM:
          const brandSubscription = await this.db('subscriptions')
            .distinctOn('brand_id')
            .where('country_id', horizontalCardListInput.countryId)
            .whereIn('brand_id', uniqItemIds);
          if (brandSubscription.length != uniqItemIds.length) {
            errors.push(horizontalCardListItemError.INVALID_SUBSCRIPTION_BRAND);
          }
          break;
        default:
          errors.push(horizontalCardListItemError.SECTION_TYPE_CAN_NOT_SUPPORT_HORIZONTAL_CARD);
          break;
      }
    } else errors.push(horizontalCardListItemError.INVALID_SECTION);

    return errors;
  }

  async getBySectionId(sectionId, status) {
    const section = await this.context.homePageSection.getById(sectionId);
    const query = this.db({ hcli: this.tableName });
    let tableName = null;
    switch (section.itemType) {
      case homePageSectionItemTypeEnum.BRAND_HORIZONTAL_CARD_LIST_ITEM:
      case homePageSectionItemTypeEnum.SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM:
        tableName = this.context.brand.tableName;
        break;
      case homePageSectionItemTypeEnum.BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM:
        tableName = this.context.brandLocation.tableName;
        break;
      default:
        break;
    }
    query.leftJoin(
      { tt: tableName },
      'tt.id',
      'hcli.item_id'
    )
      .select('hcli.*', 'tt.name', 'tt.name_ar')
      .where('hcli.section_id', sectionId)
      .whereNot('hcli.status', horizontalCardListItemStatus.DELETED);
    if (status) {
      query.where('hcli.status', status);
    }
    const items = await query;
    return {
      section,
      itemType: items[0].itemType,
      items
    };
  }
}

module.exports = HorizontalCardListItem;
