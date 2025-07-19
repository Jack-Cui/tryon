import VERTC, { MediaType, StreamIndex } from '@volcengine/rtc';
import { rtcMessageHandler } from './rtcMessageHandler';

export interface RTCVideoConfig {
  appId: string;
  appKey: string;
  roomId: string;
  userId: string;
  token?: string;
}

export interface RemoteStream {
  userId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  domId: string;
}

export class RTCVideoService {
  private engine: any = null;
  private config: RTCVideoConfig | null = null;
  private isConnected: boolean = false;
  private remoteStreams: Map<string, RemoteStream> = new Map();
  private eventHandlers: {
    onUserJoin?: (userId: string) => void;
    onUserLeave?: (userId: string) => void;
    onUserPublishStream?: (userId: string, hasVideo: boolean, hasAudio: boolean) => void;
    onUserUnpublishStream?: (userId: string) => void;
    onError?: (error: any) => void;
    onHeartbeat?: (delay: number) => void;
  } = {};

  constructor() {
    // 初始化消息处理器
    rtcMessageHandler.initialize();
    
    // 注册心跳响应处理
    rtcMessageHandler.onMessage('heartbeat_ack', (data) => {
      const delay = rtcMessageHandler.getLastHeartbeatDelay();
      this.eventHandlers.onHeartbeat?.(delay);
    });
  }

