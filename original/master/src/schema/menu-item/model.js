/* eslint-disable camelcase */
const {
  assign,
  forEach,
  map,
  omit,
  flatten,
  get,
  toInteger,
  uniq,
  filter,
  head
} = require('lodash');
const Promise = require('bluebird');
const BaseModel = require('../../base-model');
const {
  appendSortOrderToList,
  removeLocalizationField,
  removeLocalizationMultipleFields,
  formatError,
  now,
} = require('../../lib/util');
const {
  brandLocationUnavailableMenuItemError,
  brandMenuItemError,
  menuItemUnavailableState,
  statusTypes,
} = require('../root/enums');
const {
  invalidateMenuForBrandLocation,
  invalidateMenu,
} = require('../c-menu/utils');
const { createLoaders } = require('./loaders');
const Fuse = require('fuse.js');
const { env } = require('../../../config');
const { menuItemSearchError, menuItemStatus } = require('./enums');
const moment = require('moment');

class MenuItem extends BaseModel {
  constructor(db, context) {
    super(db, 'menu_items', context);
    this.loaders = createLoaders(this);
  }

  getById(id) {
    return this.db(this.tableName)
      .where('id', id)
      .first();
  }
  getByIds(id) {
    return this._idLoader.loadMany(id);
  }

  getByMenuSection(menuSectionId) {
    return this.db(this.tableName)
      .where('section_id', menuSectionId)
      .orderBy('sort_order', 'ASC');
  }

  async getAvailability(menuItemId, brandLocationId) {
    const countResult = await this.db('brand_locations_unavailable_menu_items')
      .count('*')
      .where({
        brand_location_id: brandLocationId,
        menu_item_id: menuItemId,
      })
      .then(result => toInteger(get(result, '[0].count', 0)));
    return countResult === 0;
  }

  async getSoldOutItemsByBrandLocationId(brandLocationId) {
    return this.db(this.tableName)
      .join(
        'brand_locations_unavailable_menu_items',
        'brand_locations_unavailable_menu_items.menu_item_id',
        'menu_items.id'
      )
      .where({
        'brand_locations_unavailable_menu_items.brand_location_id': brandLocationId,
        'brand_locations_unavailable_menu_items.state':
          menuItemUnavailableState.SOLD_OUT,
      })
      .select('menu_items.*');
  }

  async getUnavailabilityState(menuItemId, brandLocationId) {
    const [result] = await this.db(
      'brand_locations_unavailable_menu_items'
    ).where({
      brand_location_id: brandLocationId,
      menu_item_id: menuItemId,
    });
    return result ? result.state : null;
  }

  async setAvailabilityWithoutAuth(menuItemId, brandLocationId, available) {
    const tempAuth = this.context.auth;
    this.context.auth = {
      id: 'c301540e-7777-7777-7777-789d0381d001',
      email: 'foodics@cofeapp.com',
    };
    await this.setAvailability(menuItemId, brandLocationId, available);
    this.context.auth = tempAuth;
    return true;
  }

