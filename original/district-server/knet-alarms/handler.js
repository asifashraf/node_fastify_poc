const Axios = require('axios');
const axios = Axios.create({
  baseURL: 'https://hooks.slack.com',
  timeout: 60000,
});

const post = params => {
  return axios.post(
    '/services/T8E7ZC91S/B95A23M6K/D9cztU2RePkCuFd4xQNZI9WY',
    params
  );
};

const knetAlarmEvent = (event, context, callback) => {
  const { Message: message, Subject: subject } = event.Records[0].Sns;

  const data = {
    text: `*${subject}*\n:ping: <!channel>`,
    attachments: [
      {
        color: 'danger',
        text: message,
        fallback: message,
      },
    ],
  };

  return post(data)
    .then(() => {
      callback(null, {
        message: 'Success',
        event,
      });
    })
    .catch(err => {
      callback(err, {
        message: `Error: ${err.message || err}`,
        event,
      });
    });
};

module.exports = {
  knetAlarmEvent,
};
