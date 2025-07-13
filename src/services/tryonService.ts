import { authAPI, roomAPI } from './api';
import { scheduleService } from './scheduleService';
import { webSocketService, WebSocketConfig } from './websocketService';
import { RTCVideoService, RTCVideoConfig } from './rtcVideoService';
import { RTC_CONFIG } from '../config/config';
import { AccessToken, Privilege } from '../token/AccessToken';
import { updateRoomNameInCache } from '../utils/loginCache';

export interface TryonConfig {
  phone: string;
  coCreationId: number;
  userId: string;
  accessToken: string;
  rtcConfig?: RTCVideoConfig;
}

export class TryonService {
  private config: TryonConfig | null = null;
  private accessToken: string | null = null;
  private roomId: string | null = null;
  private roomName: string | null = null; // 添加房间名称属性
  private roomPrimaryId: number | null = null; // 添加房间主键ID属性
  private enterStageInfo: string | null = null;
  private rtcVideoService: RTCVideoService | null = null;
  private rtcStarted: boolean = false; // 防止重复启动RTC

  constructor() {
    // 监听登台成功事件
    this.setupEventListeners();
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    window.addEventListener('stageSuccessRTCStart', ((event: CustomEvent) => {
      console.log('🎯 收到登台成功事件，准备启动RTC...');
      console.log('事件详情:', event.detail);
      
      if (!this.rtcStarted) {
        this.rtcStarted = true;
        this.startRTCVideo().catch(error => {
          console.error('RTC启动失败:', error);
          this.rtcStarted = false; // 重置标志，允许重试
        });
      } else {
        console.log('RTC已经启动，跳过重复启动');
      }
    }) as EventListener);
  }

  // 生成RTC Token
  private generateRTCToken(): string {
    if (!this.config || !this.roomId) {
      throw new Error('缺少必要参数：config 或 roomId');
    }

    const appId = RTC_CONFIG.APP_ID;
    const appKey = RTC_CONFIG.APP_KEY;
    const roomId = this.roomId;
    const userId = this.config.userId;

    console.log('🔑 生成RTC Token...');
    console.log('  - appId:', appId);
    console.log('  - roomId:', roomId);
    console.log('  - userId:', userId);

    const token = new AccessToken(appId, appKey, roomId, userId);
    
    // 添加订阅流权限（永久有效）
    token.addPrivilege(Privilege.PrivSubscribeStream, 0);
    
    // 添加发布流权限（24小时有效）
    const expireTime = Math.floor(new Date().getTime() / 1000) + 24 * 3600;
    token.addPrivilege(Privilege.PrivPublishStream, expireTime);
    
    // 设置token过期时间（24小时）
    token.expireTime(expireTime);
    
    // 序列化生成token字符串
    const tokenString = token.serialize();
    console.log('✅ RTC Token 生成成功');
    
    return tokenString;
  }

  // 登录成功后初始化房间信息
  async initializeAfterLogin(config: TryonConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.accessToken;
    
    try {
      console.log('🏠 开始初始化房间信息...');
      
      // 1. 获取房间信息
      console.log('步骤1: 获取房间信息');
      await this.getRoomInfo();
      
      // 2. 创建房间
      console.log('步骤2: 创建房间');
      this.roomPrimaryId = await this.createRoom();
      
      console.log('✅ 房间信息初始化完成');
      console.log('  - 房间ID:', this.roomId);
      console.log('  - 房间名称:', this.roomName);
      console.log('  - 房间主键ID:', this.roomPrimaryId);
      
      // 更新缓存中的房间名称
      if (this.roomName) {
        updateRoomNameInCache(this.roomName);
      }
      
    } catch (error) {
      console.error('❌ 房间信息初始化失败:', error);
      throw error;
    }
  }