  // TODO maybe Unique menuItemId-brandLocationId constraint on db?
  async setAvailability(menuItemId, brandLocationId, available, state) {
    const { id, email } = this.context.auth;
    const unavailableItemsTableName = 'brand_locations_unavailable_menu_items';

    let brand = await this.db('brand_locations as bl')
      .select('b.id as brandId', 'b.name as brandName', 'b.country_id', 'bl.name as branchName', 'bl.id as branchId')
      .leftJoin('brands as b', 'b.id', 'bl.brand_id')
      .where('bl.id', brandLocationId).first();
    const countryId = brand.countryId;
    brand = omit(brand, ['countryId']);
    const menuItem = await super.getById(menuItemId);
    if (available) {
      await this.db(unavailableItemsTableName)
        .where({
          brand_location_id: brandLocationId,
          menu_item_id: menuItemId,
        })
        .delete();
      const event = {
        eventType: 'ITEM_STATUS_CHANGE',
        countryId,
        eventData: { ...brand, ...{ itemName: menuItem.name, itemId: menuItemId, itemStatus: 'ITEM_AVAILABLE', changerAccount: email, changerId: id } }
      };
      await this.context.events.save(event);
    } else {
      const [row] = await this.db(unavailableItemsTableName).where({
        brand_location_id: brandLocationId,
        menu_item_id: menuItemId,
      });

      if (row) {
        await this.db(unavailableItemsTableName)
          .where({
            brand_location_id: brandLocationId,
            menu_item_id: menuItemId,
          })
          .update({
            state: state || menuItemUnavailableState.NOT_COMMERCIALIZED,
          });
      } else {
        await this.db(unavailableItemsTableName).insert({
          brandLocationId,
          menuItemId,
          state,
        });
      }
      const event = {
        eventType: 'ITEM_STATUS_CHANGE',
        countryId,
        eventData: { ...brand, ...{ itemName: menuItem.name, itemId: menuItemId, itemStatus: state || menuItemUnavailableState.NOT_COMMERCIALIZED, changerAccount: email, changerId: id } }
      };
      await this.context.events.save(event);
    }
    await invalidateMenuForBrandLocation.apply({ db: this.db }, [
      brandLocationId,
    ]);
  }

  async saveMenuItemV2(menuItem) {
    const me = this.context;

    const menuItemOptionSets = menuItem.optionSets;

    delete menuItem.optionSets;

    let menuItemOptionSetIds = [];

    const itemId = await super.save(menuItem);

    menuItemOptionSetIds = menuItemOptionSets.map(async (optionSet) => {
      const { menuItemId } = optionSet;

      const options = optionSet.options;

      delete optionSet.options;

      if (!menuItemId) optionSet['menuItemId'] = itemId;

      const optionSetId = await me.menuItemOptionSet.save(optionSet);

      const menuItemOptions = options.map((option) => {
        const { menuItemOptionSetId } = option;

        if (!menuItemOptionSetId) option['menuItemOptionSetId'] = optionSetId;

        return option;
      });

      const menuItemOptionIds = await me.menuItemOption.saveMenuItemOptionV2(menuItemOptions);

      return { optionSetId, menuItemOptionIds };
    });

    await Promise.all(menuItemOptionSetIds);

    const section = await this.context.menuSection.getById(menuItem.sectionId);

    await invalidateMenu(section.menuId);

    return itemId;
  }

  async save(menuItems) {
    const db = this.db;
    const saveMenuItem = async menuItem => {
      if (menuItem.baseNutritional) {
        if (menuItem.baseNutritional.deleted) {
          await this.context.nutritionalInfo.save(menuItem.baseNutritional);
        } else {
          menuItem.baseNutritionalId = await this.context.nutritionalInfo.save(
            menuItem.baseNutritional
          );
        }
      }

      const menuItemId = await super.save(
        omit(menuItem, ['optionSets', 'baseNutritional', 'tagIds'])
      );

      if (menuItem.deleted) return menuItem;
      const brand = await db('menu_sections as ms').select('b.id as brandId', 'b.name as brandName', 'b.country_id')
        .leftJoin('menus as m', 'm.id', 'ms.menu_id')
        .leftJoin('brands as b', 'b.id', 'm.brand_id')
        .where('ms.id', menuItem.sectionId).first();
      let optionSets = appendSortOrderToList(
        map(menuItem.optionSets, optionSet => {
          const oSet = assign({}, omit(optionSet, 'options'), {
            menuItemId,
          });

          return oSet;
        }),
        'menuItemId',
        'sortOrder'
      );

      optionSets = removeLocalizationField(optionSets, 'label');
      const menuItemOptionSetIds = await this.context.menuItemOptionSet.save(
        optionSets
      );

      let options = flatten(
        map(menuItem.optionSets, 'options').map((options, ix) =>
          map(options, option =>
            assign({}, option, {
              menuItemOptionSetId: menuItemOptionSetIds[ix],
            })
          )
        )
      );
      options = removeLocalizationMultipleFields(options, ['value', 'iconUrl']);
      await this.context.menuItemOption.save(
        appendSortOrderToList(options, 'menuItemOptionSetId', 'sortOrder'),
        brand
      );
      if (menuItemId) {
        const res = await this.context.tagRelation.saveBulkForMenuItem(menuItemId, menuItem?.tagIds);
        if (res?.errors?.length > 0)
          throw new Error('INVALID_TAG');
      }
      return assign({}, menuItem, { id: menuItemId });
    };

    const newMenuItems = filter(
      await Promise.mapSeries(
        appendSortOrderToList(menuItems, 'sectionId', 'sortOrder'),
        saveMenuItem
      ),
      item => !item.deleted
    );

    const nutritionalIds = [];
    const allergenData = [];

    forEach(newMenuItems, item => {
      if (item.baseNutritionalId) {
        nutritionalIds.push(item.baseNutritionalId);

        forEach(item.baseNutritional.allergens, allergen => {
          allergenData.push({
            nutritionalInfoId: item.baseNutritionalId,
            allergenId: allergen,
          });
        });
      }
    });

    // NOTE: first we need to remove allergen associations from DB
    await this.context.nutritionalInfo.removeAllergensByNutritionalIds(
      nutritionalIds
    );

    // NOTE: next we add in the new allergen associations
    if (allergenData.length > 0) await this.context.nutritionalInfo.createAllergens(allergenData);
    const { sectionId } = menuItems[0];
    const section = await this.context.menuSection.getById(sectionId);
    await invalidateMenu(section.menuId);
    return uniq(map(newMenuItems, 'id'));
  }

