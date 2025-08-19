import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { v4 as uuidv4 } from 'uuid';
import JSONbig from 'json-bigint';


import { 
  ApiResponse, 
  LoginResponse, 
  VerifyCodeResponse, 
  RoomInfoResponse, 
  ClotheDetailResponse,
  CreateRoomResponse, 
  JoinRoomResponse, 
  EnterStageInfo 
} from '../types/api';
import { getLoginCache, updateDefaultSceneNameInCache } from '../utils/loginCache';

const Long = require('long');
const crypto = require('crypto');


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
      // console.log('POST请求响应内容:', responseText);

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
  },

   // 检查登录状态
   async checkLogin(access_token: string): Promise<ApiResponse> {
    console.log('开始检查登录状态');
    const endpoint = API_ENDPOINTS.CHECK_LOGIN(access_token);
    const headers = {
      // 'Authorization': `Bearer ${access_token}`
      "Authorization": "Basic cGlnOnBpZw=="
    };
    return await apiService.get(endpoint, headers);
  },

  // 解析检查登录状态响应
  parseCheckLoginResponse(response: ApiResponse): { status: number; message?: string } | null {
    if (!response.data) {
      return null;
    }

    try {
      return {
        status: response.status,
        ...(response.data && { message: JSON.parse(response.data).message })
      };
    } catch (error) {
      console.error('解析检查登录状态响应失败:', error);
      return {
        status: response.status
      };
    }
  },


  generateHMAC2(public_KEY: string, data: string) {
    const HMAC_SHA256 = 'sha256';

    try {
        return crypto
            .createHmac(HMAC_SHA256, Buffer.from(public_KEY, 'utf8'))
            .update(data, 'utf8')
            .digest('base64');
    } catch (e: any) {
        console.error('HMAC生成失败:', e);
        return null;
    }
  },

  generateHMAC(public_KEY: string, data: string) {
    try {
        // 计算 HMAC-SHA256 并返回 Base64 编码结果
        const keyBytes = Buffer.from(public_KEY, 'utf8');
        const messageBytes = Buffer.from(data, 'utf8');
        const hmac = crypto.createHmac('sha256', keyBytes);
        hmac.update(messageBytes);
        return hmac.digest('base64');
    } catch (e: any) {
        console.error('HMAC生成失败:', e);
        return null;
    }
  },

  // 余额扣费请求函数
  async getBalanceDeductionRequest(
    balanceRaw: any,
    accessToken: string,
    userId: string
  ): Promise<ApiResponse> {
    console.log('开始余额扣费请求');
    
    const url = `${API_CONFIG.BASE_URL}/admin/balance/deduction`;
    
    // 构建消息字符串：data|timestamp|userId
    const timestamp = Date.now().toString();
    const requestId = uuidv4().replace(/-/g, '');
    
    const data = JSONbig().stringify(balanceRaw).replace(/\s+/g, '');
    const sMessage = `${data}|${timestamp}|${userId}`;
    
    console.log('s_message:', sMessage);
    
    // 使用固定的密钥生成签名
    const KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwxAKb+pGIdtg189rgCtLGClLVTcWkAga0UTiZ8cfDzNDBF3eZBX96iXb5godZLHaAg38OZbtqclZfWBu9nBEpaV+nZudJ5z42RFpJlK6p9ACetR+/rX5Xfol9k0DayI9lP42uyK8h+wv/LPcA5PT/eE4aSMwn2g/xrVuLPGpCXM5Ca3de8s6Rj5JdW2GccLsi3GueLet2N4+a88cvpNMr4poVu135cb+SyxEbt3/4z0HhTFM0QF+GLaw+3faT8A4peiiot4io1UCUyW8fRXIAiHv5J0s8Y3bJW311BZFs/jnAodiIvQKzh3pEMKMyo0kw0T7HF5G4oSe+6Dvn9AV6QIDAQAB";
    const signature = this.generateHMAC(KEY, sMessage);
    
    if (!signature) {
      throw new Error('生成签名失败');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-timestamp': timestamp,
      'X-requestId': requestId,
      'X-signature': signature,
    };
    
    console.log('请求URL:', url);
    console.log('请求头:', headers);
    console.log('请求数据:', data);
    
    return await apiService.post(url, data, headers);
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

  // 获取衣服详情
  async getClotheDetail(clothe_id: string, access_token: string): Promise<ApiResponse> {
    console.log('开始获取衣服详情，衣服ID:', clothe_id);
    const endpoint = API_ENDPOINTS.GET_CLOTHE_DETAIL(clothe_id);
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

  // 获取场景列表
  async getSceneList(access_token: string): Promise<ApiResponse> {
    console.log('开始获取场景列表');
    const endpoint = API_ENDPOINTS.GET_SCENE_LIST();
    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    };
    return await apiService.get(endpoint, headers);
  },

  // 构建进入舞台信息
  async buildEnterStageInfo(room_info: RoomInfoResponse, access_token: string): Promise<string> {
    console.log('开始构建进入舞台信息');
    const room_info_data = room_info.data;

    const clothe_ids = room_info_data.clothId.split(';');
    const garments: any = {};
    
    // 用于存储处理后的服装信息
    let clothesItemInfoList: any[] = [];
    let isClothesSuit = false;
    
    for (let i = 0; i < clothe_ids.length; i++) {
      const clothe_id = clothe_ids[i];
      console.log(`处理衣服ID: ${clothe_id}`);
      
      if (!clothe_id || clothe_id === '' || clothe_id === '0') {
        console.log(`跳过无效的衣服ID: ${clothe_id}`);
        continue;
      }
      
      // 判断 clothe_id 是否大于0
      const clotheIdNum = Long.fromString(clothe_id);
      if (clotheIdNum.toNumber() <= 0) {
        console.log(`跳过无效的衣服ID: ${clothe_id}`);
        continue;
      }
      
      try {
        // 获取衣服详情
        console.log(`获取衣服详情: ${clothe_id}`);
        const clothe_detail_response = await this.getClotheDetail(clothe_id, access_token);
        
        if (clothe_detail_response.ok) {
          const clothe_detail_data = JSON.parse(clothe_detail_response.data) as ClotheDetailResponse;
          const clothe_detail = clothe_detail_data.data;
          
          console.log(`衣服详情获取成功:`, {
            id: clothe_detail.id,
            name: clothe_detail.name,
            classifyId: clothe_detail.classifyId,
            suitIds: clothe_detail.suitIds
          });
          
          // 参考 handleClothesManagement 的逻辑处理服装
          const classifyId = clothe_detail.classifyId;
          const clothesId = clothe_detail.id;
          const suitIds = clothe_detail.suitIds || '';

          // const classifyId = 4;
          // const clothesId = "1916394930865287170";
          // const suitIds = "1916394256718999553";
          
          console.log('👕 处理衣服管理逻辑:', {
            classifyId: classifyId,
            clothesId: clothesId,
            suitIds: suitIds
          });
          
          if (classifyId === 4) {
            // 套装
            isClothesSuit = true;
            
            // 处理套装逻辑
            const arr = suitIds.split(',');
            
            // if (suitIds === '' || arr.length === 0) {
            if (arr.length === 0) {
              const item = {
                classifyId: classifyId,
                clothesId: Long.fromString(clothesId)
              };
              clothesItemInfoList.push(item);
            } else {
              for (let j = 0; j < arr.length; ++j) {
                const longValue = Long.fromString(arr[j]);
                const item = {
                  classifyId: classifyId,
                  clothesId: longValue
                };
                clothesItemInfoList.push(item);
              }
            }
            
            console.log('👕 套装处理完成:', clothesItemInfoList);
            
          } else {
            // 非套装
            if (isClothesSuit) {
              // 之前是套装，现在切换到非套装
              isClothesSuit = false;
              
              const item = {
                classifyId: classifyId,
                clothesId: Long.fromString(clothesId)
              };
              clothesItemInfoList.push(item);
              
              console.log('👕 从套装切换到非套装:', clothesItemInfoList);
              
            } else {
              // 之前不是套装
              // 1. 删除存储的同类型衣服
              for (let j = clothesItemInfoList.length - 1; j >= 0; --j) {
                const item = clothesItemInfoList[j];
                if (item.classifyId === classifyId) {
                  clothesItemInfoList.splice(j, 1);
                }
              }

              // 2. 特殊处理
              // 穿裙子 脱下上下衣
              if (classifyId === 7) {
                for (let j = clothesItemInfoList.length - 1; j >= 0; --j) {
                  const item = clothesItemInfoList[j];
                  if (item.classifyId === 1 || item.classifyId === 2) {
                    clothesItemInfoList.splice(j, 1);
                  }
                }
              }

              // 穿上下衣 脱下裙子
              if (classifyId === 1 || classifyId === 2) {
                for (let j = clothesItemInfoList.length - 1; j >= 0; --j) {
                  const item = clothesItemInfoList[j];
                  if (item.classifyId === 7) {
                    clothesItemInfoList.splice(j, 1);
                  }
                }
              }

              let index = -1;
              for (let j = 0; j < clothesItemInfoList.length; ++j) {
                const item = clothesItemInfoList[j];
                if (classifyId === item.classifyId) {
                  item.clothesId = Long.fromString(clothesId);
                  clothesItemInfoList[j] = item;
                  index = j;
                }
              }

              if (clothesItemInfoList.length >= 3) {
                clothesItemInfoList.splice(0, 1);
              }

              const cii = {
                classifyId: classifyId,
                clothesId: Long.fromString(clothesId)
              };
              clothesItemInfoList.push(cii);
              
              console.log('👕 非套装处理完成:', clothesItemInfoList);
            }
          }
          
        } else {
          console.error(`获取衣服详情失败: ${clothe_id}`, clothe_detail_response);
        }
      } catch (error) {
        console.error(`获取衣服详情失败: ${clothe_id}`, error);
      }
    }
    
    // 参考 sendChangeGarmentRequest 的构建逻辑
    console.log('👕 准备构建服装参数:', {
      clothesItemInfoList: clothesItemInfoList,
      isClothesSuit: isClothesSuit
    });
    
    // 构建服装参数
    const garment1Id = clothesItemInfoList.length >= 1 ? clothesItemInfoList[0].clothesId : Long.ZERO;
    const garment2Id = clothesItemInfoList.length >= 2 ? clothesItemInfoList[1].clothesId : Long.ZERO;
    const garment3Id = clothesItemInfoList.length >= 3 ? clothesItemInfoList[2].clothesId : Long.ZERO;
    const garment1Size = 4; // 默认尺寸，实际应该从服务器获取
    const garment2Size = garment2Id.gt(Long.ZERO) ? 4 : 1; // 默认尺寸，实际应该从服务器获取
    const garment3Size = garment3Id.gt(Long.ZERO) ? 4 : 1; // 默认尺寸，实际应该从服务器获取

    console.log('👕 构建的服装参数:', {
      garment1Id: garment1Id.toString(), 
      garment2Id: garment2Id.toString(), 
      garment3Id: garment3Id.toString(),
      garment1Size, garment2Size, garment3Size
    });
    
    // 构建 garments 对象
    garments.Garment1Id = garment1Id.toString();
    garments.Garment1Size = garment1Size;
    garments.Garment2Id = garment2Id.toString();
    garments.Garment2Size = garment2Size;
    garments.Garment3Id = garment3Id.toString();
    garments.Garment3Size = garment3Size;

    const login_cache = getLoginCache();
    let scene_code = "";
    let scene_name = "";
    
    // 优先使用房间信息中的场景ID来查找场景代码和名称
    if (room_info_data.scenarioId) {
      console.log("🔍 房间信息中有场景ID:", room_info_data.scenarioId);
      if (login_cache && login_cache.scenesList) {
        const scene_list = login_cache.scenesList;
        if (scene_list[room_info_data.scenarioId]) {
          scene_code = scene_list[room_info_data.scenarioId].code;
          scene_name = scene_list[room_info_data.scenarioId].name;
          console.log("✅ 根据场景ID找到场景代码:", scene_code, "名称:", scene_name);
        } else {
          console.log("⚠️ 场景ID在缓存中未找到:", room_info_data.scenarioId);
        }
      }
    }
    
    // 如果没有找到场景代码，使用缓存中的第一个场景
    if (scene_code === "") {
      if (login_cache && login_cache.scenesList) {
        const scene_list = login_cache.scenesList;
        const scene_list_keys = Object.keys(scene_list);
        if (scene_list_keys.length > 0) {
          const scene_id = scene_list_keys[0];
          scene_name = scene_list[scene_id].name;
          scene_code = scene_list[scene_id].code;
          console.log("🔄 使用缓存中第一个场景:", scene_name, "代码:", scene_code);
        }
      }
    }
    
    // 如果还是没有场景代码，使用默认值
    if (scene_code === "") {
      scene_code = "Maps_jiaotang";
      scene_name = "教堂";
      console.log("⚠️ 场景代码为空，使用默认场景代码: Maps_jiaotang");
    }
    
    // 更新缓存中的默认场景名称
    if (scene_name && login_cache) {
      updateDefaultSceneNameInCache(scene_name);
    }
    const enter_stage_info: EnterStageInfo = {
      AvatarId: 0,
      UserId: room_info_data.userId,
      // MapName: room_info_data.scenarioId,
      MapName: scene_code,
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