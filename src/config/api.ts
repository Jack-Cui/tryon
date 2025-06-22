// API配置文件
export const API_CONFIG = {
  // API基础地址 - 使用相对路径，配合代理设置
  BASE_URL: '', // 空字符串表示使用当前域名
  
  // 通用请求头
  COMMON_HEADERS: {
    'Content-Type': 'application/json',
  },
  
  // 登录相关请求头
  LOGIN_HEADERS: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'isToken': 'false',
    'TENANT-ID': '1',
    'Authorization': 'Basic cGlnOnBpZw=='
  }
};

// API端点
export const API_ENDPOINTS = {
  // 获取验证码
  GET_VERIFY_CODE: (phone: string) => `/admin/mobile/${phone}`,
  
  // 登录
  LOGIN: (phone: string, code: string) => 
    `/admin/oauth/token?mobile=SMS@${phone}&code=${code}&grant_type=mobile`
}; 