  async validatePermission(menuItems, permission) {
    const sectionIds = menuItems.map(menuItem => menuItem.sectionId);
    const brandIds = await this.db
      .select('brand_id')
      .from('menus')
      .whereIn(
        'id',
        this.db
          .select('menu_id')
          .from('menu_sections')
          .whereIn('id', sectionIds)
      );
    // if result set is not equal to 1 comprimised data and return false
    if (brandIds.length !== 1) {
      return false;
    }
    // get admin's brandId from auth
    const admin = await this.context.admin.getByAuthoId(this.context.auth.id);
    if (!admin) {
      return false;
    }
    // const brandAdminList = (
    //   await this.context.brandAdmin.getOnlyBrandAdminByAdminId(admin.id) ||
    //   []
    // ).map(brandAdmin => brandAdmin.brandId);

    const { brandAdminList, branchAdminList } = this.context.auth.brandAdminInfo;
    // admin portal case
    if (!this.context.auth.isVendorAdmin && brandAdminList.length == 0 && branchAdminList.length == 0) {
      const hasPermission = await this.context.orderSet.validatePermissiosByPermission(permission);
      if (hasPermission) {
        return true;
      } else {
        return false;
      }
    }

    // return false if they are not matching (this is an attack)
    if (!brandAdminList || !brandAdminList.includes(brandIds[0].brandId)) {
      return false;
    }

    return true;
  }

  async validateDeleteMenuItem(menuItemId) {
    const errors = [];
    const menuItem = await this.getById(menuItemId);
    if (menuItem) {
      const permissionIsValid = await this.validatePermission([menuItem], 'menu:upsert');
      if (!permissionIsValid) {
        errors.push(brandLocationUnavailableMenuItemError.INVALID_MENU_ITEM);
      }
      const isSubscribable = await this.context.cSubscriptionMenuItem.isSubscribableItem(menuItemId);
      if (isSubscribable) {
        errors.push(brandLocationUnavailableMenuItemError.SUBSCRIBABLE_ITEM);
      }
    } else {
      errors.push(brandLocationUnavailableMenuItemError.INVALID_MENU_ITEM);
    }
    return errors;
  }