  // 设置事件处理器
  setEventHandlers(handlers: typeof this.eventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  // 初始化RTC引擎
  async initialize(config: RTCVideoConfig): Promise<void> {
    console.log('🎥 初始化RTC视频服务...');
    console.log('  - appId:', config.appId);
    console.log('  - roomId:', config.roomId);
    console.log('  - userId:', config.userId);
    
    this.config = config;
    
    try {
      // 创建RTC引擎
      this.engine = VERTC.createEngine(config.appId);
      
      // 绑定事件监听器
      this.bindEngineEvents();
      
      console.log('✅ RTC引擎初始化成功');
    } catch (error) {
      console.error('❌ RTC引擎初始化失败:', error);
      throw error;
    }
  }

  // 绑定引擎事件
  private bindEngineEvents(): void {
    if (!this.engine) return;

    // 用户加入房间
    this.engine.on(VERTC.events.onUserJoined, (event: any) => {
      const userId = event.userInfo?.userId;
      console.log('👤 用户加入房间:', userId);
      this.eventHandlers.onUserJoin?.(userId);
    });

    // 用户离开房间
    this.engine.on(VERTC.events.onUserLeave, (event: any) => {
      const userId = event.userInfo?.userId;
      console.log('👤 用户离开房间:', userId);
      this.removeRemoteStream(userId);
      this.eventHandlers.onUserLeave?.(userId);
    });

    // 用户发布流
    this.engine.on(VERTC.events.onUserPublishStream, (event: any) => {
      const userId = event.userId;
      const mediaType = event.mediaType;
      const hasVideo = !!(mediaType & MediaType.VIDEO);
      const hasAudio = !!(mediaType & MediaType.AUDIO);
      
      console.log('📹 用户发布流:', userId, '视频:', hasVideo, '音频:', hasAudio);
      
      this.addRemoteStream(userId, hasVideo, hasAudio);
      this.eventHandlers.onUserPublishStream?.(userId, hasVideo, hasAudio);
    });

    // 用户取消发布流
    this.engine.on(VERTC.events.onUserUnpublishStream, (event: any) => {
      const userId = event.userId;
      console.log('📹 用户取消发布流:', userId);
      
      this.removeRemoteStream(userId);
      this.eventHandlers.onUserUnpublishStream?.(userId);
    });

    // 自动播放失败
    this.engine.on(VERTC.events.onAutoplayFailed, (event: any) => {
      console.warn('⚠️ 自动播放失败:', event.userId, event.kind);
    });

    // 播放器事件
    this.engine.on(VERTC.events.onPlayerEvent, (event: any) => {
      console.log('🎬 播放器事件:', event);
      // 检查是否是视频开始播放的事件
      if (event.eventType === 'onFirstFrame') {
        console.log('🎬 视频第一帧渲染完成:', event.userId);
        
        // 发送自定义事件到首页
        const customEvent = new CustomEvent('rtcPlayerEvent', {
          detail: {
            eventType: event.eventType,
            userId: event.userId
          }
        });
        window.dispatchEvent(customEvent);
      }
    });

    // 错误处理
    this.engine.on(VERTC.events.onError, (event: any) => {
      console.error('❌ RTC错误:', event);
      this.eventHandlers.onError?.(event);
    });
  }

  // 加入房间
  async joinRoom(token?: string): Promise<void> {
    if (!this.engine || !this.config) {
      throw new Error('RTC引擎未初始化');
    }

    console.log('🚪 加入RTC房间...');
    console.log('  - roomId:', this.config.roomId);
    console.log('  - userId:', this.config.userId);
    console.log('  - token:', token || '无token');

    try {
      await this.engine.joinRoom(
        token || null,
        this.config.roomId,
        {
          userId: this.config.userId,
        },
        {
          // 只订阅，不发布本地流
          isAutoPublish: false,
          isAutoSubscribeAudio: true,
          isAutoSubscribeVideo: true,
        }
      );
      
      this.isConnected = true;
      
      // 开始心跳
      rtcMessageHandler.startHeartbeat();
      
      console.log('✅ 成功加入RTC房间');
    } catch (error) {
      console.error('❌ 加入RTC房间失败:', error);
      throw error;
    }
  }

  // 添加远程流
  private addRemoteStream(userId: string, hasVideo: boolean, hasAudio: boolean): void {
    const domId = `remoteStream_${userId}`;
    
    this.remoteStreams.set(userId, {
      userId,
      hasVideo,
      hasAudio,
      domId
    });

    console.log('📹 添加远程流:', userId, 'DOM ID:', domId);
  }

  // 移除远程流
  private removeRemoteStream(userId: string): void {
    this.remoteStreams.delete(userId);
    console.log('📹 移除远程流:', userId);
  }

  // 设置远程视频播放器
  async setRemoteVideoPlayer(userId: string, domId: string): Promise<void> {
    if (!this.engine) {
      throw new Error('RTC引擎未初始化');
    }

    console.log('🎬 设置远程视频播放器:', userId, 'DOM ID:', domId);

    try {
      // 确保DOM元素存在
      const domElement = document.getElementById(domId);
      if (!domElement) {
        throw new Error(`DOM元素不存在: ${domId}`);
      }
      console.log('✅ DOM元素存在:', domId);

      // 订阅用户的音视频流
      await this.engine.subscribeStream(userId, MediaType.AUDIO_AND_VIDEO);
      console.log('✅ 订阅流成功:', userId);
      
      // 设置远程视频播放器
      await this.engine.setRemoteVideoPlayer(StreamIndex.STREAM_INDEX_MAIN, {
        userId: userId,
        renderDom: domId,
      });

      console.log('✅ 远程视频播放器设置成功');
    } catch (error) {
      console.error('❌ 设置远程视频播放器失败:', error);
      throw error;
    }
  }

  // 获取所有远程流
  getRemoteStreams(): RemoteStream[] {
    return Array.from(this.remoteStreams.values());
  }

  // 获取远程流信息
  getRemoteStream(userId: string): RemoteStream | undefined {
    return this.remoteStreams.get(userId);
  }

  // 离开房间
  async leaveRoom(): Promise<void> {
    if (!this.engine) return;

    console.log('🚪 准备离开RTC房间...');

    try {
      // 停止心跳
      rtcMessageHandler.stopHeartbeat();
      
      await this.engine.leaveRoom();
      this.isConnected = false;
      this.remoteStreams.clear();
      console.log('✅ 成功离开RTC房间');
    } catch (error) {
      console.error('❌ 离开RTC房间失败:', error);
      throw error;
    }
  }

  // 销毁引擎
  destroy(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    this.isConnected = false;
    this.remoteStreams.clear();
    
    // 销毁消息处理器
    rtcMessageHandler.destroy();
    
    console.log('🗑️ RTC引擎已销毁');
  }

  // 获取连接状态
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // 获取SDK版本
  getSDKVersion(): string {
    return VERTC.getSdkVersion();
  }

  // 获取心跳延迟
  getHeartbeatDelay(): number {
    return rtcMessageHandler.getLastHeartbeatDelay();
  }
}

// 导出单例实例
export const rtcVideoService = new RTCVideoService(); 