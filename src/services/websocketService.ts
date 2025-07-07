import * as proto from '../proto/xproto';

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
        
        // 设置二进制类型为 ArrayBuffer
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
      // 确保数据是 ArrayBuffer 类型
      let arrayBuffer: ArrayBuffer;
      
      if (data instanceof ArrayBuffer) {
        arrayBuffer = data;
      } else if (data instanceof Uint8Array) {
        arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      } else if (typeof data === 'string') {
        // 如果是字符串，可能是 JSON 格式的消息，需要特殊处理
        console.warn('收到字符串消息，可能需要特殊处理:', data);
        return;
      } else {
        console.error('未知的数据类型:', typeof data, data);
        return;
      }
      
      const dataView = new DataView(arrayBuffer);
      
      // 检查数据长度是否足够
      if (arrayBuffer.byteLength < 6) {
        console.error('消息数据长度不足:', arrayBuffer.byteLength);
        return;
      }
      
      // 解析消息头 (4字节长度 + 2字节消息ID)
      const totalLength = dataView.getUint32(0, true); // 小端序
      const messageId = dataView.getUint16(4, true);   // 小端序
      
      // 验证消息长度
      if (totalLength !== arrayBuffer.byteLength) {
        console.warn(`消息长度不匹配: 期望 ${totalLength}, 实际 ${arrayBuffer.byteLength}`);
      }
      
      // 提取消息体
      const payload = arrayBuffer.slice(6);
      
      console.log(`收到消息 ID: ${messageId}, 长度: ${totalLength}, 实际长度: ${arrayBuffer.byteLength}`);
      
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
    if (!this.websocket || !this.isConnected) {
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
    
    this.websocket.send(buffer);
    console.log(`发送消息 ID: ${messageId}, 长度: ${totalLength}`);
  }

  // 发送登录请求
  async sendLoginRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }

    
    // 检查 insToken 是否有效
    if (!this.config.insToken) {
      throw new Error('insToken 为空或未定义');
    }
    
    if (typeof this.config.insToken !== 'string') {
      throw new Error(`insToken 类型错误，期望 string，实际 ${typeof this.config.insToken}`);
    }
    
    if (this.config.insToken.trim() === '') {
      throw new Error('insToken 为空字符串');
    }
    
    // 使用 protobufjs 内置的 Long 类型来正确处理64位整数
    const Long = require('long');
    
    // 使用Long.fromString正确处理64位整数
    const accountLong = Long.fromString(this.config.uid, false); // false表示无符号
    
    // 验证Long值是否正确
    console.log('🔍 验证Long值:');
    console.log('  - 期望值:', this.config.uid);
    console.log('  - Long.toString():', accountLong.toString());
    console.log('  - 是否相等:', accountLong.toString() === this.config.uid);
    
    if (accountLong.toString() !== this.config.uid) {
      console.error('❌ Long值不正确！期望:', this.config.uid, '实际:', accountLong.toString());
    } else {
      console.log('✅ Long值正确！');
    }
    
    
    const loginReq = proto.oLoginReq.create({
      account: accountLong,  // 使用 Long 类型
      token: this.config.accessToken,
      insToken: this.config.insToken
    });
    
    console.log('🔍 Protobuf 消息详情:');
    console.log('  - loginReq.account:', loginReq.account, '(类型:', typeof loginReq.account, ')');
    console.log('  - loginReq.token:', loginReq.token, '(类型:', typeof loginReq.token, ')');
    console.log('  - loginReq.insToken:', loginReq.insToken, '(类型:', typeof loginReq.insToken, ')');
    
    // 验证字段是否正确设置
    if (!loginReq.account) {
      throw new Error('account 字段未正确设置');
    }
    if (!loginReq.token) {
      throw new Error('token 字段未正确设置');
    }
    if (!loginReq.insToken) {
      throw new Error('insToken 字段未正确设置');
    }
    
    const payload = proto.oLoginReq.encode(loginReq).finish();
    console.log('  - 编码后的 payload 长度:', payload.length);
    console.log('  - 编码后的 payload (前20字节):', Array.from(payload.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // 解码验证
    try {
      const decoded = proto.oLoginReq.decode(payload);
      console.log('🔍 解码验证:');
      console.log('  - decoded.account:', decoded.account, '(类型:', typeof decoded.account, ')');
      console.log('  - decoded.token:', decoded.token);
      console.log('  - decoded.insToken:', decoded.insToken);
      
      // 验证account是否正确解码
      if (decoded.account && typeof decoded.account === 'object' && decoded.account.toString) {
        console.log('  - decoded.account.toString():', decoded.account.toString());
        if (decoded.account.toString() !== accountLong.toString()) {
          console.error('❌ account解码错误！期望:', accountLong.toString(), '实际:', decoded.account.toString());
        } else {
          console.log('✅ account解码正确！');
        }
      } else if (typeof decoded.account === 'number') {
        console.log('  - decoded.account (number):', decoded.account);
        const expectedNum = parseInt(accountLong.toString());
        if (decoded.account !== expectedNum) {
          console.error('❌ account解码错误！期望:', expectedNum, '实际:', decoded.account);
        } else {
          console.log('✅ account解码正确！');
        }
      }
    } catch (error) {
      console.error('解码验证失败:', error);
    }
    
    // 发送登录请求
    console.log('🔍 发送登录请求');
    this.sendMessage(101, payload); // LoginReq = 101
  }

  // 发送进入房间请求
  async sendEnterRoomRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }
    
    // 使用Long类型处理roomId，避免64位整数精度问题
    const Long = require('long');
    const roomIdLong = Long.fromString(this.config.roomId, false); // false表示无符号
    
    console.log('🔍 进入房间请求参数检查:');
    console.log('  - roomId (原始):', this.config.roomId, '(类型:', typeof this.config.roomId, ')');
    console.log('  - roomId (Long):', roomIdLong.toString());
    console.log('  - roomId (Long 低32位):', roomIdLong.low);
    console.log('  - roomId (Long 高32位):', roomIdLong.high);
    
    // 验证Long值是否正确
    if (roomIdLong.toString() !== this.config.roomId) {
      console.error('❌ roomId Long值不正确！期望:', this.config.roomId, '实际:', roomIdLong.toString());
    } else {
      console.log('✅ roomId Long值正确！');
    }
    
    const enterRoomReq = proto.oEnterRoomReq.create({
      roomId: roomIdLong  // 使用 Long 类型
    });
    
    console.log('🔍 进入房间Protobuf消息详情:');
    console.log('  - enterRoomReq.roomId:', enterRoomReq.roomId, '(类型:', typeof enterRoomReq.roomId, ')');
    
    const payload = proto.oEnterRoomReq.encode(enterRoomReq).finish();
    console.log('  - 编码后的 payload 长度:', payload.length);
    console.log('  - 编码后的 payload (前20字节):', Array.from(payload.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // 解码验证
    try {
      const decoded = proto.oEnterRoomReq.decode(payload);
      console.log('🔍 进入房间解码验证:');
      console.log('  - decoded.roomId:', decoded.roomId, '(类型:', typeof decoded.roomId, ')');
      
      if (decoded.roomId && typeof decoded.roomId === 'object' && decoded.roomId.toString) {
        console.log('  - decoded.roomId.toString():', decoded.roomId.toString());
        if (decoded.roomId.toString() !== roomIdLong.toString()) {
          console.error('❌ roomId解码错误！期望:', roomIdLong.toString(), '实际:', decoded.roomId.toString());
        } else {
          console.log('✅ roomId解码正确！');
        }
      } else if (typeof decoded.roomId === 'number') {
        console.log('  - decoded.roomId (number):', decoded.roomId);
        const expectedNum = parseInt(roomIdLong.toString());
        if (decoded.roomId !== expectedNum) {
          console.error('❌ roomId解码错误！期望:', expectedNum, '实际:', decoded.roomId);
        } else {
          console.log('✅ roomId解码正确！');
        }
      }
    } catch (error) {
      console.error('进入房间解码验证失败:', error);
    }
    
    console.log('🔍 发送进入房间请求');
    this.sendMessage(201, payload); // EnterRoomReq = 201
  }

  // 发送登台请求
  async sendEnterStageRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }
    
    const enterStageReq = proto.oEnterStageReq.create({
      context: this.config.enterStageInfo
    });
    
    const payload = proto.oEnterStageReq.encode(enterStageReq).finish();
    this.sendMessage(501, payload); // EnterStageReq = 501
  }

  // 发送离开房间请求
  async sendLeaveRoomRequest(): Promise<void> {
    if (!this.config) {
      throw new Error('未配置WebSocket参数');
    }
    
    // 使用Long类型处理roomId，避免64位整数精度问题
    const Long = require('long');
    const roomIdLong = Long.fromString(this.config.roomId, false); // false表示无符号
    
    const leaveRoomReq = proto.oLeaveRoomReq.create({
      roomId: roomIdLong  // 使用 Long 类型
    });
    
    const payload = proto.oLeaveRoomReq.encode(leaveRoomReq).finish();
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
        console.log(`成功进入房间: ${enterRoomAsw.roomId}`);
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
      console.log(`收到用户进入房间广播: 用户ID ${enterRoomPush.enterUserId}`);
    } catch (error) {
      console.error('处理进入房间广播失败:', error);
    }
  }

  // 处理登台响应
  private handleEnterStageResponse(payload: ArrayBuffer): void {
    try {
      const enterStageAsw = proto.oEnterStageAsw.decode(new Uint8Array(payload));
      console.log('登台响应:', enterStageAsw);
      
      const errorName = proto.eError[enterStageAsw.code];
      console.log(`登台结果: ${errorName}`);
      
      if (enterStageAsw.code === proto.eError.SUCCESS) {
        console.log(`成功登台: 房间ID ${enterStageAsw.roomId}, 舞台ID ${enterStageAsw.stageId}`);
        
        // 在台上停留 20 秒后离开房间
        setTimeout(() => {
          console.log('准备离开房间...');
          this.sendLeaveRoomRequest();
        }, 20000);
      } else {
        console.error('登台失败:', errorName);
      }
    } catch (error) {
      console.error('处理登台响应失败:', error);
    }
  }

  // 处理登台广播
  private handleEnterStagePush(payload: ArrayBuffer): void {
    try {
      const enterStagePush = proto.oEnterStagePush.decode(new Uint8Array(payload));
      console.log(`收到用户登台广播: 用户ID ${enterStagePush.userId}, 舞台ID ${enterStagePush.stageId}`);
    } catch (error) {
      console.error('处理登台广播失败:', error);
    }
  }

  // 处理舞台状态变更
  private handleStageStatusChange(payload: ArrayBuffer): void {
    try {
      const stageStatusChange = proto.oStageStatusChangePush.decode(new Uint8Array(payload));
      console.log(`收到舞台状态变更: 索引${stageStatusChange.index}, 舞台ID${stageStatusChange.stageId}, 用户ID${stageStatusChange.userId}, 状态${stageStatusChange.stageType}`);
      
      if (stageStatusChange.stageType === proto.eStageType.StageTypeTryEnter) {
        console.log('舞台状态变更为 TryEnter - 正在尝试上台');
      } else if (stageStatusChange.stageType === proto.eStageType.StageTypeWorking) {
        console.log('舞台状态变更为 Working - 已经在台上工作！');
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
      console.log(`收到用户离开房间广播: 用户ID ${leaveRoomPush.leaveUserId}`);
    } catch (error) {
      console.error('处理离开房间广播失败:', error);
    }
  }

  // 完整的登台流程
  async performFullStageFlow(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('WebSocket 未连接');
    }
    
    try {
      console.log('开始登台流程...');
      
      // 1. 发送登录请求
      await this.sendLoginRequest();
      
      // 其他步骤将通过消息处理器自动执行
      console.log('登台流程已启动，等待服务器响应...');
      
    } catch (error) {
      console.error('登台流程失败:', error);
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