  async deleteMenuItem(menuItemId) {
    const deleteItem = async menuItem => {
      await super.save(menuItem);
      return menuItem;
    };
    const menuItem = await this.getById(menuItemId);
    const sectionId = menuItem.sectionId;
    const menuItems = map(await this.getByMenuSection(sectionId), mi => {
      if (mi.id === menuItemId) {
        mi.deleted = true;
      }
      return mi;
    });

    filter(
      await Promise.mapSeries(
        appendSortOrderToList(menuItems, 'sectionId', 'sortOrder'),
        deleteItem
      ),
      item => !item.deleted
    );

    const section = await this.context.menuSection.getById(sectionId);
    await invalidateMenu(section.menuId);

    return true;
  }

  async sortMenuItems(menuItems) {
    const sortItem = async menuItem => {
      await super.save(menuItem);
      return menuItem;
    };
    if (menuItems.length > 0) {
      const firstMenuItemId = head(menuItems);
      const firstMenuItem = await this.getById(firstMenuItemId.id);
      if (firstMenuItem) {
        const permissionIsValid = await this.validatePermission(
          [firstMenuItem], 'menu:upsert'
        );
        if (!permissionIsValid) {
          return false;
        }
        const sectionId = firstMenuItem.sectionId;

        menuItems = map(menuItems, mi => {
          mi.sectionId = sectionId;
          return mi;
        });

        await Promise.mapSeries(
          appendSortOrderToList(menuItems, 'sectionId', 'sortOrder'),
          sortItem
        );

        const section = await this.context.menuSection.getById(sectionId);
        await invalidateMenu(section.menuId);
      }
    }

    return true;
  }

  async validateAvailablity(menuItemId, brandLocationId) {
    const errors = [];
    //const validMenuItem = await this.context.menuItem.isValid({ id: menuItemId });
    const menuItem = await this.context.menuItem.getById(menuItemId);
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);

    if (!brandLocation) {
      errors.push(brandLocationUnavailableMenuItemError.INVALID_BRAND_LOCATION);
    }

    if (!menuItem) {
      errors.push(brandLocationUnavailableMenuItemError.INVALID_MENU_ITEM);
    } else {
      if (menuItem.status == menuItemStatus.INACTIVE) {
        errors.push(brandLocationUnavailableMenuItemError.MENU_ITEM_IS_INACTIVE);
      } else {
        const section = await this.context.menuSection.getById(menuItem.sectionId);
        if (section.status == menuItemStatus.INACTIVE) {
          errors.push(brandMenuItemError.ITEM_MUST_BE_ACTIVE_TO_UNAVAILABLE_PROCESS);
        }
        const menu = await this.context.menu.getById(section.menuId);
        if (brandLocation.brandId != menu.brandId) {
          errors.push(brandLocationUnavailableMenuItemError.MENU_ITEM_AND_BRAND_NOT_MATCHED);
        }
      }
    }

    /*
    if (state && state === menuItemUnavailableState.NOT_COMMERCIALIZED) {
      if (await this.context.cSubscriptionMenuItem.isSubscribableItem(menuItemId))
        errors.push(brandLocationUnavailableMenuItemError.SUBSCRIBABLE_ITEM);
    }
    */

