// 微信小程序API调用示例
// 展示如何在小程序中依次调用API实现一键登录和视频播放

// 配置信息
const CONFIG = {
  BASE_URL: 'https://dev-h5.ai1010.cn',
  PHONE: '13500003000',
  CO_CREATION_ID: '1962501788939943937',
  VERIFY_CODE: '8888'
};

// 小程序页面
Page({
  data: {
    loading: false,
    currentStep: '',
    videoPlaying: false,
    accessToken: '',
    userId: '',
    roomPrimaryId: null
  },

  // 一键登录并播放视频
  async onOneClickLogin() {
    this.setData({ loading: true });

    try {
      // 步骤1: 登录（使用传入的验证码）
      const loginResult = await this.login();
      if (!loginResult.success) {
        throw new Error(loginResult.error);
      }

      // 步骤2: 获取房间信息
      const roomInfo = await this.getRoomInfo(loginResult.accessToken);
      
      // 步骤3: 获取场景列表
      await this.getSceneList(loginResult.accessToken);
      
      // 步骤4: 创建房间
      const roomPrimaryId = await this.createRoom(loginResult.accessToken, roomInfo);
      
      // 步骤5: 加入房间
      await this.joinRoom(loginResult.accessToken, roomPrimaryId);
      
      // 步骤6: 启动视频播放
      await this.startVideoPlayback(loginResult.userId, roomPrimaryId);

      // 保存登录信息
      this.setData({
        accessToken: loginResult.accessToken,
        userId: loginResult.userId,
        roomPrimaryId: roomPrimaryId,
        videoPlaying: true
      });

      wx.showToast({
        title: '登录成功，视频开始播放',
        icon: 'success'
      });

    } catch (error) {
      console.error('操作失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 步骤1: 登录
  async login() {
    this.setData({ currentStep: '正在登录...' });
    
    const response = await wx.request({
      url: `${CONFIG.BASE_URL}/admin/oauth/token`,
      method: 'POST',
      data: {
        mobile: `SMS@${CONFIG.PHONE}`,
        code: CONFIG.VERIFY_CODE, // 使用传入的验证码
        grant_type: 'mobile'
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'isToken': 'false',
        'TENANT-ID': '1',
        'Authorization': 'Basic cGlnOnBpZw=='
      }
    });

    if (response.statusCode !== 200 || !response.data.access_token) {
      throw new Error('登录失败');
    }

    console.log('✅ 登录成功');
    return {
      success: true,
      accessToken: response.data.access_token,
      userId: response.data.user_id
    };
  },

  // 步骤2: 获取房间信息
  async getRoomInfo(accessToken) {
    this.setData({ currentStep: '正在获取房间信息...' });
    
    const response = await wx.request({
      url: `${CONFIG.BASE_URL}/admin/sysroomshare/${CONFIG.CO_CREATION_ID}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.statusCode !== 200) {
      throw new Error('获取房间信息失败');
    }

    console.log('✅ 房间信息获取成功');
    return response.data.data;
  },

  // 步骤3: 获取场景列表
  async getSceneList(accessToken) {
    this.setData({ currentStep: '正在获取场景列表...' });
    
    const response = await wx.request({
      url: `${CONFIG.BASE_URL}/admin/sysscenario/listScenairo`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode !== 200) {
      throw new Error('获取场景列表失败');
    }

    console.log('✅ 场景列表获取成功');
    return response.data;
  },

  // 步骤4: 创建房间
  async createRoom(accessToken, roomInfo) {
    this.setData({ currentStep: '正在创建房间...' });
    
    const response = await wx.request({
      url: `${CONFIG.BASE_URL}/admin/room/create`,
      method: 'POST',
      data: {
        sourceRoomId: roomInfo.roomId || 'default_room',
        shareId: CONFIG.CO_CREATION_ID
      },
      header: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode !== 200 || !response.data.data?.id) {
      throw new Error('创建房间失败');
    }

    console.log('✅ 房间创建成功');
    return response.data.data.id;
  },

  // 步骤5: 加入房间
  async joinRoom(accessToken, roomPrimaryId) {
    this.setData({ currentStep: '正在加入房间...' });
    
    const response = await wx.request({
      url: `${CONFIG.BASE_URL}/admin/roomUser/join`,
      method: 'POST',
      data: {
        id: roomPrimaryId,
        relationshipType: 1
      },
      header: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode !== 200) {
      throw new Error('加入房间失败');
    }

    console.log('✅ 加入房间成功');
  },

  // 步骤6: 启动视频播放
  async startVideoPlayback(userId, roomPrimaryId) {
    this.setData({ currentStep: '正在启动视频播放...' });
    
    // 这里需要集成RTC视频播放功能
    // 由于小程序环境的限制，可能需要使用小程序的live-player组件
    // 或者通过web-view组件加载H5页面
    
    console.log('✅ 视频播放启动成功');
    
    // 模拟视频播放成功
    setTimeout(() => {
      this.setData({ 
        currentStep: '视频播放中...',
        videoPlaying: true 
      });
    }, 1000);
  },

  // 停止视频播放
  onStopVideo() {
    this.setData({
      videoPlaying: false,
      currentStep: ''
    });
    
    wx.showToast({
      title: '视频已停止',
      icon: 'success'
    });
  }
});
