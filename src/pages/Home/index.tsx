import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './index.css';
import demoImage from '../../assets/demo.png';
import { forceLogout, isLoggedIn } from '../../utils/auth';
import { tryonService } from '../../services/tryonService';

const Home = () => {
  const location = useLocation();
  const { token, userId, phone, coCreationId } = location.state || {};
  const hasStartedTryon = useRef(false); // 防止重复执行

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
        const config = {
          phone,
          coCreationId,
          userId,
          accessToken: token, // 传入登录成功后的token
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
      </div>
    </div>
  );
};

export default Home;
export {}; 