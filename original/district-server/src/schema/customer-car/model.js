const BaseModel = require('../../base-model');
const { first } = require('lodash');
const { customerCarError } = require('../root/enums');

class CustomerCar extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_cars', context);
  }

  getByCustomer(customerId) {
    return this.getAll().where('customer_id', customerId);
  }

  getDefaultByCustomer(customerId) {
    return this.getByCustomer(customerId)
      .andWhere('is_default', true)
      .then(first);
  }

  async deleteCar(customerId, carId) {
    return this.db('customer_cars')
      .where('id', carId)
      .andWhere('customer_id', customerId)
      .del();
  }

  async setDefaultCar(customerCar) {
    await this.db(this.tableName)
      .where('customer_id', customerCar.customerId)
      .update('is_default', false);

    return super.save({
      ...customerCar,
      isDefault: true,
    });
  }

  async validate(customerCar) {
    const errors = [];
    if (!customerCar || !customerCar.customerId) {
      errors.push(customerCarError.INVALID_CUSTOMER);
    }

    return errors;
  }

  async save(customerCar) {
    const { customerId } = customerCar;
    const [{ count }] = await this.getByCustomer(customerId).count();
    const carCount = Number(count);

    if (carCount > 0 && customerCar.isDefault) {
      await this.db(this.tableName)
        .where('customer_id', customerId)
        .update('is_default', false);
    }

    if (carCount === 0) {
      return super.save({
        ...customerCar,
        isDefault: true,
      });
    }

    return super.save(customerCar);
  }
}

module.exports = CustomerCar;