  // 完整的试穿流程（简化版，跳过已执行的步骤）
  async startTryonFlow(config: TryonConfig): Promise<void> {
    // 如果没有预先初始化，则执行完整流程
    if (!this.roomId || !this.roomPrimaryId || !this.accessToken) {
      console.log('⚠️ 房间信息未初始化，执行完整流程...');
      return this.startFullTryonFlow(config);
    }
    
    // 更新配置（主要是RTC配置）
    this.config = config;
    
    try {
      console.log('🚀 开始简化试穿流程...');
      console.log('  - 使用已获取的房间ID:', this.roomId);
      console.log('  - 使用已获取的房间主键ID:', this.roomPrimaryId);
      console.log('  - 使用已获取的房间名称:', this.roomName);
      
      // 3. 加入房间
      console.log('步骤3: 加入房间');
      await this.joinRoom(this.roomPrimaryId);
      
      // 4. 调度分配实例
      console.log('步骤4: 调度分配实例');
      const scheduleResult = await this.scheduleInstance();
      
      // 5. 连接WebSocket并执行登台流程
      console.log('步骤5: 连接WebSocket并执行登台流程');
      await this.connectAndPerformStage(scheduleResult);
      
      console.log('✅ 简化试穿流程完成！');
      
    } catch (error) {
      console.error('❌ 简化试穿流程失败:', error);
      throw error;
    }
  }

  // 完整的试穿流程（原始版本）
  private async startFullTryonFlow(config: TryonConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.accessToken;
    
    try {
      console.log('开始完整试穿流程...');
      
      // 1. 获取房间信息
      console.log('步骤1: 获取房间信息');
      await this.getRoomInfo();
      
      // 2. 创建房间
      console.log('步骤2: 创建房间');
      const roomPrimaryId = await this.createRoom();
      this.roomPrimaryId = roomPrimaryId;
      
      // 3. 加入房间
      console.log('步骤3: 加入房间');
      await this.joinRoom(roomPrimaryId);
      
      // 4. 调度分配实例
      console.log('步骤4: 调度分配实例');
      const scheduleResult = await this.scheduleInstance();
      
      // 5. 连接WebSocket并执行登台流程
      console.log('步骤5: 连接WebSocket并执行登台流程');
      await this.connectAndPerformStage(scheduleResult);
      
      console.log('试穿流程完成！');
      
    } catch (error) {
      console.error('试穿流程失败:', error);
      throw error;
    }
  }

  // 获取房间信息
  private async getRoomInfo(): Promise<any> {
    if (!this.config || !this.accessToken) {
      throw new Error('未配置参数或未提供accessToken');
    }
    
    const response = await roomAPI.getSysRoomShare(this.config.coCreationId, this.accessToken);
    console.log('房间信息响应:', response);
    console.log('房间信息响应数据:', response.data);
    
    if (!response.ok) {
      throw new Error(`获取房间信息失败: HTTP ${response.status}`);
    }
    
    const roomInfo = roomAPI.parseRoomInfoResponse(response);
    console.log('解析后的房间信息:', roomInfo);
    
    if (!roomInfo) {
      throw new Error('解析房间信息失败：响应数据为空');
    }
    
    if (!roomInfo.data) {
      throw new Error('解析房间信息失败：响应数据中没有data字段');
    }
    
    if (!roomInfo.data.roomId) {
      throw new Error('解析房间信息失败：响应数据中没有roomId字段');
    }
    
    this.roomId = roomInfo.data.roomId;
    console.log('房间ID:', this.roomId);
    
    // 更新RTC配置中的房间ID
    if (this.config.rtcConfig) {
      this.config.rtcConfig.roomId = this.roomId;
      console.log('🔄 已更新RTC配置中的房间ID:', this.roomId);
    }
    
    // 构建登台信息
    this.enterStageInfo = await roomAPI.buildEnterStageInfo(roomInfo, this.accessToken);
    console.log('房间信息获取成功，roomId:', this.roomId);
    console.log('登台信息:', this.enterStageInfo);
    
    return roomInfo;
  }

