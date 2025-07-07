import React, { useState, useRef } from 'react';
import { Button, Input, Form, Card, message, Space, Divider, Typography } from 'antd';
import { tryonService } from '../services/tryonService';

const { Title, Text } = Typography;

interface TryonTestProps {}

const TryonTest: React.FC<TryonTestProps> = () => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [form] = Form.useForm();
  const logRef = useRef<HTMLDivElement>(null);

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    if (logRef.current) {
      const logElement = document.createElement('div');
      logElement.textContent = logMessage;
      logElement.style.marginBottom = '4px';
      logRef.current.appendChild(logElement);
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  // 清空日志
  const clearLog = () => {
    if (logRef.current) {
      logRef.current.innerHTML = '';
    }
  };

  // 开始试穿流程
  const handleStartTryon = async () => {
    let originalLog: any = null;
    
    try {
      setLoading(true);
      clearLog();
      
      const values = await form.validateFields();
      
      addLog('开始试穿流程...');
      
      // 重写console.log以显示在页面上
      originalLog = console.log;
      console.log = (...args) => {
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            // 特殊处理 Long 对象和其他特殊对象
            try {
              // 如果是 Long 对象，转换为字符串
              if (arg && typeof arg.toString === 'function' && arg.toString().includes('Long')) {
                return arg.toString();
              }
              // 尝试 JSON.stringify，如果失败则使用 toString
              return JSON.stringify(arg, null, 2);
            } catch (error) {
              // 如果 JSON.stringify 失败，使用 toString
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
        addLog(message);
        originalLog(...args);
      };
      
      const config = {
        phone: values.phone,
        coCreationId: parseInt(values.coCreationId),
        userId: values.userId,
        accessToken: values.accessToken
      };
      
      await tryonService.startTryonFlow(config);
      
      setConnected(true);
      message.success('试穿流程启动成功！');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`错误: ${errorMessage}`);
      message.error('试穿流程失败，请检查参数和网络连接');
    } finally {
      // 确保恢复原始的console.log
      if (originalLog && typeof originalLog === 'function') {
        console.log = originalLog;
      }
      setLoading(false);
    }
  };

  // 断开连接
  const handleDisconnect = () => {
    tryonService.disconnect();
    setConnected(false);
    addLog('已断开连接');
    message.info('已断开连接');
  };

  // 检查连接状态
  const checkConnectionStatus = () => {
    const status = tryonService.getConnectionStatus();
    setConnected(status);
    addLog(`连接状态: ${status ? '已连接' : '未连接'}`);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>试穿系统测试</Title>
      
      <Card title="配置参数" style={{ marginBottom: '20px' }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            phone: '13500003000',
            coCreationId: '2',
            userId: '1754092805389819906'
          }}
        >
          <Form.Item
            label="手机号码"
            name="phone"
            rules={[{ required: true, message: '请输入手机号码' }]}
          >
            <Input placeholder="请输入手机号码" />
          </Form.Item>
          
          <Form.Item
            label="共创ID"
            name="coCreationId"
            rules={[{ required: true, message: '请输入共创ID' }]}
          >
            <Input placeholder="请输入共创ID" />
          </Form.Item>
          
          <Form.Item
            label="用户ID"
            name="userId"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="请输入用户ID" />
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="操作控制" style={{ marginBottom: '20px' }}>
        <Space>
          <Button 
            type="primary" 
            onClick={handleStartTryon} 
            loading={loading}
            disabled={connected}
            size="large"
          >
            开始试穿流程
          </Button>
          
          <Button 
            danger 
            onClick={handleDisconnect} 
            disabled={!connected}
            size="large"
          >
            断开连接
          </Button>
          
          <Button 
            onClick={checkConnectionStatus}
            size="large"
          >
            检查连接状态
          </Button>
          
          <Button 
            onClick={clearLog}
            size="large"
          >
            清空日志
          </Button>
        </Space>
      </Card>
      
      <Card title="状态信息" style={{ marginBottom: '20px' }}>
        <Space direction="vertical">
          <Text strong>连接状态: 
            <span style={{ color: connected ? 'green' : 'red', marginLeft: '8px' }}>
              {connected ? '已连接' : '未连接'}
            </span>
          </Text>
          <Text strong>加载状态: 
            <span style={{ color: loading ? 'orange' : 'green', marginLeft: '8px' }}>
              {loading ? '处理中...' : '就绪'}
            </span>
          </Text>
        </Space>
      </Card>
      
      <Card title="实时日志" style={{ marginBottom: '20px' }}>
        <div 
          ref={logRef}
          style={{
            height: '400px',
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            padding: '10px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          <div style={{ color: '#666' }}>等待开始...</div>
        </div>
      </Card>
      
      <Card title="使用说明" type="inner">
        <ol>
          <li>确保网络连接正常</li>
          <li>输入正确的手机号码、共创ID和用户ID</li>
          <li>点击"开始试穿流程"按钮启动完整流程</li>
          <li>观察实时日志了解流程进展</li>
          <li>流程包括：获取验证码 → 登录 → 获取房间信息 → 创建房间 → 加入房间 → 调度实例 → WebSocket连接 → 登台流程</li>
          <li>整个流程会自动执行，在台上停留20秒后自动离开</li>
        </ol>
      </Card>
    </div>
  );
};

export default TryonTest; 