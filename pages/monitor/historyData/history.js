Page({
    data: {
        token: wx.getStorageSync("token"),
        deviceId: wx.getStorageSync("deviceId"),
        slaveIndex: wx.getStorageSync("slaveIndex"),
        dataPointId: wx.getStorageSync("dataPointId")
    },
});