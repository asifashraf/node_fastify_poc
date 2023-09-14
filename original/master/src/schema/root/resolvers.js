const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const moment = require('moment');
const { formatNumberForDinars } = require('../../lib/util');
const URL = require('url').URL;

module.exports = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date in format yyyy-mm-dd',

    // NOTE: serialize date value into string
    serialize: value =>
      value &&
      moment
        .utc(value)
        .toISOString()
        .split('.')[0] + 'Z', // Drop millisecond precision

    // NOTE: parses client value into date
    parseValue: value => value && moment.utc(value).hours(12),

    // NOTE: parse ast literal to date
    parseLiteral: ast =>
      (ast.kind === Kind.STRING ? moment.utc(ast.value).hours(12) : null),
  }),
  Datetime: new GraphQLScalarType({
    name: 'Datetime',
    description: 'ISO 8601 Datetime string',

    // NOTE: serialize date value into string
    serialize: value =>
      value &&
      moment
        .utc(value)
        .toISOString()
        .split('.')[0] + 'Z', // Drop millisecond precision

    // NOTE: parses client value into date
    parseValue: value => value && moment.utc(value),

    // NOTE: parse ast literal to date
    parseLiteral: ast =>
      (ast.kind === Kind.STRING ? moment.utc(ast.value) : null),
  }),
  CurrencyValue: new GraphQLScalarType({
    name: 'CurrencyValue',
    description: 'Currency, ie "0.500"',

    // NOTE: serialize currency
    serialize: value => String(value),

    // NOTE: parses client value into date
    parseValue: value => formatNumberForDinars(value),

    // NOTE: parse ast literal to date
    parseLiteral: ast =>
      (ast.kind === Kind.STRING ? formatNumberForDinars(ast.value) : null),
  }),
  LocalTime: new GraphQLScalarType({
    name: 'LocalTime',
    description: 'LocalTime custom scalar type',

    // NOTE: serialize LocalTime
    serialize: value => String(value),

    // NOTE: parses client value into date
    parseValue: value => String(value),

    // NOTE: parse ast literal to date
    parseLiteral: ast => (ast.kind === Kind.STRING ? ast.value : null),
  }),
  URL: new GraphQLScalarType({
    name: 'URL',
    description: 'Standart URL type',

    serialize(value) {
      if (value) {
        return new URL(value.toString()).toString();
      }
      return value;
    },

    parseValue: value => (value ? new URL(value.toString()) : value),

    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) return null;
      if (ast.value) {
        return new URL(ast.value.toString());
      }
      return ast.value;
    },
  }),
};
