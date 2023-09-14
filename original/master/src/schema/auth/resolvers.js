const { otpCodeViewRequestError, otpRateLimitResetRequestError } = require('./enums');
const { formatError } = require('../../lib/util');
const { map } = require('lodash');
module.exports = {
  Query: {
    async viewCustomerOTPCode(root, { customerInfo }, context) {
      const { phoneNumber } = customerInfo;
      const customerRecords = await context.authCustomer.getAllByPhoneNumber(
        phoneNumber
      );
      if (customerRecords.length === 0) {
        return formatError(
          [otpCodeViewRequestError.NOT_EXISTING_CUSTOMER],
          customerInfo
        );
      }
      try {
        const recordedOTP = await context
          .internalAuthService
          .requestViewCustomerOTPCode(phoneNumber);
        if (!recordedOTP?.otpCode) {
          return formatError([otpCodeViewRequestError.NO_ACTIVE_OTP_FOUND], {
            phoneNumber,
          });
        }
        return recordedOTP;
      } catch (err) {
        return formatError([otpCodeViewRequestError.SERVICE_ERROR], err);
      }
    },
    async getFirstTimeUserOTPs(root, args, context) {
      try {
        const auth = context.auth;
        const admin = await context.admin.getByAuthoId(auth.id);
        if (!admin || (admin && auth.isVendorAdmin)) {
          return formatError([otpCodeViewRequestError.UNAUTHORIZED_ADMIN]);
        }
        const otpRecordsList = await context.internalAuthService
          .firstTimeUsersOTPList();
        const modifiedOtpRecords = map(otpRecordsList, record => {
          return {
            ...record,
            ttl: String(record.ttl),
          };
        });
        return { otpRecordsList: modifiedOtpRecords };
      } catch (err) {
        return formatError([otpCodeViewRequestError.SERVICE_ERROR], err);
      }
    },
  },
  Mutation: {
    async requestCustomerEmailVerification(_, { userEmail }, context) {
      return context.internalAuthService.requestEmailVerification(
        {
          id: context.auth.id,
          email: userEmail
        }
      );
    },
    async resetCustomerOTPRateLimit(root, { customerInfo }, context) {
      const { phoneNumber } = customerInfo;
      try {
        const res = await context
          .internalAuthService
          .requestResetCustomerResetOTPRateLimit(phoneNumber);
        return {
          result: res
        };
      } catch (err) {
        return formatError([otpRateLimitResetRequestError.SERVICE_ERROR], err);
      }
    },
  },
};