    return errors;
  }

  async validate(menuItems, context, permission, byPassPermissions = false) {
    const errors = [];
    if (byPassPermissions === false) {
      const permissionIsValid = await this.validatePermission(menuItems, permission);
      if (!permissionIsValid) {
        errors.push(brandMenuItemError.WRONG_OPTIONS);
        return errors;
      }
    }

    const validateMenuItem = async menuItem => {
      const validSection = await context.menuSection.isValid({
        id: menuItem.sectionId,
      });

      if (menuItem && menuItem.id) {
        const menuSection = await context.menuSection.getById(menuItem.sectionId);
        if (menuSection.status == statusTypes.INACTIVE && menuItem.status == statusTypes.ACTIVE) {
          errors.push(brandMenuItemError.SECTION_MUST_BE_ACTIVE_TO_UPDATE_MENU_ITEM);
        }

        const isSubscribable = await this.context.cSubscriptionMenuItem.isSubscribableItem(menuItem.id);
        if (isSubscribable) {
          errors.push(brandMenuItemError.SUBSCRIBABLE_ITEM);
        }
      }
      if (!validSection) {
        errors.push(brandMenuItemError.INVALID_SECTION);
      }

      const hasOptionSet = menuItem.optionSets.length > 0;
      const hasOptions = get(menuItem, 'optionSets[0].options', []).length > 0;

      if (!hasOptionSet) {
        errors.push(brandMenuItemError.MISSING_OPTION_SET);
      }

      if (!hasOptions) {
        errors.push(brandMenuItemError.MISSING_OPTIONS);
      }

      return errors;
    };

    return uniq(flatten(await Promise.all(map(menuItems, validateMenuItem))));
  }

  getAllAvailableItems(sectionId, brandLocationId) {
    const db = this.db;
    return db
      .select('menu_items.*')
      .from('menu_items')
      .leftJoin('brand_locations_unavailable_menu_items', function () {
        this.on(
          'menu_items.id',
          '=',
          'brand_locations_unavailable_menu_items.menu_item_id'
        ).andOn(
          'brand_locations_unavailable_menu_items.brand_location_id',
          '=',
          db.raw(`'${brandLocationId}'`)
        );
      })
      .where({
        'menu_items.section_id': sectionId,
        'brand_locations_unavailable_menu_items.menu_item_id': null,
      });
  }

  getAllItemsWithAvailability(sectionId, brandLocationId) {
    const db = this.db;
    return db
      .select(
        'menu_items.*',
        'brand_locations_unavailable_menu_items.state',
        db.raw(
          'CASE WHEN brand_locations_unavailable_menu_items.state = \'SOLD_OUT\' THEN true ELSE false END AS sold_out'
        )
      )
      .from('menu_items')
      .leftJoin('brand_locations_unavailable_menu_items', function () {
        this.on(
          'menu_items.id',
          '=',
          'brand_locations_unavailable_menu_items.menu_item_id'
        ).andOn(
          'brand_locations_unavailable_menu_items.brand_location_id',
          '=',
          db.raw(`'${brandLocationId}'`)
        );
      })
      .where({
        'menu_items.section_id': sectionId,
        'menu_items.status': menuItemStatus.ACTIVE,
      })
      .andWhere(builder =>
        builder
          .whereNot(
            'brand_locations_unavailable_menu_items.state',
            menuItemUnavailableState.NOT_COMMERCIALIZED
          )
          .orWhereNull('brand_locations_unavailable_menu_items.menu_item_id')
      );
  }

  getAllActiveItemsBySection(sectionId){
    return this.db(this.tableName)
      .where('section_id', sectionId)
      .where('status', menuItemStatus.ACTIVE)
      .orderBy('sort_order', 'ASC');
  }

  async searchValidation(args) {
    const errors = [];
    if (!args) {
      errors.push(menuItemSearchError.INVALID_ARGS);
    }

    if (!args.filters) {
      errors.push(menuItemSearchError.INVALID_FILTERS);
    }

    if (args.filters.paging != null) {
      if (!(args.filters.paging.page != null && args.filters.paging.perPage != null)) {
        errors.push(menuItemSearchError.INVALID_PAGING);
      } else {
        if (!(args.filters.paging.page >= 1 && args.filters.paging.perPage >= 1)) {
          errors.push(menuItemSearchError.INVALID_PAGING);
        }
      }
    }

    if (args.filters.searchText.length < 3) {
      errors.push(menuItemSearchError.MIN_LENGTH);
    }

    if (args.filters.searchText.length > 50) {
      errors.push(menuItemSearchError.MAX_LENGTH);
    }

    if (!args.filters.brandLocationId) {
      errors.push(menuItemSearchError.INVALID_BRAND_LOCATION);
    }

    return errors;
  }

  async searchWithCachedMenuData(args) {
    const errors = await this.searchValidation(args);
    if (errors.length > 0) {
      return formatError(errors);
    }
    let results = [];
    if (args) {
      if (args.filters) {
        if (args.filters?.searchText) {
          const lang = (args.filters?.preferredLanguage || 'en').toString().toLowerCase();
          const { brandLocationId } = args.filters;
          if (brandLocationId) {
            const menu = await this.context.brandLocation.calculateMenu(brandLocationId);
            const menuItems = menu.sections.reduce((a, b) => a.concat(b?.items), []);
            const options = {
              ignoreLocation: true,
              includeMatches: true,
              includeScore: true,
              threshold: 0.3,
              keys: [
                `name.${lang}`,
              ],
            };
            const fuse = new Fuse(menuItems, options);
            args.filters.searchText = args.filters?.searchText.replace(/\s+/g, ' ').trim();
            results = fuse.search(args.filters?.searchText);
            let pageVal = 1;
            let perPageVal = results.length;
            if (args.filters?.paging) {
              const { page, perPage } = args.filters?.paging;
              if (page != null && perPage != null) {
                pageVal = page;
                perPageVal = perPage;
              }
            }
            const res = this.paginator(results, pageVal, perPageVal);
            this.saveSearchFilters({ filters: args.filters, paging: res.paging }).catch(r => console.log(r));
            return res;
          }
        }
      }
    }

    return {
      results: null,
      paging: null,
    };
  }

  async saveSearchFilters(logData) {
    await this.context.kinesisLogger
      .sendLogEvent(logData, 'branch-menu-search-customer-filters', `menu-search-${env}`);
  }

  paginator(items, currentPage, perPageItems) {
    return this.addRefreshPaging(items, currentPage, perPageItems);
  }

  async updateStatusById(id, status) {
    return this.db(this.tableName)
      .update({ status })
      .where('id', id);
  }

  async setMenuItemStasusForBrand(status, brandId, menuItemId) {
    if (status == menuItemStatus.ACTIVE) {
      /* Delete All entries from brand_locations_unavailable_menu_items
        so menuItem becomes available for all branches*/

      await this.db('brand_locations_unavailable_menu_items')
        .del()
        .where('menu_item_id', menuItemId);
    } else if (status == menuItemStatus.INACTIVE) {
      let brandLocationIds = await this.context.brandLocation
        .selectFields(['id'])
        .where('brand_id', brandId);
      brandLocationIds = brandLocationIds.map(row => row.id);

      /* Delete if there is any data against these brandlocations and menuItemId*/
      await this.db.table('brand_locations_unavailable_menu_items')
        .del()
        .andWhere('menu_item_id', menuItemId);

      /* Insert menuItemId for all branches to make it NOT_COMMERCIALIZED*/
      const valuesTobeInserted = brandLocationIds.map(id => {
        return {
          brand_location_id: id,
          menu_item_id: menuItemId,
          state: menuItemUnavailableState.NOT_COMMERCIALIZED,
          created_at: moment(now.get())
        };
      });
      const chunkSize = 300;
      await this.db.transaction(async trx => {
        await trx.batchInsert('brand_locations_unavailable_menu_items', valuesTobeInserted, chunkSize);
      });
    }
  }

  async setMenuItemStasusForBrandLocation(brandLocationId, menu) {
    const sections = await this.context.menuSection.getByMenuId(menu.id);
    const inactiveItemIds = [];
    const unavailableItemsTableName = 'brand_locations_unavailable_menu_items';
    await Promise.all(sections.map(async section => {
      const menuItems = await this.getByMenuSection(section.id);
      menuItems.map(menuItem => {
        if (section.status == menuItemStatus.INACTIVE || menuItem.status == menuItemStatus.INACTIVE) {
          inactiveItemIds.push(menuItem.id);
        }
      });
    }));
    if (inactiveItemIds.length > 0) {
      const valuesTobeInserted = inactiveItemIds.map(menuItemId => {
        return {
          brandLocationId,
          menuItemId,
          state: menuItemUnavailableState.NOT_COMMERCIALIZED,
          created_at: moment(now.get())
        };
      });

      const chunkSize = 300;
      await this.db.transaction(async trx => {
        await trx.batchInsert(unavailableItemsTableName, valuesTobeInserted, chunkSize);
      });
    }
  }
}

module.exports = MenuItem;
