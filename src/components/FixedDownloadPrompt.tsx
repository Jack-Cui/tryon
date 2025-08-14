import React from 'react';
import './FixedDownloadPrompt.css';

const FixedDownloadPrompt: React.FC = () => {
  // 唤起APP的函数
  const handleDownloadApp = () => {
    try {
      // 尝试唤起APP
      const appUrl = 'airverse://message?id=xxxxx';
      window.location.href = appUrl;
      
      // 如果唤起失败，延迟后跳转到应用商店
      setTimeout(() => {
        // 这里可以添加应用商店链接
        console.log('APP唤起失败，可以跳转到应用商店');
      }, 2000);
    } catch (error) {
      console.error('唤起APP失败:', error);
    }
  };

  return (
    <div className="fixed-download-prompt">
      <div className="prompt-content">
        {/* APP图标 */}
        <div className="app-icon">
          <div className="icon-inner">
            <img src={require('../assets/logo.png')} alt="app logo" style={{ width: 32, height: 32 }} />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="prompt-text" style={{ textAlign: 'left' }}>
          <h3 className="app-title" style={{ textAlign: 'left' }}>airU APP</h3>
          <p className="app-description" style={{ textAlign: 'left' }}>您的私人试衣间,超多品牌等你来...</p>
        </div>

        {/* 下载按钮 */}
        <button 
          className="download-button"
          onClick={handleDownloadApp}
        >
          立即下载
        </button>
      </div>
    </div>
  );
};

export default FixedDownloadPrompt; 