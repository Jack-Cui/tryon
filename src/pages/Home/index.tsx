import React from 'react';
import './index.css';
import demoImage from '../../assets/demo.png';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">欢迎来到主页面</h1>
        <div className="demo-image-container">
          <img src={demoImage} alt="Demo" className="demo-image" />
        </div>
        <p className="home-description">
          这是登录成功后的主页面，展示了demo.png图片
        </p>
      </div>
    </div>
  );
};

export default Home;
export {}; 