/* eslint-disable no-await-in-loop */

const axios = require('axios');
class Revel {
  constructor(url, key, secret) {
    this.url = url;
    this.key = key;
    this.secret = secret;
  }
  getCurrentDate() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, -1);
  }
  async createData(command, data) {
    return this.makeCommand(command, 'POST', data);
  }
  async readData(command, data) {
    return this.makeCommand(command, 'GET', data);
  }
  async readAllData(command, data = {}) {
    const pageSize = 100;
    const retData = {
      objects: [],
    };
    data.limit = pageSize;
    data.offset = 0;
    let totalCount = 0;
    let firstTime = true;

    while (retData.objects.length < totalCount || firstTime) {
      firstTime = false;
      const rsp = await this.makeCommand(command, 'GET', data);
      totalCount = rsp.meta.total_count;
      retData.objects = retData.objects.concat(rsp.objects);
      data.offset += pageSize;
    }
    return retData;
  }
  async updateDataHard(command, data) {
    return this.makeCommand(command, 'PUT', data);
  }
  async updateDataSoft(command, data) {
    return this.makeCommand(command, 'PATCH', data);
  }
  async deleteData(command, data) {
    return this.makeCommand(command, 'DELETE', data);
  }
  async makeCommand(command, method, data) {
    let url = `https://${this.url}${command}?api_key=${this.key}&api_secret=${this.secret}&format=json`;
    if (method === 'GET' && data)
      url += Object.keys(data).reduce(
        (a, v) => a + `&${v}=${encodeURIComponent(data[v])}`,
        ''
      );

    const timeout = 5000;
    const abort = axios.CancelToken.source();
    const id = setTimeout(
      () => abort.cancel(`revel Timeout of ${timeout}ms.`),
      timeout
    );

    const rsp = axios({
      method,
      url,
      cancelToken: abort.token,
      headers: {
        'API-AUTHENTICATION': this.key + ':' + this.secret,
      },
      data,
    }).then(
      response => {
        clearTimeout(id);
        return response.data;
      },
      error => {
        clearTimeout(id);
        throw new Error(error);
      }
    );
    return rsp;
  }
}
module.exports = Revel;
