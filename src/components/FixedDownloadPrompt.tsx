import React, { useState } from 'react';
import './FixedDownloadPrompt.css';
import wx from 'weixin-js-sdk';

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

  // // 唤起APP的函数
  // const handleDownloadApp = () => {
  //   try {
  //     // 检测设备类型
  //     const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  //     const isAndroid = /Android/.test(navigator.userAgent);
      
  //     let hasLaunched = false;
  //     alert('isIOS:'+isIOS+';isAndroid:'+isAndroid);
      
  //     // 尝试唤起APP
  //     const launchApp = (protocol: string, isUniversalLink = false) => {
  //       if (hasLaunched) return;
        
  //       try {
  //         if (isUniversalLink) {
  //           // 使用Universal Links方式
  //           window.location.href = protocol;
  //         } else {
  //           // 使用自定义协议方式
  //           window.location.href = protocol;
  //         }
          
  //         hasLaunched = true;
          
  //         // 延迟检查是否成功唤起
  //         setTimeout(() => {
  //           // 如果页面仍然可见，说明唤起失败
  //           if (document.visibilityState === 'visible' && !hasLaunched) {
  //             showErrorModal(`${APP_CONFIG.name}唤起失败，正在尝试其他方式...`);
              
  //             // 尝试下一个协议
  //             const nextIndex = APP_CONFIG.protocols.indexOf(protocol) + 1;
  //             if (nextIndex < APP_CONFIG.protocols.length) {
  //               setTimeout(() => {
  //                 launchApp(APP_CONFIG.protocols[nextIndex]);
  //               }, 1000);
  //             } else if (!isUniversalLink) {
  //               // 协议都失败了，尝试Universal Links
  //               showErrorModal('协议唤起失败，尝试Universal Links方式...');
  //               setTimeout(() => {
  //                 launchApp(APP_CONFIG.universalLinks[0], true);
  //               }, 1000);
  //             } else {
  //               // 所有方式都失败了
  //               showErrorModal(`所有唤起方式都失败了，可能的原因：\n1. 浏览器阻止了APP唤起\n2. 需要在${APP_CONFIG.name}内打开链接\n3. 请手动打开${APP_CONFIG.name}\n\n建议：\n- 复制链接到${APP_CONFIG.name}内打开\n- 或者直接在${APP_CONFIG.name}中搜索`);
  //             }
  //           }
  //         }, 1500);
          
  //       } catch (error) {
  //         console.error('唤起失败:', error);
  //       }
  //     };
      
  //     // 根据设备类型选择最佳唤起方式
  //     if (isIOS) {
  //       // iOS优先使用Universal Links
  //       launchApp(APP_CONFIG.universalLinks[0], true);
  //     } else if (isAndroid) {
  //       // Android优先使用自定义协议
  //       launchApp(APP_CONFIG.protocols[0]);
  //     } else {
  //       // 其他设备尝试协议方式
  //       launchApp(APP_CONFIG.protocols[0]);
  //     }
      
  //   } catch (error) {
  //     console.error(`唤起${APP_CONFIG.name}失败:`, error);
  //     showErrorModal(`唤起失败: ${error}`);
  //   }
  // };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);  
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
 
  // 唤起APP的函数
  const handleDownloadApp = () => {
    try {
      
      if (isIOS) {
        // iOS设备，使用自定义协议唤起APP
        alert('iOS版本APP后续开放,敬请期待...');
        return;
      }


      var appId= 'appidwxb9f44b8faeead9f7'; // 你的公众号APPID
      var secret = 'a5c34dba7eb0115b064bbfd84d9ac604'; // 你的公众号密钥
      var access_token = ''; // 这里需要获取到有效的access_token
      var jsapi_ticket = ''; // 这里需要获取到有效的jsapi_ticket
      var nonceStr = Math.random().toString(36).substr(2, 15);
      var timestamp = Math.floor(Date.now() / 1000);
      var strtimestamp = timestamp.toString();
      var url = window.location.href.split('#')[0]; // 获取当前页面的URL
      var signature = ''; // 这里需要根据实际情况生成签名

      const at_fetchData = async (appId:string, secret: string) => {
        try {
          const at_response = await fetch('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${query}&secret=${secret}');
          const at_data = await at_response.json();
          
          access_token = at_data.access_token;
          alert('access_token1:'+access_token);
          console.log('Access Token:', access_token);
        } catch (error) {
          console.error('API调用失败:', error);
        }
      };
      at_fetchData(appId, secret);
      alert('access_token2:'+access_token);

      const jt_fetchData = async (access_token: string) => {
        try {
          const jt_response = await fetch(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=${access_token}`);
          const jt_data = await jt_response.json();
          jsapi_ticket = jt_data.ticket;
          console.log('JSAPI Ticket:', jsapi_ticket);
        } catch (error) {
          console.error('API调用失败:', error);
        }
      };
      jt_fetchData(access_token);
      alert('jsapi_ticket:'+jsapi_ticket);
      
      // 生成签名
      const generateSignature = (nonceStr: string, timestamp: string, url: string, jsapi_ticket: string) => {
        const stringToSign = `jsapi_ticket=${jsapi_ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
        const crypto = require('crypto');
        return crypto.createHash('sha1').update(stringToSign).digest('hex');
      };
      signature = generateSignature(nonceStr, strtimestamp, url, jsapi_ticket);  
      console.log('signature:', signature);

      if (isAndroid){
        if(isWeChat){
          wx.config({
            debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印
            appId: appId, // 必填，公众号的唯一标识
            timestamp: timestamp, // 必填，生成签名的时间戳
            nonceStr: nonceStr, // 必填，生成签名的随机串
            signature: signature,// 必填，签名
            jsApiList: [], // 必填，需要使用的JS接口列表
            openTagList: [
              'wx-open-launch-app'
            ] // 可选，需要使用的开放标签列表，例如['wx-open-launch-app']
          });
          alert('timestamp:'+timestamp+';nonceStr:'+nonceStr+';url:'+url+';jsapi_ticket:'+jsapi_ticket+';signature:'+signature);
        }else{
          // Android设备，使用自定义协议唤起APP
          window.location.href = "airverse://message?id=2";
          console.log('APP唤起xxxx');                       
        }
        // 如果唤起失败，延迟后跳转到应用商店
        setTimeout(() => {
          if (!document.hidden) {
          // 这里可以添加应用商店链接
          window.location.href = 'https://play.google.com/store/apps/details?id=com.tencent.mobileqq'; // 替换为实际的应用商店链接
          window.location.href = 'https://play.google.com/store/apps/details?id=com.tencent.mobileqq'; // 替换为实际的应用商店链接
          alert('APP唤起失败，可以跳转到应用商店');
          console.log('APP唤起失败，可以跳转到应用商店');
          }
        }, 2000);
      }
      // // 尝试唤起APP
      // const appUrl = 'airverse://message?id=xxxxx';
      // window.location.href = appUrl;
      
    } catch (error) {
      console.error('唤起APP失败:', error);
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