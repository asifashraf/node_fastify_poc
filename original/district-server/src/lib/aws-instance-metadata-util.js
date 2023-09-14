// eslint-disable-next-line no-unused-vars
const { MetadataService } = require('aws-sdk');

// Constants
const INSTANCE_ID_PATH = '/latest/meta-data/instance-id';
const PRIVATE_IPV4_PATH = '/latest/meta-data/local-ipv4';

let metadataService = null;
let instanceMetadata = null;

function initAndGetMetadataService() {
  if (metadataService === null) {
    metadataService = new MetadataService();
  }
  return metadataService;
}

async function getInstanceMetadata() {
  if (metadataService === null) {
    initAndGetMetadataService();
  }
  if (instanceMetadata === null) {
    await initializeInstanceMetadata();
  }
  return instanceMetadata;
}

// For EC2 Instances Metadata will return Instance Id and Private Ip
// For Local Execution , it will return {} with error connect EHOSTUNREACH 169.254.169.254:80
async function initializeInstanceMetadata() {
  try {
    const instanceId = await _fetchInstanceId();
    const privateIp = await _fetchInstancePrivateIp();
    instanceMetadata = {
      instanceId,
      privateIp,
    };
  } catch (err) {
    console.log('Error Getting Instance Metadata : ', err);
    instanceMetadata = {};
  }
}

function _fetchMetadataViaPathWrapper(queryPath) {
  return new Promise((resolve, reject) => {
    metadataService.request(queryPath, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

function _fetchInstanceId() {
  return _fetchMetadataViaPathWrapper(INSTANCE_ID_PATH);
}

function _fetchInstancePrivateIp() {
  return _fetchMetadataViaPathWrapper(PRIVATE_IPV4_PATH);
}

module.exports = {
  initAndGetMetadataService,
  getInstanceMetadata,
};
