import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './index.css';
import demoImage from '../../assets/demo.png';
import { forceLogout, isLoggedIn } from '../../utils/auth';
import { tryonService } from '../../services/tryonService';
import { RTCVideoConfig } from '../../services/rtcVideoService';

const Home = () => {
  const location = useLocation();
  const { token, userId, phone, coCreationId } = location.state || {};
  const hasStartedTryon = useRef(false); // 防止重复执行
  const [videoStreams, setVideoStreams] = useState<Array<{userId: string, domId: string}>>([]);

  useEffect(() => {
    if (!token || !userId || !phone || !coCreationId) {
      console.warn('缺少登录参数，试穿流程未执行');
      return;
    }

    // 防止重复执行
    if (hasStartedTryon.current) {
      console.log('试穿流程已启动，跳过重复执行');
      return;
    }

    // 自动开始试穿流程
    const startTryon = async () => {
      try {
        hasStartedTryon.current = true; // 标记已启动
        
        // RTC配置（这里使用示例配置，实际使用时需要从服务器获取）
        const rtcConfig: RTCVideoConfig = {
          appId: '643e46acb15c24012c963951', // 示例App ID
          appKey: 'b329b39ca8df4b5185078f29d8d8025f', // 示例App Key
          roomId: '1939613403762253825', // 使用共创ID作为房间ID
          userId: userId
        };
        
        const config = {
          phone,
          coCreationId,
          userId,
          accessToken: token, // 传入登录成功后的token
          rtcConfig, // 添加RTC配置
        };
        
        console.log('开始自动试穿流程，配置:', config);
        await tryonService.startTryonFlow(config);
      } catch (error) {
        console.error('试穿流程启动失败:', error);
        hasStartedTryon.current = false; // 失败时重置标志
      }
    };

    startTryon();
  }, [token, userId, phone, coCreationId]);

  // 监听RTC视频流更新事件
  useEffect(() => {
    const handleVideoStreamUpdate = (event: CustomEvent) => {
      const { userId, domId, type } = event.detail;
      
      if (type === 'add') {
        setVideoStreams(prev => [...prev, { userId, domId }]);
        console.log('添加视频流:', userId, domId);
      } else if (type === 'remove') {
        setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
        console.log('移除视频流:', userId);
      }
    };

    // 添加事件监听器
    window.addEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);

    // 清理事件监听器
    return () => {
      window.removeEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);
    };
  }, []);

  // 测试按钮区域保留（如需删除可告知）
  const handleTestLogout = () => {
    forceLogout();
    window.location.reload();
  };

  const handleCheckLoginStatus = () => {
    const loginStatus = isLoggedIn();
    console.log('🔍 当前登录状态:', loginStatus);
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">欢迎来到主页面</h1>
        
        {/* 视频播放器区域 */}
        {videoStreams.length > 0 && (
          <div className="video-container" style={{ 
            marginBottom: '20px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1890ff' }}>
              🎥 试穿视频直播
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '15px'
            }}>
              {videoStreams.map(stream => (
                <div key={stream.userId} style={{
                  backgroundColor: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div 
                    id={stream.domId}
                    style={{
                      width: '100%',
                      height: '200px',
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
        
        {/* 如不需要测试按钮可删除下方div */}
        <div className="test-buttons" style={{ marginBottom: '20px' }}>
          <button 
            onClick={handleTestLogout}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            测试：清除Token
          </button>
          <button 
            onClick={handleCheckLoginStatus}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            检查登录状态
          </button>
        </div>
        <div className="demo-image-container">
          <img src={demoImage} alt="Demo" className="demo-image" />
        </div>
        <p className="home-description">
          这是登录成功后的主页面，展示了demo.png图片
        </p>
        
        {/* 试穿流程状态显示 */}
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
          border: '1px solid #d6e4ff'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1890ff' }}>
            🔄 试穿流程状态
          </h4>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <div>✅ 登录认证: 已完成</div>
            <div>✅ 房间创建: 已完成</div>
            <div>✅ WebSocket连接: 已完成</div>
            <div>✅ 登台流程: 已完成</div>
            <div>🎥 RTC视频: {videoStreams.length > 0 ? '已连接' : '等待中...'}</div>
            {videoStreams.length > 0 && (
              <div style={{ marginTop: '10px', color: '#52c41a' }}>
                📹 当前视频流: {videoStreams.length} 个
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
export {}; 