  // 创建房间
  private async createRoom(): Promise<number> {
    if (!this.config || !this.accessToken || !this.roomId) {
      throw new Error('未配置参数、未登录或未获取房间信息');
    }
    
    const response = await roomAPI.createRoom(this.roomId, this.config.coCreationId, this.accessToken);
    console.log('创建房间响应:', response);
    console.log('创建房间响应数据:', response.data);
    
    if (!response.ok) {
      throw new Error(`创建房间失败: HTTP ${response.status}`);
    }
    
    const createRoomData = roomAPI.parseCreateRoomResponse(response);
    console.log('解析后的创建房间数据:', createRoomData);
    
    if (!createRoomData) {
      throw new Error('解析创建房间响应失败：响应数据为空');
    }
    
    if (!createRoomData.data) {
      throw new Error('解析创建房间响应失败：响应数据中没有data字段');
    }
    
    if (!createRoomData.data.id) {
      throw new Error('解析创建房间响应失败：响应数据中没有id字段');
    }
    
    // 获取房间名称
    if (createRoomData.data.roomName) {
      this.roomName = createRoomData.data.roomName;
      console.log('房间名称:', this.roomName);
    } else {
      console.log('创建房间响应中没有 roomName 字段');
    }
    
    console.log('房间创建成功，primary room key:', createRoomData.data.id);
    return createRoomData.data.id;
  }

  // 加入房间
  private async joinRoom(roomPrimaryId: number): Promise<void> {
    if (!this.accessToken) {
      throw new Error('未登录');
    }
    
    const response = await roomAPI.joinRoom(roomPrimaryId, this.accessToken, 1);
    console.log('加入房间响应:', response);
    console.log('加入房间响应数据:', response.data);
    
    if (!response.ok) {
      throw new Error(`加入房间失败: HTTP ${response.status}`);
    }
    
    const joinRoomData = roomAPI.parseJoinRoomResponse(response);
    console.log('解析后的加入房间数据:', joinRoomData);
    
    if (!joinRoomData) {
      throw new Error('解析加入房间响应失败：响应数据为空');
    }
    
    console.log('成功加入房间:', joinRoomData);
  }

  // 调度分配实例
  private async scheduleInstance(): Promise<any> {
    if (!this.config || !this.roomId) {
      throw new Error('未配置参数或未获取房间信息');
    }
    
    const scheduleRequest = {
      user_id: this.config.userId,
      room_id: this.roomId
    };
    
    const scheduleResult = await scheduleService.schedule(scheduleRequest);
    console.log('调度结果:', scheduleResult);
    
    return scheduleResult;
  }

  // 连接WebSocket并执行登台流程
  private async connectAndPerformStage(scheduleResult: any): Promise<void> {
    if (!this.config || !this.accessToken || !this.roomId || !this.enterStageInfo) {
      throw new Error('缺少必要参数');
    }
    
    const wsConfig: WebSocketConfig = {
      url: `wss://${scheduleResult.data.inst_acc_info.ws_url}`,
      uid: this.config.userId,
      accessToken: this.accessToken,
      insToken: scheduleResult.data.inst_acc_info.token,
      roomId: this.roomId,
      enterStageInfo: this.enterStageInfo,
      rtcConfig: {
        appId: RTC_CONFIG.APP_ID,
        roomId: this.roomId,
        userId: this.config.userId,
        token: this.generateRTCToken() // 动态生成token
      }
    };
    
    console.log('WebSocket配置:', wsConfig);
    
    // 连接WebSocket
    await webSocketService.connect(wsConfig);
    
    // 执行完整的登台流程
    await webSocketService.performFullStageFlow();
    
    // RTC会在登台成功后通过事件自动启动
    console.log('⏳ 等待登台成功后自动启动RTC...');
  }

