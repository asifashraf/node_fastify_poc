const BaseModel = require('../../base-model');
const { uuid } = require('../../lib/util');

class InternalComment extends BaseModel {
  constructor(db, context) {
    super(db, 'order_comments', context);
  }

  getByOrderSetId(orderSetId) {
    return this.db(this.tableName)
      .where('order_set_id', orderSetId)
      .orderBy('created');
  }
  async save(comments, orderSetId) {
    const that = this;
    await Promise.all(
      comments.map(comment =>
        that
          .db(that.tableName)
          .insert({ ...comment, orderSetId, id: uuid.get() })
      )
    );
  }
}

module.exports = InternalComment;
