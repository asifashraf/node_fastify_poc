exports.homePageSectionItemTypeEnum = {
  SEARCH_ITEM: 'SEARCH_ITEM',
  REORDER_ITEM: 'REORDER_ITEM',
  ORDER_TRACKING_ITEM: 'ORDER_TRACKING_ITEM',
  CAROUSEL_ITEM: 'CAROUSEL_ITEM',
  ICON_BUTTON_ITEM: 'ICON_BUTTON_ITEM',
  CARD_LIST_ITEM: 'CARD_LIST_ITEM',
  SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM: 'SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM',
  BRAND_HORIZONTAL_CARD_LIST_ITEM: 'BRAND_HORIZONTAL_CARD_LIST_ITEM',
  BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM: 'BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM',
  EXPRESS_DELIVERY_HORIZONTAL_CARD_LIST_ITEM: 'EXPRESS_DELIVERY_HORIZONTAL_CARD_LIST_ITEM',
};

exports.saveSectionErrorEnum = {
  NOT_EXIST: 'NOT_EXIST',
  MISSING_ARGUMENT: 'MISSING_ARGUMENT',
  ALREADY_EXIST_ITEM_TYPE_AND_REF_QUERY_ID: 'ALREADY_EXIST_ITEM_TYPE_AND_REF_QUERY_ID',
  SORT_ORDER_EXIST: 'SORT_ORDER_EXIST',
  ALREADY_EXIST_ITEM_TYPE_AND_REF_QUERY_ID_AND_COUNTRY_ID: 'ALREADY_EXIST_ITEM_TYPE_AND_REF_QUERY_ID_AND_COUNTRY_ID',
  SECTION_ITEM_TYPE_CAN_NOT_CHANGE: 'SECTION_ITEM_TYPE_CAN_NOT_CHANGE',
  ONLY_ALLOWED_ONE_ACTIVE_PAGINATED_SECTION: 'ONLY_ALLOWED_ONE_ACTIVE_PAGINATED_SECTION',
  CARD_LIST_ITEM_ONLY_CAN_BE_PAGINATED: 'CARD_LIST_ITEM_ONLY_CAN_BE_PAGINATED',
  SECTION_COUNTRY_CAN_NOT_CHANGE: 'SECTION_COUNTRY_CAN_NOT_CHANGE',
  SECTION_CAN_NOT_CREATE_WITH_DELETED_STATUS: 'SECTION_CAN_NOT_CREATE_WITH_DELETED_STATUS',
  DELETED_SECTION_CAN_NOT_BE_UPDATE: 'DELETED_SECTION_CAN_NOT_BE_UPDATE',
  INVALID_SECTION_ID: 'INVALID_SECTION_ID',
  MISSING_SECTION_ID: 'MISSING_SECTION_ID',
  PAGINATED_SECTION_MUST_BE_END_OF_LIST: 'PAGINATED_SECTION_MUST_BE_END_OF_LIST',
  PER_PAGE_SHOULD_BE_BIGGER_THAN_ZERO: 'PER_PAGE_SHOULD_BE_BIGGER_THAN_ZERO',
  UNAUTHORIZED_ADMIN: 'UNAUTHORIZED_ADMIN',
  TRANSACTIONAL_ERROR: 'TRANSACTIONAL_ERROR',
};


exports.saveSectionTypeEnum = {
  SECTION: 'SECTION',
  SECTION_SETTING: 'SECTION_SETTING'
};

exports.homePageSectionStatusEnum = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DELETED: 'DELETED',
};