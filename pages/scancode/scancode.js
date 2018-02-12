// pages/scancode/scancode.js
//用户信息
var token;
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var that = this;
    //获取缓存中用户数据 同步的
    try {
      token = wx.getStorageSync('userinfo').data.token;
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
    that.scanCode();

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },
  /**
   * 扫码添加
   */
  scanCode: function () {
    wx.scanCode({
      success: (res) => {
        var result = res.result;
        console.log(result)
        wx.request({
          url: 'https://cloudapi.usr.cn/usrCloud/dev/addDevice',
          method: 'POST',
          data: {
            device: {
              type: "5",
              QRcode: result,
            },
            token: token
          },
          header: {
            'content-type': 'application/json' // 默认值
          },
          success: function (res) {
            console.log(res)
            if (res.data.status == 0) {
              wx.showToast({
                title: '成功',
                icon: 'success',
                duration: 2000
              })
            } else {
              wx.showToast({
                title: '失败',
                icon: 'loading',
                duration: 1000
              })
            }

          }
        })

      },
      fail: (res) => {
        console.log(res);

      }
    })
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})