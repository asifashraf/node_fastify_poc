const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { first, isEmpty, find, filter } = require('lodash');
const {
  MaintenanceError,
  MaintenanceRequestStatus,
  MaintenanceUserStatus,
  MaintenanceAssessmentStatus
} = require('./enums');
const {
  transformToCamelCase, uuid, addLocalizationField, transformToSnakeCase, objTransformToCamelCase
} = require('../../lib/util');
/*
TODO: After IOS fixing, enabled it
const {
  countryConfigurationKeys,
} = require('../root/enums');
*/
const {
  maintenance: {
    tasleehUrl,
    tasleehApiKey
  }
} = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

const Axios = require('axios');
const axios = Axios.create({
  baseURL: tasleehUrl,
  timeout: 60000,
  headers: {
    'content-type': 'application/json',
    'x-api-key': tasleehApiKey,
  },
});

const {
  kinesisEventTypes: { tasleehMaintenanceError },
} = require('../../lib/aws-kinesis-logging');

const SERVICE_LIST = ['Plumbing', 'Electrical', 'Air Conditioning'];

class BrandLocationMaintenance extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_maintenances', context);
    this.loaders = createLoaders(this);
  }

  async getMaintenanceStatus(brandId, brandLocationId) {
    const brand = await this.context.brand.getById(brandId);
    if (brand) {
      const countryStatus = (brand.countryId == '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179');
      /*
      TODO: After IOS fixing, enabled it
      const countryConfig = await this.context.countryConfiguration.getByKey(
        countryConfigurationKeys.MAINTENANCE_ENABLED,
        brand.countryId
      );
      let countryStatus = false;
      if (countryConfig && countryConfig.configurationValue === 'true') {
        countryStatus = true;
      }
      */
      const query = this.roDb('maintenance_request')
        .count('id')
        .where('brand_id', brandId);
      if (brandLocationId) {
        query.where('brand_location_id', brandLocationId);
      } else {
        query.whereNull('brand_location_id');
      }
      const count = first(await query);
      const requestStatus = count.count > 0;
      return {status: true, brandStatus: brand.maintenance, countryStatus, requestStatus };
    } else return {status: false, error: MaintenanceError.INVALID_BRAND, errors: [MaintenanceError.INVALID_BRAND]};
  }

  // Maintenance Request Part
  async validateMaintenanceRequest(brandId, brandLocationId) {
    const errors = [];
    const brand = await this.context.brand.getById(brandId);
    if (brand) {
      if (brand.maintenance) {
        errors.push(MaintenanceError.ALREADY_ENABLE);
      } else {
        const countryStatus = (brand.countryId == '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179');
        /*
        TODO: After IOS fixing, enabled it
        const countryConfig = await this.context.countryConfiguration.getByKey(
          countryConfigurationKeys.MAINTENANCE_ENABLED,
          brand.countryId
        );
        if (!countryConfig || (countryConfig && countryConfig.configurationValue === 'false')) {
          errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_COUNTRY);
        }
        */
        if (!countryStatus) {
          errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_COUNTRY);
        } else {
          const query = this.roDb('maintenance_request')
            .count('id')
            .where('brand_id', brandId);
          if (brandLocationId) {
            query.where('brand_location_id', brandLocationId);
          } else {
            query.whereNull('brand_location_id');
          }
          const count = first(await query);
          if (count.count > 0) {
            errors.push(MaintenanceError.MAINTENANCE_REQUEST_ALREADY_EXIST);
          }
        }
      }
    } else {
      errors.push(MaintenanceError.INVALID_BRAND);
    }
    return errors;
  }

  async saveMaintenanceRequest(brandId, brandLocationId) {
    const maintenanceRequestErrors = await this.validateMaintenanceRequest(brandId, brandLocationId);
    if (maintenanceRequestErrors.length > 0) return {status: false, error: maintenanceRequestErrors[0], errors: maintenanceRequestErrors};
    await this.db('maintenance_request')
      .insert({
        id: uuid.get(),
        brandId,
        brandLocationId,
        status: MaintenanceRequestStatus.REQUESTED
      });
    return {status: true};
  }

  async getMaintenanceRequestList(countryId, status) {
    const select = `mr.*, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr,
       bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr`;
    const query = this.db('maintenance_request as mr')
      .select(this.db.raw(select))
      .leftJoin('brands as b', 'b.id', 'mr.brand_id')
      .leftJoin('brand_locations as bl', 'bl.id', 'mr.brand_location_id')
      .orderBy('created', 'desc');
    if (countryId) {
      query.where('b.country_id', countryId);
    }
    if (status) {
      query.where('mr.status', status);
    }
    const maintenanceRequestList = await query;
    return addLocalizationField((addLocalizationField(maintenanceRequestList, 'brandName')), 'brandLocationName');
  }

  // Maintenance User Part
  async validateMaintenanceUser(brandLocationId) {
    const errors = [];
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);
    if (brandLocation) {
      const brand = await this.context.brand.getById(brandLocation.brandId);
      if (brand) {
        if (brand.maintenance) {
          const countryStatus = (brand.countryId == '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179');
          /*
          TODO: After IOS fixing, enabled it
          const countryConfig = await this.context.countryConfiguration.getByKey(
            countryConfigurationKeys.MAINTENANCE_ENABLED,
            brand.countryId
          );
          if (!countryConfig || (countryConfig && countryConfig.configurationValue === 'false')) {
            errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_COUNTRY);
          }
          */
          if (!countryStatus) {
            errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_COUNTRY);
          }
          try {
            const contact = find(brandLocation.contact, a => a.isPrimary === true);
            if (typeof contact === 'undefined') {
              errors.push(MaintenanceError.INVALID_BRAND_LOCATION_PHONE);
            } else if (isNaN(parseInt(contact.phone))) {
              errors.push(MaintenanceError.INVALID_BRAND_LOCATION_PHONE);
            }
          } catch (error) {
            errors.push(MaintenanceError.INVALID_BRAND_LOCATION_PHONE);
          }

          try {
            const admins = await this.context.brandAdmin.getByBrandAndBrandLocationId(brand.id, brandLocation.id);
            let validEmail = false;
            if (admins && admins?.length > 0) {
              const admin = await this.context.admin.getById(admins[0].adminId);
              validEmail = admin && admin.email;
            }
            if (!validEmail) errors.push(MaintenanceError.INVALID_BRAND_LOCATION_EMAIL);
          } catch (error) {
            errors.push(MaintenanceError.INVALID_BRAND_LOCATION_EMAIL);
          }
          /*
          try {
            const phone = brandLocation.phone?.trim();
            if (isNaN(parseInt(phone))) {
              errors.push(MaintenanceError.INVALID_BRAND_LOCATION_PHONE);
            }
          } catch (error) {
            errors.push(MaintenanceError.INVALID_BRAND_LOCATION_PHONE);
          }

          try {
            const emails = JSON.parse(brandLocation.email);
            let validEmail = false;
            if (emails && !isEmpty(emails)) {
              if (!Array.isArray(emails)) {
                validEmail = 'email' in emails;
              } else if (emails.length > 0) {
                validEmail = 'email' in emails[0];
              }
            }
            if (!validEmail) errors.push(MaintenanceError.INVALID_BRAND_LOCATION_EMAIL);
          } catch (error) {
            errors.push(MaintenanceError.INVALID_BRAND_LOCATION_EMAIL);
          }
          */
        } else errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_BRAND);
      } else errors.push(MaintenanceError.INVALID_BRAND);
    } else errors.push(MaintenanceError.INVALID_BRAND_LOCATION);
    return errors;
  }

  async checkAndSaveMaintenanceUser(userInput) {
    const user = await this.getUserByBrandLocationId(userInput.brandLocationId);
    if (user) {
      const maintenanceUser = await this.getTasleehUser(user.externalUserId);
      if (maintenanceUser) {
        const userStatus = await this.getTasleehUserStatus(user.externalUserId);
        if (user.status === MaintenanceUserStatus.INIT) {
          this.save({
            id: user.id,
            companyId: maintenanceUser.company_id,
            userId: maintenanceUser.id,
            status: userStatus.status_code === 2 ? MaintenanceUserStatus.REGISTERED : MaintenanceUserStatus.BLOCKED
          });
        } else if ((user.status === MaintenanceUserStatus.REGISTERED && userStatus.status_code === 0) ||
          (user.status === MaintenanceUserStatus.BLOCKED && userStatus.status_code === 2)) {
          this.save({
            id: user.id,
            status: userStatus.status_code === 2 ? MaintenanceUserStatus.REGISTERED : MaintenanceUserStatus.BLOCKED
          });
        }
        return {status: true, user: await this.getById(user.id)};
      } else {
        return await this.createMaintenanceUser(user.id);
      }
    } else {
      const maintenanceUserErrors = await this.validateMaintenanceUser(userInput.brandLocationId);
      if (maintenanceUserErrors.length > 0) return {status: false, error: maintenanceUserErrors[0], errors: maintenanceUserErrors};
      const brandLocation = await this.context.brandLocation.getById(userInput.brandLocationId);
      const admins = await this.context.brandAdmin.getByBrandAndBrandLocationId(brandLocation.brandId, brandLocation.id);
      const admin = await this.context.admin.getById(admins[0].adminId);
      const addressInfo = Object.assign({}, userInput);
      delete addressInfo['brandLocationId'];
      const contact = find(brandLocation.contact, a => a.isPrimary === true);
      const requestedUserId = await this.save({
        brandLocationId: userInput.brandLocationId,
        name: brandLocation.name,
        email: admin.email,
        phoneNumber: contact.phone,
        status: MaintenanceUserStatus.INIT,
        addressInfo: transformToSnakeCase(addressInfo)
      });
      if (!requestedUserId) {
        // add kinesis log, requested id is null
        //console.log('Branch can not inserted to Maintenance table with INIT status');
        return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
      }
      return await this.createMaintenanceUser(requestedUserId);
    }
  }

  async createMaintenanceUser(maintenanceUserId) {
    const requestedUser = await this.getById(maintenanceUserId);
    const user = {
      user_id: parseInt(requestedUser.externalUserId),
      name: requestedUser.name,
      email: requestedUser.email,
      phone: requestedUser.phoneNumber,
    };
    const data = await this.createTasleehUser(user);
    if (data) {
      try {
        await this.save({
          id: maintenanceUserId,
          companyId: data.user.company_id,
          userId: data.user.id,
          status: MaintenanceUserStatus.REGISTERED
        });
        return {status: true, user: await this.getById(maintenanceUserId)};
      } catch (error) {
        await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] User created but User status can not updated with REGISTERED.', {maintenanceUserId});
        //Add Kinesis log user created but can not updated Registered
        return {status: true, user: await this.getById(maintenanceUserId)};
      }
    } else {
      return {status: false, error: MaintenanceError.BRAND_LOCATION_NOT_REGISTERED, errors: [MaintenanceError.BRAND_LOCATION_NOT_REGISTERED]};
    }
  }

  async getBranchAddressInfo(brandLocationId) {
    const user = await this.getUserByBrandLocationId(brandLocationId);
    if (user) {
      const addressInfo = objTransformToCamelCase(user.addressInfo);
      addressInfo.phoneNumber = user.phoneNumber;
      return addressInfo;
    } else {
      const brandLocation = await this.context.brandLocation.getById(brandLocationId);
      if (brandLocation) {
        const contact = find(brandLocation.contact, a => a.isPrimary === true);
        return { street: brandLocation.street, phoneNumber: typeof contact === 'undefined' ? null : contact.phone};
      } else null;
    }
  }
  // Assessment Part
  async validateAssessment(assessmentInput) {
    const errors = [];
    const brandLocation = await this.context.brandLocation.getById(assessmentInput.brandLocationId);
    if (brandLocation) {
      if (!brandLocation.longitude || !brandLocation.latitude) {
        errors.push(MaintenanceError.MISSING_BRAND_LOCATION_LONGITUDE_LATITUDE);
      }
      const brand = await this.context.brand.getById(brandLocation.brandId);
      if (brand) {
        if (!brand.maintenance) {
          errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_BRAND);
        }
        const countryStatus = (brand.countryId == '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179');
        /*
        TODO: After IOS fixing, enabled it
        const countryConfig = await this.context.countryConfiguration.getByKey(
          countryConfigurationKeys.MAINTENANCE_ENABLED,
          brand.countryId
        );
        if (!countryConfig || (countryConfig && countryConfig.configurationValue === 'false')) {
          errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_COUNTRY);
        }
        */
        if (!countryStatus) {
          errors.push(MaintenanceError.DISABLE_MAINTENANCE_FOR_COUNTRY);
        }
        const user = await this.getUserByBrandLocationId(assessmentInput.brandLocationId);
        if (user && user.status === MaintenanceUserStatus.REGISTERED) {
          const availableSubServiceList = await this.getTasleehAvailableSubServices(user.externalUserId);
          if (Array.isArray(availableSubServiceList)) {
            const subService = find(availableSubServiceList, ['sub_service_id', assessmentInput.subServiceId.toString()]);
            if (typeof subService === 'undefined') {
              errors.push(MaintenanceError.INVALID_SUB_SERVICE);
            }
          } else {
            errors.push(MaintenanceError.AVAILABLE_SUB_SERVICE_LIST_ERROR);
          }
          const areaList = await this.getAreaList();
          if (Array.isArray(areaList)) {
            const area = find(areaList, ['area_id', assessmentInput.areaId.toString()]);
            if (typeof area === 'undefined') {
              errors.push(MaintenanceError.INVALID_AREA);
            }
          } else {
            errors.push(MaintenanceError.AREA_LIST_ERROR);
          }
        } else errors.push(MaintenanceError.USER_NOT_REGISTERED);
      } else errors.push(MaintenanceError.INVALID_BRAND);
    } else errors.push(MaintenanceError.INVALID_BRAND_LOCATION);
    return errors;
  }

  async checkAndSaveAssessment(assessmentInput) {
    const maintenanceAssessmentErrors = await this.validateAssessment(assessmentInput);
    if (maintenanceAssessmentErrors.length > 0) return {status: false, error: maintenanceAssessmentErrors[0], errors: maintenanceAssessmentErrors};
    const user = await this.getUserByBrandLocationId(assessmentInput.brandLocationId);
    const {longitude, latitude} = await this.context.brandLocationAddress.getByBrandLocation(assessmentInput.brandLocationId);
    const availableSubService = await this.getTasleehAvailableSubServices(user.externalUserId);
    const subService = find(availableSubService, ['sub_service_id', assessmentInput.subServiceId.toString()]);
    const areaList = await this.getAreaList();
    const area = find(areaList, ['area_id', assessmentInput.areaId.toString()]);
    const id = uuid.get();
    const maintenanceInitAssessment = {
      id,
      maintenanceId: user.id,
      subService,
      area,
      block: assessmentInput.block,
      street: assessmentInput.street,
      avenue: assessmentInput.avenue,
      buildingNumber: assessmentInput.buildingNumber,
      phoneNumber: assessmentInput.phoneNumber,
      status: MaintenanceAssessmentStatus.INIT
    };
    try {
      await this.db('maintenance_assessments')
        .insert(maintenanceInitAssessment);
      const assessmentInfo = {
        user_id: parseInt(user.externalUserId),
        sub_service_id: assessmentInput.subServiceId,
        area_id: assessmentInput.areaId,
        block: assessmentInput.block,
        street: assessmentInput.street,
        avenue: assessmentInput.avenue,
        building_number: assessmentInput.buildingNumber,
        phone: assessmentInput.phoneNumber,
        longitude,
        latitude
      };
      const assessment = await this.createAssessment(assessmentInfo);
      if (assessment) {
        const maintenanceUpdateAssessment = {
          assessment_id: assessment.id,
          assessment_code: assessment.code,
          status: MaintenanceAssessmentStatus.REQUESTED
        };
        await this.db('maintenance_assessments')
          .where('id', id)
          .update(maintenanceUpdateAssessment);
        return {status: true, assessmentId: assessment.id, assessmentCode: assessment.code};
      } else {
        return {status: false, error: MaintenanceError.ASSESSMENT_GENERATE_ERROR, errors: [MaintenanceError.ASSESSMENT_GENERATE_ERROR]};
      }
    } catch (error) {
      return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
    }
  }

  async getAssessmentByMaintenanceIdAndSubServiceId(maintenanceId, subServiceId) {
    return await this.db('maintenance_assessments')
      .select('*')
      .where('maintenanceId', maintenanceId)
      .where('subServiceId', subServiceId);
  }

  async getAssessmentListByBrandLocationId(brandLocationId) {
    try {
      const user = await this.getUserByBrandLocationId(brandLocationId);
      if (user) {
        const assessmentList = await this.roDb('maintenance_assessments as ma')
          .select('ma.*', 'blm.brand_location_id')
          .leftJoin('brand_location_maintenances as blm', 'blm.id', 'ma.maintenance_id')
          .where('blm.brand_location_id', brandLocationId);
        const requestedList = filter(assessmentList, { 'status': MaintenanceAssessmentStatus.REQUESTED });
        const promises = [];
        if (requestedList.length > 0) {
          const contracts = await this.getTasleehUserContracts(user.externalUserId);
          if (contracts && contracts.length > 0) {
            assessmentList.map(assessment => {
              const contract = find(contracts, ['contract_id', assessment.assessmentId.toString()]);
              if (typeof contract !== 'undefined') {
                assessment.status = MaintenanceAssessmentStatus.ACTIVE;
                const maintenanceUpdateAssessment = {
                  contract_code: contract.code,
                  status: MaintenanceAssessmentStatus.ACTIVE
                };
                promises.push(
                  this.db('maintenance_assessments')
                    .where('id', assessment.id)
                    .update(maintenanceUpdateAssessment)
                );
              }
              return assessment;
            });
          }
        }
        if (promises.length > 0) await Promise.all(promises);
        const serviceList = [...new Set(assessmentList.map((a) => a.subService.service))];
        let availableSubServiceList = await this.getTasleehAvailableSubServices(user.externalUserId);
        if (!Array.isArray(availableSubServiceList)) {
          console.log('Error subservice return null');
        } else {
          availableSubServiceList = availableSubServiceList.map(a => {
            if (!serviceList.includes(a.service)) {
              serviceList.push(a.service);
              return a;
            }
          });
          availableSubServiceList = availableSubServiceList.filter(n => n);
        }
        return { status: true, assessmentList, availableSubServiceList: transformToCamelCase(availableSubServiceList)};
      } else return { status: false, error: MaintenanceError.USER_NOT_REGISTERED, errors: [MaintenanceError.USER_NOT_REGISTERED]};
    } catch (error) {
      return { status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR] };
    }
  }

  async getAssessmentList(countryId, status) {
    try {
      const select = `ma.*, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.id as brand_id,
       bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr, bl.id as brand_location_id`;
      const query = this.roDb('maintenance_assessments as ma')
        .select(this.db.raw(select))
        .leftJoin('brand_location_maintenances as blm', 'blm.id', 'ma.maintenance_id')
        .leftJoin('brand_locations as bl', 'bl.id', 'blm.brand_location_id')
        .leftJoin('brands as b', 'b.id', 'bl.brand_id');
      if (countryId) {
        query.where('b.country_id', countryId);
      }
      if (status) {
        query.where('ma.status', status);
      }
      const assessmentList = await query;
      return { status: true, assessmentList: addLocalizationField((addLocalizationField(assessmentList, 'brandName')), 'brandLocationName') };
    } catch (error) {
      return { status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR] };
    }
  }

  async getBrandIdAndBranchIdByAssessmentId(assessmentId) {
    return this.roDb('maintenance_assessments as ma')
      .select('bl.brand_id', 'blm.brand_location_id')
      .leftJoin('brand_location_maintenances as blm', 'blm.id', 'ma.maintenance_id')
      .leftJoin('brand_locations as bl', 'bl.id', 'blm.brand_location_id')
      .where('ma.id', assessmentId)
      .then(first);
  }

  // Ticket Part
  async validateTicket(ticketInput) {
    const errors = [];
    const assessment = await this.getAssesmentById(ticketInput.assessmentId);
    if (assessment) {
      const user = await this.getById(assessment.maintenanceId);
      if (ticketInput.brandLocationId === user.brandLocationId) {
        if (assessment.status === MaintenanceAssessmentStatus.INACTIVE) {
          errors.push(MaintenanceError.INACTIVE_ASSESSMENT);
        } else if (assessment.status === MaintenanceAssessmentStatus.INIT || assessment.status === MaintenanceAssessmentStatus.REQUESTED) {
          const contracts = await this.getTasleehUserContracts(user.externalUserId);
          if (!isEmpty(contracts)) {
            const contract = find(contracts, ['contract_id', assessment.assessmentId.toString()]);
            if (typeof contract !== 'undefined') {
              const maintenanceUpdateAssessment = {
                assessment_id: contract.id,
                assessment_code: assessment.code,
                contract_code: contract.code,
                status: MaintenanceAssessmentStatus.ACTIVE
              };
              await this.db('maintenance_assessments')
                .where('id', assessment.id)
                .update(maintenanceUpdateAssessment);
            } else errors.push(MaintenanceError.INVALID_ASSESSMENT);
          } else errors.push(MaintenanceError.INVALID_ASSESSMENT);
        }
      } else errors.push(MaintenanceError.INACTIVE_ASSESSMENT);
    } else errors.push(MaintenanceError.UNAUTHORIZED_PROCESS);
    return errors;
  }

  async checkAndSaveTicket(ticketInput) {
    const ticketErrors = await this.validateTicket(ticketInput);
    if (ticketErrors.length > 0) return {status: false, error: ticketErrors[0], errors: ticketErrors};
    const id = uuid.get();
    const assessment = await this.getAssesmentById(ticketInput.assessmentId);
    const maintenanceInitTicket = {
      id,
      assessmentId: assessment.id,
      subject: ticketInput.subject,
      description: ticketInput.description,
      flatOffice: ticketInput.flatOffice,
      phoneNumber: ticketInput.phoneNumber,
      status: MaintenanceAssessmentStatus.INIT
    };
    try {
      await this.db('maintenance_assessment_tickets')
        .insert(maintenanceInitTicket);
      const ticketInfo = {
        contract_code: assessment.contractCode,
        issue_subject: ticketInput.subject,
        issue_description: ticketInput.description,
        flat_office: ticketInput.flatOffice,
        phone: ticketInput.phoneNumber
      };
      const ticket = await this.createTicket(ticketInfo);
      if (ticket) {
        const maintenanceUpdateTicket = {
          ticket_id: ticket.ticket_id,
          status: MaintenanceAssessmentStatus.ACTIVE
        };
        await this.db('maintenance_assessment_tickets')
          .where('id', id)
          .update(maintenanceUpdateTicket);
        return {status: true, ticketId: ticket.ticket_id, assessmentCode: assessment.assessmentCode};
      } else {
        return {status: false, error: MaintenanceError.TICKET_GENERATE_ERROR, errors: [MaintenanceError.TICKET_GENERATE_ERROR]};
      }
    } catch (error) {
      return {status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR]};
    }
  }

  async getTicketListByAssessmentId(assessmentId) {
    try {
      const ticketList = await this.roDb('maintenance_assessment_tickets')
        .select('*')
        .where('assessment_id', assessmentId);
      return { status: true, ticketList};
    } catch (error) {
      return { status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR] };
    }
  }

  async getTicketList({countryId, brandId, brandLocationId, assessmentId}) {
    try {
      const select = `mat.*, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.id as brand_id,
       bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr, bl.id as brand_location_id`;
      const query = this.roDb('maintenance_assessment_tickets as mat')
        .select(this.db.raw(select))
        .leftJoin('maintenance_assessments as ma', 'ma.id', 'mat.assessment_id')
        .leftJoin('brand_location_maintenances as blm', 'blm.id', 'ma.maintenance_id')
        .leftJoin('brand_locations as bl', 'bl.id', 'blm.brand_location_id')
        .leftJoin('brands as b', 'b.id', 'bl.brand_id');
      if (countryId) {
        query.where('b.country_id', countryId);
      }
      if (brandId) {
        query.where('bl.brand_id', brandId);
      }
      if (brandLocationId) {
        query.where('blm.brand_Location_id', brandLocationId);
      }
      if (assessmentId) {
        query.where('mat.assessment_id', assessmentId);
      }
      const ticketList = await query;
      return { status: true, ticketList};
    } catch (error) {
      return { status: false, error: MaintenanceError.TRANSACTIONAL_ERROR, errors: [MaintenanceError.TRANSACTIONAL_ERROR] };
    }
  }

  async getUserByBrandLocationId(brandLocationId) {
    return await this.roDb(this.tableName)
      .select('*')
      .where('brand_location_id', brandLocationId)
      .then(first);
  }

  async getAssesmentById(assessmentId) {
    return await this.roDb('maintenance_assessments')
      .select('*')
      .where('id', assessmentId)
      .then(first);
  }

  // Sub Service List Part
  async getAvailableSubServicesByBrandLocationId(brandLocationId) {
    const user = await this.getUserByBrandLocationId(brandLocationId);
    if (!user || (user && user.status !== MaintenanceUserStatus.REGISTERED)) {
      return {
        status: false,
        error: MaintenanceError.USER_NOT_REGISTERED,
        errors: [MaintenanceError.USER_NOT_REGISTERED],
      };
    } else {
      const availableSubServiceList = await this.getTasleehAvailableSubServices(user.externalUserId);
      if (Array.isArray(availableSubServiceList)) {
        return {
          status: true,
          availableSubServiceList: transformToCamelCase(availableSubServiceList)
        };
      } else return {
        status: false,
        error: MaintenanceError.AVAILABLE_SUB_SERVICE_LIST_ERROR,
        errors: [MaintenanceError.AVAILABLE_SUB_SERVICE_LIST_ERROR],
      };
    }
  }

  // Tasleeh Part
  async createTasleehUser(userInfo) {
    try {
      const response = await axios.post(
        '/user_register',
        userInfo
      );
      return response.data;
    } catch (error) {
      // Add kinesis log
      // console.log('err', error.response.data);
      await this.context.kinesisLogger.sendLogEvent(
        {
          input: userInfo,
          error: error.response.data.message,
          errorReason: 'User can not created.',
        },
        tasleehMaintenanceError
      );
      await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] User can not created.', {...userInfo, error: error.response.data.message});
      return null;
    }
  }

  async getTasleehUser(externalUserId) {
    try {
      const response = await axios.get(
        '/user',
        {params: {user_id: externalUserId}}
      );
      return response.data.user;
    } catch (error) {
      // Add kinesis log, User can not found
      // console.log('err', error.response.data);
      await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] User can not found in Tasleeh.', {externalUserId});
      return null;
    }
  }

  async getTasleehUserStatus(externalUserId) {
    try {
      const response = await axios.get(
        '/user_status',
        {params: {user_id: externalUserId}}
      );
      return response.data.user_status;
    } catch (error) {
      // Add kinesis log, User can not found
      // console.log('err', error.response.data);
      await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] User status can not get from Tasleeh.', {externalUserId});
      return null;
    }
  }

  async getTasleehUserContracts(externalUserId) {
    try {
      const response = await axios.get(
        '/user_status',
        {params: {user_id: externalUserId}}
      );
      return response.data.contracts;
    } catch (error) {
      // Add kinesis log, User can not found
      // console.log('err', error.response.data);
      await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] User contract list can not get from Tasleeh.', {externalUserId});
      return null;
    }
  }

  async getAreaList() {
    try {
      const response = await axios.get(
        '/area'
      );
      const areaList = response.data.area_list;
      return areaList;
    } catch (error) {
      // Add kinesis log, can not getting area list
      // console.log('err', error.response.data);
      await SlackWebHookManager.sendTextToSlack('[INFO] [MAINTENANCE] Area list can not get from Tasleeh.');
      return null;
    }
  }

  async getTasleehAvailableSubServices(externalUserId) {
    try {
      const response = await axios.get(
        '/available_sub_services',
        {params: {user_id: externalUserId}}
      );
      const availableSubServiceList = response.data.sub_services_list.filter(subService => SERVICE_LIST.includes(subService.service));
      return availableSubServiceList;
    } catch (error) {
      // Add kinesis log, can not getting area list
      // console.log('err', error);
      await this.context.kinesisLogger.sendLogEvent(
        {
          input: externalUserId,
          error: error.response.data.message,
          errorReason: 'Available Sub Service list can not get from Tasleeh by User.',
        },
        tasleehMaintenanceError
      );
      await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] Available Sub Service list can not get from Tasleeh by User.', {externalUserId, error: error.response.data.message});
      return null;
    }
  }

  async createAssessment(assessmentInfo) {
    try {
      const response = await axios.post(
        '/assessment',
        assessmentInfo
      );
      return response.data.assessment;
    } catch (error) {
      // Add kinesis log
      // console.log('err', error.response.data);
      await this.context.kinesisLogger.sendLogEvent(
        {
          input: assessmentInfo,
          error: error.response.data.message,
          errorReason: 'Assessment can not created.',
        },
        tasleehMaintenanceError
      );
      await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] Assessment can not created.', {...assessmentInfo, error: error.response.data.message});
      return null;
    }
  }

  async createTicket(ticketInfo) {
    try {
      const response = await axios.post(
        '/ticket',
        ticketInfo
      );
      return response.data;
    } catch (error) {
      // Add kinesis log
      // console.log('err', error.response.data);
      await this.context.kinesisLogger.sendLogEvent(
        {
          input: ticketInfo,
          error: error.response.data.message,
          errorReason: 'Ticket can not created.',
        },
        tasleehMaintenanceError
      );
      await SlackWebHookManager.sendTextAndObjectToSlack('[INFO] [MAINTENANCE] Ticket can not created.', {...ticketInfo, error: error.response.data.message});
      return null;
    }
  }
}

module.exports = BrandLocationMaintenance;
