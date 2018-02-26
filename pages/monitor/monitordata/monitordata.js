var usrCloud = require('../../../utils/usrCloudWx');
var md5util = require('../../../utils/md5.js');
var client;
//用户信息
var token;
var useraccount;
var password;
//设备信息
var devid;
var nowvalue;
var slaveIndex;
var devOnlineStatus;
Page({
    data: {
        status: 0
    },
    onLoad: function (options) {
        var that = this;
        var devicesInfo = JSON.parse(options.devicesInfo);
        this.setData({
            status: devicesInfo.onlineStatus
        });
        devOnlineStatus = devicesInfo.onlineStatus;
        //适配两个页面传递参数不同的办法   不是很好
        if (typeof options.devid == 'undefined') {
            devid = devicesInfo.devid;
        } else {
            devid = options.devid;
        }
        //处理数据
        that.handlerData(devicesInfo);
        //获取缓存中用户数据 同步的
        try {
            token = wx.getStorageSync('userinfo').data.token;
            useraccount = wx.getStorageSync('userinfo').data.account;
            password = wx.getStorageSync('userpass');
        } catch (e) {
            console.log('获取缓存失败' + e);
            wx.showToast({
                title: '获取缓存失败',
                icon: 'loading',
                duration: 2000
            });
            wx.reLaunch({
                url: '/pages/login/login'
            });
            return;
        }
        //1.获取数据点列表
        that.getDatasInfo(token);
        //2.判断在线状态开启 websocket
        that.openWebSocketConnect();
    },

    /**
     * 处理数据 转化为页面展示的样式
     */
    handlerData: function (devicesInfo) {
        var that = this;
        //修改数据
        switch (devicesInfo.protocol) {
            case 0:
                devicesInfo.protocol = 'Modbus RTU';
                break;
            case 1:
                devicesInfo.protocol = 'Modbus TCP';
                break;
            case 2:
                devicesInfo.protocol = 'TCP透传';
                break;
            default:
                break;
        }
        that.setData({devicesInfo: devicesInfo});
    },

    trim: function (s) {
        return s.replace(/(^\s*)|(\s*$)/g, "");
    },


    /**
     * 如果设备在线就开始websocket连接 否则只显示历史数据
     */
    openWebSocketConnect: function () {
        var that = this;
        wx.showLoading({
            title: '连接Socket中',
        });

        function USR_onConnAck(e) {
            if (e.code === 0) {
                wx.hideLoading();
                client.USR_SubscribeDevParsed(devid);
                setTimeout(function () {
                    client.USR_SubscribeUserParsed(useraccount);
                }, 100);
            }
            console.log('USR_onConnAck', e);
        }

        function USR_onConnLost(e) {
            console.log('USR_onConnLost', e);
        }

        function USR_onRcvParsedDataPointPush(e) {
            var dataInfoList = that.data.dataInfoList;
            var dataPoints = e.dataPoints;
            for (var key in dataPoints) {
                var dataPoint = dataPoints[key];
                var dataInfoList = that.data.dataInfoList;
                for (var key in dataInfoList) {
                    if (dataInfoList[key].id == dataPoint.pointId&&dataInfoList[key].slaveIndex == dataPoint.slaveIndex) {
                        dataInfoList[key].value = dataPoint.value;
                        dataInfoList[key].createTime = that.getTime(new Date().getTime() / 1000, 'y-M-d h:m');
                    }
                }
            }
            that.setData({dataInfoList: dataInfoList});
            console.log('USR_onRcvParsedDataPointPush', e);
        }

        function USR_onSubscribeAck(e) {
            console.log('USR_onSubscribeAck', e);
        }

        function USR_onUnSubscribeAck(e) {
            console.log('USR_onUnSubscribeAck', e);
        }

        function USR_onRcvParsedDevStatusPush(e) {
            that.setData({
                status: e.status
            });
            console.log('USR_onRcvParsedDevStatusPush', e);
        }

        function USR_onRcvParsedDevAlarmPush(e) {
            console.log('USR_onRcvParsedDevAlarmPush', e);
        }

        let callback = {
            USR_onConnAck: USR_onConnAck,
            USR_onConnLost: USR_onConnLost,
            USR_onRcvParsedDataPointPush: USR_onRcvParsedDataPointPush,
            USR_onSubscribeAck: USR_onSubscribeAck,
            USR_onUnSubscribeAck: USR_onUnSubscribeAck,
            USR_onRcvParsedDevStatusPush: USR_onRcvParsedDevStatusPush,
            USR_onRcvParsedDevAlarmPush: USR_onRcvParsedDevAlarmPush
        };
        client = new usrCloud();
        client.Usr_Init('clouddata.usr.cn', 443, 2, callback);
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        if (client) {
            client.USR_DisConnect();
        }
    },

    /**
     * 开关处理按钮
     */
    operationSwitchChange: function (event) {
        var that = this;
        var dataid = event.currentTarget.id;
        var slaveIndex = event.currentTarget.dataset.slaveindex;
        var value = event.detail.value;
        wx.showModal({
            title:'确认'+(value?'打开':'关闭')+'?',
            success: function (res) {
                if (res.confirm) {
                    if (that.data.devicesInfo.onlineStatus === 0) {
                        that.switchRollBack(dataid);
                        return;
                    }
                    if (typeof dataid != 'undefiend' && typeof value != 'undefiend') {
                        // client.USR_PublishParsedSetDataPoint(devid, dataid, value ? 1 : 0);
                        client.USR_PublishParsedSetSlaveDataPoint(devid, slaveIndex, dataid, value ? 1 : 0);
                    }
                }
            }
        });
        that.switchRollBack(dataid);
    },
    /**
     *
     * 开关按钮回滚
     */
    switchRollBack: function (dataid) {
        this.setData({dataInfoList: this.data.dataInfoList});
    },


    /**
     * 获取焦点准备修改值记录一下当前值
     */
    readyChangeVaule: function (event) {
        nowvalue = event.detail.value;
    },
    /**
     * 修改数据
     */
    changeVaule: function (event) {
        var that = this;
        var value = event.detail.value;
        var dataid = event.currentTarget.id;
        var slaveIndex = event.currentTarget.dataset.slaveindex;
        wx.showModal({
            content: '是否确定操作？',
            success: function (res) {
                if (res.confirm) {
                    //如果设备在线推送 否则提示用户
                    if (devOnlineStatus === 1) {
                        // client.USR_PublishParsedSetDataPoint(devid, dataid, value);
                        client.USR_PublishParsedSetSlaveDataPoint(devid, slaveIndex, dataid, value);
                    } else {
                        wx.showToast({
                            title: '设备未在线',
                            icon: 'loading',
                            duration: 2000
                        });
                    }
                }

                that.setData({dataInfoList: that.data.dataInfoList});
            }
        })
    },


    /**
     * 获取数据点列表
     */
    getDatasInfo: function () {
        var that = this;
        wx.request({
            url: 'https://cloudapi.usr.cn/usrCloud/datadic/getDataPointInfoByDevice',
            method: 'POST',
            data: {
                deviceIds: [
                    devid
                ],
                token: token
            },
            success: function (res) {
                //获取设备下的数据点遍历展示
                var dataInfos = res.data.data;
                var dataInfoList = [];
                var iotDataDescription;
                for (var key in dataInfos) {
                    var slavesList = dataInfos[key].slaves;
                    for (var key2 in slavesList) {
                        var slaveIndex = slavesList[key2].slaveIndex;
                        var iotDataDescriptionList = slavesList[key2].iotDataDescription;
                        for (var key3 in iotDataDescriptionList) {
                            iotDataDescription = iotDataDescriptionList[key3];
                            iotDataDescription.slaveIndex = slaveIndex;
                            dataInfoList.push(iotDataDescription);
                        }
                    }
                }
                that.setData({dataInfoList: dataInfoList});
                //取出里面设备id和数据点id 组成一个数组
                var DataDevIdlist = that.makeDevDataId(dataInfoList)
                //获取最后一条数据
                that.getLastDataInfo(DataDevIdlist);
                client.USR_Connect(useraccount, password);},
        })

    },
    /**
     * 制作一个获取最后一条数据的数组
     */
    makeDevDataId: function (dataInfoList) {
        var DataDevIdlist = [];
        for (var key in dataInfoList) {
            var DataDevId = {
                'devId': devid,
                'slaveIndex': dataInfoList[key].slaveIndex,
                'dataId': dataInfoList[key].id
            }
            DataDevIdlist.push(DataDevId);
        }
        return DataDevIdlist;
    },
    /**
     * 获取最后一条数据
     */
    getLastDataInfo: function (DataDevIdlist) {
        var that = this;
        //再去获取属于此设备的最后一条数据
        wx.request({
            url: 'https://cloudapi.usr.cn/usrCloud/datadic/getLastData',
            method: 'POST',
            data: {
                devDataIds: DataDevIdlist,
                token: token
            },
            header: {
                'content-type': 'application/json' // 默认值
            },
            success: function (res) {
                var lastDataInfoList = [];

                var lastDataInfos = res.data.data;

                var dataInfoList = that.data.dataInfoList;
                //更新数据
                for (var key in lastDataInfos) {
                    for (var key2 in dataInfoList) {
                        if (lastDataInfos[key].dataPointId == dataInfoList[key2].id&&lastDataInfos[key].slaveIndex == dataInfoList[key2].slaveIndex) {
                            dataInfoList[key2].alarm = lastDataInfos[key].alarm;
                            dataInfoList[key2].createTime = that.getTime(lastDataInfos[key].createTime, 'y-M-d h:m');
                            dataInfoList[key2].value = lastDataInfos[key].value;
                        }
                    }
                }
                that.setData({dataInfoList: dataInfoList});
            }
        })
    },


    /**
     * 转换时间格式
     */
    getTime: function (time, format) {
        var date = new Date(time * 1000);
        if (format === undefined) {
            format = date;
            date = new Date();
        }
        var map = {
            "y": date.getFullYear(),//年
            "M": date.getMonth() + 1, //月份
            "d": date.getDate(), //日
            "h": date.getHours(), //小时
            "m": date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes(), //分
            "s": date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds(), //秒
            "q": Math.floor((date.getMonth() + 3) / 3), //季度
            "S": date.getMilliseconds() //毫秒
        };
        format = format.replace(/([yMdhmsqS])+/g, function (all, t) {
            var v = map[t];
            if (v !== undefined) {
                if (all.length > 1) {
                    v = '0' + v;
                    v = v.substr(v.length - 2);
                }
                return v;
            }
            return all;
        });
        return format;
    },
    /**
     * 获取历史记录图表
     */
    getHistory: function (param) {
        wx.navigateTo({
            url: '../historyData/history?token=' + wx.getStorageSync("token") + "&deviceId=" + devid + "&slaveIndex=" + param.currentTarget.dataset.slaveindex + "&dataPointId=" + param.currentTarget.dataset.dataid
        })
    }
});
