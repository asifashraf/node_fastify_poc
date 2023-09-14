const Axios = require('axios');
const { microservices } = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

const axios = Axios.create({
  baseURL: microservices.branchLocationsMicroserviceURL,
  timeout: 6000,
});

class BranchLocationMicroserviceManager {
  static async getBranchesInBoundingBox(
    userLocation,
    minLocation,
    maxLocation,
    countryId,
    fulfillment
  ) {
    let messageBody = {};
    try {
      messageBody = {
        minPoint: minLocation,
        maxPoint: maxLocation,
        referencePoint: userLocation,
        countryId,
        fulfillment,
      };
      const response = await axios.post('branchesInBoundingBox', messageBody);
      return response.data;
    } catch (err) {
      SlackWebHookManager.sendTextToSlack('BranchLocation Microservice failed for branchesInBoundingBox! messageBody: ' +
        JSON.stringify(messageBody) + ' Error:  ' + err
      );
      return [];
    }
  }


  static async getBranchesInRadius(
    latitude,
    longitude,
    radiusMin = 0,
    radiusMax,
    countryId,
    fulfillment
  ) {
    let messageBody = {};
    try {
      messageBody = {
        latitude,
        longitude,
        radiusMin,
        radiusMax,
        countryId,
        fulfillment,
      };
      const response = await axios.post('branchesInRadius', messageBody);
      return response.data;
    } catch (err) {
      SlackWebHookManager.sendTextToSlack('BranchLocation Microservice failed for getBranchesInRadius! messageBody: ' +
        JSON.stringify(messageBody) + ' Error:  ' + err
      );
      return [];
    }
  }

  static async getBranchesOfBrand(latitude, longitude, brandId) {
    let messageBody = {};
    try {
      messageBody = {
        latitude,
        longitude,
        brandId,
      };
      const response = await axios.post('branchesOfBrand', messageBody);
      return response.data;
    } catch (err) {
      SlackWebHookManager.sendTextToSlack('BranchLocation Microservice failed for getBranchesOfBrand! messageBody: ' +
        JSON.stringify(messageBody) + ' Error: ' + err
      );
      return [];
    }
  }

  static async getBranchesOfCountry(latitude, longitude, countryId) {
    let messageBody = {};
    try {
      messageBody = {
        latitude,
        longitude,
        countryId,
      };
      const response = await axios.post('branchesOfCountry', messageBody);
      return response.data;
    } catch (err) {
      SlackWebHookManager.sendTextToSlack('BranchLocation Microservice failed for getBranchesOfCountry! messageBody: ' +
        JSON.stringify(messageBody) + ' Error: ' + err
      );
      return [];
    }
  }

  static async addBranch(branch, countryId) {
    let messageBody = {};
    try {
      messageBody = {
        latitude: branch.address.latitude,
        longitude: branch.address.longitude,
        branchId: branch.id,
        brandId: branch.brandId,
        countryId,
        deliveryRadius: branch.has_delivery ? branch.deliveryRadius : 0,
        expressDeliveryRadius: branch.allowExpressDelivery
          ? branch.expressDeliveryRadius
          : 0,
      };
      const response = await axios.post('addBranch', messageBody);
      return response.data;
    } catch (err) {
      SlackWebHookManager.sendTextToSlack('BranchLocation Microservice failed for addBranch! messageBody: ' +
        JSON.stringify(messageBody) + ' Error: ' + err
      );
    }
  }
  /*
  static async updateBranch(branch) {
    try {

      const messageBody = {
        branchId: branch.id,
        latitude: branch.address.latitude,
        longitude: branch.address.longitude,
        deliveryRadius: branch.has_delivery ? branch.deliveryRadius : 0,
        expressDeliveryRadius: branch.allowExpressDelivery
          ? branch.expressDeliveryRadius
          : 0,
      };

      const response = await axios.post('updateBranch', messageBody);
      return response.data;
    } catch (err) {}
  }

   */
  static async deleteBranch(branchId) {
    try {
      const messageBody = {
        branchId,
      };
      const response = await axios.post('deleteBranch', messageBody);
      return response.data;
    } catch (err) {
      SlackWebHookManager.sendTextToSlack('BranchLocation Microservice failed for deleteBranch! branchId:' + branchId + ' Error: ' + err);
    }
  }
}

module.exports = BranchLocationMicroserviceManager;
