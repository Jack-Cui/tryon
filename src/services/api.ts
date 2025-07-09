import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { 
  ApiResponse, 
  LoginResponse, 
  VerifyCodeResponse, 
  RoomInfoResponse, 
  ClotheSizeResponse, 
  CreateRoomResponse, 
  JoinRoomResponse, 
  EnterStageInfo 
} from '../types/api';

// 通用HTTP请求方法
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  // GET请求
  async get(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse> {
    const url = this.baseURL + endpoint;
    const requestHeaders = {
      ...API_CONFIG.COMMON_HEADERS,
      ...headers
    };

    console.log('发起GET请求:', url);
    console.log('请求头:', requestHeaders);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
        mode: 'cors', // 明确指定CORS模式
        credentials: 'omit' // 不发送cookies
      });

      console.log('GET请求状态码:', response.status);
      console.log('GET请求状态文本:', response.statusText);
      console.log('GET请求响应头:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('GET请求响应内容:', responseText);

      return {
        status: response.status,
        data: responseText,
        ok: response.ok
      };
    } catch (error) {
      console.error('GET请求详细错误:', error);
      if (error instanceof Error) {
        console.error('错误类型:', error.constructor.name);
        console.error('错误消息:', error.message);
        if (error instanceof TypeError) {
          console.error('这可能是CORS错误或网络连接问题');
        }
      }
      throw error;
    }
  }

  // POST请求
  async post(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse> {
    const url = this.baseURL + endpoint;
    const requestHeaders = {
      ...API_CONFIG.COMMON_HEADERS,
      ...headers
    };

    console.log('发起POST请求:', url);
    console.log('请求头:', requestHeaders);
    console.log('请求数据:', data);

    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: requestHeaders,
        mode: 'cors', // 明确指定CORS模式
        credentials: 'omit' // 不发送cookies
      };

      // 只有当data存在且不为undefined时才设置body
      if (data !== undefined) {
        fetchOptions.body = data;
      }

      const response = await fetch(url, fetchOptions);

      console.log('POST请求状态码:', response.status);
      console.log('POST请求状态文本:', response.statusText);
      console.log('POST请求响应头:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('POST请求响应内容:', responseText);

      return {
        status: response.status,
        data: responseText,
        ok: response.ok
      };
    } catch (error) {
      console.error('POST请求详细错误:', error);
      if (error instanceof Error) {
        console.error('错误类型:', error.constructor.name);
        console.error('错误消息:', error.message);
        if (error instanceof TypeError) {
          console.error('这可能是CORS错误或网络连接问题');
        }
      }
      throw error;
    }
  }
}

// 创建API服务实例
export const apiService = new ApiService();

// 登录相关API方法
export const authAPI = {
  // 获取验证码
  async getVerifyCode(phone: string): Promise<ApiResponse> {
    console.log('开始获取验证码，手机号:', phone);
    const endpoint = API_ENDPOINTS.GET_VERIFY_CODE(phone);
    console.log('验证码请求端点:', endpoint);
    return await apiService.get(endpoint);
  },

  // 登录
  async login(phone: string, code: string): Promise<ApiResponse> {
    console.log('开始登录，手机号:', phone, '验证码:', code);
    const endpoint = API_ENDPOINTS.LOGIN(phone, code);
    console.log('登录请求端点:', endpoint);
    return await apiService.post(endpoint, undefined, API_CONFIG.LOGIN_HEADERS);
  },

  // 解析登录响应
  parseLoginResponse(response: ApiResponse): LoginResponse | null {
    if (!response.ok || !response.data) {
      return null;
    }

    try {
      return JSON.parse(response.data);
    } catch (error) {
      console.error('解析登录响应失败:', error);
      return null;
    }
  },

  // 解析验证码响应
  parseVerifyCodeResponse(response: ApiResponse): VerifyCodeResponse | null {
    if (!response.ok || !response.data) {
      return null;
    }

    try {
      // 简单判断返回内容是否为JSON
      if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
        throw new Error('返回内容不是JSON，可能是HTML页面');
      }
      return JSON.parse(response.data);
    } catch (error: any) {
      console.error('解析验证码响应失败:', error);
      return null;
    }
  }
};

