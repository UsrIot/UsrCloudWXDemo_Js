var md5util = require('../../utils/md5.js')
var code;
Page({
    onLoad: function (options) {
        var that = this;
        try {
            var account = wx.getStorageSync('userinfo').data.account;
            var pass = wx.getStorageSync('userpass');
            if (account && pass) {
                that.setData({
                    account: account,
                    password: pass
                });
                that.loging();
            }
        } catch (e) {
            console.log('缓存中没有')
        }
    },
    data: {
        account: '',
        password: ''
    },

    // 获取输入账号
    phoneInput: function (e) {
        this.setData({
            account: e.detail.value
        })
    },

    // 获取输入密码
    passwordInput: function (e) {
        this.setData({
            password: e.detail.value
        })
    },

    //登陆
    login: function () {
        var that = this;
        if (this.data.account.length == 0 || this.data.password.length == 0) {
            wx.showToast({
                title: '不能为空',
                icon: 'loading',
                duration: 1000
            })
        } else {
            //绑定功能暂时不用
            // var resdata=that.checkBinding();
            // that.checkBinding();
            // that.binding();
            that.loging();
        }
    },
    loging: function () {
        var that = this;
        wx.showToast({
            title: '登录中',
            icon: 'loading',
            duration: 1000
        });

        wx.request({
            url: 'https://cloudapi.usr.cn/usrCloud/user/login',
            // url: 'https://superking.ngrok.xiaomiqiu.cn/usrCloud/user/login',
            method: 'POST',
            data: {
                account: this.data.account,
                password: md5util.hexMD5(this.data.password)
                // account: 'rock',
                // password: md5util.hexMD5('rock')
            },
            success: function (res) {
                var userinfo = res.data;
                if (res.data.status === 0) {
                    try {
                        wx.setStorageSync('userinfo', userinfo);
                        wx.setStorageSync('userpass', that.data.password);
                        wx.setStorageSync('token', res.data.data.token);
                    } catch (e) {
                        wx.showToast({
                            title: '获取缓存失败请重启',
                            icon: 'loading',
                            duration: 1000
                        })
                    }
                    wx.switchTab({
                        url: '/pages/index/index',
                    })
                } else {
                    wx.showToast({
                        title: '信息错误',
                        icon: 'loading',
                        duration: 1000
                    })
                }
            },
            fail: function (err) {
                console.log(err)
                wx.showToast({
                    title: '信息错误',
                    icon: 'loading',
                    duration: 1000
                })
            }, complete: function (res) {
                wx.hideLoading();
            }
        })
    },
    register: function () {
        wx.reLaunch({
            url: '../register/register'
        })
    },
    reset: function (res0) {
        wx.showModal({
            title: '确认重置密码?',
            success: function (res1) {
                if (res1.confirm) {
                    wx.login({
                        success: function (res2) {
                            wx.request({
                                url: 'http://superking.ngrok.xiaomiqiu.cn/usrCloud/user/wechatResetPass',
                                method: 'POST',
                                data: {
                                    "type": 0,
                                    "formId": res0.detail.formId,
                                    "code": res2.code,
                                    "templateId": "9AUTzKhkSIyhBAQtdW989W3wwXQvFer3F_ZJpu1GHbI"
                                },
                                success: function (res3) {
                                    console.log(res3);
                                }
                            });
                        }
                    });
                }
            }
        })
    },
    wxLogin: function () {
        wx.login({
            success: function (res) {
                wx.request({
                    // url: 'https://cloudapi.usr.cn/usrCloud/user/login',
                    url: 'https://superking.ngrok.xiaomiqiu.cn/usrCloud/user/wechatLogin',
                    method: 'POST',
                    data: {
                        "code": res.code,
                        "type": 0
                    },
                    success: function (res1) {
                        if (res1.data.status == 0) {
                            wx.setStorage('userinfo', res1.data);
                            wx.setStorage('token', res1.data.data.token);
                            wx.switchTab({
                                url: '/pages/index/index',
                            })
                        } else {
                            wx.showToast({
                                title: '登录失败',
                                icon: 'loading',
                                duration: 1000
                            })
                        }
                    }
                })
            }
        })
    }
});