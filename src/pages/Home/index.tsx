import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import { tryonService } from '../../services/tryonService';
import { RTCVideoConfig } from '../../services/rtcVideoService';
import { webSocketService } from '../../services/websocketService';
import { getLoginCache, clearLoginCache } from '../../utils/loginCache';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state || {};
  const hasStartedTryon = useRef(false);
  const [videoStreams, setVideoStreams] = useState<Array<{userId: string, domId: string}>>([]);
  const [loginParams, setLoginParams] = useState<{
    token: string;
    userId: string;
    phone: string;
    coCreationId: number;
  } | null>(null);

  // 初始化登录参数
  useEffect(() => {
    // 首先尝试从路由state获取参数
    if (locationState.token && locationState.userId && locationState.phone && locationState.coCreationId) {
      console.log('✅ 从路由state获取登录参数');
      setLoginParams({
        token: locationState.token,
        userId: locationState.userId,
        phone: locationState.phone,
        coCreationId: locationState.coCreationId
      });
      return;
    }

    // 如果路由state没有参数，尝试从缓存获取
    console.log('🔍 路由state中没有登录参数，尝试从缓存获取');
    const cachedLoginData = getLoginCache();
    
    if (cachedLoginData) {
      console.log('✅ 从缓存获取登录参数成功');
      setLoginParams({
        token: cachedLoginData.token,
        userId: cachedLoginData.userId,
        phone: cachedLoginData.phone,
        coCreationId: cachedLoginData.coCreationId
      });
    } else {
      console.log('❌ 缓存中没有有效的登录参数，跳转到登录页面');
      // 清理可能存在的过期缓存
      clearLoginCache();
      // 跳转到登录页面，并传递当前路径作为重定向参数
      navigate('/login?redirect=' + encodeURIComponent(location.pathname));
    }
  }, [locationState, navigate, location.pathname]);

  // 设置RTC事件处理器
  useEffect(() => {
    webSocketService.setRTCEventHandlers({
      onUserJoin: (userId: string) => {
        console.log('👤 用户加入RTC房间:', userId);
        // 只处理用户ID为1的视频
        if (userId === '1') {
          createVideoPlayer(userId);
        }
      },
      
      onUserLeave: (userId: string) => {
        console.log('👤 用户离开RTC房间:', userId);
        // 只处理用户ID为1的视频
        if (userId === '1') {
          removeVideoPlayer(userId);
        }
      },
      
      onUserPublishStream: (userId: string, hasVideo: boolean, hasAudio: boolean) => {
        console.log('📹 用户发布流:', userId, { hasVideo, hasAudio });
        // 只处理用户ID为1的视频
        if (userId === '1' && hasVideo) {
          const domId = `remoteStream_${userId}`;
          webSocketService.setRemoteVideoPlayer(userId, domId).catch(error => {
            console.error('设置视频播放器失败:', error);
          });
          setVideoStreams(prev => [...prev, { userId, domId }]);
        }
      },
      
      onUserUnpublishStream: (userId: string) => {
        console.log('📹 用户取消发布流:', userId);
        // 只处理用户ID为1的视频
        if (userId === '1') {
          removeVideoPlayer(userId);
        }
      },
      
      onError: (error: any) => {
        console.error('❌ RTC错误:', error);
      }
    });
  }, []);

  // 创建视频播放器
  const createVideoPlayer = (userId: string) => {
    const container = document.getElementById('video-container');
    if (!container) {
      console.error('找不到视频容器');
      return;
    }

    const videoDiv = document.createElement('div');
    videoDiv.id = `remoteStream_${userId}`;
    videoDiv.style.cssText = `
      width: 100%;
      height: 400px;
      background: #333;
      border-radius: 8px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
    `;
    videoDiv.textContent = '加载视频中...';

    const label = document.createElement('div');
    label.textContent = `用户: ${userId}`;
    label.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    `;

    videoDiv.appendChild(label);
    container.appendChild(videoDiv);
    console.log(`✅ 创建视频播放器: ${userId}`);
  };

  // 移除视频播放器
  const removeVideoPlayer = (userId: string) => {
    const videoDiv = document.getElementById(`remoteStream_${userId}`);
    if (videoDiv) {
      videoDiv.remove();
      console.log(`✅ 移除视频播放器: ${userId}`);
    }
    setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
  };

  useEffect(() => {
    if (!loginParams) {
      console.warn('缺少登录参数，试穿流程未执行');
      return;
    }

    if (hasStartedTryon.current) {
      console.log('试穿流程已启动，跳过重复执行');
      return;
    }

    const startTryon = async () => {
      try {
        hasStartedTryon.current = true;
        
        const rtcConfig: RTCVideoConfig = {
          appId: '643e46acb15c24012c963951',
          appKey: 'b329b39ca8df4b5185078f29d8d8025f',
          roomId: '1939613403762253825',
          userId: loginParams.userId
        };
        
        const config = {
          phone: loginParams.phone,
          coCreationId: loginParams.coCreationId,
          userId: loginParams.userId,
          accessToken: loginParams.token,
          rtcConfig,
        };
        
        console.log('开始自动试穿流程，配置:', config);
        await tryonService.startTryonFlow(config);
      } catch (error) {
        console.error('试穿流程启动失败:', error);
        hasStartedTryon.current = false;
      }
    };

    startTryon();
  }, [loginParams]);

  // 监听RTC视频流更新事件
  useEffect(() => {
    const handleVideoStreamUpdate = (event: CustomEvent) => {
      const { userId, domId, type } = event.detail;
      
      // 只处理用户ID为1的视频
      if (userId === '1') {
        if (type === 'add') {
          setVideoStreams(prev => [...prev, { userId, domId }]);
          console.log('添加视频流:', userId, domId);
        } else if (type === 'remove') {
          setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
          console.log('移除视频流:', userId);
        }
      }
    };

    window.addEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);

    return () => {
      window.removeEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);
    };
  }, []);

  return (
    <div className="home-container">
      <div className="home-content">
        {/* 登录参数加载状态 */}
        {!loginParams && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '500px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            margin: '20px',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '10px', color: '#1890ff' }}>
              🔄 正在验证登录信息...
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              请稍等，正在从缓存读取登录信息
            </div>
          </div>
        )}
        
        {/* 只保留视频播放器区域 */}
        {loginParams && (
          <div className="video-container" id="video-container" style={{ 
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            minHeight: '500px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: '0', color: '#1890ff' }}>
                🎥 用户1视频直播
              </h3>
              <div style={{ fontSize: '12px', color: '#666' }}>
                当前用户: {loginParams.userId} | 手机: {loginParams.phone}
                <button 
                  onClick={() => {
                    clearLoginCache();
                    navigate('/login');
                  }}
                  style={{
                    marginLeft: '10px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#ff4d4f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  重新登录
                </button>
              </div>
            </div>
            <div style={{ 
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px'
            }}>
              {videoStreams.length === 0 && (
                <div style={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  color: '#666',
                  width: '100%',
                  maxWidth: '600px'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                    📹 等待用户1的视频流...
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    当用户ID为1的用户发布视频流时，将在这里显示
                  </div>
                </div>
              )}
              {videoStreams.map(stream => (
                <div key={stream.userId} style={{
                  backgroundColor: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '600px'
                }}>
                  <div 
                    id={stream.domId}
                    style={{
                      width: '100%',
                      height: '400px',
                      backgroundColor: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  >
                    加载视频中...
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    用户: {stream.userId}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 