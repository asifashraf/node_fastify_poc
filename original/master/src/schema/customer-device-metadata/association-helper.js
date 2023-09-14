exports.customerDeviceMetadataAssociation = async (
  context,
  customerId,
  deviceType,
  deviceId
) => {
  // Wrapped in try-catch so request wouldn't fail
  try {
    await context.deviceMetadata.save({
      customerId,
      deviceIdentifierType: deviceType,
      deviceId,
    });
    // console.log('Device Metadata Saved');
  } catch (err) {
    // console.log('Device Metadata Save Error : ', err);
  }
};
