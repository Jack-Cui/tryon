import { authAPI, roomAPI } from './api';
import { scheduleService } from './scheduleService';
import { webSocketService, WebSocketConfig } from './websocketService';

export interface TryonConfig {
  phone: string;
  coCreationId: number;
  userId: string;
  accessToken: string;
}

export class TryonService {
  private config: TryonConfig | null = null;
  private accessToken: string | null = null;
  private roomId: string | null = null;
  private enterStageInfo: string | null = null;

  constructor() {}

  // 完整的试穿流程
  async startTryonFlow(config: TryonConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.accessToken;
    
    try {
      console.log('开始试穿流程...');
      
      // 1. 获取房间信息
      console.log('步骤1: 获取房间信息');
      await this.getRoomInfo();
      
      // 2. 创建房间
      console.log('步骤2: 创建房间');
      const roomPrimaryId = await this.createRoom();
      
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
      enterStageInfo: this.enterStageInfo
    };
    
    console.log('WebSocket配置:', wsConfig);
    
    // 连接WebSocket
    await webSocketService.connect(wsConfig);
    
    // 执行完整的登台流程
    await webSocketService.performFullStageFlow();
  }

  // 断开连接
  disconnect(): void {
    webSocketService.disconnect();
  }

  // 获取连接状态
  getConnectionStatus(): boolean {
    return webSocketService.getConnectionStatus();
  }
}

// 导出单例实例
export const tryonService = new TryonService(); 