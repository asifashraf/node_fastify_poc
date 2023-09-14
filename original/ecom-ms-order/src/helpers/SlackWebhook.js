module.exports = function SlackWebhook(opts) {
    const { httpRequest, logger, config } = opts;
    const _channels = {
        'alerts': config.slack.channel,
    }
    const _colors = {
        'error': '#FC3D14',
        'info': '#FCF214',
        'debug': '#26FC14',
    }
    return ({
        sendAlert: async function (obj, channel = 'alerts') {
            if(config.enableSlackWebhooks === false) return false;
            const messageBody = {
                username: 'Talabat MS Alert'
            }
            if (obj.isText) {
                messageBody['text'] = `${obj.text} - [${config.env}]`;
            }
            if (obj.isObject) {
                messageBody['attachments'] = [
                    {
                        color: _colors[obj.color] || '#14EBFC',
                        fields: [
                            {
                                title: `${obj.title} - [${config.env}]`,
                                value: JSON.stringify(obj.data, Object.getOwnPropertyNames(obj.data)),
                                short: false
                            }
                        ]
                    }
                ];
            }
            try {
                const response = await httpRequest.send({
                    path: _channels[channel],
                    method: 'POST',
                    params: messageBody,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
    
                return response;
            } catch (ex) {
                logger.error(ex, `SlackWebhook > Exception >`);
            }
            return false;
        }
    })
}