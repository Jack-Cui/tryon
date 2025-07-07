import * as proto from '../proto/xproto';

// 从 proto 中获取 Long 类型
const Long = require('long');

export interface WebSocketConfig {
  url: string;
  uid: string;
  accessToken: string;
  insToken: string;
  roomId: string;
  enterStageInfo: string;
}

export class WebSocketService {
  private websocket: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private isConnected: boolean = false;
  private messageHandlers: Map<number, (data: any) => void> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor() {
    this.setupMessageHandlers();
  }

  // 工具方法：安全地将字符串转换为 Long 类型
  private stringToLong(value: string): any {
    try {
      if (!value || value.trim() === '') {
        throw new Error('输入值不能为空');
      }
      
      // 验证输入是否为有效的数字字符串
      if (!/^\d+$/.test(value)) {
        throw new Error(`输入值不是有效的数字: ${value}`);
      }
      
      const longValue = Long.fromString(value);
      
      // 验证 Long 对象是否有效
      if (!longValue || typeof longValue.toString !== 'function') {
        throw new Error('Long 对象创建失败');
      }
      
      console.log(`✅ 成功转换字符串 "${value}" 为 Long: ${longValue.toString()}`);
      return longValue;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 转换字符串到 Long 失败: ${value}`, error);
      throw new Error(`无效的数字格式: ${value} - ${errorMessage}`);
    }
  }

  // 工具方法：安全地将 Long 类型转换为字符串
  private longToString(value: any): string {
    if (!value) return 'unknown';
    try {
      return value.toString();
    } catch (error) {
      console.error('转换 Long 到字符串失败:', error);
      return 'unknown';
    }
  }

  private setupMessageHandlers(): void {
    // 登录响应
    this.messageHandlers.set(1101, this.handleLoginResponse.bind(this));
    // 顶号通知
    this.messageHandlers.set(1105, this.handleLoginOtherPush.bind(this));
    // 进入房间响应
    this.messageHandlers.set(1201, this.handleEnterRoomResponse.bind(this));
    // 进入房间广播
    this.messageHandlers.set(1202, this.handleEnterRoomPush.bind(this));
    // 登台响应
    this.messageHandlers.set(1501, this.handleEnterStageResponse.bind(this));
    // 登台广播
    this.messageHandlers.set(1502, this.handleEnterStagePush.bind(this));
    // 舞台状态变更
    this.messageHandlers.set(1522, this.handleStageStatusChange.bind(this));
    // 队列信息推送
    this.messageHandlers.set(1505, this.handleStageQueueInfo.bind(this));
    // 离开房间响应
    this.messageHandlers.set(1203, this.handleLeaveRoomResponse.bind(this));
    // 离开房间广播
    this.messageHandlers.set(1204, this.handleLeaveRoomPush.bind(this));
  }

  async connect(config: WebSocketConfig): Promise<void> {
    this.config = config;
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`正在连接WebSocket: ${config.url}`);
        this.websocket = new WebSocket(config.url);
        
        // 设置二进制数据类型为 ArrayBuffer
        this.websocket.binaryType = 'arraybuffer';
        
        this.websocket.onopen = () => {
          console.log('WebSocket 连接成功');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.websocket.onclose = (event) => {
          console.log('WebSocket 连接关闭', event);
          this.isConnected = false;
          this.handleReconnect();
        };
        
        this.websocket.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          this.isConnected = false;
          reject(error);
        };
        
        // 连接超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket 连接超时'));
          }
        }, 10000);
        
      } catch (error) {
        console.error('WebSocket 连接失败:', error);
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.config) {
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(this.config!).catch(error => {
          console.error('重连失败:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(data: any): void {
    try {
      let arrayBuffer: ArrayBuffer;
      
      // 检查数据类型并转换为 ArrayBuffer
      if (data instanceof ArrayBuffer) {
        arrayBuffer = data;
      } else if (data instanceof Blob) {
        // 如果是 Blob，需要异步读取
        data.arrayBuffer().then(buffer => {
          this.handleMessage(buffer);
        }).catch(error => {
          console.error('读取 Blob 数据失败:', error);
        });
        return;
      } else if (typeof data === 'string') {
        // 如果是字符串，可能是 JSON 或其他格式
        console.log('收到字符串消息:', data);
        // 这里可以根据需要处理字符串消息
        return;
      } else {
        console.error('不支持的消息数据类型:', typeof data, data);
        return;
      }
      
      // 检查数据长度是否足够
      if (arrayBuffer.byteLength < 6) {
        console.error('消息数据长度不足:', arrayBuffer.byteLength);
        return;
      }
      
      const dataView = new DataView(arrayBuffer);
      
      // 解析消息头 (4字节长度 + 2字节消息ID)
      const totalLength = dataView.getUint32(0, true); // 小端序
      const messageId = dataView.getUint16(4, true);   // 小端序
      
      // 验证消息长度
      if (totalLength !== arrayBuffer.byteLength) {
        console.error(`消息长度不匹配: 期望 ${totalLength}, 实际 ${arrayBuffer.byteLength}`);
        return;
      }
      
      // 提取消息体
      const payload = arrayBuffer.slice(6);
      
      console.log(`收到消息 ID: ${messageId}, 长度: ${totalLength}`);
      
      // 根据消息ID处理消息
      const handler = this.messageHandlers.get(messageId);
      if (handler) {
        handler(payload);
      } else {
        console.warn(`未知消息类型: ${messageId}`);
      }
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  }

  private sendMessage(messageId: number, payload: Uint8Array): void {
    console.log(`📤 准备发送消息 ID: ${messageId}, 连接状态: ${this.isConnected}`);
    
    if (!this.websocket || !this.isConnected) {
      console.error('❌ WebSocket 未连接，无法发送消息');
      throw new Error('WebSocket 未连接');
    }
    
    // 构造消息 (4字节长度 + 2字节消息ID + 数据)
    const totalLength = 4 + 2 + payload.length;
    const buffer = new ArrayBuffer(totalLength);
    const dataView = new DataView(buffer);
    
    dataView.setUint32(0, totalLength, true);  // 小端序
    dataView.setUint16(4, messageId, true);    // 小端序
    
    // 复制消息体
    const bodyView = new Uint8Array(buffer, 6);
    bodyView.set(payload);
    
    console.log(`📤 发送消息详情: ID=${messageId}, 总长度=${totalLength}, 数据长度=${payload.length}`);
    
    this.websocket.send(buffer);
    console.log(`✅ 消息发送成功 ID: ${messageId}`);
  }

  // 发送登录请求
  async sendLoginRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }
    
    console.log('🔐 准备发送登录请求...');
    console.log('  - uid:', this.config.uid);
    console.log('  - accessToken:', this.config.accessToken ? '已设置' : '未设置');
    console.log('  - insToken:', this.config.insToken ? '已设置' : '未设置');
    
    try {
      // 使用 Long.fromString 将字符串 uid 转换为 Long 类型
      const accountLong = this.stringToLong(this.config.uid);
      console.log('🔐 转换后的 account Long:', this.longToString(accountLong));
      
      // 验证 accountLong 是否为有效的 Long 对象
      if (!accountLong || typeof accountLong.toString !== 'function') {
        throw new Error('account Long 对象无效');
      }
      
      // 创建登录请求对象
      const loginReqData = {
        account: accountLong,
        token: this.config.accessToken,
        insToken: this.config.insToken
      };
      
      console.log('🔐 登录请求数据:', {
        account: accountLong.toString(),
        token: this.config.accessToken ? '已设置' : '未设置',
        insToken: this.config.insToken ? '已设置' : '未设置'
      });
      
      const loginReq = proto.oLoginReq.create(loginReqData);
      
      // 验证创建的对象
      if (!loginReq) {
        throw new Error('登录请求对象创建失败');
      }
      
      console.log('🔐 登录请求对象创建成功:', loginReq);
      
      const payload = proto.oLoginReq.encode(loginReq).finish();
      console.log('🔐 登录请求编码完成，长度:', payload.length);
      
      this.sendMessage(101, payload); // LoginReq = 101
      console.log('🔐 登录请求已发送');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ 发送登录请求失败:', errorMessage);
      throw new Error(`登录请求失败: ${errorMessage}`);
    }
  }

  // 发送进入房间请求
  async sendEnterRoomRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }
    
    console.log('🚪 准备发送进入房间请求...');
    console.log('  - roomId:', this.config.roomId);
    
    // 使用 Long.fromString 将字符串 roomId 转换为 Long 类型
    const roomIdLong = this.stringToLong(this.config.roomId);
    console.log('🚪 转换后的 roomId Long:', this.longToString(roomIdLong));
    
    const enterRoomReq = proto.oEnterRoomReq.create({
      roomId: roomIdLong
    });
    
    const payload = proto.oEnterRoomReq.encode(enterRoomReq).finish();
    console.log('🚪 进入房间请求已发送');
    this.sendMessage(201, payload); // EnterRoomReq = 201
  }

  // 发送登台请求
  async sendEnterStageRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }
    
    console.log('🔍 登台请求参数检查:');
    console.log('  - enterStageInfo:', this.config.enterStageInfo);
    
    const enterStageReq = proto.oEnterStageReq.create({
      context: this.config.enterStageInfo
    });
    
    const payload = proto.oEnterStageReq.encode(enterStageReq).finish();
    console.log('🔍 发送登台请求');
    this.sendMessage(501, payload); // EnterStageReq = 501
    
    // 启动登台状态监听
    this.startStageStatusMonitoring();
  }

  // 登台状态监听
  private stageStatusMonitoring: {
    isActive: boolean;
    timeoutCount: number;
    maxTimeouts: number;
    receivedStageChange: boolean;
    enterStageSuccess: boolean;
    roomIdForLeave: string | null;
  } = {
    isActive: false,
    timeoutCount: 0,
    maxTimeouts: 2,
    receivedStageChange: false,
    enterStageSuccess: false,
    roomIdForLeave: null
  };

  private startStageStatusMonitoring(): void {
    this.stageStatusMonitoring = {
      isActive: true,
      timeoutCount: 0,
      maxTimeouts: 2,
      receivedStageChange: false,
      enterStageSuccess: false,
      roomIdForLeave: null
    };
    
    console.log('🔍 开始登台状态监听...');
    
    // 设置超时检查
    this.checkStageStatusTimeout();
  }

  private checkStageStatusTimeout(): void {
    if (!this.stageStatusMonitoring.isActive) {
      return;
    }
    
    this.stageStatusMonitoring.timeoutCount++;
    console.log(`⏰ 登台状态检查超时 (${this.stageStatusMonitoring.timeoutCount}/${this.stageStatusMonitoring.maxTimeouts})`);
    
    // 如果收到了舞台状态变更，可能登台已经成功
    if (this.stageStatusMonitoring.receivedStageChange && this.stageStatusMonitoring.timeoutCount >= this.stageStatusMonitoring.maxTimeouts) {
      console.log('✅ 基于舞台状态变更判断登台可能成功');
      this.stageStatusMonitoring.enterStageSuccess = true;
      this.completeStageFlow();
    } else if (this.stageStatusMonitoring.timeoutCount >= this.stageStatusMonitoring.maxTimeouts) {
      console.log('❌ 登台过程失败或超时');
      this.stageStatusMonitoring.isActive = false;
    } else {
      // 继续等待
      setTimeout(() => {
        this.checkStageStatusTimeout();
      }, 8000); // 8秒超时
    }
  }

  private completeStageFlow(): void {
    if (!this.stageStatusMonitoring.isActive) {
      return;
    }
    
    this.stageStatusMonitoring.isActive = false;
    
    if (!this.stageStatusMonitoring.roomIdForLeave && this.config) {
      this.stageStatusMonitoring.roomIdForLeave = this.config.roomId;
      console.log(`使用配置的房间ID: ${this.stageStatusMonitoring.roomIdForLeave}`);
    }
    
    console.log('✅ 登台成功，准备启动RTC视频服务...');
    
    // 立即触发RTC启动事件
    this.triggerRTCStart();
    
    console.log('⏰ 等待20秒后离开房间...');
    
    // 等待20秒后离开房间
    setTimeout(() => {
      console.log('准备离开房间...');
      this.sendLeaveRoomRequest();
    }, 20000);
  }

  // 触发RTC启动事件
  private triggerRTCStart(): void {
    console.log('🚀 触发RTC启动事件...');
    
    // 创建自定义事件，通知tryonService启动RTC
    const event = new CustomEvent('stageSuccessRTCStart', {
      detail: {
        timestamp: Date.now(),
        roomId: this.config?.roomId,
        userId: this.config?.uid
      }
    });
    
    window.dispatchEvent(event);
    console.log('📡 RTC启动事件已发送');
  }

  // 发送离开房间请求
  async sendLeaveRoomRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }
    
    console.log('🚪 准备发送离开房间请求...');
    console.log('  - roomId:', this.config.roomId);
    
    // 使用 Long.fromString 将字符串 roomId 转换为 Long 类型
    const roomIdLong = this.stringToLong(this.config.roomId);
    console.log('🚪 转换后的 roomId Long:', this.longToString(roomIdLong));
    
    const leaveRoomReq = proto.oLeaveRoomReq.create({
      roomId: roomIdLong
    });
    
    const payload = proto.oLeaveRoomReq.encode(leaveRoomReq).finish();
    console.log('🚪 离开房间请求已发送');
    this.sendMessage(203, payload); // LeaveRoomReq = 203
  }

  // 处理登录响应
  private handleLoginResponse(payload: ArrayBuffer): void {
    try {
      const loginAsw = proto.oLoginAsw.decode(new Uint8Array(payload));
      console.log('登录响应:', loginAsw);
      
      const errorName = proto.eError[loginAsw.code];
      console.log(`登录结果: ${errorName}`);
      
      if (loginAsw.code === proto.eError.SUCCESS) {
        console.log('登录成功，准备进入房间...');
        // 自动进入房间
        setTimeout(() => {
          this.sendEnterRoomRequest();
        }, 500);
      } else {
        console.error('登录失败:', errorName);
      }
    } catch (error) {
      console.error('处理登录响应失败:', error);
    }
  }

  // 处理顶号通知
  private handleLoginOtherPush(payload: ArrayBuffer): void {
    try {
      const loginOther = proto.oLoginOtherPush.decode(new Uint8Array(payload));
      console.log('收到顶号通知');
      // 这里可以触发UI提示用户
      alert('您的账号在其他地方登录');
    } catch (error) {
      console.error('处理顶号通知失败:', error);
    }
  }

  // 处理进入房间响应
  private handleEnterRoomResponse(payload: ArrayBuffer): void {
    try {
      const enterRoomAsw = proto.oEnterRoomAsw.decode(new Uint8Array(payload));
      console.log('进入房间响应:', enterRoomAsw);
      
      const errorName = proto.eError[enterRoomAsw.code];
      console.log(`进入房间结果: ${errorName}`);
      
      if (enterRoomAsw.code === proto.eError.SUCCESS) {
        // 将 Long 类型转换为字符串显示
        const roomIdStr = this.longToString(enterRoomAsw.roomId);
        console.log(`成功进入房间: ${roomIdStr}`);
        console.log(`在线用户数量: ${enterRoomAsw.onlineUsers.length}`);
        console.log(`舞台数量: ${enterRoomAsw.stageCount}`);
        console.log(`场景: ${enterRoomAsw.scene}`);
        
        // 自动发送登台请求
        setTimeout(() => {
          this.sendEnterStageRequest();
        }, 1000);
      } else {
        console.error('进入房间失败:', errorName);
      }
    } catch (error) {
      console.error('处理进入房间响应失败:', error);
    }
  }

  // 处理进入房间广播
  private handleEnterRoomPush(payload: ArrayBuffer): void {
    try {
      const enterRoomPush = proto.oEnterRoomPush.decode(new Uint8Array(payload));
      // 将 Long 类型转换为字符串显示
      const userIdStr = this.longToString(enterRoomPush.enterUserId);
      console.log(`收到用户进入房间广播: 用户ID ${userIdStr}`);
    } catch (error) {
      console.error('处理进入房间广播失败:', error);
    }
  }

  // 处理登台响应
  private handleEnterStageResponse(payload: ArrayBuffer): void {
    console.log('登台响应:', payload);
    try {
      const enterStageAsw = proto.oEnterStageAsw.decode(new Uint8Array(payload));
      console.log('登台响应详情:', enterStageAsw);
      
      const errorName = proto.eError[enterStageAsw.code];
      console.log(`登台结果: ${errorName}`);
      
      if (enterStageAsw.code === proto.eError.SUCCESS) {
        // 将 Long 类型转换为字符串显示
        const roomIdStr = this.longToString(enterStageAsw.roomId);
        const stageIdStr = this.longToString(enterStageAsw.stageId);
        console.log(`✅ 成功登台: 房间ID ${roomIdStr}, 舞台ID ${stageIdStr}`);
        
        // 更新登台状态监听器
        if (this.stageStatusMonitoring.isActive) {
          this.stageStatusMonitoring.enterStageSuccess = true;
          this.stageStatusMonitoring.roomIdForLeave = roomIdStr;
          this.completeStageFlow();
        }
      } else {
        console.error('❌ 登台失败:', errorName);
        // 停止登台状态监听
        this.stageStatusMonitoring.isActive = false;
      }
    } catch (error) {
      console.error('处理登台响应失败:', error);
    }
  }

  // 处理登台广播
  private handleEnterStagePush(payload: ArrayBuffer): void {
    try {
      const enterStagePush = proto.oEnterStagePush.decode(new Uint8Array(payload));
      // 将 Long 类型转换为字符串显示
      const userIdStr = this.longToString(enterStagePush.userId);
      const stageIdStr = this.longToString(enterStagePush.stageId);
      console.log(`收到用户登台广播: 用户ID ${userIdStr}, 舞台ID ${stageIdStr}`);
    } catch (error) {
      console.error('处理登台广播失败:', error);
    }
  }

  // 处理舞台状态变更
  private handleStageStatusChange(payload: ArrayBuffer): void {
    try {
      const stageStatusChange = proto.oStageStatusChangePush.decode(new Uint8Array(payload));
      // 将 Long 类型转换为字符串显示
      const stageIdStr = this.longToString(stageStatusChange.stageId);
      const userIdStr = this.longToString(stageStatusChange.userId);
      console.log(`收到舞台状态变更: 索引${stageStatusChange.index}, 舞台ID${stageIdStr}, 用户ID${userIdStr}, 状态${stageStatusChange.stageType}`);
      
      // 更新登台状态监听器
      if (this.stageStatusMonitoring.isActive) {
        this.stageStatusMonitoring.receivedStageChange = true;
        
        if (stageStatusChange.stageType === proto.eStageType.StageTypeTryEnter) {
          console.log('舞台状态变更为 TryEnter - 正在尝试上台');
        } else if (stageStatusChange.stageType === proto.eStageType.StageTypeWorking) {
          console.log('舞台状态变更为 Working - 已经在台上工作！');
          // 如果状态变为Working，认为登台成功
          this.stageStatusMonitoring.enterStageSuccess = true;
          this.completeStageFlow();
        }
      }
    } catch (error) {
      console.error('处理舞台状态变更失败:', error);
    }
  }

  // 处理队列信息推送
  private handleStageQueueInfo(payload: ArrayBuffer): void {
    try {
      const stageQueueInfo = proto.oStageQueueInfoPush.decode(new Uint8Array(payload));
      console.log(`收到舞台队列信息: 队列类型${stageQueueInfo.type}, 排队人数${stageQueueInfo.queueCount}, 舞台数量${stageQueueInfo.stageCount}`);
      
      // 可以在这里添加队列状态的处理逻辑
      if (stageQueueInfo.queueUserIds && stageQueueInfo.queueUserIds.length > 0) {
        console.log(`排队用户: ${stageQueueInfo.queueUserIds.length}个`);
      }
      if (stageQueueInfo.stageUserIds && stageQueueInfo.stageUserIds.length > 0) {
        console.log(`台上用户: ${stageQueueInfo.stageUserIds.length}个`);
      }
    } catch (error) {
      console.error('处理队列信息推送失败:', error);
    }
  }

  // 处理离开房间响应
  private handleLeaveRoomResponse(payload: ArrayBuffer): void {
    try {
      const leaveRoomAsw = proto.oLeaveRoomAsw.decode(new Uint8Array(payload));
      console.log('离开房间响应:', leaveRoomAsw);
      
      const errorName = proto.eError[leaveRoomAsw.code];
      console.log(`离开房间结果: ${errorName}`);
      
      if (leaveRoomAsw.code === proto.eError.SUCCESS) {
        console.log('成功离开房间');
        // 关闭WebSocket连接
        this.disconnect();
      } else {
        console.error('离开房间失败:', errorName);
      }
    } catch (error) {
      console.error('处理离开房间响应失败:', error);
    }
  }

  // 处理离开房间广播
  private handleLeaveRoomPush(payload: ArrayBuffer): void {
    try {
      const leaveRoomPush = proto.oLeaveRoomPush.decode(new Uint8Array(payload));
      // 将 Long 类型转换为字符串显示
      const userIdStr = this.longToString(leaveRoomPush.leaveUserId);
      console.log(`收到用户离开房间广播: 用户ID ${userIdStr}`);
    } catch (error) {
      console.error('处理离开房间广播失败:', error);
    }
  }

  // 完整的登台流程
  async performFullStageFlow(): Promise<void> {
    console.log('🚀 开始执行完整登台流程...');
    console.log('  - WebSocket 连接状态:', this.isConnected);
    console.log('  - WebSocket 实例:', this.websocket ? '已创建' : '未创建');
    console.log('  - 配置信息:', this.config ? '已设置' : '未设置');
    
    if (!this.isConnected) {
      console.error('❌ WebSocket 未连接，无法执行登台流程');
      throw new Error('WebSocket 未连接');
    }
    
    if (!this.config) {
      console.error('❌ 未配置WebSocket参数，无法执行登台流程');
      throw new Error('未配置WebSocket参数');
    }
    
    try {
      console.log('✅ 开始登台流程...');
      
      // 1. 发送登录请求
      console.log('📤 步骤1: 发送登录请求');
      await this.sendLoginRequest();
      
      // 其他步骤将通过消息处理器自动执行
      console.log('⏳ 登台流程已启动，等待服务器响应...');
      
    } catch (error) {
      console.error('❌ 登台流程失败:', error);
      throw error;
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
    console.log('WebSocket 连接已断开');
  }

  // 获取连接状态
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 导出单例实例
export const webSocketService = new WebSocketService(); 