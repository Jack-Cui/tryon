import React, { useState } from 'react';
import './FixedDownloadPrompt.css';

const FixedDownloadPrompt: React.FC = () => {
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // APP配置 - 在这里修改即可快速调试其他APP
  const APP_CONFIG = {
    name: 'airU APP', // APP名称
    description: '您的私人试衣间,超多品牌等你来...', // APP描述
    protocols: [
      'airverse://message', // 主要协议
      'airverse://', // 备用协议1
      'airverse://home', // 备用协议2
    ],
    universalLinks: [
      'https://airverse.com', // Universal Links (iOS)
      'https://airverse.com/home',
    ],
    fallbackUrl: 'https://airverse.com', // 备用网页链接
    icon: require('../assets/logo.png') // APP图标
  };

  // 显示错误弹窗
  const showErrorModal = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
  };

  // 关闭错误弹窗
  const closeErrorModal = () => {
    setShowError(false);
    setErrorMessage('');
  };

  // 复制链接到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 唤起APP的函数
  const handleDownloadApp = () => {
    try {
      // 检测设备类型
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      let hasLaunched = false;
      
      // 尝试唤起APP
      const launchApp = (protocol: string, isUniversalLink = false) => {
        if (hasLaunched) return;
        
        try {
          if (isUniversalLink) {
            // 使用Universal Links方式
            window.location.href = protocol;
          } else {
            // 使用自定义协议方式
            window.location.href = protocol;
          }
          
          hasLaunched = true;
          
          // 延迟检查是否成功唤起
          setTimeout(() => {
            // 如果页面仍然可见，说明唤起失败
            if (document.visibilityState === 'visible' && !hasLaunched) {
              showErrorModal(`${APP_CONFIG.name}唤起失败，正在尝试其他方式...`);
              
              // 尝试下一个协议
              const nextIndex = APP_CONFIG.protocols.indexOf(protocol) + 1;
              if (nextIndex < APP_CONFIG.protocols.length) {
                setTimeout(() => {
                  launchApp(APP_CONFIG.protocols[nextIndex]);
                }, 1000);
              } else if (!isUniversalLink) {
                // 协议都失败了，尝试Universal Links
                showErrorModal('协议唤起失败，尝试Universal Links方式...');
                setTimeout(() => {
                  launchApp(APP_CONFIG.universalLinks[0], true);
                }, 1000);
              } else {
                // 所有方式都失败了
                showErrorModal(`所有唤起方式都失败了，可能的原因：\n1. 浏览器阻止了APP唤起\n2. 需要在${APP_CONFIG.name}内打开链接\n3. 请手动打开${APP_CONFIG.name}\n\n建议：\n- 复制链接到${APP_CONFIG.name}内打开\n- 或者直接在${APP_CONFIG.name}中搜索`);
              }
            }
          }, 1500);
          
        } catch (error) {
          console.error('唤起失败:', error);
        }
      };
      
      // 根据设备类型选择最佳唤起方式
      if (isIOS) {
        // iOS优先使用Universal Links
        launchApp(APP_CONFIG.universalLinks[0], true);
      } else if (isAndroid) {
        // Android优先使用自定义协议
        launchApp(APP_CONFIG.protocols[0]);
      } else {
        // 其他设备尝试协议方式
        launchApp(APP_CONFIG.protocols[0]);
      }
      
    } catch (error) {
      console.error(`唤起${APP_CONFIG.name}失败:`, error);
      showErrorModal(`唤起失败: ${error}`);
    }
  };

  return (
    <>
      <div className="fixed-download-prompt">
        <div className="prompt-content">
          {/* APP图标 */}
          <div className="app-icon">
            <div className="icon-inner">
              <img src={APP_CONFIG.icon} alt={APP_CONFIG.name} style={{ width: 32, height: 32 }} />
            </div>
          </div>

          {/* 内容区域 */}
          <div className="prompt-text" style={{ textAlign: 'left' }}>
            <h3 className="app-title" style={{ textAlign: 'left' }}>{APP_CONFIG.name}</h3>
            <p className="app-description" style={{ textAlign: 'left' }}>{APP_CONFIG.description}</p>
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

      {/* 错误弹窗 */}
      {showError && (
        <div className="error-modal-overlay" onClick={closeErrorModal}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-header">
              <h3>唤起失败</h3>
              <button className="close-button" onClick={closeErrorModal}>×</button>
            </div>
            <div className="error-content">
              <p>{errorMessage}</p>
              <div className="error-suggestions">
                <p><strong>解决方案：</strong></p>
                <ul>
                  <li>复制链接到{APP_CONFIG.name}内打开</li>
                  <li>直接在{APP_CONFIG.name}中搜索</li>
                  <li>检查浏览器是否允许APP唤起</li>
                </ul>
              </div>
            </div>
            <div className="error-footer">
              <button 
                className="copy-button"
                onClick={() => copyToClipboard(APP_CONFIG.fallbackUrl)}
              >
                复制{APP_CONFIG.name}链接
              </button>
              <button className="ok-button" onClick={closeErrorModal}>确定</button>
            </div>
          </div>
        </div>
      )}

      {/* 复制成功提示 */}
      {showCopySuccess && (
        <div className="copy-success-toast">
          <span>链接已复制到剪贴板</span>
        </div>
      )}
    </>
  );
};

export default FixedDownloadPrompt; 