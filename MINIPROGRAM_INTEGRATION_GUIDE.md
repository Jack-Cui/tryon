# 微信小程序集成指南

## 概述

本指南说明如何在微信小程序中集成airU3D试衣功能，实现一键登录和自动视频播放。

## 服务域名配置

在微信小程序后台配置以下域名到"服务器域名"白名单：

```
https://dev-h5.ai1010.cn
```

## 小程序调用流程

### 1. 引入服务

```javascript
// 在小程序页面中引入服务
import { miniprogramService } from './services/miniprogramService';
```

### 2. 一键登录和视频播放

```javascript
// 页面数据
Page({
  data: {
    loading: false,
    videoPlaying: false
  },

  // 一键登录并播放视频
  async onOneClickLogin() {
    this.setData({ loading: true });

    try {
      // 配置登录参数
      const loginConfig = {
        phone: '13500003000', // 用户手机号
        coCreationId: '1962501788939943937', // 共创ID
        verifyCode: '8888' // 验证码
      };

      // 执行完整流程（RTC参数由服务端配置）
      const result = await miniprogramService.completeFlow(loginConfig);

      if (result.success) {
        console.log('✅ 登录和视频播放成功');
        this.setData({ videoPlaying: true });
        
        // 显示成功提示
        wx.showToast({
          title: '登录成功，视频开始播放',
          icon: 'success'
        });
      } else {
        console.error('❌ 流程执行失败:', result.error);
        wx.showToast({
          title: result.error || '操作失败',
          icon: 'error'
        });
      }

    } catch (error) {
      console.error('❌ 执行错误:', error);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
```

### 3. 分步执行（可选）

如果需要分步执行，可以分别调用：

```javascript
// 步骤1: 一键登录
async onLogin() {
  const loginConfig = {
    phone: '13500003000',
    coCreationId: '1962501788939943937',
    verifyCode: '8888'
  };

  const result = await miniprogramService.oneClickLogin(loginConfig);
  
  if (result.success) {
    console.log('登录成功:', result);
    // 保存登录信息
    wx.setStorageSync('accessToken', result.accessToken);
    wx.setStorageSync('userId', result.userId);
  }
}

// 步骤2: 启动视频播放
async onStartVideo() {
  const result = await miniprogramService.startVideoPlayback('user_123', 'room_123');
  
  if (result.success) {
    console.log('视频播放启动成功');
  }
}
```

## API接口说明

### 1. 获取验证码
```
GET https://dev-h5.ai1010.cn/admin/mobile/{phone}
```

### 2. 登录
```
POST https://dev-h5.ai1010.cn/admin/oauth/token?mobile=SMS@{phone}&code={code}&grant_type=mobile
Headers: {
  'Content-Type': 'application/x-www-form-urlencoded',
  'isToken': 'false',
  'TENANT-ID': '1',
  'Authorization': 'Basic cGlnOnBpZw=='
}
```

### 3. 获取房间信息
```
GET https://dev-h5.ai1010.cn/admin/sysroomshare/{co_creation_id}
Headers: {
  'Authorization': 'Bearer {access_token}'
}
```

### 4. 创建房间
```
POST https://dev-h5.ai1010.cn/admin/room/create
Headers: {
  'Authorization': 'Bearer {access_token}',
  'Content-Type': 'application/json'
}
Body: {
  "sourceRoomId": "{room_id}",
  "shareId": "{co_creation_id}"
}
```

### 5. 加入房间
```
POST https://dev-h5.ai1010.cn/admin/roomUser/join
Headers: {
  'Authorization': 'Bearer {access_token}',
  'Content-Type': 'application/json'
}
Body: {
  "id": {room_primary_id},
  "relationshipType": 1
}
```

## 小程序页面示例

```xml
<!-- pages/tryon/index.wxml -->
<view class="container">
  <view class="header">
    <text class="title">airU3D试衣间</text>
  </view>
  
  <view class="content">
    <button 
      class="login-btn {{loading ? 'loading' : ''}}"
      bindtap="onOneClickLogin"
      disabled="{{loading}}"
    >
      {{loading ? '登录中...' : '一键登录并开始试衣'}}
    </button>
    
    <view class="video-container" wx:if="{{videoPlaying}}">
      <text class="video-tip">视频正在播放中...</text>
      <!-- 这里可以添加视频播放组件 -->
    </view>
  </view>
</view>
```

```css
/* pages/tryon/index.wxss */
.container {
  padding: 40rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  text-align: center;
  margin-bottom: 80rpx;
}

.title {
  font-size: 48rpx;
  color: white;
  font-weight: bold;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-btn {
  width: 600rpx;
  height: 100rpx;
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
  border: none;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 20rpx rgba(255, 107, 107, 0.3);
}

.login-btn.loading {
  opacity: 0.7;
}

.video-container {
  margin-top: 60rpx;
  padding: 40rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  backdrop-filter: blur(10rpx);
}

.video-tip {
  color: white;
  font-size: 28rpx;
}
```

## 注意事项

1. **域名配置**: 确保在微信小程序后台正确配置服务器域名
2. **权限申请**: 如果需要摄像头权限，需要在app.json中配置
3. **网络请求**: 所有网络请求都需要使用HTTPS
4. **错误处理**: 建议添加完善的错误处理和用户提示
5. **性能优化**: 视频播放时注意内存管理，及时释放资源

## 测试建议

1. 先在微信开发者工具中测试
2. 使用真机调试验证功能
3. 测试不同网络环境下的表现
4. 验证错误处理机制

## 技术支持

如有问题，请查看控制台日志或联系技术支持团队。
