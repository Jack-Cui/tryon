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
  user_id?: string;
  co_creation_id?: number;
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

// 房间信息响应类型
export interface RoomInfoResponse {
  data: {
    roomId: string;
    userId: string;
    clothId: string;
    scenarioId: string;
    actionId: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// 衣服尺寸响应类型
export interface ClotheSizeResponse {
  data: string;
  [key: string]: any;
}

// 创建房间响应类型
export interface CreateRoomResponse {
  data: {
    id: number;
    roomName?: string; // 添加房间名称字段
    [key: string]: any;
  };
  [key: string]: any;
}

// 加入房间响应类型
export interface JoinRoomResponse {
  data: any;
  [key: string]: any;
}

// 进入舞台信息类型
export interface EnterStageInfo {
  AvatarId: number;
  UserId: string;
  MapName: string;
  Garments: {
    Garment1Id?: string;
    Garment1Size?: string;
    Garment2Id?: string;
    Garment2Size?: string;
    Garment3Id?: string;
    Garment3Size?: string;
  };
  // Animation: {
  //   animId: string;
  //   playRate: number;
  //   isLoop: boolean;
  // };
  Animation: null;
  Camera: boolean;
  Voice: boolean;
  isControl: boolean;
  startTime: number;
  endTime: number;
  Size: number;
} 