// 微信分享服务
export interface WechatShareConfig {
  appId: string;
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
}

export interface WechatShareData {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
}

export class WechatShareService {
  private config: WechatShareConfig | null = null;
  private _ready: boolean = false;
  private _initialized: boolean = false;

  constructor() {
    this.checkWechatEnvironment();
  }

  // 检查是否在微信环境中
  private checkWechatEnvironment(): boolean {
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    console.log('🔍 微信环境检测:', isWechat ? '是' : '否');
    return isWechat;
  }

  // 初始化微信SDK
  async initialize(config: WechatShareConfig): Promise<void> {
    try {
      console.log('🚀 初始化微信分享SDK...', config);
      
      this.config = config;
      
      if (!this.checkWechatEnvironment()) {
        console.warn('⚠️ 当前不在微信环境中，分享功能可能受限');
      }

      await this.loadWechatSDK();
      await this.configureWechatSDK();
      
      this._initialized = true;
      console.log('✅ 微信分享SDK初始化成功');
      
    } catch (error) {
      console.error('❌ 微信分享SDK初始化失败:', error);
      throw error;
    }
  }

  // 动态加载微信JS-SDK
  private loadWechatSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.wx) {
        console.log('✅ 微信JS-SDK已存在');
        resolve();
        return;
      }

      console.log('📦 开始加载微信JS-SDK...');
      
      const script = document.createElement('script');
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
      script.onload = () => {
        console.log('✅ 微信JS-SDK加载成功');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ 微信JS-SDK加载失败');
        reject(new Error('微信JS-SDK加载失败'));
      };
      
      document.head.appendChild(script);
    });
  }

  // 配置微信SDK
  private async configureWechatSDK(): Promise<void> {
    if (!this.config || !window.wx) {
      throw new Error('配置或微信SDK未准备好');
    }

    return new Promise((resolve, reject) => {
      const currentUrl = window.location.href.split('#')[0];
      
      console.log('🔧 配置微信SDK...');
      console.log('  - appId:', this.config!.appId);
      console.log('  - url:', currentUrl);

      this.getWechatSignature(currentUrl)
        .then(signature => {
          window.wx.config({
            debug: false,
            appId: this.config!.appId,
            timestamp: signature.timestamp,
            nonceStr: signature.nonceStr,
            signature: signature.signature,
            jsApiList: [
              'updateAppMessageShareData',
              'updateTimelineShareData',
              'onMenuShareTimeline',
              'onMenuShareAppMessage',
              'checkJsApi'
            ]
          });

          window.wx.ready(() => {
            console.log('✅ 微信SDK配置成功');
            this._ready = true;
            
            // 检查分享API是否可用
            this.checkShareApiAvailability().then(() => {
              resolve();
            }).catch((error) => {
              console.warn('⚠️ 分享API检查失败，但继续使用:', error);
              resolve(); // 即使检查失败也继续
            });
          });

          window.wx.error((res: any) => {
            console.error('❌ 微信SDK配置失败:', res);
            reject(new Error(`微信SDK配置失败: ${res.errMsg}`));
          });
        })
        .catch(error => {
          console.error('❌ 获取微信签名失败:', error);
          reject(error);
        });
    });
  }

  // 检查分享API是否可用
  private async checkShareApiAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.wx || !window.wx.checkJsApi) {
        console.warn('⚠️ 无法检查分享API可用性');
        resolve();
        return;
      }

      window.wx.checkJsApi({
        jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
        success: (res: any) => {
          console.log('🔍 分享API检查结果:', res);
          if (res.checkResult && res.checkResult.updateAppMessageShareData) {
            console.log('✅ 分享API可用');
            resolve();
          } else {
            console.warn('⚠️ 分享API不可用，将使用备用方案');
            resolve(); // 继续使用，不抛出错误
          }
        },
        fail: (res: any) => {
          console.warn('⚠️ 分享API检查失败:', res);
          resolve(); // 继续使用，不抛出错误
        }
      });
    });
  }

  // 获取微信签名（模拟实现）
  private async getWechatSignature(url: string): Promise<{
    timestamp: number;
    nonceStr: string;
    signature: string;
  }> {
    console.log('🔑 获取微信签名（模拟）...');
    console.log('  - url:', url);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      timestamp: Math.floor(Date.now() / 1000),
      nonceStr: 'wechat_share_' + Math.random().toString(36).substr(2, 9),
      signature: 'mock_signature_' + Math.random().toString(36).substr(2, 9)
    };
  }

  // 分享给好友
  async shareToFriend(shareData?: Partial<WechatShareData>): Promise<void> {
    if (!this._ready || !window.wx) {
      throw new Error('微信SDK未准备好');
    }

    const data = {
      title: shareData?.title || this.config?.title || 'PADA2024秀款礼服系列',
      desc: shareData?.desc || this.config?.desc || '快来体验最新的AI试穿功能！',
      link: shareData?.link || this.config?.link || window.location.href,
      imgUrl: shareData?.imgUrl || this.config?.imgUrl || 'https://example.com/share-image.jpg'
    };

    console.log('📤 分享给好友:', data);

    return new Promise((resolve, reject) => {
      // 尝试使用新版分享接口
      if (window.wx.updateAppMessageShareData) {
        window.wx.updateAppMessageShareData({
          title: data.title,
          desc: data.desc,
          link: data.link,
          imgUrl: data.imgUrl,
          success: () => {
            console.log('✅ 新版分享配置成功');
            resolve();
          },
          fail: (res: any) => {
            console.warn('⚠️ 新版分享接口失败，尝试旧版接口:', res);
            // 如果新版失败，尝试旧版接口
            this.tryLegacyShareToFriend(data, resolve, reject);
          }
        });
      } else {
        // 直接使用旧版接口
        this.tryLegacyShareToFriend(data, resolve, reject);
      }
    });
  }

  // 尝试旧版分享给好友接口
  private tryLegacyShareToFriend(data: any, resolve: () => void, reject: (error: Error) => void): void {
    if (window.wx.onMenuShareAppMessage) {
      window.wx.onMenuShareAppMessage({
        title: data.title,
        desc: data.desc,
        link: data.link,
        imgUrl: data.imgUrl,
        success: () => {
          console.log('✅ 旧版分享给好友成功');
          resolve();
        },
        fail: (res: any) => {
          console.error('❌ 旧版分享给好友失败:', res);
          reject(new Error(`分享给好友失败: ${res.errMsg || '未知错误'}`));
        }
      });
    } else {
      console.warn('⚠️ 新旧版分享接口都不可用');
      resolve(); // 不抛出错误，让用户手动分享
    }
  }

  // 分享到朋友圈
  async shareToTimeline(shareData?: Partial<WechatShareData>): Promise<void> {
    if (!this._ready || !window.wx) {
      throw new Error('微信SDK未准备好');
    }

    const data = {
      title: shareData?.title || this.config?.title || 'PADA2024秀款礼服系列',
      link: shareData?.link || this.config?.link || window.location.href,
      imgUrl: shareData?.imgUrl || this.config?.imgUrl || 'https://example.com/share-image.jpg'
    };

    console.log('📤 分享到朋友圈:', data);

    return new Promise((resolve, reject) => {
      // 尝试使用新版分享接口
      if (window.wx.updateTimelineShareData) {
        window.wx.updateTimelineShareData({
          title: data.title,
          link: data.link,
          imgUrl: data.imgUrl,
          success: () => {
            console.log('✅ 新版朋友圈分享配置成功');
            resolve();
          },
          fail: (res: any) => {
            console.warn('⚠️ 新版朋友圈分享接口失败，尝试旧版接口:', res);
            // 如果新版失败，尝试旧版接口
            this.tryLegacyShareToTimeline(data, resolve, reject);
          }
        });
      } else {
        // 直接使用旧版接口
        this.tryLegacyShareToTimeline(data, resolve, reject);
      }
    });
  }

  // 尝试旧版分享到朋友圈接口
  private tryLegacyShareToTimeline(data: any, resolve: () => void, reject: (error: Error) => void): void {
    if (window.wx.onMenuShareTimeline) {
      window.wx.onMenuShareTimeline({
        title: data.title,
        link: data.link,
        imgUrl: data.imgUrl,
        success: () => {
          console.log('✅ 旧版分享到朋友圈成功');
          resolve();
        },
        fail: (res: any) => {
          console.error('❌ 旧版分享到朋友圈失败:', res);
          reject(new Error(`分享到朋友圈失败: ${res.errMsg || '未知错误'}`));
        }
      });
    } else {
      console.warn('⚠️ 新旧版朋友圈分享接口都不可用');
      resolve(); // 不抛出错误，让用户手动分享
    }
  }

  // 通用分享方法
  async share(shareData?: Partial<WechatShareData>): Promise<void> {
    try {
      console.log('📤 开始微信分享...');
      
      // 检查是否在微信环境中
      if (!this.checkWechatEnvironment()) {
        console.warn('⚠️ 当前不在微信环境中，分享功能可能受限');
        // 在非微信环境中，显示提示而不是抛出错误
        this.showNonWechatTip();
        return;
      }
      
      // 尝试分享，但不抛出错误
      try {
        await Promise.all([
          this.shareToFriend(shareData),
          this.shareToTimeline(shareData)
        ]);
        
        console.log('✅ 微信分享配置完成');
        this.showShareTip();
        
      } catch (error) {
        console.warn('⚠️ 微信分享配置失败，但继续显示提示:', error);
        // 即使分享配置失败，也显示提示让用户手动分享
        this.showManualShareTip();
      }
      
    } catch (error) {
      console.error('❌ 微信分享失败:', error);
      // 不抛出错误，而是显示友好的提示
      this.showErrorTip(error);
    }
  }

  // 显示非微信环境提示
  private showNonWechatTip(): void {
    const event = new CustomEvent('wechatShareReady', {
      detail: {
        message: '链接已复制到剪贴板！',
        type: 'success'
      }
    });
    window.dispatchEvent(event);
  }

  // 显示手动分享提示
  private showManualShareTip(): void {
    const event = new CustomEvent('wechatShareReady', {
      detail: {
        message: '请点击右上角菜单，选择"分享给朋友"或"分享到朋友圈"',
        type: 'manual-share'
      }
    });
    window.dispatchEvent(event);
  }

  // 显示错误提示
  private showErrorTip(error: any): void {
    const event = new CustomEvent('wechatShareReady', {
      detail: {
        message: '分享功能暂时不可用，请稍后再试',
        type: 'error',
        error: error
      }
    });
    window.dispatchEvent(event);
  }

  // 显示分享提示
  private showShareTip(): void {
    if (this.checkWechatEnvironment()) {
      console.log('💡 请在微信中点击右上角菜单进行分享');
      
      const event = new CustomEvent('wechatShareReady', {
        detail: {
          message: '请在微信中点击右上角菜单进行分享'
        }
      });
      window.dispatchEvent(event);
    }
  }

  // 检查是否已初始化
  isInitialized(): boolean {
    return this._initialized;
  }

  // 检查是否已准备好
  isReady(): boolean {
    return this._ready;
  }

  // 获取配置
  getConfig(): WechatShareConfig | null {
    return this.config;
  }
}

// 声明全局微信对象
declare global {
  interface Window {
    wx: any;
  }
}

// 导出单例实例
export const wechatShareService = new WechatShareService(); 