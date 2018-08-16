
const app = getApp()

const util = require('../../../utils/util.js')

const plugin = requirePlugin("WechatSI")

import { language } from '../../../utils/conf.js'


// 获取**全局唯一**的语音识别管理器**recordRecoManager**
const manager = plugin.getRecordRecognitionManager()


Page({
  data: {
    showModalStatus: false ,
    isNone:false,
    dialogList: [
      // {
      //   // 当前语音输入内容
      //   create: '04/27 15:37',
      //   lfrom: 'zh_CN',
      //   lto: 'en_US',
      //   text: '这是测试这是测试这是测试这是测试',
      //   translateText: 'this is test.this is test.this is test.this is test.',
      //   voicePath: '',
      //   translateVoicePath: '',
      //   autoPlay: false, // 自动播放背景音乐
      //   id: 0,
      // },
    ],
    scroll_top: 10000, // 竖向滚动条位置

    bottomButtonDisabled: false, // 底部按钮disabled

    tips_language: language[0], // 目前只有中文

    initTranslate: {
      // 为空时的卡片内容
      create: '04/27 15:37',
      text: '等待说话',
    },

    currentTranslate: {
      // 当前语音输入内容
      create: '04/27 15:37',
      text: '等待说话',
    },
    recording: false,  // 正在录音
    recordStatus: 0,   // 状态： 0 - 录音中 1- 翻译中 2 - 翻译完成/二次翻译

    toView: 'fake',  // 滚动位置
    lastId: -1,    // dialogList 最后一个item的 id
    currentTranslateVoice: '', // 当前播放语音路径
    // serverResponse: {},

  },
//  弹窗控制
  powerDrawer: function (e) {
    var currentStatu = "close";
    this.util(currentStatu)
    let that=this;
    that.setData({
      isNone:false
    })
    // let youEmail = e.detail.value.youEmail;
    let sendEmail = e.detail.value.sendEmail;
    let emailTitle = e.detail.value.emailTitle;
    let emailContext = e.detail.value.emailContext;
    // let remarks = e.detail.value.remarks;
    wx.request({
      // url: 'http://123.207.173.185:8080/sendEmail',
      url: 'http://192.168.1.7:8080/sendEmail',
      method: "POST",
      data: {
        // "youEmail": youEmail,
        "sendEmail": sendEmail,
        "emailTitle": emailTitle,
        "emailContext": emailContext,
        // "remarks": remarks
      },
      header: { "Content-Type": "application/x-www-form-urlencoded" },
      success: function (res) {
        console.log(res)
        var serverResponse = res.data
        // that.textToSpeech(item, index, serverResponse)
        wx.showModal({
          title: '提示',
          content: serverResponse,
          success: function (res) {
            if (res.confirm) {
              console.log('用户点击确定')
            } else if (res.cancel) {
              console.log('用户点击取消')
            }
          }
        })
      }
    })

  },
  util: function (currentStatu) {
    /* 动画部分 */
    // 第1步：创建动画实例   
    var animation = wx.createAnimation({
      duration: 200,  //动画时长  
      timingFunction: "linear", //线性  
      delay: 0  //0则不延迟  
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
        this.setData(
          {
            showModalStatus: false
          }
        );
      }
    }.bind(this), 200)

    // 显示  
    if (currentStatu == "open") {
      this.setData(
        {
          showModalStatus: true
        }
      );
    }
  }, 


  /**
   * 按住按钮开始语音识别
   */
  streamRecord: function(e) {
    // console.log("streamrecord" ,e)
    let detail = e.detail || {}
    let buttonItem = detail.buttonItem || {}
    manager.start({
      lang: buttonItem.lang,
    })

    this.setData({
      recordStatus: 0,
      recording: true,
      currentTranslate: {
        // 当前语音输入内容
        create: util.recordTime(new Date()),
        text: '正在聆听中',
        lfrom: buttonItem.lang,
        lto: buttonItem.lto,
      },
    })
    this.scrollToNew();

  },


  /**
   * 松开按钮结束语音识别
   */
  streamRecordEnd: function(e) {

    // console.log("streamRecordEnd" ,e)
    let detail = e.detail || {}  // 自定义组件触发事件时提供的detail对象
    let buttonItem = detail.buttonItem || {}
    let item = detail.item
    let index = detail.index

    // 防止重复触发stop函数
    if(!this.data.recording || this.data.recordStatus != 0) {
      console.warn("has finished!")
      return
    }

    manager.stop()

    this.setData({
      bottomButtonDisabled: true,
    })

  },




  /**
   * 语音文件过期，重新合成语音文件
   */
  expiredAction: function(e) {
    let detail = e.detail || {}  // 自定义组件触发事件时提供的detail对象
    let item = detail.item || {}
    let index = detail.index

    if(isNaN(index) || index < 0) {
      return
    }

    let lto = item.lto || 'en_US'

    plugin.textToSpeech({
      lang: lto,
      content: "item.translateText",
      success: resTrans => {
        if(resTrans.retcode == 0) {
          let tmpDialogList = this.data.dialogList.slice(0)

          let tmpTranslate = Object.assign({}, item, {
            autoPlay: true, // 自动播放背景音乐
            translateVoicePath: resTrans.filename,
            translateVoiceExpiredTime: resTrans.expired_time || 0
          })

          tmpDialogList[index] = tmpTranslate


          this.setData({
            dialogList: tmpDialogList,
          })

        } else {
          console.warn("语音合成失败", resTrans, item)
        }
      },
      fail: function(resTrans) {
        console.warn("语音合成失败", resTrans, item)
      }
  })
  },

  /**
   * 初始化为空时的卡片
   */
  initCard: function () {
    let initTranslateNew = Object.assign({}, this.data.initTranslate, {
      create: util.recordTime(new Date()),
    })
    this.setData({
      initTranslate: initTranslateNew
    })
  },


  /**
   * 删除卡片
   */
  deleteItem: function(e) {
    // console.log("deleteItem" ,e)
    let detail = e.detail
    let item = detail.item

    let tmpDialogList = this.data.dialogList.slice(0)
    let arrIndex = detail.index
    tmpDialogList.splice(arrIndex, 1)

    // 不使用setTImeout可能会触发 Error: Expect END descriptor with depth 0 but get another
    setTimeout( ()=>{
      this.setData({
        dialogList: tmpDialogList
      })
      if(tmpDialogList.length == 0) {
        this.initCard()
      }
    }, 0)

  },


  /**
   * 识别内容为空时的反馈
   */
  showRecordEmptyTip: function() {
    this.setData({
      recording: false,
      bottomButtonDisabled: false,
    })
    wx.showToast({
      title: this.data.tips_language.recognize_nothing,
      icon: 'success',
      image: '/image/no_voice.png',
      duration: 1000,
      success: function (res) {

      },
      fail: function (res) {
        console.log(res);
      }
    });
  },


  /**
   * 初始化语音识别回调
   * 绑定语音播放开始事件
   */
  initRecord: function(e) {
    console.log("初始化语音识别回调:" + JSON.stringify(e))
    //有新的识别内容返回，则会调用此事件
    manager.onRecognize = (res) => {
      let currentData = Object.assign({}, this.data.currentTranslate, {
                        text: res.result,
                      })
      this.setData({
        currentTranslate: currentData,
      })
      this.scrollToNew();
    }

    // 识别结束事件
    manager.onStop = (res) => {
      console.log("识别结束事件：" + JSON.stringify(res))
      let text = res.result
      // console.log("识别结束，内容是："+text)

      if(text == '') {
        this.showRecordEmptyTip()
        return
      }

      let lastId = this.data.lastId + 1

      let currentData = Object.assign({}, this.data.currentTranslate, {
                        text: res.result,
                        translateText: '正在识别中',
                        id: lastId,
                        voicePath: res.tempFilePath
                      })

      this.setData({
        currentTranslate: currentData,
        recordStatus: 1,
        lastId: lastId,
      })

      this.scrollToNew();
      this.requestSend(text,currentData, this.data.dialogList.length);
      var data = this.data.currentTranslate.text;
      // var serverResponse = wx.getStorageSync('serverResponse')

      // this.textToSpeech(currentData, this.data.dialogList.length, app.globalData.serverResponse)
      

    }

    

    // 识别错误事件
    manager.onError = (res) => {

      this.setData({
        recording: false,
        bottomButtonDisabled: false,
      })

    }

    // 语音播放开始事件
    wx.onBackgroundAudioPlay(res=>{

      const backgroundAudioManager = wx.getBackgroundAudioManager()
      let src = backgroundAudioManager.src

      this.setData({
        currentTranslateVoice: src
      })

    })
  },

  requestSend: function (text,item,index) {
    var that = this;
    // var _self=this;
    wx.request({
      // url: 'http://123.207.173.185:8080/textToAIUI',
      url: 'http://192.168.1.7:8080/textToAIUI',
      method: "POST",
      data: {
        "voiceText": text
      },
      header: { "Content-Type": "application/x-www-form-urlencoded" },
      success: function (res) {
        console.log(res);
        var emailData = res.data.semantic;
        // that.globalData.emailData = res.data.semantic
        // wx.setStorageSync('serverResponse', res.data)
        var serverResponse = res.data.say
        console.log("返回结果" + JSON.stringify(res.data))
        that.textToSpeech(item, index,serverResponse)
        if (serverResponse =="好的，请输入邮箱信息！"){
          setTimeout(function(){
            let currentStatu = "open";
            that.util(currentStatu);
            that.setData({
              isNone: !that.data.isNone
            })
          },4000)
        }
        if (serverResponse == "好的，邮件已为您写好，请检查邮件信息是否正确并确认是否发送。") {
          setTimeout(function () {
            let currentStatu = "open";
            that.util(currentStatu);
            that.setData({
              isNone: !that.data.isNone,
              emailData: emailData
            })
            console.log('hahha'+emailData[0].normValue)
          }, 8000)
        }
      }
    })
  },

  /**
   * 语音合成
   */
  textToSpeech: function (item, index, serverResponse) {
    // console.log("你好，哈哈哈哈" + JSON.stringify(item))
    let lto = 'zh_CN'
    plugin.textToSpeech({
      lang: lto,
      content: serverResponse,
      tts: true,
      success: (resTrans) => {

        let passRetcode = [
          0, // 翻译合成成功
          -10006, // 翻译成功，合成失败
          -10007, // 翻译成功，传入了不支持的语音合成语言
          -10008, // 翻译成功，语音合成达到频率限制
        ]

        if (passRetcode.indexOf(resTrans.retcode) >= 0) {
          let tmpDialogList = this.data.dialogList.slice(0)

          if (!isNaN(index)) {

            let tmpTranslate = Object.assign({}, item, {
              autoPlay: true, // 自动播放背景音乐
              translateText: serverResponse,
              translateVoicePath: resTrans.filename || "",
              translateVoiceExpiredTime: resTrans.expired_time || 0
            })

            tmpDialogList[index] = tmpTranslate


            this.setData({
              dialogList: tmpDialogList,
              bottomButtonDisabled: false,
              recording: false,
            })

            this.scrollToNew();

          } else {
            console.error("index error", resTrans, item)
          }
        } else {
          console.warn("合成失败", resTrans, item)
        }

      },
      fail: function (resTrans) {
        console.warn("语音合成失败", resTrans, item)
      },
      complete: resTrans => {
        this.setData({
          recordStatus: 1,
        })
        wx.hideLoading()
      }
    })
  },

  /**
   * 设置语音识别历史记录
   */
  setHistory: function() {
    try {
      let dialogList = this.data.dialogList
      dialogList.forEach(item => {
        item.autoPlay = false
      })
      wx.setStorageSync('history',dialogList)

    } catch (e) {

      console.error("setStorageSync setHistory failed")
    }
  },

  
  /**
   * 重新滚动到底部
   */
  scrollToNew: function() {
    this.setData({
      toView: this.data.toView
    })
  },

  onShow: function() {
    this.scrollToNew();

    this.initCard()

    if(this.data.recordStatus == 2) {
      wx.showLoading({
        // title: '',
        mask: true,
      })
    }

  },

  onLoad: function () {
    //语音识别开始回调
    this.initRecord()
    this.setData({toView: this.data.toView})
    app.getRecordAuth()
  },

  onHide: function() {
    this.setHistory()
  },
})
