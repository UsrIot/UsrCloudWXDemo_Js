/**
 * Copyright (c) 2017 USR
 * mqtt websocket
 * @Author USR
 * http://www.usr.cn
 */

//'use strict';

var PahoMqtt = require('mqttwsWx31.js');

/**
 * 定义事件(回调)
 * @param name
 * @constructor
 */
function Event(name) {
  this.name = name;
  //function to call on event fire
  this.eventAction = null;
  //subscribe a function to the event
  this.subscribe = function (fn) {
    this.eventAction = fn;
  };
  //fire the event
  this.fire = function (sender, eventArgs) {
    if (this.eventAction !== null) {
      this.eventAction(sender, eventArgs);
    }
  };
}

/**
 * 透传云mqtt接口
 * @constructor
 */
function UsrCloud() {

  /**
   * 定义常量
   * @type {number}
   */

  var USR_VERSION = 2;//透传云客户端版本号
  var mqtt; //mqtt client
  var Host;
  var Port;
  var Path;
  var Username;
  //回调object
  var callbackobj = {
    USR_onConnAck: null,
    USR_onConnLost: null,
    USR_onSubscribeAck: null,
    USR_onUnSubscribeAck: null,
    USR_onRcvRawFromDev: null,
    USR_onRcvParsedDataPointReturn: null,
    USR_onRcvParsedOptionResponseReturn: null,
    USR_onRcvParsedDataPointPush: null,
    USR_onRcvParsedDevAlarmPush: null,
    USR_onRcvParsedDevStatusPush: null
  };

  var connected = false;
  var subscriptions = []; //主题列表

  /**
   * 定义主题前缀
   */
  var DEVTX_TOPIC_PREFIX = '$USR/DevTx/';
  var DEVRX_TOPIC_PREFIX = '$USR/DevRx/';
  var DEV2APP_TOPIC_PREFIX = '$USR/Dev2App/';
  var APP2DEV_TOPIC_PREFIX = '$USR/App2Dev/';
  var JSONTX_TOPOIC_PREFIX = '$USR/JsonTx/';
  var DEVJSONTX_TOPIC_PREFIX = '$USR/DevJsonTx/';
  var DEVJSONRX_TOPIC_PREFIX = '$USR/DevJsonRx/';
  /**
   * 定义事件
   * @type {Event}
   */
  var USR_onConnAck = new Event("OnConnAck");
  var USR_onConnLost = new Event("OnConnLost");
  var USR_onSubscribeAck = new Event("OnSubscribeAck");
  var USR_onUnSubscribeAck = new Event("OnUnSubscribeAck");
  var USR_onRcvRawFromDev = new Event("OnRcvRawFromDev");
  var USR_onRcvParsedDataPointReturn = new Event("OnRcvParsedDataPointReturn");
  var USR_onRcvParsedOptionResponseReturn = new Event("USR_onRcvParsedOptionResponseReturn");
  var USR_onRcvParsedDataPointPush = new Event("OnRcvParsedDataPointPush");
  var USR_onRcvParsedDevStatusPush = new Event("OnRcvParsedDevStatusPush");
  var USR_onRcvParsedDevAlarmPush = new Event("OnRcvParsedDevAlarmPush");
  /**
   * 初始化
   * @param host
   * @param port
   * @param version
   * @param callback
   * @returns {number} 0:成功 ; 1 :参数错误 ;2: 版本错误;
   * @constructor
   */
  this.Usr_Init = function (host, port, version, callback) {
    if (typeof (host) === "undefined" || typeof (port) === "undefined" || typeof (version) === "undefined") {
      return 1;
    }
    Host = host;
    Port = port;
    if (version > USR_VERSION) {
      return 2;
    }
    //callback
    callbackobj = callback;
    //subscribe event
    {
      !callbackobj.USR_onConnAck || USR_onConnAck.subscribe(callbackobj.USR_onConnAck);
      !callbackobj.USR_onConnLost || USR_onConnLost.subscribe(callbackobj.USR_onConnLost);
      !callbackobj.USR_onSubscribeAck || USR_onSubscribeAck.subscribe(callbackobj.USR_onSubscribeAck);
      !callbackobj.USR_onUnSubscribeAck || USR_onUnSubscribeAck.subscribe(callbackobj.USR_onUnSubscribeAck);
      !callbackobj.USR_onRcvRawFromDev || USR_onRcvRawFromDev.subscribe(callbackobj.USR_onRcvRawFromDev);
      !callbackobj.USR_onRcvParsedDataPointReturn || USR_onRcvParsedDataPointReturn.subscribe(callbackobj.USR_onRcvParsedDataPointReturn);
      !callbackobj.USR_onRcvParsedOptionResponseReturn || USR_onRcvParsedOptionResponseReturn.subscribe(callbackobj.USR_onRcvParsedOptionResponseReturn);
      !callbackobj.USR_onRcvParsedDataPointPush || USR_onRcvParsedDataPointPush.subscribe(callbackobj.USR_onRcvParsedDataPointPush);
      !callbackobj.USR_onRcvParsedDevAlarmPush || USR_onRcvParsedDevAlarmPush.subscribe(callbackobj.USR_onRcvParsedDevAlarmPush);
      !callbackobj.USR_onRcvParsedDevStatusPush || USR_onRcvParsedDevStatusPush.subscribe(callbackobj.USR_onRcvParsedDevStatusPush);
    }
    return 0;
  };


  /* ---------------------- 外部函数/变量 ---------------------- */
  /**
   * 获取版本信息
   * @returns {number}
   * @constructor
   */
  this.USR_GetVer = function () {
    return USR_VERSION;
  };

  /**
   * 连接服务器
   * @param username
   * @param password
   * @returns {number} 0:success;    1:username null;      2:password null;  3:connection failed
   * @constructor
   */
  /*------------------------连接断开连接--------------------------*/
  this.USR_Connect = function (username, password) {
    Username = username;
    //客户端标识符为APP+账号
    var clientId = "APP:" + username;

    if (typeof Path === "undefined") {
      Path = '/mqtt';
    }
    mqtt = new PahoMqtt.Client(Host, Port, Path, clientId);
    var options = {
      timeout: 50,
      useSSL: true,
      keepAliveInterval: 600,
      cleanSession: true,
      mqttVersion: 4,	//mqtt协议版本：3.1.1
      onSuccess: onConnSuccess,
      onFailure: onConnFail
    };
    mqtt.onConnectionLost = onConnLost;
    mqtt.onMessageArrived = onMessageArrived;
    if (username.length > 0) {
      options.userName = username;
    } else {
      return 1;
    }
    if (password.length > 0) {
      //options.password = hex_md5(password);
      options.password = password;
    } else {
      return 2;
    }
    try {
      mqtt.connect(options);
    } catch (err) {
      return 3;
    }
    return 0;
  };


  /**
   * 断开连接
   * @constructor
   */
  this.USR_DisConnect = function () {
    if (connected) {
      mqtt.disconnect();
    }
    connected = false;
  };
  /* =========================================================== */
  /*============================发布=============================*/
  /* =========================================================== */
  /**
   * 发布数据公共方法
   * @param topic
   * @param dataByte
   * @returns {number}
   */
  var publish = function (topic, dataByte) {
    if (!connected) {
      return 1;
    }
    //数据区最大长度为255M：268435455byte
    if (dataByte.length > 268435455) {
      // alert("Message must not exceed 267386880 byte ");
      return 2;
    }
    var payloadBuff = new Uint8Array(dataByte.length);
    payloadBuff.set(dataByte);
    var message = new PahoMqtt.Message(payloadBuff.buffer);
    message.qos = 1;
    message.retained = false;
    message.destinationName = topic;
    mqtt.send(message);
    return 0;
  };
  /**
   * 向单台设备推送原始数据流
   * @param devId example:1,2,3,4
   * @param dataBuff
   * @returns {number} 0:success;   1:not connected;  2:length is too large
   * @constructor
   */
  this.USR_PublishRawToDev = function (devId, dataByte) {
    let result;
    while (devId.indexOf(" ") !== -1) {
      devId = devId.replace(" ", "");
    }
    if ((result = publish(DEVRX_TOPIC_PREFIX + devId, dataByte)) !== 0) {
      return result;
    }
    return 0;
  };
  /**
   * 向帐号下全部设备发送原始数据流
   * @param username
   * @param dataByte
   * @returns {number}
   * @constructor
   */
  this.USR_PublishRawToUser = function (username, dataByte) {
    (username !== "" && typeof (username) !== 'undefined') || (username = Username);
    let result;
    if ((result = publish(APP2DEV_TOPIC_PREFIX + username, dataByte)) !== 0) {
      return result;
    }
    return 0;
  };
  /**
   * 设置单台设备数据点值(弃用）
   * @deprecated
   * @param devId
   * @param pointId
   * @param value
   * @return {number}
   * @constructor
   */
  this.USR_PublishParsedSetDataPoint = function (devId, pointId, value) {
    var payloadObj = { 'setDataPoint': {} };
    payloadObj['setDataPoint']['pointId'] = pointId;
    payloadObj['setDataPoint']['value'] = value;
    var payloadString = JSON.stringify(payloadObj);
    //获取消息UTF-8编码字节长度并创建Uint8Array字节数组
    var dataByte = [];
    let result;
    for (var i = 0; i < payloadString.length; i++) {
      dataByte[i] = payloadString.charCodeAt(i);
    }
    stringToUTF8(payloadString, dataByte, 0);
    if ((result = publish(DEVJSONRX_TOPIC_PREFIX + devId, dataByte)) !== 0) {
      return result;
    }
    return 0;
  };
  /**
   * 设置单台设备数据点值
   * @param devId
   * @param slaveIndex
   * @param pointId
   * @param value
   * @return {number}
   * @constructor
   */
  this.USR_PublishParsedSetSlaveDataPoint = function (devId, slaveIndex, pointId, value) {
    var payloadObj = { 'setDataPoint': {} };
    payloadObj['setDataPoint']['slaveIndex'] = slaveIndex;
    payloadObj['setDataPoint']['pointId'] = pointId;
    payloadObj['setDataPoint']['value'] = value;
    var payloadString = JSON.stringify(payloadObj);
    //获取消息UTF-8编码字节长度并创建Uint8Array字节数组
    var dataByte = [];
    for (var i = 0; i < payloadString.length; i++) {
      dataByte[i] = payloadString.charCodeAt(i);
    }
    var result = publish(DEVJSONRX_TOPIC_PREFIX + devId, dataByte);
    stringToUTF8(payloadString, dataByte, 0);
    if (result !== 0) {
      return result;
    }
    return 0;
  };
  /**
   *查询单台设备数据点值(弃用）
   * @deprecated
   * @param devId
   * @param pointId
   * @return {*}
   * @constructor
   */
  this.USR_PublishParsedQueryDataPoint = function (devId, pointId) {
    var payloadObj = { 'queryDataPoint': {} };
    payloadObj['queryDataPoint']['pointId'] = pointId;
    var payloadString = JSON.stringify(payloadObj);
    //获取消息UTF-8编码字节长度并创建Uint8Array字节数组
    var dataByte = [];
    for (var i = 0; i < payloadString.length; i++) {
      dataByte[i] = payloadString.charCodeAt(i);
    }
    stringToUTF8(payloadString, dataByte, 0);
    let result;
    if ((result = publish(DEVJSONRX_TOPIC_PREFIX + devId, dataByte)) !== 0) {
      return result;
    }
    return 0;
  };
  /**
   * 查询单台设备数据点值
   * @param devId
   * @param slaveIndex
   * @param pointId
   * @return {*}
   * @constructor
   */
  this.USR_PublishParsedQuerySlaveDataPoint = function (devId, slaveIndex, pointId) {
    var payloadObj = { 'queryDataPoint': {} };
    payloadObj['queryDataPoint']['slaveIndex'] = pointId;
    payloadObj['queryDataPoint']['pointId'] = pointId;
    var payloadString = JSON.stringify(payloadObj);
    //获取消息UTF-8编码字节长度并创建Uint8Array字节数组
    var dataByte = [];
    for (var i = 0; i < payloadString.length; i++) {
      dataByte[i] = payloadString.charCodeAt(i);
    }
    stringToUTF8(payloadString, dataByte, 0);
    if ((result = publish(DEVJSONRX_TOPIC_PREFIX + devId, dataByte)) !== 0) {
      return result;
    }
    return 0;
  };
  /* =========================================================== */
  /*=============================订阅==========================*/
  /* =========================================================== */
  /**
   * 订阅公共函数
   * @param topic
   * @param successFunc
   * @param failureFunc
   * @returns {number}
   */
  var subscribe = function (topic, successFunc, failureFunc) {
    if (!connected) {
      return 1;
    }
    if (hasSubscript(topic)) {
      return 2;
    } else {
      mqtt.subscribe(topic, {
        qos: 0,
        invocationContext: { topic: topic },
        onSuccess: successFunc,
        onFailure: failureFunc
      });
    }
    return 0;
  };
  /**
   * 订阅设备原始数据流
   * @param devId
   * @returns {number} 0:success;   1:not connected;    2:format wrong  3:already subscribed;
   * @constructor
   */
  this.USR_SubscribeDevRaw = function (devId) {
    if (devId.indexOf("，") !== -1) {
      return 2;
    }
    while (devId.indexOf(" ") !== -1) {
      devId = devId.replace(" ", "");
    }
    var devIds = new Array();
    var topic = "";
    let result;
    devIds = devId.split(",");
    for (var i = 0; i < devIds.length; i++) {
      topic = DEVTX_TOPIC_PREFIX + devIds[i];
      if ((result = subscribe(topic, USR_onSubDevRawSucc, USR_onSubDevRawFail)) !== 0) {
        return result;
      }
    }
    return 0;
  };
  /**
   * 订阅账号下全部设备的原始数据流
   * @param username
   * @returns {number}
   * @constructor
   */
  this.USR_SubscribeUserRaw = function (username) {
    (username !== "" && typeof (username) !== 'undefined') || (username = Username);
    var topic = DEV2APP_TOPIC_PREFIX + username + "/+";
    let result;
    if ((result = subscribe(topic, USR_onSubscribeUserRawSucc, USR_onSubscribeUserRawFail)) !== 0) {
      return result;
    }
    return 0;
  };
  /**
   *订阅设备解析后的数据
   * @param username
   * @returns {number}
   * @constructor
   */
  this.USR_SubscribeDevParsed = function (devId) {
    if (devId.indexOf("，") !== -1) {
      return 2;
    }
    while (devId.indexOf(" ") !== -1) {
      devId = devId.replace(" ", "");
    }
    var devIds = new Array();
    var topic = "";
    devIds = devId.split(",");
    let result;
    for (var i = 0; i < devIds.length; i++) {
      topic = DEVJSONTX_TOPIC_PREFIX + devIds[i];
      if ((result = subscribe(topic, USR_onSubscribeDevParsedSucc, USR_onSubscribeDevParsedFail)) !== 0) {
        return result;
      }
    }
    return 0;
  };
  /**
   * 订阅账号下全部设备解析后的数据
   * @param username
   * @constructor
   */
  this.USR_SubscribeUserParsed = function (username) {
    (username !== "" && typeof (username) !== 'undefined') || (username = Username);
    var topic = JSONTX_TOPOIC_PREFIX + username + '/+';
    let result;
    if ((result = subscribe(topic, USR_onSubscribeUserParseSucc, USR_onSubscribeUserParseFail)) !== 0) {
      return result;
    }
    return 0;
  };

  /* =========================================================== */
  /* ==========================取消订阅========================== */
  /* =========================================================== */
  /**
   * 取消订阅函数
   * @param topic
   * @param successFunc
   * @param failureFunc
   * @return 0:success; 1:disconnect ;3:not subscribe
   */
  var unSubscribe = function (topic, successFunc, failureFunc) {
    console.log('unsub');
    if (!connected) {
      return 1;
    }
    if (hasSubscript(topic)) {
      mqtt.unsubscribe(topic, {
        invocationContext: { topic: topic },
        onSuccess: successFunc,
        onFailure: failureFunc
      });
    } else {
      return 3;
    }
    /*        for (var key in subscriptions){
     if (subscriptions[key]['topic']===topic){
     subscriptions.splice(key,1);
     }
     }*/
    return 0;
  };
  /**
   * 取消订阅设备原始数据流
   * @param devId
   * @returns {number} 0:success;   1:not connected;    2:format wrong; 3:not subscribe
   * @constructor
   */
  this.USR_UnSubscribeDevRaw = function (devId) {
    if (devId.indexOf("，") !== -1) {
      return 2;
    }
    while (devId.indexOf(" ") !== -1) {
      devId = devId.replace(" ", "");
    }
    var devIds = new Array();
    var topic = "";
    devIds = devId.split(",");
    let result;
    for (var i = 0; i < devIds.length; i++) {
      topic = DEVTX_TOPIC_PREFIX + devIds[i];
      if ((result = unSubscribe(topic, USR_onUnSubscribeDevRawSucc, USR_onUnSubscribeDevRawFail)) !== 0) {
        return result;
      }
    }
    return 0;
  };

  /**
   * 取消订阅账号下全部设备的原始数据流
   * @param username
   * @returns {number}
   * @constructor
   */
  this.USR_UnSubscribeUserRaw = function (username) {
    (username !== "" && typeof (username) !== 'undefined') || (username = Username);
    var topic = DEV2APP_TOPIC_PREFIX + username + '/+';
    let result;
    if ((result = unSubscribe(topic, USR_onUnSubscribeUserRawSucc, USR_onUnSubscribeUserRawFail)) !== 0) {
      return result;
    }
    return 0;
  };
  /**
   * 取消订阅设备解析后的数据
   * @param devId
   * @returns {*}
   * @constructor
   */
  this.USR_UnSubscribeDevParsed = function (devId) {
    if (devId.indexOf("，") !== -1) {
      return 2;
    }
    while (devId.indexOf(" ") !== -1) {
      devId = devId.replace(" ", "");
    }
    var devIds = new Array();
    var topic = "";
    devIds = devId.split(",");
    let result;
    for (var i = 0; i < devIds.length; i++) {
      topic = DEVJSONTX_TOPIC_PREFIX + devIds[i];
      if ((result = unSubscribe(topic, USR_onUnSubscribeDevParsedSucc, USR_onUnSubscribeDevParsedFail)) !== 0) {
        return result;
      }
    }
    return 0;
  };
  /**
   * 取消订阅账号下全部设备解析后的数据
   * @param username
   * @returns {*}
   * @constructor
   */
  this.USR_UnSubscribeUserParsed = function (username) {
    (username !== "" && typeof (username) !== 'undefined') || (username = Username);
    var topic = JSONTX_TOPOIC_PREFIX + username + '/+';
    let result;
    if ((result = unSubscribe(topic, USR_onUnSubscribeUserParsedSucc, USR_onUnSubscribeUserParsedFail)) !== 0) {
      return result;
    }
    return 0;
  };
  /* =========================================================== */
  /*============================回调函数==========================*/
  /* =========================================================== */
  /**
   * 订阅设备数据流回调
   * @param response
   * @constructor
   */
  var USR_onSubDevRawSucc = function (response) {
    var subscription = { 'topic': response.invocationContext.topic, 'qos': 1 };
    subscriptions.push(subscription);
    USR_onSubscribeAck.fire({
      code: 0,
      SubFunName: 'SubDevRaw',
      SubParam: response.invocationContext.topic  //主题名
    })
  };
  /**
   * 订阅设备数据流失败回调函数
   * @param response
   */
  var USR_onSubDevRawFail = function () {
    USR_onSubscribeAck.fire({
      code: 1,
      SubFunName: 'SubDevRaw',
    })
  };
  /**
   * 订阅用户数据流成功
   * @param response
   * @constructor
   */
  var USR_onSubscribeUserRawSucc = function (response) {
    var subscription = { 'topic': response.invocationContext.topic, 'qos': 1 };
    subscriptions.push(subscription);
    USR_onSubscribeAck.fire({
      code: 0,
      SubFunName: 'SubscribeUserRaw',
      SubParam: response.invocationContext.topic  //主题名
    })
  };
  /**
   * 订阅用户数据流失败
   * @param response
   */
  var USR_onSubscribeUserRawFail = function () {
    USR_onSubscribeAck.fire({
      code: 1,
      SubFunName: 'SubscribeUserRaw'
    });
  };
  /**
   * 订阅设备解析成功
   * @param response
   * @constructor
   */
  var USR_onSubscribeDevParsedSucc = function (response) {
    var subscription = { 'topic': response.invocationContext.topic, 'qos': 1 };
    subscriptions.push(subscription);
    USR_onSubscribeAck.fire({
      code: 0,
      SubFunName: 'SubscribeDevParsed',
      SubParam: response.invocationContext.topic  //主题名
    })
  };
  /**
   * 订阅设备解析失败
   * @param response
   * @constructor
   */
  var USR_onSubscribeDevParsedFail = function () {
    USR_onSubscribeAck.fire({
      code: 1,
      SubFunName: 'SubscribeDevParsed'
    })
  };
  /**
   * 订阅用户解析成功
   * @param response
   * @constructor
   */
  var USR_onSubscribeUserParseSucc = function (response) {
    var subscription = { 'topic': response.invocationContext.topic, 'qos': 1 };
    subscriptions.push(subscription);
    USR_onSubscribeAck.fire({
      code: 0,
      SubFunName: 'SubscribeUserParse',
      SubParam: response.invocationContext.topic  //主题名
    });
  };
  /**
   * 订阅用户解析失败
   * @param response
   * @constructor
   */
  var USR_onSubscribeUserParseFail = function () {
    USR_onSubscribeAck.fire({
      code: 1,
      SubFunName: 'SubscribeUserParse',
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeDevRawSucc = function (response) {
    delSubscription(response.invocationContext.topic);
    USR_onUnSubscribeAck.fire({
      code: 0,
      SubFunName: 'UnSubscribeDevRaw',
      SubParam: response.invocationContext.topic//主题名
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeDevRawFail = function () {
    USR_onUnSubscribeAck.fire({
      code: 1,
      SubFunName: 'UnSubscribeDevRaw',
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeUserRawSucc = function (response) {
    delSubscription(response.invocationContext.topic);
    USR_onUnSubscribeAck.fire({
      code: 0,
      SubFunName: 'UnSubscribeUserRaw',
      SubParam: response.invocationContext.topic//主题名
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeUserRawFail = function () {
    USR_onUnSubscribeAck.fire({
      code: 1,
      SubFunName: 'UnSubscribeUserRaw',
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeDevParsedSucc = function (response) {
    delSubscription(response.invocationContext.topic);
    USR_onUnSubscribeAck.fire({
      code: 0,
      SubFunName: 'UnSubscribeDevParsed',
      SubParam: response.invocationContext.topic//主题名
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeDevParsedFail = function () {
    USR_onUnSubscribeAck.fire({
      code: 1,
      SubFunName: 'UnSubscribeDevParsed',
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeUserParsedSucc = function (response) {
    delSubscription(response.invocationContext.topic);
    USR_onUnSubscribeAck.fire({
      code: 0,
      SubFunName: 'UnSubscribeDevParsed',
      SubParam: response.invocationContext.topic  //主题名
    });
  };
  /**
   *
   * @param response
   * @constructor
   */
  var USR_onUnSubscribeUserParsedFail = function () {
    USR_onUnSubscribeAck.fire({
      code: 1,
      SubFunName: 'UnSubscribeDevParsed'
    });
  };

  /**
   * 连接成功回调函数
   */
  var onConnSuccess = function () {
    connected = true;
    USR_onConnAck.fire({
      code: 0,
      message: ''
    });
  };
  /**
   * 连接失败回调函数
   * @param response
   */
  var onConnFail = function (response) {
    connected = false;
    USR_onConnAck.fire({
      code: 1,
      message: response.errorMessage
    })
  };
  /**
   * 连接丢失回调函数
   * @param response
   */
  var onConnLost = function (response) {
    connected = false;
    USR_onConnLost.fire({
      message: response.errorMessage
    });
  };
  /**
   * 接收消息
   * @param message
   */
  var onMessageArrived = function (message) {
    var devId = message.destinationName.split('/').reverse()[0];
    !callbackobj.USR_onRcv || callbackobj.USR_onRcv(message.destinationName, message.payloadBytes);
    //json数据
    if (message.destinationName.indexOf('Json') !== -1) {
      //console.log(message.payloadString);
      var messageObj = JSON.parse(message.payloadString);
      if (messageObj.hasOwnProperty("dataPointReturn")) {
        USR_onRcvParsedDataPointReturn.fire(
          {
            'devId': devId,
            'slaveIndex': messageObj['slaveIndex'],
            'slaveAddr': messageObj['slaveAddr'],
            'dataPointReturn': messageObj['dataPointReturn']
          }
        );
      } else if (messageObj.hasOwnProperty("dataPoints")) {
        USR_onRcvParsedDataPointPush.fire(
          {
            'devId': devId,
            'dataPoints': messageObj['dataPoints']
          }
        );
      } else if (messageObj.hasOwnProperty("devStatus")) {
        var account = message.destinationName.split('/').reverse()[1];
        USR_onRcvParsedDevStatusPush.fire(
          {
            'account': account,
            'devName': messageObj['devStatus']['devName'],
            'devId': devId,
            'slaveIndex': messageObj['slaveIndex'],
            'slaveAddr': messageObj['slaveAddr'],
            'status': messageObj['devStatus']['status']
          }
        );
      } else if (messageObj.hasOwnProperty("devAlarm")) {
        var account = message.destinationName.split('/').reverse()[1];
        USR_onRcvParsedDevAlarmPush.fire(
          {
            'account': account,
            'devId': devId,
            'slaveIndex': messageObj['slaveIndex'],
            'slaveAddr': messageObj['slaveAddr'],
            'devAlarm': messageObj['devAlarm']
          }
        );
      } else if (messageObj.hasOwnProperty("optionResponse")) {
        USR_onRcvParsedOptionResponseReturn.fire(
          {
            'devId': devId,
            'optionResponse': messageObj['optionResponse'],
            'devName': messageObj['devName']
          }
        );
      }
    } else {
      //原始数据
      USR_onRcvRawFromDev.fire({
        devId: devId,
        payload: message.payloadBytes
      });
    }
  };
  this.USR_UnSubScribeAll = function (fun) {
    if (subscriptions.length === 0) {
      fun();
    }
    for (var key in subscriptions) {
      unSubscribe(subscriptions[key]['topic'], function (response) {
        delSubscription(response.invocationContext.topic);
        fun();
      }, function () {
      });
    }
    return 0;
  };
  /**
   * 是否已经订阅主题
   */
  function hasSubscript(topic) {
    for (let i = 0; i < subscriptions.length; i++) {
      if (subscriptions[i].topic === topic) {
        return true;
      }
    }
    return false;
  }

  /**
   * 删除主题
   */
  function delSubscription(subscription) {
    for (let key in subscriptions) {
      if (subscriptions[key].topic === subscription) {
        subscriptions.splice(key, 1);
      }
    }
  }

}

/* =========================================================== */
/*                     类型转换                          */
/* =========================================================== */
//字符串转0x格式的十六进制字符串
let stringToHex = function (str) {
  var hex = '';
  //console.log(str);
  for (var i = 0; i < str.length; i++) {
    var h = str.charCodeAt(i).toString(16);
    if (h.length < 2) {
      h = '0' + h;
    }
    //hex += '0x' + h + ' ';
    hex += ' ' + h;
  }
  // console.log(hex);
  return hex;

};
//十六进制字符串转字符串
let hexToString = function (hex) {
  var hex = hex.toString();
  var str = '';
  for (var i = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
};
//十六进制字符串转字节流数组
let HexStr2Bytes = function (str) {
  // 清除空格
  while (str.indexOf(" ") != -1) {
    str = str.replace(" ", "");
  }
  var len = str.length;
  var hexA = new Array();
  for (var i = 0; i < len; i += 2) {
    var s = str.substr(i, 2);
    var v = parseInt(s, 16);
    hexA.push(v);
  }
  return hexA;
};
// 字符串转字节流数组
let Str2Buf = function (str) {
  var ch,
    st,
    re = [];
  for (var i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i); // get char
    st = []; // set up "stack"
    do {
      st.push(ch & 0xFF); // push byte to stack
      ch = ch >> 8; // shift value down by 1 byte
    } while (ch);
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re.concat(st.reverse());
  }
  // return an array of bytes
  return re;
};

// 数组转字符串
function buf2str(adata) {
  var s = "";
  for (var i in adata) {
    s += String.fromCharCode(adata[i]);
  }
  return s;
};

// 数组转十六进制字符串 55 aa 33
function buf2HexStr(adata) {
  var tmp = "";
  var tmpString = "";
  for (var i = 0; i < adata.length; i++) {
    tmpString = adata[i].toString(16);
    tmp += (tmpString < 10 ? '0' + tmpString : tmpString) + " ";
  }
  return tmp;
};

//int转字节流数组
function Int2Bytes(value) {
  var bytes = [];
  var i = 4;
  do {
    bytes[--i] = value & (255);
    value = value >> 4;
  } while (i)
  return bytes;
};

//字节流数组转int
function Bytes2Int(value) {
  var val = 0;
  for (var i = 0; i < value.length; ++i) {
    val += value[i];
    if (i < value.length - 1) {
      val = val << 8;
    }
  }
  return val;
}

/* 数组截取 uint8array无slice函数实现类似slice效果 */

/* 截取从adata数组从astart（包含）开始到aend（不包含）结束 */
function Fcopybuf(adata, astart, aend) {
  if (aend > astart) {
    var abuf = new Uint8Array(aend - astart);
    for (var i = astart; i < aend; i++)
      abuf[i - astart] = adata[i];
    return abuf;
  } else {

  }
  // alert('end > start');
}

let UTF8Length = function (input) {
  var output = 0;
  for (var i = 0; i < input.length; i++) {
    var charCode = input.charCodeAt(i);
    if (charCode > 0x7FF) {
      // Surrogate pair means its a 4 byte character
      if (0xD800 <= charCode && charCode <= 0xDBFF) {
        i++;
        output++;
      }
      output += 3;
    }
    else if (charCode > 0x7F)
      output += 2;
    else
      output++;
  }
  return output;
}
let stringToUTF8 = function (input, output, start) {
  var pos = start;
  for (var i = 0; i < input.length; i++) {
    var charCode = input.charCodeAt(i);

    // Check for a surrogate pair.
    if (0xD800 <= charCode && charCode <= 0xDBFF) {
      var lowCharCode = input.charCodeAt(++i);
      if (isNaN(lowCharCode)) {
        throw new Error(format(ERROR.MALFORMED_UNICODE, [charCode, lowCharCode]));
      }
      charCode = ((charCode - 0xD800) << 10) + (lowCharCode - 0xDC00) + 0x10000;

    }

    if (charCode <= 0x7F) {
      output[pos++] = charCode;
    } else if (charCode <= 0x7FF) {
      output[pos++] = charCode >> 6 & 0x1F | 0xC0;
      output[pos++] = charCode & 0x3F | 0x80;
    } else if (charCode <= 0xFFFF) {
      output[pos++] = charCode >> 12 & 0x0F | 0xE0;
      output[pos++] = charCode >> 6 & 0x3F | 0x80;
      output[pos++] = charCode & 0x3F | 0x80;
    } else {
      output[pos++] = charCode >> 18 & 0x07 | 0xF0;
      output[pos++] = charCode >> 12 & 0x3F | 0x80;
      output[pos++] = charCode >> 6 & 0x3F | 0x80;
      output[pos++] = charCode & 0x3F | 0x80;
    }
    ;
  }
  return output;
}

function UTF8ToString(input, offset, length) {
  var output = "";
  var utf16;
  var pos = offset;

  while (pos < offset + length) {
    var byte1 = input[pos++];
    if (byte1 < 128)
      utf16 = byte1;
    else {
      var byte2 = input[pos++] - 128;
      if (byte2 < 0)
        throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), ""]));
      if (byte1 < 0xE0)             // 2 byte character
        utf16 = 64 * (byte1 - 0xC0) + byte2;
      else {
        var byte3 = input[pos++] - 128;
        if (byte3 < 0)
          throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16)]));
        if (byte1 < 0xF0)        // 3 byte character
          utf16 = 4096 * (byte1 - 0xE0) + 64 * byte2 + byte3;
        else {
          var byte4 = input[pos++] - 128;
          if (byte4 < 0)
            throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16), byte4.toString(16)]));
          if (byte1 < 0xF8)        // 4 byte character
            utf16 = 262144 * (byte1 - 0xF0) + 4096 * byte2 + 64 * byte3 + byte4;
          else                     // longer encodings are not supported
            throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16), byte4.toString(16)]));
        }
      }
    }

    if (utf16 > 0xFFFF)   // 4 byte character - express as a surrogate pair
    {
      utf16 -= 0x10000;
      output += String.fromCharCode(0xD800 + (utf16 >> 10)); // lead character
      utf16 = 0xDC00 + (utf16 & 0x3FF);  // trail character
    }
    output += String.fromCharCode(utf16);
  }
  return output;
}

// 获取时间
function currentTime() {
  var d = new Date(), str = '';
  str += d.getFullYear() + '-'; // 年
  str += d.getMonth() + 1 + '-'; // 月
  str += d.getDate() + ' '; // 日
  str += d.getHours() + ':';  // 时
  str += d.getMinutes() + ':'; // 分
  str += d.getSeconds(); // 秒
  return str;
}


/*! https://mths.be/utf8js v2.1.2 by @mathias */
; (function (root) {

  // Detect free variables `exports`
  var freeExports = typeof exports == 'object' && exports;

  // Detect free variable `module`
  var freeModule = typeof module == 'object' && module &&
    module.exports == freeExports && module;

  // Detect free variable `global`, from Node.js or Browserified code,
  // and use it as `root`
  var freeGlobal = typeof global == 'object' && global;
  if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  var stringFromCharCode = String.fromCharCode;

  // Taken from https://mths.be/punycode
  function ucs2decode(string) {
    var output = [];
    var counter = 0;
    var length = string.length;
    var value;
    var extra;
    while (counter < length) {
      value = string.charCodeAt(counter++);
      if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
        // high surrogate, and there is a next character
        extra = string.charCodeAt(counter++);
        if ((extra & 0xFC00) == 0xDC00) { // low surrogate
          output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
        } else {
          // unmatched surrogate; only append this code unit, in case the next
          // code unit is the high surrogate of a surrogate pair
          output.push(value);
          counter--;
        }
      } else {
        output.push(value);
      }
    }
    return output;
  }

  // Taken from https://mths.be/punycode
  function ucs2encode(array) {
    var length = array.length;
    var index = -1;
    var value;
    var output = '';
    while (++index < length) {
      value = array[index];
      if (value > 0xFFFF) {
        value -= 0x10000;
        output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
        value = 0xDC00 | value & 0x3FF;
      }
      output += stringFromCharCode(value);
    }
    return output;
  }

  function checkScalarValue(codePoint) {
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
      throw Error(
        'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
        ' is not a scalar value'
      );
    }
  }

  /*--------------------------------------------------------------------------*/

  function createByte(codePoint, shift) {
    return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
  }

  function encodeCodePoint(codePoint) {
    if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
      return stringFromCharCode(codePoint);
    }
    var symbol = '';
    if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
      symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
    }
    else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
      checkScalarValue(codePoint);
      symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
      symbol += createByte(codePoint, 6);
    }
    else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
      symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
      symbol += createByte(codePoint, 12);
      symbol += createByte(codePoint, 6);
    }
    symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
    return symbol;
  }

  function utf8encode(string) {
    var codePoints = ucs2decode(string);
    var length = codePoints.length;
    var index = -1;
    var codePoint;
    var byteString = '';
    while (++index < length) {
      codePoint = codePoints[index];
      byteString += encodeCodePoint(codePoint);
    }
    return byteString;
  }

  /*--------------------------------------------------------------------------*/

  function readContinuationByte() {
    if (byteIndex >= byteCount) {
      throw Error('Invalid byte index');
    }

    var continuationByte = byteArray[byteIndex] & 0xFF;
    byteIndex++;

    if ((continuationByte & 0xC0) == 0x80) {
      return continuationByte & 0x3F;
    }

    // If we end up here, it’s not a continuation byte
    throw Error('Invalid continuation byte');
  }

  function decodeSymbol() {
    var byte1;
    var byte2;
    var byte3;
    var byte4;
    var codePoint;

    if (byteIndex > byteCount) {
      throw Error('Invalid byte index');
    }

    if (byteIndex == byteCount) {
      return false;
    }

    // Read first byte
    byte1 = byteArray[byteIndex] & 0xFF;
    byteIndex++;

    // 1-byte sequence (no continuation bytes)
    if ((byte1 & 0x80) == 0) {
      return byte1;
    }

    // 2-byte sequence
    if ((byte1 & 0xE0) == 0xC0) {
      byte2 = readContinuationByte();
      codePoint = ((byte1 & 0x1F) << 6) | byte2;
      if (codePoint >= 0x80) {
        return codePoint;
      } else {
        throw Error('Invalid continuation byte');
      }
    }

    // 3-byte sequence (may include unpaired surrogates)
    if ((byte1 & 0xF0) == 0xE0) {
      byte2 = readContinuationByte();
      byte3 = readContinuationByte();
      codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
      if (codePoint >= 0x0800) {
        checkScalarValue(codePoint);
        return codePoint;
      } else {
        throw Error('Invalid continuation byte');
      }
    }

    // 4-byte sequence
    if ((byte1 & 0xF8) == 0xF0) {
      byte2 = readContinuationByte();
      byte3 = readContinuationByte();
      byte4 = readContinuationByte();
      codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
        (byte3 << 0x06) | byte4;
      if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
        return codePoint;
      }
    }

    throw Error('Invalid UTF-8 detected');
  }

  var byteArray;
  var byteCount;
  var byteIndex;

  function utf8decode(byteString) {
    byteArray = ucs2decode(byteString);
    byteCount = byteArray.length;
    byteIndex = 0;
    var codePoints = [];
    var tmp;
    while ((tmp = decodeSymbol()) !== false) {
      codePoints.push(tmp);
    }
    return ucs2encode(codePoints);
  }

  /*--------------------------------------------------------------------------*/

  var utf8 = {
    'version': '2.1.2',
    'encode': utf8encode,
    'decode': utf8decode
  };

  // Some AMD build optimizers, like r.js, check for specific condition patterns
  // like the following:
  if (
    typeof define == 'function' &&
    typeof define.amd == 'object' &&
    define.amd
  ) {
    define(function () {
      return utf8;
    });
  } else if (freeExports && !freeExports.nodeType) {
    if (freeModule) { // in Node.js or RingoJS v0.8.0+
      freeModule.exports = utf8;
    } else { // in Narwhal or RingoJS v0.7.0-
      var object = {};
      var hasOwnProperty = object.hasOwnProperty;
      for (var key in utf8) {
        hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key]);
      }
    }
  } else { // in Rhino or a web browser
    root.utf8 = utf8;
  }
}(this));
/**
 * md5
 */
