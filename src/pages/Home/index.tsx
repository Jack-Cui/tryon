import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import { tryonService } from '../../services/tryonService';
import { RTCVideoConfig } from '../../services/rtcVideoService';
import { webSocketService } from '../../services/websocketService';
import { getLoginCache, clearLoginCache } from '../../utils/loginCache';
import { ClothesItem } from '../../types/api';
// 导入图片
import actionIcon from '../../assets/动作.png';
import dressIcon from '../../assets/连衣裙.png';
import coatIcon from '../../assets/外套.png';
import realSceneIcon from '../../assets/实景.png';
import suitIcon from '../../assets/套装.png';
import skirtIcon from '../../assets/裙子.png';
import hatIcon from '../../assets/帽子.png';
import topIcon from '../../assets/上衣.png';
import socksIcon from '../../assets/袜子.png';
import pantsIcon from '../../assets/下装.png';
import shoesIcon from '../../assets/鞋子.png';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state || {};
  const hasStartedTryon = useRef(false);
  const [videoStreams, setVideoStreams] = useState<Array<{userId: string, domId: string}>>([]);
  const [videoPlayingStatus, setVideoPlayingStatus] = useState<{[key: string]: boolean}>({});
  const [showSelectionScreen, setShowSelectionScreen] = useState(true); // 新增状态控制显示选择界面
  const [roomName, setRoomName] = useState<string>('PADA2024秀款礼服系列'); // 添加房间名称状态，默认值为原来的文本
  const [clothesList, setClothesList] = useState<ClothesItem[]>([]); // 添加服饰列表状态
  const [loginParams, setLoginParams] = useState<{
    token: string;
    userId: string;
    phone: string;
    coCreationId: number;
  } | null>(null);

  // 服饰分类名称映射到图标
  const getClothesIcon = (classifyName: string) => {
    const iconMap: {[key: string]: string} = {
      '套装': suitIcon,
      '裙子': skirtIcon,
      '帽子': hatIcon,
      '上衣': topIcon,
      '袜子': socksIcon,
      '外套': coatIcon,
      '下装': pantsIcon,
      '鞋子': shoesIcon,
      '连衣裙': dressIcon,
    };
    return iconMap[classifyName] || topIcon; // 默认使用上衣图标
  };

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
      
      // 如果路由state中有房间名称，也设置到状态中
      if (locationState.roomName) {
        setRoomName(locationState.roomName);
        console.log('✅ 从路由state获取到房间名称:', locationState.roomName);
      }
      
      // 即使从路由state获取登录参数，也要检查缓存中的服饰列表
      const cachedLoginData = getLoginCache();
      if (cachedLoginData && cachedLoginData.clothesList && cachedLoginData.clothesList.length > 0) {
        setClothesList(cachedLoginData.clothesList);
        console.log('✅ 从缓存获取到服饰列表:', cachedLoginData.clothesList);
      }
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
      
      // 如果缓存中有房间名称，也设置到状态中
      if (cachedLoginData.roomName) {
        setRoomName(cachedLoginData.roomName);
        console.log('✅ 从缓存获取到房间名称:', cachedLoginData.roomName);
      }
      
      // 如果缓存中有服饰列表，也设置到状态中
      if (cachedLoginData.clothesList && cachedLoginData.clothesList.length > 0) {
        setClothesList(cachedLoginData.clothesList);
        console.log('✅ 从缓存获取到服饰列表:', cachedLoginData.clothesList);
      }
    } else {
      console.log('❌ 缓存中没有有效的登录参数，跳转到登录页面');
      clearLoginCache();
      navigate('/login?redirect=' + encodeURIComponent(location.pathname));
    }
  }, [locationState, navigate, location.pathname]);

  // 初始化房间名称和服饰列表
  useEffect(() => {
    if (loginParams) {
      // 如果当前房间名称还是默认值，尝试从 tryonService 获取
      if (roomName === 'PADA2024秀款礼服系列') {
        const roomNameFromService = tryonService.getRoomName();
        if (roomNameFromService) {
          setRoomName(roomNameFromService);
          console.log('✅ 从 tryonService 获取到房间名称:', roomNameFromService);
        } else {
          console.log('⚠️ tryonService 中没有房间名称，使用默认名称');
        }
      } else {
        console.log('✅ 已从缓存获取到房间名称，跳过 tryonService 获取');
      }

      // 获取服饰列表（只有当前状态为空时才尝试从服务获取）
      if (clothesList.length === 0) {
        const clothesListFromService = tryonService.getClothesList();
        if (clothesListFromService && clothesListFromService.length > 0) {
          setClothesList(clothesListFromService);
          console.log('✅ 从 tryonService 获取到服饰列表:', clothesListFromService);
        } else {
          console.log('⚠️ tryonService 中没有服饰列表，等待服务器数据');
          // 不清空列表，保持从缓存读取的数据
        }
      } else {
        console.log('✅ 服饰列表已存在，跳过从 tryonService 获取:', clothesList);
      }
    }
  }, [loginParams, roomName]);

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

  // 登台按钮点击处理
  const handleStartTryon = async () => {
    if (!loginParams) {
      console.warn('缺少登录参数，无法开始试穿');
      return;
    }

    if (hasStartedTryon.current) {
      console.log('试穿流程已启动，跳过重复执行');
      return;
    }

    try {
      hasStartedTryon.current = true;
      setShowSelectionScreen(false); // 隐藏选择界面，显示视频播放界面
      
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
      
      console.log('✅ 试穿流程启动成功');
      
    } catch (error) {
      console.error('试穿流程启动失败:', error);
      hasStartedTryon.current = false;
      setShowSelectionScreen(true); // 出错时重新显示选择界面
    }
  };

  // 监听服饰列表更新事件
  useEffect(() => {
    const handleClothesListUpdate = (event: CustomEvent) => {
      const { clothesList } = event.detail;
      console.log('收到服饰列表更新事件:', clothesList);
      setClothesList(clothesList || []);
    };

    window.addEventListener('clothesListUpdate', handleClothesListUpdate as EventListener);

    return () => {
      window.removeEventListener('clothesListUpdate', handleClothesListUpdate as EventListener);
    };
  }, []);

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

  // 选择界面
  if (showSelectionScreen) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#a8d5ba', // 浅绿色背景
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* 顶部标题区域 - 与视频播放界面对齐 */}
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(168,213,186,0.9) 0%, rgba(168,213,186,0.7) 50%, transparent 100%)',
          color: '#333',
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
            {roomName}
          </h1>
        </div>

        {/* 中间图标区域 - 左右布局 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 20px 140px 20px' // 与视频播放界面相同的padding
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '500px', // 与视频播放区域相同宽度
            width: '100%',
            padding: '0 40px'
          }}>
            {/* 左侧动作和实景图标 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '30px'
            }}>
              {/* 动作 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px'
                }}>
                  <img 
                    src={actionIcon} 
                    alt="动作" 
                    style={{
                      width: '40px',
                      height: '40px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* 实景 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px'
                }}>
                  <img 
                    src={realSceneIcon} 
                    alt="实景" 
                    style={{
                      width: '40px',
                      height: '40px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 右侧动态服饰图标 - 纵向排列 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '30px'
            }}>
              {clothesList.map((clothes, index) => (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '60px',
                    height: '60px'
                  }}>
                    <img 
                      src={getClothesIcon(clothes.classifyName)} 
                      alt={clothes.classifyName} 
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部登台按钮 - 与视频播放界面底部对齐 */}
        <div style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          zIndex: 10,
          background: 'linear-gradient(0deg, rgba(168,213,186,0.9) 0%, rgba(168,213,186,0.7) 50%, transparent 100%)',
          padding: '60px 20px 20px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <button
            onClick={handleStartTryon}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              padding: '16px 60px',
              borderRadius: '25px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            登台
          </button>
        </div>

        {/* 右上角重新登录按钮 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('重新登录按钮被点击');
            // 清除缓存和服务状态
            clearLoginCache();
            tryonService.disconnect();
            console.log('✅ 已清除登录缓存和服务状态');
            navigate('/login');
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: '#ff4d4f !important',
            color: 'white !important',
            border: 'none !important',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer !important',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
            outline: 'none !important',
            opacity: 1,
            pointerEvents: 'auto',
            display: 'inline-block',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onMouseEnter={(e) => {
            console.log('鼠标悬停在重新登录按钮上');
            e.currentTarget.style.backgroundColor = '#ff7875';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            console.log('鼠标离开重新登录按钮');
            e.currentTarget.style.backgroundColor = '#ff4d4f';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            console.log('重新登录按钮被按下');
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            console.log('重新登录按钮被释放');
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
        >
          🔄 重新登录
        </button>
      </div>
    );
  }

  // 视频播放界面（原有的界面）
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
          {roomName}
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
                {/* <div style={{
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
                </div> */}
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
        {/* 返回选择界面按钮 */}
        <button
          onClick={() => {
            setShowSelectionScreen(true);
            hasStartedTryon.current = false;
          }}
          style={{
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
            marginBottom: '8px'
          }}
        >
          🔙 返回选择
        </button>

        {/* 重新登录按钮 */}
        <button
          onClick={() => {
            console.log('重新登录按钮被点击');
            // 清除缓存和服务状态
            clearLoginCache();
            tryonService.disconnect();
            console.log('✅ 已清除登录缓存和服务状态');
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
        </button>
      </div>
    </div>
  );
};

export default Home; 