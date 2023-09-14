const AWS = require('aws-sdk');
const { awsRemoteConfig } = require('../../config');

AWS.config.update(awsRemoteConfig);

const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
class DynamoDB {
  static transformDynamoDbItem(item) {
    if (!item) return undefined;
    return Object.entries(item).reduce((result, [key, value]) => {
      result[key] = Object.values(value)[0];
      return result;
    }, {});
  }
  static getItem({ tableName, dynamoDBQuery, projectionExpression }) {
    return dynamoDB.getItem({
      TableName: tableName,
      Key: dynamoDBQuery,
      ProjectionExpression: projectionExpression
    }).promise().then(({ Item }) => this.transformDynamoDbItem(Item));
  }

  static putItem({ tableName, item }) {
    return dynamoDB.putItem({
      TableName: tableName,
      Item: item
    }).promise();
  }

  static deleteItem({ tableName, dynamoDBQuery }) {
    return dynamoDB.deleteItem({
      TableName: tableName,
      Key: dynamoDBQuery
    }).promise();
  }

  static scan(options) {
    return dynamoDB.scan(options)
      .promise()
      .then(({ Items }) => {
        return Items.map(item => this.transformDynamoDbItem(item));
      });
  }
}

module.exports = DynamoDB;