var hexcase = 0;
/* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad = "";
/* base-64 pad character. "=" for strict RFC compliance   */
var chrsz = 8;
/* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s) {
  return binl2hex(core_md5(str2binl(s), s.length * chrsz));
}

function b64_md5(s) {
  return binl2b64(core_md5(str2binl(s), s.length * chrsz));
}

function str_md5(s) {
  return binl2str(core_md5(str2binl(s), s.length * chrsz));
}

function hex_hmac_md5(key, data) {
  return binl2hex(core_hmac_md5(key, data));
}

function b64_hmac_md5(key, data) {
  return binl2b64(core_hmac_md5(key, data));
}

function str_hmac_md5(key, data) {
  return binl2str(core_hmac_md5(key, data));
}

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test() {
  return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a = 1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d = 271733878;

  for (var i = 0; i < x.length; i += 16) {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
    d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
    d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t) {
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
}

function md5_ff(a, b, c, d, x, s, t) {
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function md5_gg(a, b, c, d, x, s, t) {
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function md5_hh(a, b, c, d, x, s, t) {
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5_ii(a, b, c, d, x, s, t) {
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Calculate the HMAC-MD5, of a key and some data
 */
function core_hmac_md5(key, data) {
  var bkey = str2binl(key);
  if (bkey.length > 16) bkey = core_md5(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for (var i = 0; i < 16; i++) {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
  return core_md5(opad.concat(hash), 512 + 128);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert a string to an array of little-endian words
 * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
 */
function str2binl(str) {
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (i % 32);
  return bin;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2str(bin) {
  var str = "";
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i >> 5] >>> (i % 32)) & mask);
  return str;
}

/*
 * Convert an array of little-endian words to a hex string.
 */
function binl2hex(binarray) {
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for (var i = 0; i < binarray.length * 4; i++) {
    str += hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) +
      hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xF);
  }
  return str;
}

