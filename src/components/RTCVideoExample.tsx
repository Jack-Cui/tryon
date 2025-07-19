import React, { useState } from 'react';
import RTCVideoViewer from './RTCVideoViewer';
import { RTCVideoConfig, RemoteStream } from '../services/rtcVideoService';

const RTCVideoExample: React.FC = () => {
  const [rtcConfig, setRtcConfig] = useState<RTCVideoConfig>({
    appId: '',
    appKey: '',
    roomId: '',
    userId: '',
    token: ''
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

  // 处理配置输入
  const handleConfigChange = (field: keyof RTCVideoConfig, value: string) => {
    setRtcConfig((prev: RTCVideoConfig) => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理连接
  const handleConnect = () => {
    if (!rtcConfig.appId || !rtcConfig.roomId || !rtcConfig.userId) {
      alert('请填写完整的配置信息');
      return;
    }
    setIsConnected(true);
  };

  // 处理断开连接
  const handleDisconnect = () => {
    setIsConnected(false);
    setRemoteStreams([]);
  };

  // 处理错误
  const handleError = (error: any) => {
    console.error('RTC错误:', error);
    alert(`RTC连接错误: ${error.message || error}`);
  };

  // 处理用户加入
  const handleUserJoin = (userId: string) => {
    console.log('用户加入房间:', userId);
  };

  // 处理用户离开
  const handleUserLeave = (userId: string) => {
    console.log('用户离开房间:', userId);
  };

  // 处理流更新
  const handleStreamUpdate = (streams: RemoteStream[]) => {
    setRemoteStreams(streams);
    console.log('远程流更新:', streams);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🎥 RTC视频观看示例</h2>
      
      {!isConnected ? (
        <div style={{ marginBottom: '20px' }}>
          <h3>配置RTC连接</h3>
          <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            <div>
              <label>App ID:</label>
              <input
                type="text"
                value={rtcConfig.appId}
                onChange={(e) => handleConfigChange('appId', e.target.value)}
                placeholder="请输入火山引擎App ID"
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>
            
            <div>
              <label>房间ID:</label>
              <input
                type="text"
                value={rtcConfig.roomId}
                onChange={(e) => handleConfigChange('roomId', e.target.value)}
                placeholder="请输入房间ID"
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>
            
            <div>
              <label>用户ID:</label>
              <input
                type="text"
                value={rtcConfig.userId}
                onChange={(e) => handleConfigChange('userId', e.target.value)}
                placeholder="请输入用户ID"
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>
            
            <div>
              <label>Token (可选):</label>
              <input
                type="text"
                value={rtcConfig.token}
                onChange={(e) => handleConfigChange('token', e.target.value)}
                placeholder="请输入RTC Token (可选)"
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>
          </div>
          
          <button
            onClick={handleConnect}
            style={{
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            连接RTC房间
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>RTC视频观看</h3>
            <button
              onClick={handleDisconnect}
              style={{
                backgroundColor: '#ff4d4f',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              断开连接
            </button>
          </div>
          
          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
            当前配置: AppID={rtcConfig.appId}, RoomID={rtcConfig.roomId}, UserID={rtcConfig.userId}
          </div>
          
          <RTCVideoViewer
            config={rtcConfig}
            onError={handleError}
            onUserJoin={handleUserJoin}
            onUserLeave={handleUserLeave}
            onStreamUpdate={handleStreamUpdate}
          />
        </div>
      )}
      
      {remoteStreams.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>远程流信息</h4>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {remoteStreams.map((stream, index) => (
              <div key={stream.userId} style={{ marginBottom: '5px' }}>
                {index + 1}. 用户: {stream.userId} 
                {stream.hasVideo && ' 📹'} 
                {stream.hasAudio && ' 🎤'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RTCVideoExample; 