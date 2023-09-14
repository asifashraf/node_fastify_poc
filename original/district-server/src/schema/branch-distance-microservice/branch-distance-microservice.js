const Axios = require('axios');
const { microservices } = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

const axios = Axios.create({
  baseURL: microservices.branchDistanceMicroserviceURL,
  timeout: 6000,
});

class BranchDistanceMicroserviceManager {
  static async getBranchesDistanceForLocation(
    location,
    branchList
  ) {
    let messageBody = {};
    try {
      branchList = branchList.map(item => {
        return {
          branchId: item.id,
          branchLocation: {
            latitude: item.latitude,
            longitude: item.longitude
          }
        };
      });

      messageBody = {
        sourceLocation: location,
        branchList
      };
      const response = await axios.post('branchDistance', messageBody);
      const responseData = response.data.map(item => {
        item.id = item.branchId;
        delete item.branchId;
        return item;
      });
      return responseData;
    } catch (err) {
      SlackWebHookManager.sendTextToSlack('BranchDistance Microservice failed for branchDistance! messageBody: ' +
      JSON.stringify(messageBody) + ' Error:  ' + err
      );
      return [];
    }
  }

}

module.exports = BranchDistanceMicroserviceManager;
