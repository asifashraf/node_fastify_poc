const express = require('express');
const OTPService = require('../schema/auth/otp-service');
const { OTPOperationTypes, OTPProviders } = require('../schema/auth/enums');
const { uuid } = require('../lib/util');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const config = require('../../config');
const router = express.Router();

router.all('/sms-delivery-report/:provider', async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const correlationId = uuid.get();
  try {
    context.kinesisLogger.sendLogEvent(
      {
        correlationId,
        requestBody: req.body || req.query,
      },
      'otpCallback-request',
    ).catch(err => console.error(err));
    SlackWebHookManager.sendTextToSlack(JSON.stringify({
      correlationId,
      req: req.body || req.query || null,
    }), config.otpBlock.slackUrl);
    if (!Object.keys(OTPProviders).includes(req.params.provider)) {
      throw new Error('Invalid OTP provider');
    }
    let data;
    let phoneNumber;
    if (req.params.provider === OTPProviders.KARIX) {
      // sample delivery report from KARIX
      // {
      //   "mid": "6046835115445156200",
      //   "dest": "966544705137",
      //   "dtime": "2021-08-15 13:45:57",
      //   "stime": "2021-08-15 13:45:44",
      //   "reason": "DELIVRD",
      //   "status": 1
      // }
      data = OTPService.camelize(req.body);
      phoneNumber = `+${data.dest}`;
    } else if (req.params.provider === OTPProviders.UNIFONIC) {
      // sample delivery report from UNIFONIC (Note: no phone info in the payload)
      // {
      //   "body": {
      //     "deliveredUnitCount": "1",
      //     "doneDate": "20220827000032",
      //     "errorCode": "000",
      //     "finalStatus": "DELIVRD",
      //     "id": "",
      //     "messageId": "53000129104129",
      //     "submitDate": "20220827000021",
      //     "submitUnitCount": "1"
      // },
      //   "timeStamp": "2022-08-26T21:00:33.348401Z",
      //   "eventName": "dlr",
      //   "productName": "sms",
      //   "accountId": ""
      // }
      data = OTPService.camelize(req.body);
      phoneNumber = null;
    } else if (req.params.provider === OTPProviders.CEQUENS) {
      // sample delivery report from CEQUENS, data comes in query string
      // {
      //   "msgid": "64755777-3de4-4a6e-b079-1dc0d511c56c",
      //   "statusid": "1",
      //   "from": "Cofe App",
      //   "to": "201116911100",
      //   "statusmsg": "id:A_A230427104537144000071 sub:001 dlvrd:001 submit date:230427104537 done date:230427104500 stat:DELIVRD err:000 text:-",
      //   "accountid": "district",
      //   "SubmitDate": "2023-04-27 08:46:23"
      // }
      data = OTPService.camelize(req.query);
      phoneNumber = `+${data.to}`;
    } else if (req.params.provider === OTPProviders.VICTORY_LINK) {
      // sample delivery report from VICTORY_LINK, data comes in query string
      // {
      //   "userSMSId": "b0a3a0de-3748-4308-1f93-b6ce1a3a8110",
      //   "dlrResponseStatus": "5"
      // }
      data = OTPService.camelize(req.query);
      phoneNumber = null;
    } else if (req.params.provider === OTPProviders.UNIFONIC_WHATSAPP) {
      // sample delivery report from UNIFONIC_WHATSAPP
      // {
      //   "messageId": "cb24fa62-2f1a-429e-9d53-5de3323d2959",
      //   "eventId": "86706459-223d-47d9-9841-9f4ea31a6396",
      //   "eventType": "message.rejected",
      //   "applicationId": "60e6fc75-cccb-4689-b6fd-a7b806dd308f",
      //   "conversationId": "9e6da449-932c-48c4-937f-740cd7c5be28",
      //   "recipient": {
      //   "channel": "whatsapp",
      //     "contact": "+90***"
      //   },
      // ...
      // }
      data = OTPService.camelize(req.body);
      phoneNumber = `+${data.recipient?.contact}`;
    }

    const otpService = new OTPService({
      phoneNumber,
      options: {
        ignoreRateLimit: true,
      },
    });
    const customIdentifier = OTPService.getCustomIdentifierIfExist(
      req.params.provider,
      data
    );
    await otpService.setPhoneNumberIfNullByCustomIdentifier(customIdentifier);
    await otpService.logOTPActivity({
      providerName: req.params.provider,
      providerResponse: data,
      OTPCode: '',
      operationType: OTPOperationTypes.DELIVERY_REPORT_CALLBACK,
    });
    res.json({ status: true });
  } catch (err) {
    context.kinesisLogger.sendLogEvent(
      {
        correlationId,
        req: req.body || req.query || null,
        error: err?.message || err,
        stack: err?.stack || null,
      },
      'otpCallback-error',
    ).catch(err => console.error(err));
    SlackWebHookManager.sendTextToSlack(JSON.stringify({
      correlationId,
      req: req.body || req.query || null,
      error: err?.message || err,
      stack: err?.stack || null,
    }), config.otpBlock.slackUrl);
    res.status(500).send({ status: false, error: 'An error occurred' });
  }
});

module.exports = router;
