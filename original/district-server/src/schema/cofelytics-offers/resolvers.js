const {
  TargetCustomerGroupError,
} = require('./enums');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

module.exports = {
  CofelyticsTargetCustomerGroupInputPayload: {
    customerCount(
      { customerCount},
      args,
      context
    ) {
      if (customerCount) return customerCount < 10 ? customerCount + 2 : Math.ceil(customerCount * 1.1);
      return null;
    },
  },
  Offer: {
    async emailTitle(
      {emailInfo},
      args,
      context
    ) {
      if (emailInfo) {
        return {ar: emailInfo.arTitle, en: emailInfo.enTitle};
      } return null;

    },
    async emailText(
      { emailInfo},
      args,
      context
    ) {
      if (emailInfo) {
        return {ar: emailInfo.arText, en: emailInfo.enText};
      } return null;
    },
    async pushTitle(
      { pushInfo},
      args,
      context
    ) {
      if (pushInfo) {
        return {ar: pushInfo.arTitle, en: pushInfo.enTitle};
      } return null;
    },
    async pushText(
      {pushInfo},
      args,
      context
    ) {
      if (pushInfo) {
        return {ar: pushInfo.arText, en: pushInfo.enText};
      } return null;
    },
    async branchList(
      {requestData},
      args,
      context
    ) {
      return requestData.targetBranchIds;
    },
    async tiersList(
      {requestData},
      args,
      context
    ) {
      if (requestData.targetCustomerRewardTiers) return requestData.targetCustomerRewardTiers;
      return null;
    },
    async targetAllReward(
      {requestData},
      args,
      context
    ) {
      if (requestData.targetCustomerRewardTiers) return requestData.targetAllReward;
      return null;
    },
    async customerOrderRange(
      {requestData},
      args,
      context
    ) {
      if (requestData.targetCustomerOrderRange) return requestData.targetCustomerOrderRange;
      return null;
    },
    async customerDateRange(
      {requestData},
      args,
      context
    ) {
      if (requestData.targetCustomerDateRange) return requestData.targetCustomerDateRange;
      return null;
    },
  },
  Mutation: {
    async saveTargetExistingCustomerGroup(_, {targetInfo, offerInfo}, context) {
      const { brandAdminList } = context.auth.brandAdminInfo;
      if (context.auth.isVendorAdmin && brandAdminList.includes(targetInfo.brandId)) {
        try {
          const response = await context.cofelyticsOffers.saveExistingCustomerCofelytics(targetInfo, offerInfo);
          /*
          const response = await context.withTransaction(
            'cofelyticsOffers',
            'saveExistingCustomerCofelytics',
            targetInfo,
            offerInfo
          );
          */
          if (response.status) await context.cofelyticsOffers.generateCofelyticsOfferMail(response.id, targetInfo.targetAllBranch);
          return response;
        } catch (error) {
          const errors = [TargetCustomerGroupError.TRANSACTIONAL_ERROR];
          await SlackWebHookManager.sendTextAndObjectToSlack('Can not generating cofelytics data!', {...targetInfo, ...offerInfo});
          return {status: false, error: errors[0], errors};
        }
      } else return {status: false, error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async saveTargetNewCustomerGroup(_, {brandId, offerInfo}, context) {
      const { brandAdminList } = context.auth.brandAdminInfo;
      if (context.auth.isVendorAdmin && brandAdminList.includes(brandId)) {
        try {
          const response = await context.cofelyticsOffers.saveNewCustomerCofelytics(brandId, offerInfo);
          if (response.status) await context.cofelyticsOffers.generateCofelyticsOfferMail(response.id, true);
          return response;
        } catch (error) {
          const errors = [TargetCustomerGroupError.TRANSACTIONAL_ERROR];
          await SlackWebHookManager.sendTextAndObjectToSlack('Can not generating cofelytics data!', {...brandId, ...offerInfo});
          return {status: false, error: errors[0], errors};
        }
      } else return {status: false, error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async saveCofelyticsRequest(_, {brandId}, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (context.auth.isVendorAdmin && auth.isBrandAdmin(brandId)) {
        const response = await context.cofelyticsOffers.saveCofelyticsRequest(brandId, admin.email);
        if (response.status) await context.cofelyticsOffers.generateCofelyticsRequestMail(response.id);
        return response;
      } else return {status: false, error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async updateRequestStatus(_, {id, status}, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        return context.cofelyticsOffers.saveRequestStatus(id, status);
      }
      return {status: false, error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    }
  },
  Query: {
    calculateTargetExistingCustomerGroup(_, { targetInfo }, context) {
      const { brandAdminList } = context.auth.brandAdminInfo;
      if (context.auth.isVendorAdmin && brandAdminList.includes(targetInfo.brandId)) {
        return context.cofelyticsOffers.calculateTargetExistingCustomerGroup(targetInfo);
      } else return { error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    calculateTargetNewCustomerGroup(_, { brandId }, context) {
      const { brandAdminList } = context.auth.brandAdminInfo;
      if (context.auth.isVendorAdmin && brandAdminList.includes(brandId)) {
        return context.cofelyticsOffers.calculateTargetNewCustomerGroup(brandId);
      } else return {error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getOffersByBrandId(_, { brandId }, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let hasPermission = false;
      if (admin) {
        const { brandAdminList } = context.auth.brandAdminInfo;
        if (!context.auth.isVendorAdmin) {
          hasPermission = true;
        } else if (brandAdminList.includes(brandId)) {
          hasPermission = true;
        }
      }
      if (hasPermission) {
        return await context.cofelyticsOffers.getOffersByBrandId(brandId);
      } else return {error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getOfferById(_, { brandId, offerId }, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let hasPermission = false;
      if (admin) {
        const { brandAdminList } = context.auth.brandAdminInfo;
        if (!context.auth.isVendorAdmin) {
          hasPermission = true;
        } else if (brandAdminList.includes(brandId)) {
          hasPermission = true;
        }
      }
      if (hasPermission) {
        const offer = await context.cofelyticsOffers.getById(offerId);
        if (offer && offer.brandId === brandId) {
          return offer;
        }
      }
      return {error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getRequestList(_, { countryId, status }, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        return context.cofelyticsOffers.getRequestList(countryId, status);
      }
      return {error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getCofelyticsRequestStatus(_, { brandId }, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let hasPermission = false;
      if (admin && context.auth.isVendorAdmin) {
        hasPermission = context.auth.isBrandAdmin(brandId);
      }
      if (hasPermission) {
        return await context.cofelyticsOffers.getCofelyticsRequestStatusByBrandId(brandId);
      }
      return {error: TargetCustomerGroupError.UNAUTHORIZED_PROCESS, errors: [TargetCustomerGroupError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
  },
};
