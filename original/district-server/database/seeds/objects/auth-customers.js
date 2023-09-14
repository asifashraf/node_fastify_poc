/* eslint-disable camelcase */

module.exports = customers => {
  return customers.map(customer => {
    return {
      id: customer.id,
      phone_number: customer.phone_number,
      email: customer.email,
      password: customer.password,
      is_disabled: false,
    };
  });
};
