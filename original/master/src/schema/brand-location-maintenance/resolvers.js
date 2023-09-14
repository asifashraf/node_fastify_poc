const {
  MaintenanceError,
} = require('./enums');
const {
  transformToCamelCase
} = require('../../lib/util');
// const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

module.exports = {
  Ticket: {
    assessment({ assessmentId }, args, context) {
      return context.brandLocationMaintenance.loaders.assessment.load(assessmentId);
    }
  },
  Mutation: {
    async saveMaintenanceRequest(_, {brandId, brandLocationId}, context) {
      let hasPermission = false;
      if (context.auth.isVendorAdmin) {
        if (brandId) {
          hasPermission = context.auth.isBrandAdmin(brandId);
        } else if (brandLocationId) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            brandId = brandLocation.brandId;
          }
        }
      }
      if (hasPermission) {
        try {
          const response = await context.brandLocationMaintenance.saveMaintenanceRequest(brandId, brandLocationId);
          return response;
        } catch (error) {
          const errors = [MaintenanceError.TRANSACTIONAL_ERROR];
          return {status: false, error: errors[0], errors};
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async saveMaintenanceUser(_, {userInput}, context) {
      //return await context.brandLocationMaintenance.checkAndSaveMaintenanceUser(userInput);
      const { branchAdminList } = context.auth.brandAdminInfo;
      if (context.auth.isVendorAdmin && branchAdminList.includes(userInput.brandLocationId)) {
        try {
          const response = await context.brandLocationMaintenance.checkAndSaveMaintenanceUser(userInput);
          return response;
        } catch (error) {
          const errors = [MaintenanceError.TRANSACTIONAL_ERROR];
          return {status: false, error: errors[0], errors};
        }
      } else return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async saveMaintenanceAssessment(_, {assessmentInput}, context) {
      const { branchAdminList } = context.auth.brandAdminInfo;
      if (context.auth.isVendorAdmin && branchAdminList.includes(assessmentInput.brandLocationId)) {
        try {
          const response = await context.brandLocationMaintenance.checkAndSaveAssessment(assessmentInput);
          return response;
        } catch (error) {
          const errors = [MaintenanceError.TRANSACTIONAL_ERROR];
          return {status: false, error: errors[0], errors};
        }
      } else return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async saveAssessmentTicket(_, {ticketInput}, context) {
      const { branchAdminList } = context.auth.brandAdminInfo;
      if (context.auth.isVendorAdmin && branchAdminList.includes(ticketInput.brandLocationId)) {
        try {
          const response = await context.brandLocationMaintenance.checkAndSaveTicket(ticketInput);
          return response;
        } catch (error) {
          const errors = [MaintenanceError.TRANSACTIONAL_ERROR];
          return {status: false, error: errors[0], errors};
        }
      } else return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    }

  },
  Query: {
    async getMaintenanceRequestList(_, {countryId, status}, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        try {
          const requestList = await context.brandLocationMaintenance.getMaintenanceRequestList(countryId, status);
          return {
            status: true,
            requestList
          };
        } catch (error) {
          return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getBrandMaintenanceStatus(_, { brandId, brandLocationId }, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let hasPermission = false;
      if (admin) {
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBrandAdmin(brandId);
          if (!hasPermission && brandLocationId && context.auth.isBranchAdmin(brandLocationId)) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            hasPermission = brandId === brandLocation.brandId;
          }
        } else hasPermission = true;
        if (hasPermission) {
          return await context.brandLocationMaintenance.getMaintenanceStatus(brandId, brandLocationId);
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getMaintenanceUser(_, { brandLocationId }, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let hasPermission = false;
      if (admin) {
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            hasPermission = context.auth.isBrandAdmin(brandLocation.brandId);
          }
        } else hasPermission = true;
        if (hasPermission) {
          const user = await context.brandLocationMaintenance.getUserByBrandLocationId(brandLocationId);
          if (user) {
            return {status: true, user};
          }
          return {status: false, error: MaintenanceError.USER_NOT_REGISTERED, errors: [MaintenanceError.USER_NOT_REGISTERED] };
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getAreaList(_, args, context) {
      const areaList = await context.brandLocationMaintenance.getAreaList();
      if (Array.isArray(areaList)) {
        return {
          status: true,
          areaList: transformToCamelCase(areaList)
        };
      } else return {
        status: false,
        error: MaintenanceError.AREA_LIST_ERROR,
        errors: [MaintenanceError.AREA_LIST_ERROR],
      };
    },
    async getAvailableSubServiceList(_, {brandLocationId}, context) {
      return await context.brandLocationMaintenance.getAvailableSubServicesByBrandLocationId(brandLocationId);
    },
    async getAssessmentListByBrandLocationId(_, {brandLocationId}, context) {
      // return await context.brandLocationMaintenance.getAssessmentListByBrandLocationId(brandLocationId);
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin && context.auth.isVendorAdmin) {
        try {
          let hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            hasPermission = context.auth.isBrandAdmin(brandLocation.brandId);
          }
          if (hasPermission) return await context.brandLocationMaintenance.getAssessmentListByBrandLocationId(brandLocationId);
        } catch (error) {
          return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getAssessmentList(_, {countryId, status}, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        try {
          return await context.brandLocationMaintenance.getAssessmentList(countryId, status);
        } catch (error) {
          return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getTicketListByAssessmentId(_, {assessmentId}, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin && context.auth.isVendorAdmin) {
        try {
          const {brandId, brandLocationId } = await context.brandLocationMaintenance.getBrandIdAndBranchIdByAssessmentId(assessmentId);
          let hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            hasPermission = context.auth.isBrandAdmin(brandId);
          }
          if (hasPermission) return await context.brandLocationMaintenance.getTicketListByAssessmentId(assessmentId);
        } catch (error) {
          return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getTicketList(_, {countryId, brandId, brandLocationId, assessmentId}, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let hasPermission = false;
      if (admin) {
        if (context.auth.isVendorAdmin) {
          countryId = null;
          brandId = null;
          assessmentId = null;
          hasPermission = brandLocationId ? context.auth.isBranchAdmin(brandLocationId) : false;
        } else hasPermission = true;
        if (hasPermission) {
          try {
            return await context.brandLocationMaintenance.getTicketList({countryId, brandId, brandLocationId, assessmentId});
          } catch (error) {
            return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
          }
        }

      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async getBranchAddressInfo(_, { brandLocationId}, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin && context.auth.isVendorAdmin && context.auth.isBranchAdmin(brandLocationId)) {
        try {
          return await context.brandLocationMaintenance.getBranchAddressInfo(brandLocationId);
        } catch (error) {
          return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
        }
      }
      return {status: false, error: MaintenanceError.UNAUTHORIZED_PROCESS, errors: [MaintenanceError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    }
  },
};
