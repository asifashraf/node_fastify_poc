// eslint-disable-next-line no-unused-vars
const cateringRequestCreate = async (args, context) => {
  // It seems like we no longer do catering
  return true;
  /*
  const { firstName, lastName } = await context.customer.getById(
    args.customerId
  );
  const customerName = `${firstName} ${lastName}`;
  const subject = `Catering Request: ${customerName}`;

  // prettier-ignore
  const text = `
This catering request was captured by a request from the Cofe District mobile app.

Requested By:
${customerName}

Event Date & Time:
${args.eventDate} ${args.eventTime}

Event Location:
${args.eventLocation}

Contact Email:
${args.contactEmail}

Contact Phone:
${args.contactPhone}

Additional Info:
${args.additionalInfo}
`;

  // prettier-ignore
  const html = `
This catering request was captured by a request from the Cofe District mobile app.

<strong>Requested By:</strong>
${customerName}

<strong>Event Date & Time:</strong>
${args.eventDate} ${args.eventTime}

<strong>Event Location:</strong>
${args.eventLocation}

<strong>Contact Email:</strong>
${args.contactEmail}

<strong>Contact Phone:</strong>
${args.contactPhone}

<strong>Additional Info:</strong>
${args.additionalInfo}
`.replace(/\n/g, '<br/>');

  return emailSend(doNotReply, { to: [catering] }, subject, {
    html,
    text,
  });
   */
};

module.exports = {
  cateringRequestCreate,
};
