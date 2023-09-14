const axios = require('axios');
const aws = require('aws-sdk');
const subMinutes = require('date-fns/subMinutes');

const requestAccountDeletionStatus = {
    SCHEDULED: 'SCHEDULED',
    DELETED: 'DELETED',
    CANCELED: 'CANCELED',
};

const customerStatus = {
    NEW: 'NEW',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BLACK_LISTED: 'BLACK_LISTED',
    DELETED: 'DELETED'
};

const hashDataFields = (data = [], stringFields = [], numberFields = []) => {
    const date = (new Date()).toISOString().split('T')[0]
    return data.map(row => {
        for (const fieldName of stringFields) {
            const value = row[fieldName];
            row[fieldName] = crypto.createHash('sha256')
                .update(value + date)
                .digest('hex');
        }
        for (const fieldName of numberFields) {
            row[fieldName] = 0;
        }
        return row;
    })
}

module.exports = function CustomerAccountDeleter(jobConfig, queryContext, config) {
    const deleteCustomerProfilePicture = async (customerId) => {
        const { awsRemoteConfig, customerProfilePicture } = config;

        const { amazonProperties } = customerProfilePicture;

        aws.config.update(awsRemoteConfig);

        const s3 = new aws.S3({ region: amazonProperties.region });

        return s3.deleteObject({
            Bucket: amazonProperties.bucketName,
            Key: `${amazonProperties.folderPath}/${customerId}.jpg`
        }).promise();
    }

    const ACCOUNT_DELETION_REQUEST_TABLE_NAME = 'customer_account_deletion_request';
    const CUSTOMERS_TABLE_NAME = 'customers';
    const AUTH_CUSTOMER_TABLE_NAME = 'auth_customer';
    const CUSTOMER_ADDRESSES_TABLE_NAME = 'customer_addresses';
    const CUSTOMER_CARS_TABLE_NAME = 'customer_cars';
    const CUSTOMER_CARD_TOKENS_TABLE_NAME = 'customer_card_tokens';
    const WAITING_TIME_IN_MINUTE = 10;

    return async function () {
        console.info(`CustomerAccountDeleter is running....`);
        try {
            const { db } = queryContext;

            const accountsToBeDeleted = await db(ACCOUNT_DELETION_REQUEST_TABLE_NAME)
                .where('status', requestAccountDeletionStatus.SCHEDULED)
                .andWhere('created', '<=', subMinutes(new Date(), WAITING_TIME_IN_MINUTE));

            if (accountsToBeDeleted.length === 0) return;

            let customers = await db(CUSTOMERS_TABLE_NAME)
                .whereIn('phone_number', accountsToBeDeleted.map(({ phoneNumber }) => phoneNumber));

            const customerIds = customers.map(({ id }) => id);

            let authCustomers = await db(AUTH_CUSTOMER_TABLE_NAME)
                .whereIn('id', customerIds);

            let customerAddresses = await db(CUSTOMER_ADDRESSES_TABLE_NAME)
                .whereIn('customer_id', customerIds);

            let customerCars = await db(CUSTOMER_CARS_TABLE_NAME)
                .whereIn('customer_id', customerIds);

            let customerCardTokens = await db(CUSTOMER_CARD_TOKENS_TABLE_NAME)
                .whereIn('customer_id', customerIds);

            customers = hashDataFields(customers, ['firstName', 'lastName', 'phoneNumber', 'email']);
            authCustomers = hashDataFields(authCustomers, ['phoneNumber', 'email']);
            customerAddresses = hashDataFields(customerAddresses, ['friendlyName']);
            customerCars = hashDataFields(customerCars, ['color', 'brand', 'plateNumber']);
            customerCardTokens = hashDataFields(customerCardTokens, ['providerRaw', 'name'], ['expiryMonth', 'expiryYear', 'last4']);

            await db.transaction(trx => {
                const [customerUpdates, customerProfilePictureDeletes] = customers.reduce(([customerUpdates, customerProfilePictureDeletes], customer) => {
                    customer.status = customerStatus.DELETED
                    customerUpdates.push(
                        trx(CUSTOMERS_TABLE_NAME)
                            .where('id', customer.id)
                            .update(customer)
                    )
                    customerProfilePictureDeletes.push(
                        deleteCustomerProfilePicture(customer.id)
                    )
                    return [customerUpdates, customerProfilePictureDeletes]
                }, [[], []]);
                const authCustomerUpdates = authCustomers.map(authCustomer => {
                    return trx(AUTH_CUSTOMER_TABLE_NAME)
                        .where('id', authCustomer.id)
                        .update(authCustomer)
                });
                const deletionRequestUpdates = accountsToBeDeleted.map(request => {
                    return trx(ACCOUNT_DELETION_REQUEST_TABLE_NAME)
                        .where('id', request.id)
                        .update({ status: requestAccountDeletionStatus.DELETED })
                });
                const customerAddressesUpdates = customerAddresses.map(customerAddress => {
                    return trx(CUSTOMER_ADDRESSES_TABLE_NAME)
                        .where('id', customerAddress.id)
                        .update(customerAddress);
                });
                const customerCarsUpdates = customerCars.map(customerCar => {
                    return trx(CUSTOMER_CARS_TABLE_NAME)
                        .where('id', customerCar.id)
                        .update(customerCar);
                });
                const customerCardTokensUpdates = customerCardTokens.map(customerCardToken => {
                    return trx(CUSTOMER_CARD_TOKENS_TABLE_NAME)
                        .where('id', customerCardToken.id)
                        .update(customerCardToken);
                });
                const deletionFromBraze = axios({
                    method: 'post',
                    url: `${jobConfig.brazeEndpoint}/users/delete`,
                    headers: { 'Authorization': `Bearer ${jobConfig.apiKey}` },
                    data: {
                        'external_ids': customers.map(customer => customer.id)
                    }
                });

                return Promise.all([
                    ...customerUpdates,
                    ...authCustomerUpdates,
                    ...deletionRequestUpdates,
                    ...customerAddressesUpdates,
                    ...customerCarsUpdates,
                    ...customerCardTokensUpdates,
                    ...customerProfilePictureDeletes,
                    deletionFromBraze
                ])
            })
                .then(result => console.error(`CustomerAccountDeleter > result >`, result))
                .catch(ex => console.error(`CustomerAccountDeleter > transaction > exception >`, ex));
        } catch (ex) {
            console.error(`CustomerAccountDeleter > exception >`, ex);
        }
        console.info(`CustomerAccountDeleter is running....`);
    }
}

