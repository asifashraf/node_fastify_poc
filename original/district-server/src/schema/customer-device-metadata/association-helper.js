exports.customerDeviceMetadataAssociation = async (
  context,
  customerId,
  deviceType,
  deviceId,
) => {
  try {
    await context.deviceMetadata.save({
      customerId,
      deviceIdentifierType: deviceType,
      deviceId,
    });
  } catch (err) {
    const { stack, message } = err;
    context.kinesisLogger.sendLogEvent({ stack, message },
      'customerDeviceMetadataAssociation-error')
      .catch(err => console.log(err));
  }
};
