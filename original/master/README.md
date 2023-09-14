# Cofe District Server

### Requirements

* **Node** => 8.0.0
* **Postgres** 9.5 or later. Homebrew installation is recommended.
* **PostGIS** 2.4.2 or later. Homebrew installation is recommended.

### Installation

1. `yarn` to install Node dependencies
2. `createdb cofe-district && createdb cofe-district-test` to create relevant databases
3. `cp .env.example .env` to initialize your `.env` file
4. `yarn dev` to run development environment
5. `yarn seed` to generate seed data
6. Review schema at http://localhost:4000/graphiql, login is bpxl/bpxl

#### Upgrading from Postgres v9.x

1. `mkdir /usr/local/var/pgsql.old`
2. `mv /usr/local/var/postgres /usr/local/var/pgsql.old`
3. `initdb /usr/local/var/postgres -E utf8`
4. `launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql.plist`
5. `launchctl load ~/Library/LaunchAgents/homebrew.mxcl.postgresql.plist`
6. `createdb cofe-district && createdb cofe-district-test`

## Running queries

Once the server is running you can run queries through http://localhost:4000/graphiql, user/pw `bpxl/bpxl`.
You can override the user info in development mode by either:

* Passing in a variable along with your request with a `__user` object, such as: `{"__user": { "id": "my-user-id"}}`
* Editing the DEFAULT_USER_ID setting in the `.env` file.
* For OrderSetComments you will also need to send the email and user name. You can do this by editing DEFAULT_USER_EMAIL and DEFAULT_USER_NAME in the `.env` file or via the `__user` object variable. i.e.: `{"__user": { "id":"my-user_id", "name":"my-user-name", "email":"my-user-email" }}`

## KNET Alarms Lambda Function

A Lambda function forwards KNET alarms (via the KnetAlarms SNS topic) onto a Slack webhook. To make changes to the Lambda function, first install the `serverless` CLI tool:

```
npm install -g serverless
```

Then configure an AWS profile (you'll need the AWS key and secret for the Lambda user, ask in Slack):

```
serverless config credentials --provider aws --key LAMBDA_KEY --secret LAMBDA_SECRET --profile cofe
```

Then `cd` into this directory:

```
cd ./knet-alarms/
```

Run npm install (the knet-alarms service has it's own dependencies):

```
npm install
```

Make your code changes, then run:

```
serverless deploy
```
