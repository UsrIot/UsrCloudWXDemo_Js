
Page({
  data: {
    devicesInfoList: [], //放置返回数据的数组  
    isFromSearch: true,   // 用于判断searchSongList数组是不是空数组，默认true，空的数组  
    searchPageNum: 15,   // 设置加载的第几次，默认是第一次  
    callbackcount: 0,      //返回数据的个数  
    searchLoading: false, //"上拉加载"的变量，默认false，隐藏  
    searchLoadingComplete: false  //“没有数据”的变量，默认false，隐藏  
  },

  onLoad: function (option) {
    this.setData({
      searchPageNum: 20,   //第一次加载，设置20 
      devicesInfoList: [],  //放置返回数据的数组,设为空  
      isFromSearch: true,  //第一次加载，设置true  
      searchLoading: true,  //把"上拉加载"的变量设为true，显示  
      searchLoadingComplete: false, //把“没有数据”设为false，隐藏  
    })

  },
  // 点击获取设备下的数据点
  onClickDeviceInfo: function (event) {
    var that = this;

    var devicesInfoList = that.data.devicesInfoList;
    var devid = event.currentTarget.dataset.devid;
    for (var key in devicesInfoList) {
      if (devicesInfoList[key].devid == devid) {
        var devicesInfo = devicesInfoList[key];
      }
    }

    wx.navigateTo({
      url: '/pages/monitor/monitordata/monitordata?devicesInfo=' + JSON.stringify(devicesInfo),
    })
  },
  //搜索，访问网络  
  fetchSearchList: function () {
    var that = this;
    let searchPageNum = that.data.searchPageNum,//把第几次加载次数作为参数  
      callbackcount = that.data.callbackcount; //返回数据的个数  
    //获取缓存中用户数据
    
    wx.getStorage({
      key: 'userinfo',
      success: function (res) {
        var userinfo = (res.data.data);
        that.setData({ userinfo: userinfo });
        if (userinfo.token.length != 0) {
          wx.request({
            url: 'https://cloudapi.usr.cn/usrCloud/dev/getDevs',
            method: 'POST',
            data: {
              property_needed: [
                "name",
                "onlineStatus",
                "pass"
              ],
              page_param: {
                offset: 0,
                limit: searchPageNum
              },
              sort: 'up',
              token: userinfo.token
            },
            success: function (res) {
              var devicesinfo = res.data.data;

              that.setData({ devicesinfo: devicesinfo });

              //判断是否有数据，有则取数据  
              if (devicesinfo.total != 0) {
                if (devicesinfo.total > devicesinfo.dev.length) {
                  var issearchLoading = true;
                } else {
                  var issearchLoading = false;
                }
                that.setData({
                  devicesInfoList: devicesinfo.dev, //获取数据数组  
                  searchLoading: issearchLoading   //把"上拉加载"的变量设为false，显示 
                });
              } else {
                //没有数据了，把“没有数据”显示，把“上拉加载”隐藏  
                that.setData({
                  searchLoadingComplete: true, //把“没有数据”设为true，显示  
                  searchLoading: false  //把"上拉加载"的变量设为false，隐藏  
                });
              }
            },

          })
        }

      },
    })


  },
  onClickDataInfo: function (event) {
    var menuid = event.currentTarget.dataset.dataid;
  
  },
  //滚动到底部触发事件  
  searchScrollLower: function () {
    let that = this;
    if (this.data.devicesInfoList.length < this.data.devicesinfo.total) {
      if (that.data.searchLoading && !that.data.searchLoadingComplete) {
        that.setData({
          searchPageNum: that.data.searchPageNum + 20,  //每次触发上拉事件，把searchPageNum+1  
          isFromSearch: false  //触发到上拉事件，把isFromSearch设为为false  
        });
        that.fetchSearchList();
      }
    } else {
      that.setData({
        searchLoadingComplete: true, //把“没有数据”设为true，显示  
        searchLoading: false  //把"上拉加载"的变量设为false，隐藏  
      });
    }
  }
  , onShow: function () {
    this.fetchSearchList();
  }
})  