// 房间相关API方法
export const roomAPI = {
  // 获取房间信息
  async getSysRoomShare(co_creation_id: number, access_token: string): Promise<ApiResponse> {
    console.log('开始获取房间信息，共创ID:', co_creation_id);
    const endpoint = API_ENDPOINTS.GET_SYSROOMSHARE(co_creation_id);
    const headers = {
      'Authorization': `Bearer ${access_token}`
    };
    return await apiService.get(endpoint, headers);
  },

  // 获取衣服尺寸
  async getClotheSize(clothe_id: string, access_token: string): Promise<ApiResponse> {
    console.log('开始获取衣服尺寸，衣服ID:', clothe_id);
    const endpoint = API_ENDPOINTS.GET_CLOTHE_SIZE(clothe_id);
    const headers = {
      'Authorization': `Bearer ${access_token}`
    };
    return await apiService.get(endpoint, headers);
  },

  // 创建房间
  async createRoom(room_id: string, co_creation_id: number, access_token: string): Promise<ApiResponse> {
    console.log('开始创建房间，房间ID:', room_id, '共创ID:', co_creation_id);
    const endpoint = API_ENDPOINTS.CREATE_ROOM();
    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    };
    const data = JSON.stringify({
      sourceRoomId: room_id,
      shareId: co_creation_id
    });
    return await apiService.post(endpoint, data, headers);
  },

  // 加入房间
  async joinRoom(room_primary_id: number, access_token: string, relationship_type: number = 1): Promise<ApiResponse> {
    console.log('开始加入房间，房间主键ID:', room_primary_id, '关系类型:', relationship_type);
    const endpoint = API_ENDPOINTS.JOIN_ROOM();
    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    };
    const data = JSON.stringify({
      id: room_primary_id,
      relationshipType: relationship_type
    });
    return await apiService.post(endpoint, data, headers);
  },

  // 构建进入舞台信息
  async buildEnterStageInfo(room_info: RoomInfoResponse, access_token: string): Promise<string> {
    console.log('开始构建进入舞台信息');
    const room_info_data = room_info.data;

    const clothe_ids = room_info_data.clothId.split(';');
    const garments: any = {};
    
    for (let i = 0; i < clothe_ids.length; i++) {
      const clothe_id = clothe_ids[i];
      console.log(`获取衣服尺寸: ${clothe_id}`);
      
      try {
        const clothe_size_response = await this.getClotheSize(clothe_id, access_token);
        if (clothe_size_response.ok) {
          const clothe_size_data = JSON.parse(clothe_size_response.data) as ClotheSizeResponse;
          const clothe_size = clothe_size_data.data;
          console.log(`衣服ID: ${clothe_id}, 尺寸: ${clothe_size}`);
        }
      } catch (error) {
        console.error(`获取衣服尺寸失败: ${clothe_id}`, error);
      }
      let clothe_size = 0;
      if (clothe_id == '0') {
        clothe_size = 0
      } else {
        clothe_size = 4
      }
      if (i === 0) {
        garments.garment1Id = clothe_id;
        garments.garment1Size = clothe_size;
      } else if (i === 1) {
        garments.garment2Id = clothe_id;
        garments.garment2Size = clothe_size;
      } else if (i === 2) {
        garments.garment3Id = clothe_id;
        garments.garment3Size = clothe_size;
      }
    }

    const enter_stage_info: EnterStageInfo = {
      AvatarId: 0,
      UserId: room_info_data.userId,
      MapName: room_info_data.scenarioId,
      Garments: garments,
      Animation: null,
      Camera: true,
      Voice: false,
      isControl: true,
      startTime: 0,
      endTime: 0,
      Size: 4
    };

    console.log('进入舞台信息:', enter_stage_info);
    return JSON.stringify(enter_stage_info);
  },

  // 解析房间信息响应
  parseRoomInfoResponse(response: ApiResponse): RoomInfoResponse | null {
    if (!response.ok || !response.data) {
      return null;
    }

    try {
      return JSON.parse(response.data);
    } catch (error) {
      console.error('解析房间信息响应失败:', error);
      return null;
    }
  },

  // 解析创建房间响应
  parseCreateRoomResponse(response: ApiResponse): CreateRoomResponse | null {
    if (!response.ok || !response.data) {
      return null;
    }

    try {
      return JSON.parse(response.data);
    } catch (error) {
      console.error('解析创建房间响应失败:', error);
      return null;
    }
  },

  // 解析加入房间响应
  parseJoinRoomResponse(response: ApiResponse): JoinRoomResponse | null {
    if (!response.ok || !response.data) {
      return null;
    }

    try {
      return JSON.parse(response.data);
    } catch (error) {
      console.error('解析加入房间响应失败:', error);
      return null;
    }
  }
}; 