
var userinfo;
Page({
  data: {
    height: 'auto',
    showModalStatus: false,
  },

  onLoad: function (option) {
    var that = this;
    //调用wx.getSystemInfo接口，然后动态绑定组件高度
    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          height: res.windowHeight
        })
      }
    })

    //1，获取缓存中的用户信息
    wx.getStorage({
      key: 'userinfo',
      success: function (res) {
        userinfo = res.data.data;
        that.getDevicesList(userinfo.token);
      },
      fail: function (res) {
        console.log('获取缓存失败')
      }
    })
  },
  //获取设备列表
  getDevicesList: function (token) {
    var that = this;
    wx.request({
      url: 'https://cloudapi.usr.cn/usrCloud/dev/getDevs',
      method: 'POST',
      data: {
        property_needed: [
          "name",
          "onlineStatus",
          "pass"
        ],
        sort: 'up',
        token: token,
      },
      success: function (res) {
        var devicesinfo = res.data.data;
        var devicesinfodevs = devicesinfo.dev;
        var markers = [];
        //遍历设备列表取到里面的信息
        for (var key in devicesinfodevs) {
          //取出经度纬度设备id组成一个数组
          var devposition = devicesinfodevs[key].position;
          if (typeof devposition != 'undefined') {
            var LatitudeLongitude = devposition.split(",");
          } else {
            var LatitudeLongitude = [
              '', ''
            ]
          }
          var devmapinfo = {
            'iconPath': (devicesinfodevs[key].onlineStatus) == 1 ? "/images/index/mapsign.png" : "/images/index/mapsignoff.png",
            'id': devicesinfodevs[key].devid,
            'latitude': LatitudeLongitude[1],
            'longitude': LatitudeLongitude[0],
            'width': 32,
            'height': 32,
            'name': devicesinfodevs[key].name,
            'address': devicesinfodevs[key].address,
            'pointCount': devicesinfodevs[key].pointCount,
            'onlineStatus': devicesinfodevs[key].onlineStatus,
            'protocol': devicesinfodevs[key].protocol,
            'pass': devicesinfodevs[key].pass,
            'devid': devicesinfodevs[key].devid,
            'polling_interval': devicesinfodevs[key].polling_interval
          }
          markers.push(devmapinfo);
        }
        that.setData({
          markers: markers,
          devicesinfodevs: devicesinfodevs
        });
      },
      fail: function (res) {
        console.log('获取设备列表失败');
      }
    })
  },


  //标记点击事件
  markertap(event) {
    var that = this;
    var currentStatu = event.currentTarget.dataset.statu;
    var devinfosList = that.data.markers;
    var devid = event.markerId;
    if (typeof devid != 'undefiend') {
      for (var key in devinfosList) {
        if (devinfosList[key].id == devid) {
          var devinfo = devinfosList[key];
          that.setData({ devinfo: devinfo });
        }
      }
    }
    if (!that.data.showModalStatus) {
      //动画显示
      this.util(currentStatu);
    }
  },

  powerDrawer: function (e) {
    var that = this;
    var showModalStatus = that.data.showModalStatus;
    var currentStatu = e.currentTarget.dataset.statu;

    var operationid = e.currentTarget.dataset.id;
    var devicesinfodevs = this.data.devicesinfodevs;
    //获取单个设备的数据信息
    for (var key in devicesinfodevs) {
      if (devicesinfodevs[key].id = operationid) {
        var devicesInfo = devicesinfodevs[key];
      }
    }
    if (typeof operationid != 'undefined') {
      switch (operationid) {
        case '0':
          break;
        case '1':
          wx: wx.navigateTo({
            url: '/pages/monitor/monitordata/monitordata?devicesInfo=' + JSON.stringify(that.data.devinfo) + '&&devid=' + that.data.devinfo.id,
          })
          break;
        case '2':
          break;
      }
    }
    this.util(currentStatu)
  },

  mapbindtap: function () {

    if (this.data.showModalStatus) {
      this.util('close');
    }
  },

  util: function (currentStatu) {

    var that = this;
    /* 动画部分 */
    // 第1步：创建动画实例
    var animation = wx.createAnimation({
      transformOrigin: "0% 0%",
      duration: 200, //动画时长
      timingFunction: "linear", //线性
      delay: 0 //0则不延迟
    });

    // 第2步：这个动画实例赋给当前的动画实例
    this.animation = animation;

    // 第3步：执行第一组动画
    animation.opacity(0).rotateX(-100).step();

    // 第4步：导出动画对象赋给数据对象储存
    this.setData({
      animationData: animation.export()
    })

    // 第5步：设置定时器到指定时候后，执行第二组动画
    setTimeout(function () {
      // 执行第二组动画
      animation.opacity(1).rotateX(0).step();
      // 给数据对象储存的第一组动画，更替为执行完第二组动画的动画对象
      this.setData({
        animationData: animation
      })

      //关闭
      if (currentStatu == "close") {
        var height = that.data.height;
        this.setData(
          {
            height: height + 200,
            showModalStatus: false
          }
        );
      }
    }.bind(this), 200)

    // 显示
    if (currentStatu == "open") {
      var height = that.data.height;
      this.setData(
        {
          height: height - 200,
          showModalStatus: true
        }
      );
    }
  }
})