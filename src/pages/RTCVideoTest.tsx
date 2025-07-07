import React from 'react';
import RTCVideoExample from '../components/RTCVideoExample';

const RTCVideoTest: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f2f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#fafafa'
        }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#1890ff' }}>
            🎥 RTC视频观看测试
          </h1>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            测试火山引擎RTC视频观看功能，支持观看远程视频流
          </p>
        </div>
        
        <div style={{ padding: '20px' }}>
          <RTCVideoExample />
        </div>
      </div>
    </div>
  );
};

export default RTCVideoTest; 