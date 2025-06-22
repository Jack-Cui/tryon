import React from 'react';
import './index.css';
import logo from '../../assets/logo.png';

const Login = () => {
  return (
    <div className="login-container">
      <img src={logo} alt="logo" className="logo" />
      <h2 className="welcome-text">欢迎来到元相</h2>
      <div className="form">
        <input type="tel" placeholder="输入手机号" className="input-field" />
        <div className="verify-code-container">
          <input type="text" placeholder="输入验证码" className="input-field" />
          <button className="verify-code-button">获取验证码</button>
        </div>
        <div className="agreement-container">
          <input type="checkbox" id="agreement" />
          <label htmlFor="agreement">
            我已阅读并同意
            <a href="#">《用户服务协议》</a>和
            <a href="#">《隐私政策》</a>
            <a href="#">《天翼账号认证服务条款》</a>
          </label>
        </div>
        <button className="login-button">立即登录</button>
      </div>
    </div>
  );
};

export default Login; 