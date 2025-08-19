import React from 'react';
import './DownloadAppModal.css';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
  showCloseButton?: boolean;
}

const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  title = "airU APP",
  description = "您的私人试衣间,超多品牌等你来...",
  buttonText = "立即下载",
  showCloseButton = true
}) => {
  if (!isOpen) return null;

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)'
    }}>
      <div className="download-app-modal" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '24px',
        maxWidth: '320px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        position: 'relative'
      }}>
        {/* 关闭按钮 */}
        {/* {showCloseButton && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.color = '#666';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#999';
            }}
          >
            ×
          </button>
        )} */}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* APP图标 */}
          <div>
            <img src={require('../assets/logo.png')} alt="app logo" style={{ width: 32, height: 32 }} />
          </div>

          {/* 内容区域 */}
          <div style={{
            flex: 1,
            minWidth: 0
          }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              lineHeight: '1.2'
            }}>
              {title}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {description}
            </p>
          </div>

          {/* 下载按钮 */}
          <button
            onClick={handleDownloadApp}
            style={{
              background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(82, 196, 26, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(82, 196, 26, 0.3)';
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadAppModal; 