/*
 * Convert an array of little-endian words to a base-64 string
 */
function binl2b64(binarray) {
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for (var i = 0; i < binarray.length * 4; i += 3) {
    var triplet = (((binarray[i >> 2] >> 8 * (i % 4)) & 0xFF) << 16)
      | (((binarray[i + 1 >> 2] >> 8 * ((i + 1) % 4)) & 0xFF) << 8)
      | ((binarray[i + 2 >> 2] >> 8 * ((i + 2) % 4)) & 0xFF);
    for (var j = 0; j < 4; j++) {
      if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
    }
  }
  return str;
}

/**
 * lodash
 */
!function (n) {
  function t(n, t, e) {
    e = (e || 0) - 1;
    for (var r = n.length; ++e < r;)
      if (n[e] === t) return e;
    return -1
  }

  function e(n, e) {
    var r = typeof e;
    if (n = n.k, "boolean" == r || e == h) return n[e];
    "number" != r && "string" != r && (r = "object");
    var u = "number" == r ? e : j + e;
    return n = n[r] || (n[r] = {}), "object" == r ? n[u] && -1 < t(n[u], e) ? 0 : -1 : n[u] ? 0 : -1
  }

  function r(n) {
    var t = this.k,
      e = typeof n;
    if ("boolean" == e || n == h) t[n] = y;
    else {
      "number" != e && "string" != e && (e = "object");
      var r = "number" == e ? n : j + n,
        u = t[e] || (t[e] = {});
      "object" == e ? (u[r] || (u[r] = [])).push(n) == this.b.length && (t[e] = b) : u[r] = y
    }
  }

  function u(n) {
    return n.charCodeAt(0)
  }

  function a(n, t) {
    var e = n.m,
      r = t.m;
    if (n = n.l, t = t.l, n !== t) {
      if (n > t || typeof n == "undefined") return 1;
      if (n < t || typeof t == "undefined") return -1
    }
    return e < r ? -1 : 1
  }

  function o(n) {
    var t = -1,
      e = n.length,
      u = l();
    u["false"] = u["null"] = u["true"] = u.undefined = b;
    var a = l();
    for (a.b = n, a.k = u, a.push = r; ++t < e;) a.push(n[t]);
    return u.object === false ? (p(a), h) : a
  }

  function i(n) {
    return "\\" + Q[n]
  }

  function f() {
    return m.pop() || []
  }

  function l() {
    return d.pop() || {
      b: h,
      k: h,
      l: h,
      "false": b,
      m: 0,
      leading: b,
      maxWait: 0,
      "null": b,
      number: h,
      object: h,
      push: h,
      string: h,
      trailing: b,
      "true": b,
      undefined: b,
      n: h
    }
  }

  function c(n) {
    n.length = 0, m.length < C && m.push(n)
  }

  function p(n) {
    var t = n.k;
    t && p(t), n.b = n.k = n.l = n.object = n.number = n.string = n.n = h, d.length < C && d.push(n)
  }

  function s(n, t, e) {
    t || (t = 0), typeof e == "undefined" && (e = n ? n.length : 0);
    var r = -1;
    e = e - t || 0;
    for (var u = Array(0 > e ? 0 : e); ++r < e;) u[r] = n[t + r];
    return u
  }

  function v(r) {
    function m(n) {
      if (!n || ve.call(n) != V) return b;
      var t = n.valueOf,
        e = typeof t == "function" && (e = fe(t)) && fe(e);
      return e ? n == e || fe(n) == e : it(n)
    }

    function d(n, t, e) {
      if (!n || !L[typeof n]) return n;
      t = t && typeof e == "undefined" ? t : tt.createCallback(t, e);
      for (var r = -1, u = L[typeof n] && Se(n), a = u ? u.length : 0; ++r < a && (e = u[r], !(t(n[e], e, n) === false)););
      return n
    }

    function C(n, t, e) {
      var r;
      if (!n || !L[typeof n]) return n;
      t = t && typeof e == "undefined" ? t : tt.createCallback(t, e);
      for (r in n)
        if (t(n[r], r, n) === false) break;
      return n
    }

    function Q(n, t, e) {
      var r, u = n,
        a = u;
      if (!u) return a;
      for (var o = arguments, i = 0, f = typeof e == "number" ? 2 : o.length; ++i < f;)
        if ((u = o[i]) && L[typeof u])
          for (var l = -1, c = L[typeof u] && Se(u), p = c ? c.length : 0; ++l < p;) r = c[l], "undefined" == typeof a[r] && (a[r] = u[r]);
      return a
    }

    function X(n, t, e) {
      var r, u = n,
        a = u;
      if (!u) return a;
      var o = arguments,
        i = 0,
        f = typeof e == "number" ? 2 : o.length;
      if (3 < f && "function" == typeof o[f - 2]) var l = tt.createCallback(o[--f - 1], o[f--], 2);
      else 2 < f && "function" == typeof o[f - 1] && (l = o[--f]);
      for (; ++i < f;)
        if ((u = o[i]) && L[typeof u])
          for (var c = -1, p = L[typeof u] && Se(u), s = p ? p.length : 0; ++c < s;) r = p[c], a[r] = l ? l(a[r], u[r]) : u[r];
      return a
    }

    function Z(n) {
      var t, e = [];
      if (!n || !L[typeof n]) return e;
      for (t in n) le.call(n, t) && e.push(t);
      return e
    }

    function tt(n) {
      return n && typeof n == "object" && !Ee(n) && le.call(n, "__wrapped__") ? n : new et(n)
    }

    function et(n) {
      this.__wrapped__ = n
    }

    function rt(n, t, e, r) {
      function u() {
        var r = arguments,
          l = o ? this : t;
        return a || (n = t[i]), e.length && (r = r.length ? (r = Ce.call(r), f ? r.concat(e) : e.concat(r)) : e), this instanceof u ? (l = gt(n.prototype) ? ye(n.prototype) : {}, r = n.apply(l, r), gt(r) ? r : l) : n.apply(l, r)
      }

      var a = vt(n),
        o = !e,
        i = t;
      if (o) {
        var f = r;
        e = t
      } else if (!a) {
        if (!r) throw new Yt;
        t = n
      }
      return u
    }

    function ut(n) {
      return Ie[n]
    }

    function at() {
      var n = (n = tt.indexOf) === $t ? t : n;
      return n
    }

    function ot(n) {
      return function (t, e, r, u) {
        return typeof e != "boolean" && e != h && (u = r, r = u && u[e] === t ? g : e, e = b), r != h && (r = tt.createCallback(r, u)), n(t, e, r, u)
      }
    }

    function it(n) {
      var t, e;
      return n && ve.call(n) == V && (t = n.constructor, !vt(t) || t instanceof t) ? (C(n, function (n, t) {
        e = t
      }), e === g || le.call(n, e)) : b
    }

    function ft(n) {
      return Ae[n]
    }

    function lt(n, t, e, r, u, a) {
      var o = n;
      if (typeof t != "boolean" && t != h && (r = e, e = t, t = b), typeof e == "function") {
        if (e = typeof r == "undefined" ? e : tt.createCallback(e, r, 1), o = e(o), typeof o != "undefined") return o;
        o = n
      }
      if (r = gt(o)) {
        var i = ve.call(o);
        if (!J[i]) return o;
        var l = Ee(o)
      }
      if (!r || !t) return r ? l ? s(o) : X({}, o) : o;
      switch (r = xe[i], i) {
        case P:
        case K:
          return new r(+o);
        case U:
        case H:
          return new r(o);
        case G:
          return r(o.source, A.exec(o))
      }
      i = !u, u || (u = f()), a || (a = f());
      for (var p = u.length; p--;)
        if (u[p] == n) return a[p];
      return o = l ? r(o.length) : {}, l && (le.call(n, "index") && (o.index = n.index), le.call(n, "input") && (o.input = n.input)), u.push(n), a.push(o), (l ? wt : d)(n, function (n, r) {
        o[r] = lt(n, t, e, g, u, a)
      }), i && (c(u), c(a)), o
    }

    function ct(n) {
      var t = [];
      return C(n, function (n, e) {
        vt(n) && t.push(e)
      }), t.sort()
    }

    function pt(n) {
      for (var t = -1, e = Se(n), r = e.length, u = {}; ++t < r;) {
        var a = e[t];
        u[n[a]] = a
      }
      return u
    }

    function st(n, t, e, r, u, a) {
      var o = e === k;
      if (typeof e == "function" && !o) {
        e = tt.createCallback(e, r, 2);
        var i = e(n, t);
        if (typeof i != "undefined") return !!i
      }
      if (n === t) return 0 !== n || 1 / n == 1 / t;
      var l = typeof n,
        p = typeof t;
      if (n === n && (!n || "function" != l && "object" != l) && (!t || "function" != p && "object" != p)) return b;
      if (n == h || t == h) return n === t;
      if (p = ve.call(n), l = ve.call(t), p == z && (p = V), l == z && (l = V), p != l) return b;
      switch (p) {
        case P:
        case K:
          return +n == +t;
        case U:
          return n != +n ? t != +t : 0 == n ? 1 / n == 1 / t : n == +t;
        case G:
        case H:
          return n == Xt(t)
      }
      if (l = p == W, !l) {
        if (le.call(n, "__wrapped__") || le.call(t, "__wrapped__")) return st(n.__wrapped__ || n, t.__wrapped__ || t, e, r, u, a);
        if (p != V) return b;
        var p = n.constructor,
          s = t.constructor;
        if (p != s && (!vt(p) || !(p instanceof p && vt(s) && s instanceof s))) return b
      }
      for (s = !u, u || (u = f()), a || (a = f()), p = u.length; p--;)
        if (u[p] == n) return a[p] == t;
      var v = 0,
        i = y;
      if (u.push(n), a.push(t), l) {
        if (p = n.length, v = t.length, i = v == n.length, !i && !o) return i;
        for (; v--;)
          if (l = p, s = t[v], o)
            for (; l-- && !(i = st(n[l], s, e, r, u, a)););
          else if (!(i = st(n[v], s, e, r, u, a))) break;
        return i
      }
      return C(t, function (t, o, f) {
        return le.call(f, o) ? (v++ , i = le.call(n, o) && st(n[o], t, e, r, u, a)) : void 0
      }), i && !o && C(n, function (n, t, e) {
        return le.call(e, t) ? i = -1 < --v : void 0
      }), s && (c(u), c(a)), i
    }

    function vt(n) {
      return typeof n == "function"
    }

    function gt(n) {
      return !(!n || !L[typeof n])
    }

    function yt(n) {
      return typeof n == "number" || ve.call(n) == U
    }

    function ht(n) {
      return typeof n == "string" || ve.call(n) == H
    }

    function bt(n, t, e) {
      var r = arguments,
        u = 0,
        a = 2;
      if (!gt(n)) return n;
      if (e === k) var o = r[3],
        i = r[4],
        l = r[5];
      else {
        var p = y,
          i = f(),
          l = f();
        typeof e != "number" && (a = r.length), 3 < a && "function" == typeof r[a - 2] ? o = tt.createCallback(r[--a - 1], r[a--], 2) : 2 < a && "function" == typeof r[a - 1] && (o = r[--a])
      }
      for (; ++u < a;) (Ee(r[u]) ? wt : d)(r[u], function (t, e) {
        var r, u, a = t,
          f = n[e];
        if (t && ((u = Ee(t)) || m(t))) {
          for (a = i.length; a--;)
            if (r = i[a] == t) {
              f = l[a];
              break
            }
          if (!r) {
            var c;
            o && (a = o(f, t), c = typeof a != "undefined") && (f = a), c || (f = u ? Ee(f) ? f : [] : m(f) ? f : {}), i.push(t), l.push(f), c || (f = bt(f, t, k, o, i, l))
          }
        } else o && (a = o(f, t), typeof a == "undefined" && (a = t)), typeof a != "undefined" && (f = a);
        n[e] = f
      });
      return p && (c(i), c(l)), n
    }

    function mt(n) {
      for (var t = -1, e = Se(n), r = e.length, u = Mt(r); ++t < r;) u[t] = n[e[t]];
      return u
    }

    function dt(n, t, e) {
      var r = -1,
        u = at(),
        a = n ? n.length : 0,
        o = b;
      return e = (0 > e ? _e(0, a + e) : e) || 0, a && typeof a == "number" ? o = -1 < (ht(n) ? n.indexOf(t, e) : u(n, t, e)) : d(n, function (n) {
        return ++r < e ? void 0 : !(o = n === t)
      }), o
    }

    function _t(n, t, e) {
      var r = y;
      t = tt.createCallback(t, e), e = -1;
      var u = n ? n.length : 0;
      if (typeof u == "number")
        for (; ++e < u && (r = !!t(n[e], e, n)););
      else d(n, function (n, e, u) {
        return r = !!t(n, e, u)
      });
      return r
    }

    function kt(n, t, e) {
      var r = [];
      t = tt.createCallback(t, e), e = -1;
      var u = n ? n.length : 0;
      if (typeof u == "number")
        for (; ++e < u;) {
          var a = n[e];
          t(a, e, n) && r.push(a)
        } else d(n, function (n, e, u) {
          t(n, e, u) && r.push(n)
        });
      return r
    }

    function jt(n, t, e) {
      t = tt.createCallback(t, e), e = -1;
      var r = n ? n.length : 0;
      if (typeof r != "number") {
        var u;
        return d(n, function (n, e, r) {
          return t(n, e, r) ? (u = n, b) : void 0
        }), u
      }
      for (; ++e < r;) {
        var a = n[e];
        if (t(a, e, n)) return a
      }
    }

    function wt(n, t, e) {
      var r = -1,
        u = n ? n.length : 0;
      if (t = t && typeof e == "undefined" ? t : tt.createCallback(t, e), typeof u == "number")
        for (; ++r < u && t(n[r], r, n) !== false;);
      else d(n, t);
      return n
    }

    function Ct(n, t, e) {
      var r = -1,
        u = n ? n.length : 0;
      if (t = tt.createCallback(t, e), typeof u == "number")
        for (var a = Mt(u); ++r < u;) a[r] = t(n[r], r, n);
      else a = [], d(n, function (n, e, u) {
        a[++r] = t(n, e, u)
      });
      return a
    }

    function xt(n, t, e) {
      var r = -1 / 0,
        a = r;
      if (!t && Ee(n)) {
        e = -1;
        for (var o = n.length; ++e < o;) {
          var i = n[e];
          i > a && (a = i)
        }
      } else t = !t && ht(n) ? u : tt.createCallback(t, e), wt(n, function (n, e, u) {
        e = t(n, e, u), e > r && (r = e, a = n)
      });
      return a
    }

    function Ot(n, t) {
      var e = -1,
        r = n ? n.length : 0;
      if (typeof r == "number")
        for (var u = Mt(r); ++e < r;) u[e] = n[e][t];
      return u || Ct(n, t)
    }

    function Et(n, t, e, r) {
      if (!n) return e;
      var u = 3 > arguments.length;
      t = tt.createCallback(t, r, 4);
      var a = -1,
        o = n.length;
      if (typeof o == "number")
        for (u && (e = n[++a]); ++a < o;) e = t(e, n[a], a, n);
      else d(n, function (n, r, a) {
        e = u ? (u = b, n) : t(e, n, r, a)
      });
      return e
    }

    function St(n, t, e, r) {
      var u = n ? n.length : 0,
        a = 3 > arguments.length;
      if (typeof u != "number") var o = Se(n),
        u = o.length;
      return t = tt.createCallback(t, r, 4), wt(n, function (r, i, f) {
        i = o ? o[--u] : --u, e = a ? (a = b, n[i]) : t(e, n[i], i, f)
      }), e
    }

    function It(n, t, e) {
      var r;
      t = tt.createCallback(t, e), e = -1;
      var u = n ? n.length : 0;
      if (typeof u == "number")
        for (; ++e < u && !(r = t(n[e], e, n)););
      else d(n, function (n, e, u) {
        return !(r = t(n, e, u))
      });
      return !!r
    }

    function At(n) {
      var r = -1,
        u = at(),
        a = n ? n.length : 0,
        i = ae.apply(Zt, Ce.call(arguments, 1)),
        f = [],
        l = a >= w && u === t;
      if (l) {
        var c = o(i);
        c ? (u = e, i = c) : l = b
      }
      for (; ++r < a;) c = n[r], 0 > u(i, c) && f.push(c);
      return l && p(i), f
    }

    function Nt(n, t, e) {
      if (n) {
        var r = 0,
          u = n.length;
        if (typeof t != "number" && t != h) {
          var a = -1;
          for (t = tt.createCallback(t, e); ++a < u && t(n[a], a, n);) r++
        } else if (r = t, r == h || e) return n[0];
        return s(n, 0, ke(_e(0, r), u))
      }
    }

    function $t(n, e, r) {
      if (typeof r == "number") {
        var u = n ? n.length : 0;
        r = 0 > r ? _e(0, u + r) : r || 0
      } else if (r) return r = Ft(n, e), n[r] === e ? r : -1;
      return n ? t(n, e, r) : -1
    }

    function Bt(n, t, e) {
      if (typeof t != "number" && t != h) {
        var r = 0,
          u = -1,
          a = n ? n.length : 0;
        for (t = tt.createCallback(t, e); ++u < a && t(n[u], u, n);) r++
      } else r = t == h || e ? 1 : _e(0, t);
      return s(n, r)
    }

    function Ft(n, t, e, r) {
      var u = 0,
        a = n ? n.length : u;
      for (e = e ? tt.createCallback(e, r, 1) : Wt, t = e(t); u < a;) r = u + a >>> 1, e(n[r]) < t ? u = r + 1 : a = r;
      return u
    }

    function Rt(n) {
      for (var t = -1, e = n ? xt(Ot(n, "length")) : 0, r = Mt(0 > e ? 0 : e); ++t < e;) r[t] = Ot(n, t);
      return r
    }

    function Tt(n, t) {
      for (var e = -1, r = n ? n.length : 0, u = {}; ++e < r;) {
        var a = n[e];
        t ? u[a] = t[e] : u[a[0]] = a[1]
      }
      return u
    }

    function qt(n, t) {
      return Oe.fastBind || ge && 2 < arguments.length ? ge.call.apply(ge, arguments) : rt(n, t, Ce.call(arguments, 2))
    }

    function Dt(n, t, e) {
      function r() {
        ue(s), ue(v), l = 0, s = v = h
      }

      function u() {
        var t = g && (!m || 1 < l);
        r(), t && (p !== false && (c = new Vt), i = n.apply(f, o))
      }

      function a() {
        r(), (g || p !== t) && (c = new Vt, i = n.apply(f, o))
      }

      var o, i, f, l = 0,
        c = 0,
        p = b,
        s = h,
        v = h,
        g = y;
      if (t = _e(0, t || 0), e === y) var m = y,
        g = b;
      else gt(e) && (m = e.leading, p = "maxWait" in e && _e(t, e.maxWait || 0), g = "trailing" in e ? e.trailing : g);
      return function () {
        if (o = arguments, f = this, l++ , ue(v), p === false) m && 2 > l && (i = n.apply(f, o));
        else {
          var e = new Vt;
          !s && !m && (c = e);
          var r = p - (e - c);
          0 < r ? s || (s = se(a, r)) : (ue(s), s = h, c = e, i = n.apply(f, o))
        }
        return t !== p && (v = se(u, t)), i
      }
    }

    function zt(n) {
      var t = Ce.call(arguments, 1);
      return se(function () {
        n.apply(g, t)
      }, 1)
    }

    function Wt(n) {
      return n
    }

    function Pt(n) {
      wt(ct(n), function (t) {
        var e = tt[t] = n[t];
        tt.prototype[t] = function () {
          var n = this.__wrapped__,
            t = [n];
          return ce.apply(t, arguments), t = e.apply(tt, t), n && typeof n == "object" && n === t ? this : new et(t)
        }
      })
    }

    function Kt() {
      return this.__wrapped__
    }

  }
  var g, y = !0,
    h = null,
    b = !1,
    m = [],
    d = [],
    _ = 0,
    k = {},
    j = +new Date + "",
    w = 75,
    C = 40,
    x = /\b__p\+='';/g,
    O = /\b(__p\+=)''\+/g,
    E = /(__e\(.*?\)|\b__t\))\+'';/g,
    S = /&(?:amp|lt|gt|quot|#39);/g,
    I = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,
    A = /\w*$/,
    N = /<%=([\s\S]+?)%>/g,
    $ = ($ = /\bthis\b/) && $.test(v) && $,
    B = " \t\x0B\f\xa0\ufeff\n\r\u2028\u2029\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000",
    F = RegExp("^[" + B + "]*0+(?=.$)"),
    R = /($^)/,
    T = /[&<>"']/g,
    q = /['\n\r\t\u2028\u2029\\]/g,
    D = "Array Boolean Date Function Math Number Object RegExp String _ attachEvent clearTimeout isFinite isNaN parseInt setImmediate setTimeout".split(" "),
    z = "[object Arguments]",
    W = "[object Array]",
    P = "[object Boolean]",
    K = "[object Date]",
    M = "[object Function]",
    U = "[object Number]",
    V = "[object Object]",
    G = "[object RegExp]",
    H = "[object String]",
    J = {};
  J[M] = b, J[z] = J[W] = J[P] = J[K] = J[U] = J[V] = J[G] = J[H] = y;
  var L = {
    "boolean": b,
    "function": y,
    object: y,
    number: b,
    string: b,
    undefined: b
  },
    Q = {
      "\\": "\\",
      "'": "'",
      "\n": "n",
      "\r": "r",
      "\t": "t",
      "\u2028": "u2028",
      "\u2029": "u2029"
    },
    X = L[typeof exports] && exports,
    Y = L[typeof module] && module && module.exports == X && module,
    Z = L[typeof global] && global;
  !Z || Z.global !== Z && Z.window !== Z || (n = Z);
  var nt = v();
  typeof define == "function" && typeof define.amd == "object" && define.amd ? (n._ = nt, define(function () {
    return nt
  })) : X && !X.nodeType ? Y ? (Y.exports = nt)._ = nt : X._ = nt : n._ = nt
}(this);
module.exports = UsrCloud;