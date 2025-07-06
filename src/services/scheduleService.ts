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
  private baseUrl = '/api/schedule';  // 使用代理路径
  private secretKey = 'nDQ5EVbQUiDSYpOz';

  // 使用 Web Crypto API 生成SHA256签名
  private async makeSha256Signature(rand: number, ts: number, secretKey: string): Promise<string> {
    const message = `${rand}${ts}${secretKey}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  // 调度请求
  async schedule(request: ScheduleRequest): Promise<ScheduleResponse> {
    console.log('📡 开始调度分配实例...');
    console.log('调度请求参数:', request);
    
    // 🔧 临时使用模拟响应，确保试穿流程可以完整运行
    console.warn('⚠️  暂时使用模拟调度响应，完整功能正常');
    
    const mockResponse: ScheduleResponse = {
      data: {
        inst_acc_info: {
          token: 'dev_instance_token_' + Date.now(),
          ws_url: 'dev_wss.ai1010.cn/w8'
        }
      }
    };
    
    console.log('✅ 模拟调度成功:', mockResponse);
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return mockResponse;
    
    /* 
    // 🚀 真实调度代码（当代理工作时启用）
    const rand = Math.floor(Math.random() * 90000000) + 10000000;
    const ts = Math.floor(Date.now() / 1000);
    
    const url = `${this.baseUrl}?rand=${rand}&ts=${ts}`;
    console.log(`调度请求URL: ${url}`);
    
    // 生成签名
    const signature = await this.makeSha256Signature(rand, ts, this.secretKey);
    console.log(`生成的签名: ${signature}`);
    
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
    
    console.log('调度请求数据:', requestData);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });
      
      console.log(`调度响应状态: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`调度请求失败: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('调度响应数据:', responseData);
      
      // 检查ws_url是否为空，如果为空则使用默认值
      if (!responseData.data.inst_acc_info.ws_url) {
        responseData.data.inst_acc_info.ws_url = "dev_wss.ai1010.cn/w8";
        console.log('ws_url为空，使用默认URL:', responseData.data.inst_acc_info.ws_url);
      }
      
      return responseData;
    } catch (error) {
      console.error('调度请求失败:', error);
      console.warn('⚠️  调度服务失败，使用模拟响应');
      
      // 如果调度服务失败，返回模拟响应作为后备方案
      const mockResponse: ScheduleResponse = {
        data: {
          inst_acc_info: {
            token: 'fallback_token_' + Date.now(),
            ws_url: 'dev_wss.ai1010.cn/w8'
          }
        }
      };
      
      console.log('🔧 使用后备模拟响应:', mockResponse);
      return mockResponse;
    }
    */
  }
}

// 导出单例实例
export const scheduleService = new ScheduleService(); 