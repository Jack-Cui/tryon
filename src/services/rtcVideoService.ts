import VERTC, { MediaType, StreamIndex } from '@volcengine/rtc';

export interface RTCVideoConfig {
  appId: string;
  appKey: string;
  roomId: string;
  userId: string;
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
  } = {};

  constructor() {}

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
      
      // 设置连接状态为已连接（因为用户已经在API中加入了房间）
      this.isConnected = true;
      
      console.log('✅ RTC引擎初始化成功（跳过加入房间步骤）');
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
    });

    // 错误处理
    this.engine.on(VERTC.events.onError, (event: any) => {
      console.error('❌ RTC错误:', event);
      this.eventHandlers.onError?.(event);
    });
  }

  // 加入房间 - 已跳过，因为用户已经在API中加入了房间
  async joinRoom(): Promise<void> {
    console.log('🚪 跳过加入RTC房间步骤（用户已在API中加入房间）');
    // 不需要执行任何操作，因为用户已经在API中加入了房间
    return Promise.resolve();
  }

  // 添加远程流
  private addRemoteStream(userId: string, hasVideo: boolean, hasAudio: boolean): void {
    const domId = `remote-video-${userId}`;
    
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
      // 订阅用户的音视频流
      await this.engine.subscribeStream(userId, MediaType.AUDIO_AND_VIDEO);
      
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
}

// 导出单例实例
export const rtcVideoService = new RTCVideoService(); 