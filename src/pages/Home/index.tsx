import React from 'react';
import './index.css';
import demoImage from '../../assets/demo.png';
import { forceLogout, isLoggedIn } from '../../utils/auth';

const Home = () => {
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