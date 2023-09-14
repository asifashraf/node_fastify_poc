const mposKinesisLogMiddleware = async (req, res, next) => {
  const { queryContextWithoutAuth: context } = req.app;
  const requestObject = {
    baseUrl: req?.originalUrl,
    limit: req?.body?.limit,
    page: req?.body?.page,
    deviceId: req?.body?.deviceId,
    serialNumber: req?.headers?.serialnumber,
    appVersion: req?.headers?.appversion,
    shortCode: req?.body?.shortCode,
    orderSetId: req?.body?.orderSetId,
    orderSetIds: req?.body?.orderSetIds,
    status: req?.body?.status,
    menuItemIds: req?.body?.menuItemIds,
    assessmentId: req?.body?.assessmentId,
    subject: req?.body?.subject,
    description: req?.body?.description,
    flatOffice: req?.body?.flatOffice,
    phoneNumber: req?.body?.phoneNumber,
    requestBody: req?.body,
  };
  const cleanRequestObj = Object.fromEntries(Object.entries(requestObject).filter(([_, v]) => v != null));
  const originalSendFunc = res.send.bind(res);
  res.send = function (body) {
    const responseObj = JSON.parse(body);
    if (!(
      ('/mpos/new-orders' == requestObject.baseUrl && responseObj?.success == true && responseObj?.orders.length == 0) ||
      ('/mpos/arrived-orders' == requestObject.baseUrl && responseObj?.success == true
        && responseObj?.arrivedOrders.length == 0 && responseObj?.completedOrders.length == 0)
    )) {
      context.generalCCCService.logIt({
        eventType: 'mpos-request',
        eventObject: {request: cleanRequestObj, response: responseObj},
      }).catch(e => console.log('mpos-request-exception', e));
    }
    return originalSendFunc(body);
  };
  return next();
};

module.exports = mposKinesisLogMiddleware;
