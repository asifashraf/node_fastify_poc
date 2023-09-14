const { existsSync, readFileSync } = require('fs');
const find = require('find');
const { join: pathJoin } = require('path');
const {
  addMockFunctionsToSchema,
  gql,
} = require('apollo-server-express');
const crypto = require('crypto');
const { mapSchema, getDirective, MapperKind } = require('@graphql-tools/utils');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { getGraphQLRateLimiter, RedisStore } = require('graphql-rate-limit');
const { merge } = require('lodash');
const moment = require('moment');
const { defaultFieldResolver } = require('graphql');
const redis = require('../redis');
const { getDirectories } = require('./lib/util');
const { isTest, mocksEnabled } = require('../config');
const SlackWebHookManager = require('./schema/slack-webhook-manager/slack-webhook-manager');

function loadSchema() {
  const schemaTypes = getDirectories(pathJoin(__dirname, 'schema'));

  const typeSchemas = [];
  const schemaFiles = find.fileSync(
    /\.graphql$/,
    pathJoin(__dirname, 'schema'),
  );
  schemaFiles.forEach(schemaFile =>
    typeSchemas.push(readFileSync(schemaFile, 'utf8')),
  );

  const typeResolvers = [];
  schemaTypes.forEach(t => {
    const resolverFile = `./schema/${t}/resolvers`;
    if (existsSync(pathJoin(__dirname, `${resolverFile}.js`)))
      typeResolvers.push(require(resolverFile));
  });

  // In production there is a single schema file
  if (typeSchemas.length === 0) {
    typeSchemas.push(
      readFileSync(pathJoin(__dirname, '..', 'schema.graphql'), 'utf8'),
    );
  }
  const typeDefs = gql`
    ${typeSchemas.join('\n')}
  `;
  const resolvers = merge({}, ...typeResolvers);

  function requireAuthDirectiveTransformer(schema, directiveName) {
    return mapSchema(schema, {
      [MapperKind.FIELD]: (fieldConfig, fieldName, typeName, schema) => {
        const requireAuthDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (requireAuthDirective) {
          const { resolve = defaultFieldResolver } = fieldConfig;
          fieldConfig.resolve = async function (source, args, context, info) {
            if (context.skipAuthChecks) {
              return resolve(source, args, context, info);
            }
            if (!context.auth || (!context.auth.uid && !context.auth.id))
              throw new Error('Insufficient privileges !');
            return resolve(source, args, context, info);
          };
          return fieldConfig;
        }
      }
    });
  }

  function requirePermissionsDirectiveTransformer(schema, directiveName) {
    return mapSchema(schema, {
      [MapperKind.FIELD]: (fieldConfig, fieldName, typeName, schema) => {
        const requirePermissionDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
        if (requirePermissionDirective) {
          const { permissions } = requirePermissionDirective;
          const { resolve = defaultFieldResolver } = fieldConfig;
          fieldConfig.resolve = async function (source, args, context, info) {
            if (!context.auth || (!context.auth.uid && !context.auth.id))
              throw new Error('Insufficient privileges !');

            if (context.skipAuthChecks) {
              return resolve(source, args, context, info);
            }
            if (!context.auth.permissions || (context.auth.permissions && context.auth.permissions.length === 0)) {
              SlackWebHookManager.sendTextToSlack(
                `
[!!!PermissionDenied!!!]
Endpoint: ${fieldName ? fieldName : '--internal--'} / ExpectedPermission: ${JSON.stringify(permissions)}
Email: ${context.auth.email} / Id: ${context.auth.id} / (HasNoPermissions) / IP: ${context.clientIp} / Provider: ${context.auth.authProvider}
RequestId: ${context.requestId}`);
              throw new Error('Unauthorized to perform this action');
            }
            permissions.forEach(permission => context.checkPermission(permission, fieldName));
            return resolve(source, args, context, info);
          };
          return fieldConfig;
        }
      }
    });
  }

  function requireRolesDirectiveTransformer(schema, directiveName) {
    return mapSchema(schema, {
      [MapperKind.FIELD]: (fieldConfig, fieldName, typeName, schema) => {
        const requireAuthDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (requireAuthDirective) {
          const { roles } = requireAuthDirective;
          const { resolve = defaultFieldResolver } = fieldConfig;
          fieldConfig.resolve = async function (source, args, context, info) {
            if (context.skipAuthChecks) {
              return resolve(source, args, context, info);
            }
            roles.forEach(role => context.checkRole(role, fieldName));
            return resolve(source, args, context, info);
          };
          return fieldConfig;
        }
      }
    });
  }

  const getRateLimitId = (req) => {
    //const opName = req.body.operationName || 'Unknown';
    //const xHost = req.headers['host'] || 'Unknown';
    const xIp = req.clientIp;
    const xAppOs = req.headers['apollographql-client-name'] || req.headers['x-app-os'] || 'Unknown';
    const xAppVersion = req.headers['apollographql-client-version'] || req.headers['x-app-version'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const keyString = `${xIp}_${xAppOs}_${xAppVersion}_${userAgent}`;

    return {
      flags: {
        xIp,
        xAppOs,
        xAppVersion,
        userAgent
      },
      raw: keyString,
      hash: crypto.createHash('md5').update(keyString).digest('hex')
    };
  };

  const rateLimiter = getGraphQLRateLimiter({
    identifyContext: (ctx) => {
      const req = ctx.req;
      const { hash } = getRateLimitId(req);
      return `rate_${hash}`;
    },
    store: new RedisStore(redis),
  });

  function rateLimitDirectiveTransformer(schema, directiveName) {
    return mapSchema(schema, {
      [MapperKind.FIELD]: (fieldConfig, fieldName) => {
        const rateLimitDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (rateLimitDirective) {
          const { max, window } = rateLimitDirective;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async (source, args, context, info) => {
            const errorMessage = await rateLimiter(
              { source, args, context, info },
              { max, window }
            );

            if (errorMessage) {
              const {
                hash,
                raw
              } = getRateLimitId(context.req);

              SlackWebHookManager.sendTextToSlack(
                `
                [!!!RateLimiterTriggered!!!]
                Endpoint: ${fieldName}
                IpAddress: ${context.req.clientIp}
                RateLimitIdRaw: ${raw}
                RateLimitIdHash: rate_${hash}
              `);
              throw new Error(errorMessage);
            }
            return resolve(source, args, context, info);
          };
          return fieldConfig;
        }
      }
    });
  }

  let executableSchema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  executableSchema = rateLimitDirectiveTransformer(executableSchema, 'rateLimit');
  executableSchema = requireAuthDirectiveTransformer(executableSchema, 'requireAuth');
  executableSchema = requirePermissionsDirectiveTransformer(executableSchema, 'requirePermissions');
  executableSchema = requireRolesDirectiveTransformer(executableSchema, 'requireRoles');

  if (mocksEnabled && !isTest) {
    console.log('Schema mocks enabled');
    addMockFunctionsToSchema({
      schema: executableSchema,
      preserveResolvers: true,
      mocks: {
        Date: () => moment.utc().hours(12),
        Datetime: () => moment.utc().hours(12),
        LocalTime: () => '12:00',
        CurrencyValue: () => '0.500',
      },
    });
  }

  return executableSchema;
}

module.exports = loadSchema;
