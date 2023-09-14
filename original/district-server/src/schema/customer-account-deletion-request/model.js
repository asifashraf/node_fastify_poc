const BaseModel = require('../../base-model');
const isUUID = require('is-uuid');
const {
  requestAccountDeletionValidationError, requestAccountDeletionStatus,
} = require('./enums');
const { customerStatus, otpRequestError } = require('../root/enums');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const {
  notificationMedia,
  notificationProviders,
  notificationActions
} = require('../../notifications/enums');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const { accountDeletionSlackUrl, orderRatingSlackUrl } = require('../../../config');
const { addLocalizationField } = require('../../lib/util');

class CustomerAccountDeletionRequest extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_account_deletion_request', context);
  }

  async isCustomerRegisteredBefore({ phoneNumber, customerId }) {
    if (!customerId && !phoneNumber) {
      throw new Error('customerId or phoneNumber should be provided');
    }
    if (customerId) {
      const customer = await this.context.customer
        .selectFields(['phone_number'])
        .where('id', customerId)
        .first();
      phoneNumber = customer.phoneNumber;
    }
    const request = await this.selectFields(['id'])
      .where('phone_number', phoneNumber)
      .andWhere('status', requestAccountDeletionStatus.DELETED)
      .first();
    return Boolean(request);
  }

  async validate({ reason, otpCode }) {
    const errors = [];

    if (
      !isUUID.v4(reason)
      || !(await this.context.customerAccountDeletionReason.getById(reason))
    ) {
      errors.push(requestAccountDeletionValidationError.INVALID_REASON);
    }

    const customer = await this.context.customer
      .selectFields(['status', 'phone_number'])
      .where('id', this.context.auth.id)
      .first();

    // const otpValidation = await this.context.authService.validatePhoneOTP(
    //   customer.phoneNumber,
    //   otpCode
    // );
    //
    // if (otpValidation.error) {
    //   errors.push(otpValidation.error);
    // }

    if (
      customer.status !== customerStatus.NEW
      && customer.status !== customerStatus.ACTIVE
      && customer.status !== null
    ) {
      errors.push(requestAccountDeletionValidationError.INVALID_CUSTOMER);
    }

    return errors;
  }

  async save(input) {
    const customer = await this.context.customer
      .selectFields(['id', 'email', 'phone_number', 'first_name', 'last_name'])
      .where('id', this.context.auth.id)
      .first();
    // delete input.otpCode;
    try {
      await Promise.all([
        this.context.customer.save({
          id: this.context.auth.id,
          status: customerStatus.INACTIVE,
        }),
        this.context.authCustomer.updateDisableStatus(
          this.context.auth.id,
          true,
        ),
        super.save({
          ...input,
          phoneNumber: customer.phoneNumber,
        }),
        this.context.notification.sendNotificationContentToQueue(
          notificationMedia.EMAIL,
          notificationProviders.AWS_SES,
          this.generateAccountDeletionRequestNotificationContent({ customer }),
          notificationActions.ACCOUNT_DELETION_REQUEST
        ),
        this.sendSlackMessageManualDeletion(input, customer)
      ]);
      return {
        result: true,
      };
    } catch (err) {
      this.context.kinesisLogger.sendLogEvent(
        {
          user: this.context.auth,
          input,
          err
        },
        kinesisEventTypes.customerAccountDeletionRequest
      ).catch(err => console.log(err));
      return {
        result: false,
      };
    }
  }

  async sendSlackMessageManualDeletion(input, customer) {
    const reason = addLocalizationField(await this.db('customer_account_deletion_reason')
      .where('id', input.reason)
      .first(), 'reason');
    if (input.description && input.description.trim()) {
      const adminPortal = orderRatingSlackUrl.adminPortal;
      const customerPage = `${adminPortal.baseUrl}/${adminPortal.customersPage}/${customer.id}`;
      const customerInformation = `${customer?.firstName} ${customer?.lastName} (Email: ${customer?.email} | Phone: ${customer?.phoneNumber})`;
      SlackWebHookManager.sendTextToSlack(
        `
Customer: ${customerInformation}
Customer Url: ${customerPage}
Reason: ${reason?.reason?.en}
Description: ${input.description}`, accountDeletionSlackUrl);
    }
  }

  checkActiveDeletionRequest(phoneNumber) {
    return this.selectFields(['id'])
      .where('phone_number', phoneNumber)
      .andWhere('status', requestAccountDeletionStatus.SCHEDULED)
      .first();
  }

  async cancelDeletionRequest({ accountDeletionRequest, phoneNumber }) {
    const customer = await this.context.customer
      .selectFields(['id', 'email', 'phone_number'])
      .where('phone_number', phoneNumber)
      .first();

    return Promise.all([
      this.context.customer.save({
        id: customer.id,
        status: customerStatus.ACTIVE,
      }),
      this.context.authCustomer.updateDisableStatus(
        customer.id,
        false,
      ),
      super.save({
        ...accountDeletionRequest,
        status: requestAccountDeletionStatus.CANCELED,
      }),
      this.context.notification.sendNotificationContentToQueue(
        notificationMedia.EMAIL,
        notificationProviders.AWS_SES,
        this.generateAccountDeletionRequestNotificationContent({
          customer,
          canceled: true,
        }),
        notificationActions.ACCOUNT_DELETION_REQUEST
      ),
    ]);
  }

  generateAccountDeletionRequestNotificationContent({ customer, canceled = false }) {
    const action = canceled ? 'canceled' : 'requested';
    const html = `
        The customer that given information below ${action} account deletion.
        <hr>
        <br /><br />
        ID: ${customer.id} <br />
        Email: ${customer.email} <br />
        Phone Number: ${customer.phoneNumber} <br />
        `;

    const text = html;
    const subject = canceled
      ? `${customer.id} canceled account deletion`
      : `${customer.id} wants to delete account!`;

    return {
      subject,
      html,
      text,
    };
  }

  async otpRequestToCancelAccountDeletion({ phoneNumber, cancelAccountDeletion = false }) {
    const accountDeletionRequest = await this.context
      .customerAccountDeletionRequest
      .checkActiveDeletionRequest(phoneNumber);
    if (accountDeletionRequest) {
      if (!cancelAccountDeletion) {
        return {
          status: false,
          error: otpRequestError.ACTIVE_ACCOUNT_DELETION,
        };
      }
      await this.context.withTransaction(
        'customerAccountDeletionRequest',
        'cancelDeletionRequest',
        { accountDeletionRequest, phoneNumber },
      );
    }
  }
}

module.exports = CustomerAccountDeletionRequest;
