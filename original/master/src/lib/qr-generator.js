const qrcode = require('qrcode');


exports.generateQrCode = async obj => {
  function getTLVForValue(tagNum, tagValue) {
    const tag = Buffer.from([tagNum], 'utf8');
    const length = Buffer.from([tagValue.length], 'utf8');
    const value = Buffer.from(tagValue, 'utf8');
    return Buffer.concat([tag, length, value]);
  }
  const arr = [];
  for (const [key, value] of Object.entries(obj)) {
    arr.push(getTLVForValue(key, value));
  }
  const buffer = Buffer.concat(arr);
  const base64 = buffer.toString('base64');
  return qrcode.toDataURL(base64).then(url => {
    return url;
  });
};
