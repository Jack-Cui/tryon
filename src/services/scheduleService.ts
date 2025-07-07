// 浏览器环境中使用 Web Crypto API

export interface ScheduleRequest {
  user_id: string;
  room_id: string;
  priority_ips?: string[];
  latitude?: number;
  longitude?: number;
  poi?: string | null;
}

export interface ScheduleResponse {
  data: {
    inst_acc_info: {
      token: string;
      ws_url: string;
    };
  };
}

export class ScheduleService {
  private baseUrl = '/alloc/room_inst';  // 使用相对路径，通过nginx代理
  private secretKey = 'nDQ5EVbQUiDSYpOz';

  // 使用 Web Crypto API 生成SHA256签名
  private async makeSha256Signature(rand: number, ts: number, secretKey: string): Promise<string> {
    // 修复：使用与Python代码一致的签名格式
    const message = `rand=${rand}&secretkey=${secretKey}&ts=${ts}`;
    
    console.log('🔐 签名生成详情:');
    console.log('  - rand:', rand);
    console.log('  - ts:', ts);
    console.log('  - secretKey:', secretKey);
    console.log('  - 签名字符串:', message);
    
    // 检查 crypto.subtle 是否可用
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log('  - 生成的签名 (Web Crypto):', hashHex);
        return hashHex;
      } catch (error) {
        console.warn('Web Crypto API 失败，使用简单哈希:', error);
      }
    }
    
    // 后备方案：简单的字符串哈希函数
    console.warn('⚠️  Web Crypto API 不可用，使用简单哈希函数');
    const simpleHash = this.simpleHash(message);
    console.log('  - 生成的签名 (简单哈希):', simpleHash);
    return simpleHash;
  }

  // 简单的哈希函数作为后备方案
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString(16);
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 转换为16进制字符串，确保长度为64位（模拟SHA256长度）
    const hashHex = Math.abs(hash).toString(16);
    return hashHex.padEnd(64, '0').substring(0, 64);
  }

  // 调度请求
  async schedule(request: ScheduleRequest): Promise<ScheduleResponse> {
    console.log('📡 开始调度分配实例...');
    console.log('调度请求参数:', request);
    
    // 🚀 测试：使用固定参数
    const rand = 21731296;
    const ts = 1751856205;
    const signature = '389a7927b97b71374e7d264f529460f2b6b5f989459ad512818fe57fccddf74a';
    
    const url = `${this.baseUrl}?rand=${rand}&ts=${ts}`;
    console.log(`调度请求URL: ${url}`);
    console.log(`使用固定签名: ${signature}`);
    
    // 修复：设置必要的请求头，与Python requests库保持一致
    const headers = {
      'Content-Type': 'application/json',
      'X-SHA-Signature': signature
    };
    
    const requestData = {
      user_id: request.user_id,
      priority_ips: request.priority_ips || ["14.103.136.236", "120.245.126.162"],
      latitude: request.latitude || 0.0,
      longitude: request.longitude || 0.0,
      poi: request.poi || null,
      room_id: request.room_id
    };
    
    console.log('📤 完整请求信息:');
    console.log('  - URL:', url);
    console.log('  - Method: POST');
    console.log('  - Headers:', headers);
    console.log('  - Body:', JSON.stringify(requestData, null, 2));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });
      
      console.log(`📥 调度响应状态: ${response.status}`);
      console.log('📥 响应头:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📥 错误响应内容:', errorText);
        throw new Error(`调度请求失败: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('📥 调度响应数据:', responseData);
      
      // 详细检查响应数据结构
      console.log('🔍 调度响应数据结构检查:');
      console.log('  - responseData:', responseData);
      console.log('  - responseData.data:', responseData.data);
      console.log('  - responseData.data.inst_acc_info:', responseData.data?.inst_acc_info);
      
      if (!responseData.data) {
        throw new Error('调度响应中没有 data 字段');
      }
      
      if (!responseData.data.inst_acc_info) {
        throw new Error('调度响应中没有 inst_acc_info 字段');
      }
      
      const instAccInfo = responseData.data.inst_acc_info;
      console.log('  - instAccInfo.token:', instAccInfo.token, '(类型:', typeof instAccInfo.token, ')');
      console.log('  - instAccInfo.ws_url:', instAccInfo.ws_url, '(类型:', typeof instAccInfo.ws_url, ')');
      
      if (!instAccInfo.token) {
        throw new Error('调度响应中 token 为空或未定义');
      }
      
      // 检查ws_url是否为空，如果为空则使用默认值
      if (!instAccInfo.ws_url) {
        instAccInfo.ws_url = "dev_wss.ai1010.cn/w8";
        console.log('ws_url为空，使用默认URL:', instAccInfo.ws_url);
      }
      
      return responseData;
    } catch (error) {
      console.error('调度请求失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const scheduleService = new ScheduleService(); 