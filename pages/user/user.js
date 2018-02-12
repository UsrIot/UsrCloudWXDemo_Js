//获取应用实例
const app = getApp()
Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  onLoad: function () {
    var that=this;
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }

    //在缓存中获取用户的透传云账号
    wx.getStorage({
      key: 'userinfo',
      success: function (res) {
        that.setData({
          userAccount : res.data.data.account
        });
        console.log(res);
      }
    })
  },
  MoreCloudfunction: function () {
    console.log("MoreCloudfunction");
  },
  Signout: function () {
    wx.showModal({
      title: '确定退出？',
    
      success: function (res) {
        if (res.confirm) {
          wx.clearStorage();
          wx.reLaunch({
            url: '../../pages/login/login'
          })
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },
  AboutCloud: function (el) {
    console.log("AboutCloud");
  }
})

