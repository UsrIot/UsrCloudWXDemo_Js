Page({
  onLoad: function (options) {
    this.setData({
      dataPointId: options.dataPointId,
      deviceId: options.deviceId,
      slaveIndex: options.slaveIndex,
      token: options.token
    })
  }
});