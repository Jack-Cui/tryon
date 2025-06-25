import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { ApiResponse, LoginResponse, VerifyCodeResponse } from '../types/api';

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