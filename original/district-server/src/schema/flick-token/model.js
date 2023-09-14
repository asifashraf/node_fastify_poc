const BaseModel = require('../../base-model');
const { first } = require('lodash');

class FlickToken extends BaseModel {
  constructor(db, context) {
    super(db, 'flick_token', context);
  }

  getToken() {
    return this.db
      .table(this.tableName)
      .select('id', 'partner_token')
      .then(first);
  }

  async saveToken(partnerToken) {
    return this.db(this.tableName)
      .delete()
      .then(() => {
        this.save({
          partnerToken,
        });
        return partnerToken;
      });
  }
}

module.exports = FlickToken;
