// 登录缓存工具
export interface LoginCacheData {
  token: string;
  userId: string;
  phone: string;
  coCreationId: number;
  timestamp: number; // 缓存时间戳
}

const CACHE_KEY = 'loginCache';
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时，单位毫秒

/**
 * 保存登录信息到缓存
 * @param loginData 登录信息
 * @param duration 缓存时长（毫秒），可选，默认24小时
 */
export const saveLoginCache = (loginData: Omit<LoginCacheData, 'timestamp'>, duration?: number): void => {
  try {
    const cacheData: LoginCacheData = {
      ...loginData,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(CACHE_KEY + '_duration', (duration || DEFAULT_CACHE_DURATION).toString());
    console.log('✅ 登录信息已保存到缓存');
  } catch (error) {
    console.error('❌ 保存登录缓存失败:', error);
  }
};

/**
 * 从缓存读取登录信息
 * @returns 登录信息，如果没有缓存或已过期则返回null
 */
export const getLoginCache = (): LoginCacheData | null => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) {
      console.log('📝 没有找到登录缓存');
      return null;
    }

    const loginData: LoginCacheData = JSON.parse(cachedData);
    const now = Date.now();
    const cacheAge = now - loginData.timestamp;

    // 获取缓存时长
    const cacheDurationStr = localStorage.getItem(CACHE_KEY + '_duration');
    const cacheDuration = cacheDurationStr ? parseInt(cacheDurationStr) : DEFAULT_CACHE_DURATION;

    // 检查是否过期
    if (cacheAge > cacheDuration) {
      console.log('⏰ 登录缓存已过期，自动清理');
      clearLoginCache();
      return null;
    }

    const remainingTime = cacheDuration - cacheAge;
    const remainingHours = Math.floor(remainingTime / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
    
    console.log(`✅ 读取登录缓存成功，剩余有效时间: ${remainingHours}小时${remainingMinutes}分钟`);
    return loginData;
  } catch (error) {
    console.error('❌ 读取登录缓存失败:', error);
    clearLoginCache();
    return null;
  }
};

/**
 * 清除登录缓存
 */
export const clearLoginCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_KEY + '_duration');
    console.log('🗑️ 登录缓存已清理');
  } catch (error) {
    console.error('❌ 清理登录缓存失败:', error);
  }
};

/**
 * 检查登录缓存是否有效
 * @returns 是否有效的登录缓存
 */
export const isLoginCacheValid = (): boolean => {
  return getLoginCache() !== null;
};

/**
 * 获取缓存剩余时间（毫秒）
 * @returns 剩余时间，如果没有缓存则返回0
 */
export const getCacheRemainingTime = (): number => {
  const loginData = getLoginCache();
  if (!loginData) return 0;
  
  const now = Date.now();
  const cacheAge = now - loginData.timestamp;
  
  // 获取缓存时长
  const cacheDurationStr = localStorage.getItem(CACHE_KEY + '_duration');
  const cacheDuration = cacheDurationStr ? parseInt(cacheDurationStr) : DEFAULT_CACHE_DURATION;
  
  return Math.max(0, cacheDuration - cacheAge);
}; 