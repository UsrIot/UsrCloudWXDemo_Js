var md5util = require('../../utils/md5.js');
let that;
// pages/register/register.js
Page({

    /**
     * 页面的初始数据
     */
    data: {},

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        that=this;
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

    },
    login: function () {
        wx.reLaunch({
            url: '../login/login'
        })
    },
    submit: function (res0) {
        console.log('form', res0.detail.formId);
        if (res0.detail.value.checkPassword!=res0.detail.value.password){
            wx.showToast({
                "title":"密码不一致",
                "icon":"loading"
            });
            return false;
        }
        wx.login(
            {
                success: function (res) {
                    that.setData({
                        code:res.code,
                        formId:res0.detail.formId
                    });
                    wx.request({
                        url: 'https://cloudapi.usr.cn/usrCloud/user/wechatRegUser',
                        method:'POST',
                        data: {
                            "code": res.code,
                            "type": 0,
                            "regMethod": 1,
                            "account": res0.detail.value.username,
                            "password":md5util.hexMD5(res0.detail.value.password)
                        },
                        success: function (res1) {
                            if (res1.data.status==0) {
                                wx.showToast({
                                    "title": "注册成功",
                                    "icon": "loading"
                                });
                            }else if (res1.data.status ==1430){
                                wx.showToast({
                                    "title":"该微信已经注册过了",
                                    "icon":"loading"
                                });
                            }else{
                                wx.showToast({
                                    "title":"注册失败",
                                    "icon":"loading"
                                });
                            }
                        }
                    });
                }
            }
        );

        /* setTimeout(function () {
             wx.request({
                 url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=6_tlWW3fUODMoHjz38q8b3Q5QdXBRzHshmKRtPEhESfUGd80irqtk5TlUKqzqIZhKmNWxtOMkzb_7WwwjOoId9-vZOLaB89EivmlxQmXKP67i52LE3iIPQesbOVFtRWuoE8YN_ouuIoEhwegpPOCUbAIARFX',
                 method: 'POST',
                 data: {
                     "touser": "oKUz40EwhP5ILkXbnLgeZMjdMHKo",
                     "template_id": "9AUTzKhkSIyhBAQtdW989W3wwXQvFer3F_ZJpu1GHbI",
                     "page": "pages/login/login",
                     "form_id": res.detail.formId,
                     "data": {
                         "keyword1": {
                             "value": "339208499",
                             "color": "#173177"
                         },
                         "keyword2": {
                             "value": "不告诉你",
                             "color": "#173177"
                         }
                     },
                     "emphasis_keyword": "keyword1.DATA"
                 },
                 success: function (res) {
                     console.log('result', res);
                 }
             });
         },3000)
 */
    }
});