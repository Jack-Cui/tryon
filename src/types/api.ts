// API响应类型定义
export interface ApiResponse {
  status: number;
  data: string;
  ok: boolean;
}

// 登录响应类型
export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  [key: string]: any;
}

// 验证码响应类型 - 匹配服务器实际返回格式
export interface VerifyCodeResponse {
  code?: number;
  msg?: string;
  data?: boolean | any;
  success?: boolean;
  message?: string;
  [key: string]: any;
} 