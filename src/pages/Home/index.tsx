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
  const [videoPlayingStatus, setVideoPlayingStatus] = useState<{[key: string]: boolean}>({});
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
      clearLoginCache();
      navigate('/login?redirect=' + encodeURIComponent(location.pathname));
    }
  }, [locationState, navigate, location.pathname]);

  // 检查视频是否真正开始播放的函数
  const checkVideoPlayingStatus = (userId: string, domId: string) => {
    const videoElement = document.getElementById(domId);
    if (videoElement) {
      const videoTag = videoElement.querySelector('video');
      if (videoTag) {
        // 设置视频样式以适应容器
        videoTag.style.width = '100%';
        videoTag.style.height = '100%';
        videoTag.style.objectFit = 'cover';
        
        const checkPlaying = () => {
          if (!videoTag.paused && !videoTag.ended && videoTag.readyState > 2) {
            console.log(`✅ 视频 ${userId} 已开始播放`);
            setVideoPlayingStatus(prev => ({
              ...prev,
              [userId]: true
            }));
          } else {
            // 继续检查
            setTimeout(checkPlaying, 500);
          }
        };
        
        // 监听视频事件
        videoTag.addEventListener('playing', () => {
          console.log(`✅ 视频 ${userId} 播放事件触发`);
          setVideoPlayingStatus(prev => ({
            ...prev,
            [userId]: true
          }));
        });
        
        videoTag.addEventListener('loadeddata', () => {
          console.log(`✅ 视频 ${userId} 数据加载完成`);
          checkPlaying();
        });
        
        // 立即检查一次
        checkPlaying();
      } else {
        // 如果还没有video标签，延迟检查
        setTimeout(() => checkVideoPlayingStatus(userId, domId), 1000);
      }
    } else {
      // 如果DOM元素还没有创建，延迟检查
      setTimeout(() => checkVideoPlayingStatus(userId, domId), 1000);
    }
  };

  // 设置RTC事件处理器
  useEffect(() => {
    webSocketService.setRTCEventHandlers({
      onUserJoin: (userId: string) => {
        console.log('👤 用户加入RTC房间:', userId);
        if (userId === '1') {
          console.log('✅ 用户1加入房间');
        }
      },
      
      onUserLeave: (userId: string) => {
        console.log('👤 用户离开RTC房间:', userId);
        if (userId === '1') {
          setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
          setVideoPlayingStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[userId];
            return newStatus;
          });
        }
      },
      
      onUserPublishStream: (userId: string, hasVideo: boolean, hasAudio: boolean) => {
        console.log('📹 用户发布流:', userId, { hasVideo, hasAudio });
        if (userId === '1' && hasVideo) {
          const domId = `remoteStream_${userId}`;
          webSocketService.setRemoteVideoPlayer(userId, domId).catch(error => {
            console.error('设置视频播放器失败:', error);
          });
          setVideoStreams(prev => {
            if (prev.find(stream => stream.userId === userId)) {
              return prev;
            }
            return [...prev, { userId, domId }];
          });
          
          // 开始检查视频播放状态
          setTimeout(() => {
            checkVideoPlayingStatus(userId, domId);
            // 额外确保视频样式正确
            const videoElement = document.getElementById(domId);
            if (videoElement) {
              const videoTag = videoElement.querySelector('video');
              if (videoTag) {
                videoTag.style.width = '100%';
                videoTag.style.height = '100%';
                videoTag.style.objectFit = 'cover';
              }
            }
          }, 1000);
        }
      },
      
      onUserUnpublishStream: (userId: string) => {
        console.log('📹 用户取消发布流:', userId);
        if (userId === '1') {
          setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
          setVideoPlayingStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[userId];
            return newStatus;
          });
        }
      },
      
      onError: (error: any) => {
        console.error('❌ RTC错误:', error);
      }
    });
  }, []);

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
      
      if (userId === '1') {
        if (type === 'add') {
          setVideoStreams(prev => {
            if (prev.find(stream => stream.userId === userId)) {
              return prev;
            }
            return [...prev, { userId, domId }];
          });
          console.log('添加视频流:', userId, domId);
          
          // 开始检查视频播放状态
          setTimeout(() => {
            checkVideoPlayingStatus(userId, domId);
            // 额外确保视频样式正确
            const videoElement = document.getElementById(domId);
            if (videoElement) {
              const videoTag = videoElement.querySelector('video');
              if (videoTag) {
                videoTag.style.width = '100%';
                videoTag.style.height = '100%';
                videoTag.style.objectFit = 'cover';
              }
            }
          }, 1000);
        } else if (type === 'remove') {
          setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
          setVideoPlayingStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[userId];
            return newStatus;
          });
          console.log('移除视频流:', userId);
        }
      }
    };

    window.addEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);

    return () => {
      window.removeEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);
    };
  }, []);

  // 如果缺少必要参数，显示加载页面
  if (!loginParams) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        flexDirection: 'column',
        padding: '20px'
      }}>
        <div style={{ fontSize: '16px', marginBottom: '10px', color: '#1890ff' }}>
          🔄 正在验证登录信息...
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          请稍等，正在从缓存读取登录信息
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* 顶部标题区域 - 放在正中间 */}
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: 10,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        color: '#fff',
        padding: '20px 20px 60px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          🎥 用户1视频直播
        </h1>
      </div>

      {/* 视频播放区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 20px 140px 20px'
      }}>
        {videoStreams.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#fff',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
            <div style={{ fontSize: '20px', marginBottom: '12px' }}>
              等待用户1的视频流...
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              试穿流程正在进行中，请稍候
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'center',
            maxWidth: '500px',
            width: '100%'
          }}>
            {videoStreams.map(stream => (
              <div key={stream.userId} style={{
                backgroundColor: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                minHeight: '75vh',
                maxHeight: '85vh',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <div 
                  id={stream.domId}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '16px',
                    position: 'relative',
                    minHeight: '75vh'
                  }}
                >
                  {/* 只在视频未播放时显示加载文本 */}
                  {!videoPlayingStatus[stream.userId] && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      zIndex: 2,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      padding: '20px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎬</div>
                      <div>加载视频中...</div>
                    </div>
                  )}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backdropFilter: 'blur(10px)'
                }}>
                  用户: {stream.userId}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部控制区域 - 重新登录按钮放到下方 */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: 10,
        background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        color: '#fff',
        padding: '60px 20px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* 用户信息 */}
        <div style={{
          fontSize: '12px',
          opacity: 0.8,
          textAlign: 'center'
        }}>
          {/* 当前用户: {loginParams.userId} | 手机: {loginParams.phone} | 共创ID: {loginParams.coCreationId} */}
        </div>

        {/* 重新登录按钮 */}
        {/* <button
          onClick={() => {
            clearLoginCache();
            navigate('/login');
          }}
          style={{
            backgroundColor: '#ff4d4f',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(255, 77, 79, 0.3)'
          }}
        >
          🔄 重新登录
        </button> */}
      </div>
    </div>
  );
};

export default Home; 