import React from 'react';
import './DownloadAppModal.css';
import wx from 'weixin-js-sdk'; 
// 如果需要使用微信JS-SDK，可以引入这个库

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
      var timestamp = Math.floor(Date.now() / 1000).toString();
      var url = window.location.href.split('#')[0]; // 获取当前页面的URL
      var signature = ''; // 这里需要根据实际情况生成签名

      const at_fetchData = async (appId:string, secret: string) => {
        try {
          const at_response = await fetch('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${query}&secret=${secret}');
          const at_data = await at_response.json();
          access_token = at_data.access_token;
          console.log('Access Token:', access_token);
        } catch (error) {
          console.error('API调用失败:', error);
        }
      };
      at_fetchData(appId, secret);

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
       
      // 生成签名
      const generateSignature = (nonceStr: string, timestamp: string, url: string, jsapi_ticket: string) => {
        const stringToSign = `jsapi_ticket=${jsapi_ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
        const crypto = require('crypto');
        return crypto.createHash('sha1').update(stringToSign).digest('hex');
      };
      signature = generateSignature(nonceStr, timestamp, url, jsapi_ticket);  

      if (isAndroid){
        if(isWeChat){

          // wx.config({
          //   debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印
          //   appId: '', // 必填，公众号的唯一标识
          //   timestamp: , // 必填，生成签名的时间戳
          //   nonceStr: '', // 必填，生成签名的随机串
          //   signature: '',// 必填，签名
          //   jsApiList: [], // 必填，需要使用的JS接口列表
          //   openTagList: [
          //     'wx-open-launch-app'
          //   ] // 可选，需要使用的开放标签列表，例如['wx-open-launch-app']
          // });
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