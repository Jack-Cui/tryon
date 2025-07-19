// RTC消息处理服务，参考C#代码实现
export interface RTCMessage {
  type: string;
  data: any;
}

export interface HeartBeatMessage {
  timestamp: number;
}

export interface HeartBeatAckMessage {
  timestamp: number;
}

export class RTCMessageHandler {
  private messageCallbacks: Map<string, (data: any) => void> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeatDelay: number = 0;

  constructor() {}

  // 初始化消息处理器
  initialize(): void {
    console.log('📨 初始化RTC消息处理器');
  }

  // 注册消息回调
  onMessage(type: string, callback: (data: any) => void): void {
    this.messageCallbacks.set(type, callback);
  }

  // 处理接收到的消息
  handleMessage(message: RTCMessage): void {
    console.log('📨 收到RTC消息:', message.type, message.data);
    
    const callback = this.messageCallbacks.get(message.type);
    if (callback) {
      callback(message.data);
    }
  }

  // 发送心跳消息
  sendHeartbeat(): HeartBeatMessage {
    const message: HeartBeatMessage = {
      timestamp: Date.now()
    };
    
    console.log('💓 发送心跳消息:', message);
    return message;
  }

  // 处理心跳响应
  handleHeartbeatAck(data: HeartBeatAckMessage): void {
    const delay = Date.now() - data.timestamp;
    this.lastHeartbeatDelay = delay;
    console.log('💓 心跳响应延迟:', delay, 'ms');
  }

  // 开始心跳
  startHeartbeat(interval: number = 30000): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      const heartbeat = this.sendHeartbeat();
      // 这里可以发送到WebSocket或其他通信方式
    }, interval);
    
    console.log('💓 开始心跳，间隔:', interval, 'ms');
  }

  // 停止心跳
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log('💓 停止心跳');
  }

  // 获取最后心跳延迟
  getLastHeartbeatDelay(): number {
    return this.lastHeartbeatDelay;
  }

  // 销毁处理器
  destroy(): void {
    this.stopHeartbeat();
    this.messageCallbacks.clear();
    console.log('🗑️ RTC消息处理器已销毁');
  }
}

// 导出单例实例
export const rtcMessageHandler = new RTCMessageHandler(); 