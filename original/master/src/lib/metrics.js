const filterPrefix = 'Cofe.CloudWatch.MetricFilter';

const knetEvents = {
  initiatePaymentSuccess: 'Knet.InitiatePayment.Success',
  initiatePaymentFailure: 'Knet.InitiatePayment.Failure',
  responseCaptured: 'Knet.Response.Captured',
  responseNotCaptured: 'Knet.Response.NotCaptured',
  error: 'Knet.Error',
};

const log = (name, data) => {
  const dataString = JSON.stringify(data);
  console.log(`${filterPrefix}.${name}: ${dataString}`);
};

/**
A request from the server to KNET, to initiate a payment, succeeded.
*/
const knetInitiatePaymentSuccess = stringfiableData => {
  const name = knetEvents.initiatePaymentSuccess;
  log(name, stringfiableData);
};

/**
A request from the server to KNET, to initiate a payment, failed.
*/
const knetInitiatePaymentFailure = stringfiableData => {
  const name = knetEvents.initiatePaymentFailure;
  log(name, stringfiableData);
};

/**
A request from KNET to the server at /knet-response indicated capture.
*/
const knetResponseCaptured = stringfiableData => {
  const name = knetEvents.responseCaptured;
  log(name, stringfiableData);
};

/**
A request from KNET to the server at /knet-response indicated non-capture.
*/
const knetResponseNotCaptured = stringfiableData => {
  const name = knetEvents.responseNotCaptured;
  log(name, stringfiableData);
};

/**
A request from KNET to the server at /knet-error
*/
const knetError = stringfiableData => {
  const name = knetEvents.error;
  log(name, stringfiableData);
};

module.exports = {
  knetInitiatePaymentSuccess,
  knetInitiatePaymentFailure,
  knetResponseCaptured,
  knetResponseNotCaptured,
  knetError,
};
