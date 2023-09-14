const Axios = require('axios');

const WebHookURLHost = 'https://hooks.slack.com/';

const axios = Axios.create({
  baseURL: WebHookURLHost,
  timeout: 6000,
});

class SlackWebHookManager {

  static getWebHookUrlPath(path) {
    if (path) {
      return path;
    } else {
      return require('../../../config').slackWebHookUrlPath;
    }
  }

  static async sendTextAndErrorToSlack(text, error, path) {
    console.error({ text, error });
    return;

    const webHookURL = this.getWebHookUrlPath(path);
    try {
      const messageBody = {
        username: 'Error notifier', // This will appear as user name who posts the message
        text: '```' + text + '```',
        attachments: [
          // attachments, here we also use long attachment to use more space
          {
            color: '#2eb886',
            fields: [
              {
                title: 'Error',
                value: JSON.stringify(error, Object.getOwnPropertyNames(error)),
                short: false,
              },
            ],
          },
        ],
      };
      this.sendSlackMessage(messageBody, webHookURL);
    } catch (err) { }
  }

  static async sendTextToSlack(text, path) {

    console.info({ text });
    return;

    const webHookURL = this.getWebHookUrlPath(path);
    try {
      const messageBody = {
        username: 'Error notifier', // This will appear as user name who posts the message
        text: '```' + text + '```',
      };
      this.sendSlackMessage(messageBody, webHookURL);
    } catch (err) { }
  }

  static async sendTextAndObjectToSlack(text, object, path) {
    console.info({ text, object });
    return;

    const webHookURL = this.getWebHookUrlPath(path);
    try {
      const messageBody = {
        username: 'Error notifier', // This will appear as user name who posts the message
        text: '```' + text + '```',
        attachments: [
          // attachments, here we also use long attachment to use more space
          {
            color: '#2eb886',
            fields: [
              {
                title: 'Object',
                value: JSON.stringify(
                  object,
                  Object.getOwnPropertyNames(object)
                ),
                short: false,
              },
            ],
          },
        ],
      };
      this.sendSlackMessage(messageBody, webHookURL);
    } catch (err) { }
  }

  static async sendTextAndObjectAndImage({ text, object, image, webhookUrl }) {
    console.info({ text, object, image });
    return;

    const webHookURL = this.getWebHookUrlPath(webhookUrl);
    try {
      const textBlock = (valText, valObject) => {
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + `${valText}` + '```' + (valObject ? '\n' + '```' + `${JSON.stringify(valObject)}` + '```' : ''),
          },
        };
      };

      // const imgBlock = (valImage) => {
      //   return {
      //     type: 'image',
      //     image_url: valImage,
      //     alt_text: 'uploaded image'
      //   };
      // };

      const blocks = [];
      if (text) {
        blocks.push(textBlock(text, object));
      }
      if (image) {
        if (blocks.length > 0) {
          blocks[0].accessory = {
            type: 'image',
            image_url: `${image}`,
            alt_text: 'image',
          };
        }
      }
      const messageBody = {
        blocks: [
          ...blocks
        ],
      };
      if (blocks.length > 0) {
        this.sendSlackMessage(JSON.stringify(messageBody), webHookURL);
      }
    } catch (err) { }
  }

  static async sendDataBlocksAndButton(text, object, webhookUrl, button) {

    console.info({ text, object, button })
    return;

    const webHookURL = this.getWebHookUrlPath(webhookUrl);

    const fields = [];
    for (const [key, value] of Object.entries(object)) {
      fields.push({
        'type': 'mrkdwn',
        'text': `*${key}:*\n${value}`
      });
    }

    try {
      const blocks = [
        {
          'type': 'header',
          'text': {
            'type': 'plain_text',
            text,
            'emoji': true
          }
        },
        {
          'type': 'section',
          fields
        }
      ];

      if (button) {
        blocks.push(
          {
            'type': 'actions',
            'elements': [
              {
                'type': 'button',
                'text': {
                  'type': 'plain_text',
                  'text': 'View Details',
                  'emoji': true
                },
                'url': button
              }
            ]
          }
        );
      }

      const messageBody = { blocks };

      this.sendSlackMessage(JSON.stringify(messageBody), webHookURL);

    } catch (err) { }
  }

  /**
   * Handles the actual sending request.
   * We're turning the https.request into a promise here for convenience
   * @param webhookURL
   * @param messageBody
   * @return {Promise}
   */
  static sendSlackMessage(messageBody, webHookURL) {
    return axios.post(webHookURL, messageBody);
  }
}

module.exports = SlackWebHookManager;
