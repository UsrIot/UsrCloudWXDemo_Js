let that;
Page({
    data: {
        token: '',
        deviceId: '',
        slaveIndex: '',
        dataPointId: '',
        startTime:Date.parse(new Date())/1000-3600,
        stopTime:Date.parse(new Date())/1000
    },
    onLoad: function (options) {
        that = this;
        that.setData({
            deviceId:options.deviceId,
            slaveIndex:options.slaveIndex,
            dataPointId:options.dataPointId
        });
        wx.getSystemInfo({
            success: function (res) {
                that.setData({
                    width: res.windowWidth,
                    height: res.windowHeight
                })
            }
        })
    },
    bindPickerChange:function(res){
        console.log(res);
        if(res.detail.value==0){
            that.setData({
                startTime:Date.parse(new Date())/1000-3600
            })
        }else{
            that.setData({
                startTime:Date.parse(new Date())/1000-86400
            })
        }
    }
});