  // 启动RTC视频服务
  private async startRTCVideo(): Promise<void> {
    console.log('🎥 检查RTC配置...');
    console.log('  - config:', this.config);
    console.log('  - rtcConfig:', this.config?.rtcConfig);
    
    if (!this.config?.rtcConfig) {
      console.log('❌ 未配置RTC参数，跳过RTC视频接入');
      return;
    }

    try {
      console.log('🎥 开始接入RTC视频服务...');
      console.log('📋 RTC配置参数:');
      console.log('  - appId:', this.config.rtcConfig.appId);
      console.log('  - appKey:', this.config.rtcConfig.appKey);
      console.log('  - roomId:', this.config.rtcConfig.roomId);
      console.log('  - userId:', this.config.rtcConfig.userId);
      
      // 创建RTC视频服务实例
      this.rtcVideoService = new RTCVideoService();
      
      // 设置事件处理器
      this.rtcVideoService.setEventHandlers({
        onUserJoin: (userId: string) => {
          console.log('👤 RTC用户加入:', userId);
        },
        onUserLeave: (userId: string) => {
          console.log('👤 RTC用户离开:', userId);
        },
        onUserPublishStream: (userId: string, hasVideo: boolean, hasAudio: boolean) => {
          console.log('📹 RTC用户发布流:', userId, '视频:', hasVideo, '音频:', hasAudio);
          this.handleRemoteStream(userId, hasVideo, hasAudio);
        },
        onUserUnpublishStream: (userId: string) => {
          console.log('📹 RTC用户取消发布流:', userId);
        },
        onError: (error: any) => {
          console.error('❌ RTC错误:', error);
        }
      });
      
      console.log('🔧 开始初始化RTC服务...');
      
      // 初始化RTC服务
      await this.rtcVideoService.initialize(this.config.rtcConfig);
      
      console.log('✅ RTC视频服务接入成功！');
      
    } catch (error) {
      console.error('❌ RTC视频服务接入失败:', error);
      console.error('错误详情:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  // 处理远程视频流
  private async handleRemoteStream(userId: string, hasVideo: boolean, hasAudio: boolean): Promise<void> {
    if (!this.rtcVideoService || !hasVideo) {
      return;
    }

    try {
      const domId = `remote-video-${userId}`;
      
      // 设置远程视频播放器
      await this.rtcVideoService.setRemoteVideoPlayer(userId, domId);
      
      console.log('🎬 远程视频播放器设置成功:', userId, domId);
      
      // 这里可以触发UI更新，显示视频播放器
      this.triggerVideoPlayerUpdate(userId, domId);
      
    } catch (error) {
      console.error('❌ 设置远程视频播放器失败:', error);
    }
  }

  // 触发视频播放器UI更新
  private triggerVideoPlayerUpdate(userId: string, domId: string): void {
    // 创建自定义事件，通知UI组件更新视频播放器
    const event = new CustomEvent('rtcVideoStreamUpdate', {
      detail: {
        userId,
        domId,
        type: 'add'
      }
    });
    
    window.dispatchEvent(event);
    console.log('📡 发送视频播放器更新事件:', userId, domId);
  }

  // 获取房间名称
  getRoomName(): string | null {
    return this.roomName;
  }

  // 断开连接
  disconnect(): void {
    webSocketService.disconnect();
    
    // 清理RTC视频服务
    if (this.rtcVideoService) {
      this.rtcVideoService.leaveRoom().catch(error => {
        console.error('清理RTC服务失败:', error);
      });
      this.rtcVideoService = null;
    }
    
    // 重置RTC状态
    this.rtcStarted = false;
    
    // 清理房间相关数据
    this.roomName = null;
    this.roomId = null;
    this.roomPrimaryId = null;
    this.enterStageInfo = null;
  }

  // 获取连接状态
  getConnectionStatus(): boolean {
    return webSocketService.getConnectionStatus();
  }
}

// 导出单例实例
export const tryonService = new TryonService(); 