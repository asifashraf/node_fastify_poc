const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

const { first } = require('lodash');

class UserActivityLog extends BaseModel {
  constructor(db, context) {
    super(db, 'user_activity_logs', context);
    this.loaders = createLoaders(this);
  }

  getStreamLogs(streamId, stream) {
    return this.roDb(this.tableName)
      .select('*')
      .where('stream_id', streamId)
      .where('stream', stream)
      .orderBy('created', 'desc');
  }

  getByStreamId(streamId) {
    return this.roDb(this.tableName)
      .select('*')
      .where('stream_id', streamId)
      .orderBy('created', 'desc');
  }

  getUserByStreamId(streamId) {
    return this.roDb(this.tableName)
      .select('admins.*')
      .joinRaw(
        'inner join admins on (admins.autho_id = user_activity_logs.reference_user_id  or cast(admins.id as text) = user_activity_logs.reference_user_id)'
      )
      .where('stream_id', streamId)
      .orderBy('created', 'desc');
  }

  getUserByStreamAndAction({ userId, streamId, stream, action }) {
    return this.roDb(this.tableName)
      .select('*')
      .where('reference_user_id', userId)
      .where('stream_id', streamId)
      .where('stream', stream)
      .where('action', action)
      .orderBy('created', 'desc')
      .then(first);
  }

  getAllUserByStreamAndActionGroupByDay({ userId, streamId, stream, action }) {
    return this.roDb(this.tableName)
      .select(
        this.roDb.raw('count(id) as cnt'),
        this.roDb.raw('date(created) as cDate')
      )
      .where('reference_user_id', userId)
      .where('stream_id', streamId)
      .where('stream', stream)
      .where('action', action)
      .orderByRaw('date(created) desc')
      .groupByRaw(' date(created) ');
  }

  async create(data) {
    try {
      if (this.context) {
        const log = {
          ...data,
          ...{
            referenceUserId: this.context.auth.id,
            // ip: this.context.srcIp || null,
            agent:
              this.context.req.xDeviceId || this.context.req.userAgent || null,
            srcPlatform:
              this.context.req.xAppOs || this.context.req.srcPlatform || null,
            srcPlatformVersion: this.context.req.xAppVersion || null,
            query:
              this.context.req.body && this.context.req.body.query
                ? this.context.req.body.query
                : null,
            operationName:
              this.context.req.body && this.context.req.body.operationName
                ? this.context.req.body.operationName
                : null,
            inputVariables:
              this.context.req.body && this.context.req.body.variables
                ? this.context.req.body.variables
                : null,
          },
        };
        return this.save(log);
      }
    } catch (err) {
      console.log('error', err);
    }
  }
}

module.exports = UserActivityLog;
