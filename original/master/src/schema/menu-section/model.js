const BaseModel = require('../../base-model');
const { uniq, flatten, first, map, filter, head } = require('lodash');
const Promise = require('bluebird');
const { appendSortOrderToList } = require('../../lib/util');
const { brandMenuSectionError } = require('../root/enums');
const { invalidateMenu } = require('../c-menu/utils');
const { createLoaders } = require('./loaders');

class MenuSection extends BaseModel {
  constructor(db, context) {
    super(db, 'menu_sections', context);
    this.loaders = createLoaders(this);
  }

  getByMenu(menuId) {
    return this.db(this.tableName)
      .where('menu_id', menuId)
      .orderBy('sort_order', 'ASC');
  }

  async validate(menuSections) {
    const context = this.context;
    const validateMenuSection = async menuSection => {
      const errors = [];
      const validMenu = await context.menu.isValid({ id: menuSection.menuId });

      if (!validMenu) {
        return errors.push(brandMenuSectionError.INVALID_MENU);
      }

      const nameCheckObj = await this.db(this.tableName)
        .where('menu_id', menuSection.menuId)
        .andWhere('name', 'ILIKE', menuSection.name)
        .then(first);

      if (
        nameCheckObj !== undefined &&
        nameCheckObj !== null &&
        nameCheckObj.id !== menuSection.id
      ) {
        errors.push(brandMenuSectionError.DUPLICATE_NAME);
      }

      return errors;
    };

    return uniq(
      flatten(await Promise.all(map(menuSections, validateMenuSection)))
    );
  }

  async validateMenuSectionDelete(menuSectionId) {
    const context = this.context;
    const validateMenuSection = async menuSectionId => {
      const errors = [];
      const sectionHaveItems = await context.menuItem.getByMenuSection(
        menuSectionId
      );

      if (sectionHaveItems.length > 0) {
        errors.push(brandMenuSectionError.HAVE_ITEMS);
      }

      return errors;
    };

    return uniq(
      flatten(await Promise.all(map([menuSectionId], validateMenuSection)))
    );
  }

  async save(menuSections) {
    const { menuId } = menuSections[0];
    await invalidateMenu(menuId);
    return super.save(
      appendSortOrderToList(menuSections, 'menuId', 'sortOrder')
    );
  }

  async saveWithProvidedSortOrder(menuSections) {
    const { menuId } = menuSections[0];
    await invalidateMenu(menuId);
    return super.save(menuSections);
  }

  getByMenuId(menuId) {
    return this.db(this.tableName)
      .where('menu_id', menuId)
      .orderBy('sort_order', 'ASC');
  }

  async deleteMenuSection(menuSectionId) {
    const deleteSection = async menuSection => {
      await super.save(menuSection);
      return menuSection;
    };
    const menuSection = await this.getById(menuSectionId);
    if (menuSection) {
      const menuId = menuSection.menuId;
      const menuSections = map(await this.getByMenuId(menuId), mi => {
        if (mi.id === menuSectionId) {
          mi.deleted = true;
        }
        return mi;
      });

      filter(
        await Promise.mapSeries(
          appendSortOrderToList(menuSections, 'menuId', 'sortOrder'),
          deleteSection
        ),
        item => !item.deleted
      );

      await invalidateMenu(menuId);
    }
    return true;
  }

  async sortMenuSections(menuSections) {
    const sortSection = async menuSection => {
      await super.save(menuSection);
      return menuSection;
    };
    if (menuSections.length > 0) {
      const firstMenuSectionId = head(menuSections);
      const firstMenuSection = await this.getById(firstMenuSectionId.id);
      if (firstMenuSection) {
        const menuId = firstMenuSection.menuId;

        menuSections = map(menuSections, mi => {
          mi.menuId = menuId;
          return mi;
        });

        await Promise.mapSeries(
          appendSortOrderToList(menuSections, 'menuId', 'sortOrder'),
          sortSection
        );

        await invalidateMenu(menuId);
      }
    }

    return true;
  }
  async getMenuByMenuSectionId(menuSectionId) {
    const menuSection = await this.getById(menuSectionId);
    return [menuSection.menuId];
  }


}

module.exports = MenuSection;
