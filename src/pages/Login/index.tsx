import React, { useState, useEffect } from 'react';
import './index.css';
import logo from '../../assets/logo.png';
import { authAPI } from '../../services/api';

const Login = () => {
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingCode, setIsGettingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isCountingDown && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && isCountingDown) {
      setIsCountingDown(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [countdown, isCountingDown]);

  const handleGetVerifyCode = async () => {
    console.log('phonexxxx')
    if (!phoneNumber.trim()) {
      setErrorMessage('请输入手机号');
      return;
    }

    // 简单的手机号验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMessage('请输入正确的手机号');
      return;
    }

    setErrorMessage('');
    setIsGettingCode(true);

    try {
      const response = await authAPI.getVerifyCode(phoneNumber);
      
      if (response.ok) {
        // 尝试解析响应数据
        const parsedResponse = authAPI.parseVerifyCodeResponse(response);
        
        if (parsedResponse) {
          // 检查服务器返回的具体错误信息
          if (parsedResponse.code === 0 && parsedResponse.msg === "验证码发送过频繁") {
            setErrorMessage('验证码发送过于频繁，请稍后再试');
            return;
          }
          
          if (parsedResponse.data === false) {
            setErrorMessage(parsedResponse.msg || '获取验证码失败');
            return;
          }
        }
        
        // 获取验证码成功，开始倒计时
        setCountdown(300);
        setIsCountingDown(true);
        console.log('验证码发送成功');
        
        // 尝试解析响应数据
        if (parsedResponse?.message) {
          console.log('服务器消息:', parsedResponse.message);
        }
      } else {
        setErrorMessage(`获取验证码失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取验证码错误:', error);
      setErrorMessage('网络错误，请稍后重试');
    } finally {
      setIsGettingCode(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !verifyCode.trim()) {
      setErrorMessage('请填写完整信息');
      return;
    }

    if (!isAgreementChecked) {
      setErrorMessage('请先同意用户协议');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      console.log('come in')
      const response = await authAPI.login(phoneNumber, verifyCode);
      
      if (response.ok) {
        console.log('登录成功:', response.data);
        
        // 解析登录响应
        const loginData = authAPI.parseLoginResponse(response);
        if (loginData?.access_token) {
          // 保存token到本地存储
          localStorage.setItem('access_token', loginData.access_token);
          if (loginData.refresh_token) {
            localStorage.setItem('refresh_token', loginData.refresh_token);
          }
          console.log('Token已保存');
          
          // 这里可以添加登录成功后的跳转逻辑
          // 例如：window.location.href = '/dashboard';
          // 或者使用React Router: navigate('/dashboard');
        }
      } else {
        setErrorMessage(`登录失败: ${response.status}`);
      }
    } catch (error) {
      console.error('登录错误:', error);
      setErrorMessage('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 检查表单是否完整
  const isFormValid = phoneNumber.trim() !== '' && verifyCode.trim() !== '' && isAgreementChecked;

  return (
    <div className="login-container">
      <img src={logo} alt="logo" className="logo" />
      <h2 className="welcome-text">欢迎来到元相</h2>
      <div className="form">
        <input 
          type="tel" 
          placeholder="输入手机号" 
          className="input-field"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <div className="verify-code-container">
          <input 
            type="text" 
            placeholder="输入验证码" 
            className="input-field"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
          />
          <button 
            className={`verify-code-button ${isCountingDown || isGettingCode ? 'disabled' : ''}`}
            onClick={handleGetVerifyCode}
            disabled={isCountingDown || isGettingCode}
          >
            {isGettingCode ? '发送中...' : isCountingDown ? formatTime(countdown) : '获取验证码'}
          </button>
        </div>
        <div className="agreement-container">
          <input 
            type="checkbox" 
            id="agreement"
            checked={isAgreementChecked}
            onChange={(e) => setIsAgreementChecked(e.target.checked)}
          />
          <label htmlFor="agreement">
            我已阅读并同意
            <a href="#">《用户服务协议》</a>和
            <a href="#">《隐私政策》</a>
            <a href="#">《天翼账号认证服务条款》</a>
          </label>
        </div>
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        <button 
          className={`login-button ${!isFormValid || isLoading ? 'disabled' : ''}`}
          onClick={handleLogin}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? '登录中...' : '立即登录'}
        </button>
      </div>
    </div>
  );
};

export default Login; 