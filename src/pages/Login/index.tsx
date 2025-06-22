import React, { useState, useEffect } from 'react';
import './index.css';
import logo from '../../assets/logo.png';

const Login = () => {
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);

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

  const handleGetVerifyCode = () => {
    // 这里可以添加获取验证码的API调用
    console.log('获取验证码');
    
    // 开始倒计时
    setCountdown(300);
    setIsCountingDown(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLogin = () => {
    // 这里可以添加登录逻辑
    console.log('登录', { phoneNumber, verifyCode });
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
            className={`verify-code-button ${isCountingDown ? 'disabled' : ''}`}
            onClick={handleGetVerifyCode}
            disabled={isCountingDown}
          >
            {isCountingDown ? formatTime(countdown) : '获取验证码'}
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
        <button 
          className={`login-button ${!isFormValid ? 'disabled' : ''}`}
          onClick={handleLogin}
          disabled={!isFormValid}
        >
          立即登录
        </button>
      </div>
    </div>
  );
};

export default Login; 