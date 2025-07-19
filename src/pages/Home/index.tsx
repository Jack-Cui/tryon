import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import { tryonService } from '../../services/tryonService';
import { rtcVideoService } from '../../services/rtcVideoService';
import { RTCVideoConfig } from '../../services/rtcVideoService';
import { webSocketService } from '../../services/websocketService';
import { wechatShareService } from '../../services/wechatShareService';
import { getLoginCache, clearLoginCache } from '../../utils/loginCache';
import { ClothesItem } from '../../types/api';
import { WECHAT_CONFIG } from '../../config/config';
import * as proto from '../../proto/xproto';
import { rtcMessageHandler } from '../../services/rtcMessageHandler';
// 导入图片
import actionIcon from '../../assets/动作.png';
import balletIcon from '../../assets/芭蕾.png';
import dressIcon from '../../assets/连衣裙.png';
import coatIcon from '../../assets/外套.png';
import suitIcon from '../../assets/套装.png';
import skirtIcon from '../../assets/裙子.png';
import hatIcon from '../../assets/帽子.png';
import topIcon from '../../assets/上衣.png';
import socksIcon from '../../assets/袜子.png';
import pantsIcon from '../../assets/下装.png';
import shoesIcon from '../../assets/鞋子.png';
import shareIcon from '../../assets/分享.png';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state || {};
  const hasStartedTryon = useRef(false);
  const [videoStreams, setVideoStreams] = useState<Array<{userId: string, domId: string}>>([]);
  const [videoPlayingStatus, setVideoPlayingStatus] = useState<{[key: string]: boolean}>({});
  const [showSelectionScreen, setShowSelectionScreen] = useState(true); // 新增状态控制显示选择界面
  const [roomName, setRoomName] = useState<string>('PADA2024秀款礼服系列'); // 添加房间名称状态，默认值为原来的文本
  
  // 触摸事件相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouchPos, setLastTouchPos] = useState<{ x: number, y: number } | null>(null);
  
  // 缩放事件相关状态
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [lastScaleDistance, setLastScaleDistance] = useState<number | null>(null);
  
  // 视频暂停状态
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isProcessingClick, setIsProcessingClick] = useState(false);
  const [clothesList, setClothesList] = useState<ClothesItem[]>([]); // 添加服饰列表状态
  const [loginParams, setLoginParams] = useState<{
    token: string;
    userId: string;
    phone: string;
    coCreationId: number;
  } | null>(null);

  // 新增状态：服装浏览相关
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // 当前选中的分类
  const [isBrowsingClothes, setIsBrowsingClothes] = useState(false); // 是否在浏览具体服装
  const [selectedClothesIndex, setSelectedClothesIndex] = useState(0); // 选中的服装索引（用于顶部显示）

  // 新增状态：动作和实景展开相关
  const [isActionExpanded, setIsActionExpanded] = useState(false); // 动作是否展开
  const [isRealSceneExpanded, setIsRealSceneExpanded] = useState(false); // 实景是否展开
  const [selectedActionIndex, setSelectedActionIndex] = useState(0); // 当前选中的动作索引（0: 动作.png, 1: 芭蕾.png）
  const [selectedRealSceneIndex, setSelectedRealSceneIndex] = useState(0); // 当前选中的实景索引

  // 新增状态：视频播放界面的图标控制
  const [showVideoIcons, setShowVideoIcons] = useState(true); // 视频播放时是否显示左右侧图标
  const [iconHideTimer, setIconHideTimer] = useState<NodeJS.Timeout | null>(null); // 图标自动隐藏定时器

  // 新增状态：微信分享相关
  const [isWechatShareReady, setIsWechatShareReady] = useState(false); // 微信分享是否已准备好
  const [showShareTip, setShowShareTip] = useState(false); // 是否显示分享提示

  // 服饰分类名称映射到图标
  const getClothesIcon = (classifyName: string) => {
    const iconMap: {[key: string]: string} = {
      '套装': suitIcon,
      '裙子': skirtIcon,
      '帽子': hatIcon,
      '上衣': topIcon,
      '袜子': socksIcon,
      '外套': coatIcon,
      '下装': pantsIcon,
      '鞋子': shoesIcon,
      '连衣裙': dressIcon,
    };
    return iconMap[classifyName] || topIcon; // 默认使用上衣图标
  };

  // 动作图标数组
  const actionIcons = [
    { icon: actionIcon, name: '动作' },
    { icon: balletIcon, name: '芭蕾' }
  ];

  // 实景图标数组，对应不同的地图
  const realSceneIcons = [
    { icon: hatIcon, name: '博物馆', mapName: 'Maps_Museum' },
    { icon: coatIcon, name: '教堂', mapName: 'Maps_jiaotang' },
    { icon: topIcon, name: '广场', mapName: 'Maps_guangchang' },
    { icon: pantsIcon, name: '沙滩', mapName: 'Maps_shatan' },
    { icon: shoesIcon, name: '商店', mapName: 'Maps_udraper' }
  ];

  // 处理动作图标点击
  const handleActionClick = (index?: number) => {
    if (index === undefined) {
      // 点击主动作图标，切换展开/收起状态
      setIsActionExpanded(!isActionExpanded);
      // 收起实景展开状态
      setIsRealSceneExpanded(false);
    } else {
      // 点击具体的动作，更新选中状态和主图标，然后自动收起
      setSelectedActionIndex(index);
      setIsActionExpanded(false); // 自动收起
      console.log('选中动作:', actionIcons[index].name);
    }
  };

  // 处理实景图标点击
  const handleRealSceneClick = async (index?: number) => {
    if (index === undefined) {
      // 点击主实景图标，切换展开/收起状态
      setIsRealSceneExpanded(!isRealSceneExpanded);
      // 收起动作展开状态
      setIsActionExpanded(false);
    } else {
      // 点击具体的实景，更新选中状态和主图标，然后自动收起
      setSelectedRealSceneIndex(index);
      setIsRealSceneExpanded(false); // 自动收起
      
      const selectedScene = realSceneIcons[index];
      console.log('选中实景:', selectedScene.name, '地图名称:', selectedScene.mapName);
      
      // 检查RTC连接状态
      if (!rtcVideoService.getConnectionStatus()) {
        console.error('❌ RTC未连接，无法切换地图');
        console.log('🔍 RTC连接状态检查失败，可能需要等待RTC初始化完成');
        console.log('💡 提示：请确保已完成登台流程，RTC服务已启动');
        console.log('🔧 调试信息：');
        console.log('  - showSelectionScreen:', showSelectionScreen);
        console.log('  - hasStartedTryon.current:', hasStartedTryon.current);
        console.log('  - RTC SDK版本:', rtcVideoService.getSDKVersion());
        console.log('  - RTC连接状态:', rtcVideoService.getConnectionStatus());
        return;
      }
      
      // 检查是否在视频播放状态（已登台）
      if (showSelectionScreen) {
        console.error('❌ 未在视频播放状态，无法切换地图');
        return;
      }
      
      // 发送切换地图的RTC消息
      try {
        console.log('🚀 开始发送切换地图RTC消息...');
        rtcVideoService.sendChangeMap(selectedScene.mapName);
        console.log('✅ 切换地图RTC消息已发送:', selectedScene.mapName);
      } catch (error) {
        console.error('❌ 发送切换地图RTC消息失败:', error);
        // 显示错误提示
        alert(`切换地图失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // 获取分类的实际图标URL（优先使用服务器返回的classifyUrl）
  const getCategoryIcon = (classifyName: string): string => {
    // const categoryItem = clothesList.find(item => item.classifyName === classifyName);
    // // 优先使用服务器返回的classifyUrl，如果没有则使用本地图标
    // return categoryItem?.classifyUrl || getClothesIcon(classifyName);
    return getClothesIcon(classifyName);
  };

  // 获取第一个分类的第一个服装（用于顶部显示）
  const getFirstClothesOfFirstCategory = (): any | null => {
    if (clothesList.length === 0) return null;
    
    const firstCategory = getUniqueCategories()[0];
    if (!firstCategory) return null;
    
    const firstCategoryClothes = getClothesForCategory(firstCategory);
    return firstCategoryClothes.length > 0 ? firstCategoryClothes[0] : null;
  };

  // 获取当前应该在顶部显示的服装
  const getCurrentDisplayClothes = (): any | null => {
    // 如果正在浏览某个分类，显示选中的服装
    if (isBrowsingClothes && selectedCategory) {
      const categoryClothes = getClothesForCategory(selectedCategory);
      return categoryClothes.length > selectedClothesIndex ? categoryClothes[selectedClothesIndex] : null;
    }
    
    // 否则显示第一个分类的第一个服装
    return getFirstClothesOfFirstCategory();
  };

  // 获取某个分类下的所有服装（从clothesItems中获取）
  const getClothesForCategory = (category: string): any[] => {
    const categoryItem = clothesList.find(item => item.classifyName === category);
    return categoryItem?.clothesItems || [];
  };

  // 获取所有分类
  const getUniqueCategories = (): string[] => {
    return clothesList.map(item => item.classifyName);
  };

  // 处理分类点击
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setIsBrowsingClothes(true);
    
    // 调试：打印分类下的服装数量
    const categoryClothes = getClothesForCategory(category);
    console.log(`分类 "${category}" 下的服装数量:`, categoryClothes.length);
    console.log(`分类 "${category}" 下的服装列表:`, categoryClothes.slice(0, 3)); // 只打印前3个用于调试
  };

  // 处理返回到分类列表
  const handleBackToCategories = () => {
    setIsBrowsingClothes(false);
    setSelectedCategory(null);
    setSelectedClothesIndex(0); // 重置到第一个服装
  };

  // 处理服装点击
  const handleClothesClick = (clothesItem: any, index: number) => {
    // 更新顶部显示的服装 - 使用在当前分类下的相对索引
    setSelectedClothesIndex(index);
    console.log('选中服装:', clothesItem, '分类内索引:', index);
    console.log('选中服装图片URL:', clothesItem.clothesImageUrl);
  };

  // 开始图标自动隐藏定时器（视频播放界面用）
  const startIconHideTimer = () => {
    // 清除现有定时器
    if (iconHideTimer) {
      clearTimeout(iconHideTimer);
    }
    
    // 设置新的定时器，3秒后隐藏图标
    const timer = setTimeout(() => {
      setShowVideoIcons(false);
      setIconHideTimer(null);
    }, 3000);
    
    setIconHideTimer(timer);
  };

  // 处理视频区域点击（切换图标显示/隐藏 + 暂停/播放）
  const handleVideoAreaClick = () => {
    console.log('🎬 视频区域被点击');
    
    // 防止快速连续点击（只在微信浏览器中启用）
    if (isWechatBrowser() && isProcessingClick) {
      console.log('⚠️ 微信浏览器中正在处理点击事件，跳过');
      return;
    }
    
    if (isWechatBrowser()) {
      setIsProcessingClick(true);
    }
    
    // 检查RTC连接状态
    if (!rtcVideoService.getConnectionStatus()) {
      console.log('⚠️ RTC未连接，跳过点击消息发送');
      // 仍然切换图标显示状态
      if (!showVideoIcons) {
        setShowVideoIcons(true);
        startIconHideTimer();
      } else {
        setShowVideoIcons(false);
        if (iconHideTimer) {
          clearTimeout(iconHideTimer);
          setIconHideTimer(null);
        }
      }
      if (isWechatBrowser()) {
        setIsProcessingClick(false);
      }
      return;
    }
    
    try {
      // 发送点击触摸消息
      console.log('👆 发送点击触摸消息');
      rtcVideoService.sendTouchScreen(
        proto.eTouchType.click, // click类型
        {
          x: 0,
          y: 0,
          z: 0
        },
        Date.now()
      );
      
      console.log('✅ 点击触摸消息发送成功');
      
      // 切换图标显示状态
      if (!showVideoIcons) {
        setShowVideoIcons(true);
        startIconHideTimer();
      } else {
        setShowVideoIcons(false);
        if (iconHideTimer) {
          clearTimeout(iconHideTimer);
          setIconHideTimer(null);
        }
      }
      
      // 延迟切换暂停状态，确保微信浏览器中的视频状态同步
      const delay = isWechatBrowser() ? 300 : 300; // 微信浏览器使用450ms延迟
      setTimeout(() => {
        setIsVideoPaused(!isVideoPaused);
        console.log('⏸️ 切换视频暂停状态:', !isVideoPaused, '延迟:', delay + 'ms');
        if (isWechatBrowser()) {
          setIsProcessingClick(false);
        }
      }, delay);
      
    } catch (error) {
      console.error('❌ 发送点击触摸消息失败:', error);
      // 即使发送失败，也要切换图标显示状态
      if (!showVideoIcons) {
        setShowVideoIcons(true);
        startIconHideTimer();
      } else {
        setShowVideoIcons(false);
        if (iconHideTimer) {
          clearTimeout(iconHideTimer);
          setIconHideTimer(null);
        }
      }
      if (isWechatBrowser()) {
        setIsProcessingClick(false);
      }
    }
  };

  // 处理视频播放界面的动作点击
  const handleVideoActionClick = (index?: number) => {
    if (index === undefined) {
      // 点击主动作图标，切换展开/收起状态
      setIsActionExpanded(!isActionExpanded);
      // 收起实景展开状态
      setIsRealSceneExpanded(false);
    } else {
      // 点击具体的动作，更新选中状态和主图标，然后自动收起
      setSelectedActionIndex(index);
      setIsActionExpanded(false); // 自动收起
      console.log('选中动作:', actionIcons[index].name);
    }
    
    // 重新开始隐藏定时器
    startIconHideTimer();
  };

  // 处理视频播放界面的实景点击
  const handleVideoRealSceneClick = async (index?: number) => {
    if (index === undefined) {
      // 点击主实景图标，切换展开/收起状态
      setIsRealSceneExpanded(!isRealSceneExpanded);
      // 收起动作展开状态
      setIsActionExpanded(false);
    } else {
      // 点击具体的实景，更新选中状态和主图标，然后自动收起
      setSelectedRealSceneIndex(index);
      setIsRealSceneExpanded(false); // 自动收起
      
      const selectedScene = realSceneIcons[index];
      console.log('选中实景:', selectedScene.name, '地图名称:', selectedScene.mapName);
      
      // 检查RTC连接状态
      if (!rtcVideoService.getConnectionStatus()) {
        console.error('❌ RTC未连接，无法切换地图');
        console.log('🔍 RTC连接状态检查失败，可能需要等待RTC初始化完成');
        console.log('💡 提示：请确保已完成登台流程，RTC服务已启动');
        console.log('🔧 调试信息：');
        console.log('  - showSelectionScreen:', showSelectionScreen);
        console.log('  - hasStartedTryon.current:', hasStartedTryon.current);
        console.log('  - RTC SDK版本:', rtcVideoService.getSDKVersion());
        console.log('  - RTC连接状态:', rtcVideoService.getConnectionStatus());
        return;
      }
      
      // 发送切换地图的RTC消息
      try {
        console.log('🚀 开始发送切换地图RTC消息...');
        rtcVideoService.sendChangeMap(selectedScene.mapName);
        console.log('✅ 切换地图RTC消息已发送:', selectedScene.mapName);
      } catch (error) {
        console.error('❌ 发送切换地图RTC消息失败:', error);
        // 显示错误提示
        alert(`切换地图失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 重新开始隐藏定时器
    startIconHideTimer();
  };

  // 处理视频播放界面的服装分类点击
  const handleVideoCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setIsBrowsingClothes(true);
    
    // 重新开始隐藏定时器
    startIconHideTimer();
    
    // 调试：打印分类下的服装数量
    const categoryClothes = getClothesForCategory(category);
    console.log(`分类 "${category}" 下的服装数量:`, categoryClothes.length);
    console.log(`分类 "${category}" 下的服装列表:`, categoryClothes.slice(0, 3)); // 只打印前3个用于调试
  };

  // 处理视频播放界面的返回到分类列表
  const handleVideoBackToCategories = () => {
    setIsBrowsingClothes(false);
    setSelectedCategory(null);
    setSelectedClothesIndex(0); // 重置到第一个服装
    
    // 重新开始隐藏定时器
    startIconHideTimer();
  };

  // 处理视频播放界面的服装点击
  const handleVideoClothesClick = (clothesItem: any, index: number) => {
    // 更新顶部显示的服装 - 使用在当前分类下的相对索引
    setSelectedClothesIndex(index);
    console.log('选中服装:', clothesItem, '分类内索引:', index);
    console.log('选中服装图片URL:', clothesItem.clothesImageUrl);
    
    // 重新开始隐藏定时器
    startIconHideTimer();
  };

  // 处理触摸开始事件
  const handleTouchStart = (event: React.TouchEvent | React.MouseEvent) => {
    const pos = getEventPosition(event);
    setLastTouchPos(pos);
    setIsDragging(false);
    
    // 检测多点触摸（缩放手势）
    if ('touches' in event && event.touches.length === 2) {
      const positions = getTouchPositions(event as React.TouchEvent);
      const distance = getDistance(positions[0], positions[1]);
      setInitialDistance(distance);
      setLastScaleDistance(distance);
      console.log('🔍 缩放开始:', { 
        distance: distance.toFixed(2), 
        positions: positions.map(p => ({ x: p.x.toFixed(0), y: p.y.toFixed(0) })),
        touchCount: event.touches.length
      });
    } else {
      setInitialDistance(null);
      setLastScaleDistance(null);
      console.log('👆 单点触摸开始，触摸点数量:', 'touches' in event ? event.touches.length : 0);
    }
    
    console.log('👆 触摸开始:', pos);
  };

  // 处理触摸移动事件
  const handleTouchMove = (event: React.TouchEvent | React.MouseEvent) => {
    // 检测缩放手势
    if ('touches' in event && event.touches.length === 2 && initialDistance !== null) {
      const positions = getTouchPositions(event as React.TouchEvent);
      const currentDistance = getDistance(positions[0], positions[1]);
      const scaleDelta = currentDistance - (lastScaleDistance || initialDistance);
      
      // 如果缩放距离超过阈值，发送缩放消息
      if (Math.abs(scaleDelta) > 5) {
        // 检查RTC连接状态
        if (!rtcVideoService.getConnectionStatus()) {
          console.log('⚠️ RTC未连接，跳过缩放消息发送');
          return;
        }
        
        try {
          console.log('🔍 发送缩放触摸消息:', {
            currentDistance: currentDistance,
            initialDistance: initialDistance,
            scaleDelta: scaleDelta,
            positions: positions
          });
          
          // 发送触摸屏幕消息，touchType=scale
          rtcVideoService.sendTouchScreen(
            proto.eTouchType.scale, // scale类型
            {
              x: scaleDelta,
              y: 0,
              z: 0
            },
            Date.now()
          );
          
          console.log('✅ 缩放触摸消息发送成功');
          
        } catch (error) {
          console.error('❌ 发送缩放触摸消息失败:', error);
        }
        
        setLastScaleDistance(currentDistance);
      }
      return;
    }
    
    // 单点触摸处理（旋转）
    if (!lastTouchPos) return;
    
    const currentPos = getEventPosition(event);
    const deltaX = currentPos.x - lastTouchPos.x;
    const deltaY = currentPos.y - lastTouchPos.y;
    
    // 计算滑动距离
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 如果滑动距离超过阈值，发送旋转消息
    if (distance > 10) {
      setIsDragging(true);
      
      // 检查RTC连接状态
      if (!rtcVideoService.getConnectionStatus()) {
        console.log('⚠️ RTC未连接，跳过触摸消息发送');
        return;
      }
      
      try {
        console.log('🔄 发送旋转触摸消息:', {
          deltaX: deltaX,
          deltaY: deltaY,
          distance: distance
        });
        
        // 发送触摸屏幕消息，touchType=rotate
        // 调整旋转速度，使用较小的值
        const rotationScale = 0.3; // 旋转缩放因子
        rtcVideoService.sendTouchScreen(
          proto.eTouchType.rotate, // rotate类型
          {
            x: deltaX * rotationScale,
            y: deltaY * rotationScale,
            z: 0
          },
          Date.now()
        );
        
        console.log('✅ 旋转触摸消息发送成功');
        
      } catch (error) {
        console.error('❌ 发送旋转触摸消息失败:', error);
      }
    }
  };

  // 处理触摸结束事件
  const handleTouchEnd = (event: React.TouchEvent | React.MouseEvent) => {
    if (isDragging) {
      console.log('👆 触摸结束，旋转操作完成');
    }
    
    // 清理缩放状态
    if (initialDistance !== null) {
      console.log('🔍 缩放操作结束');
    }
    
    // 如果没有拖动，则认为是点击事件
    if (!isDragging && lastTouchPos) {
      // 检查滑动距离，如果很小才认为是点击
      const currentPos = getEventPosition(event);
      const deltaX = currentPos.x - lastTouchPos.x;
      const deltaY = currentPos.y - lastTouchPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance < 5) { // 只有滑动距离小于5像素才认为是点击
        console.log('👆 检测到点击事件，触发视频区域点击');
        handleVideoAreaClick();
      } else {
        console.log('👆 滑动距离过大，不触发点击事件:', distance.toFixed(2));
      }
    }
    
    setIsDragging(false);
    setLastTouchPos(null);
    setInitialDistance(null);
    setLastScaleDistance(null);
  };

  // 获取事件位置
  const getEventPosition = (event: React.TouchEvent | React.MouseEvent): { x: number, y: number } => {
    if ('touches' in event && event.touches.length > 0) {
      // 触摸事件
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if ('clientX' in event) {
      // 鼠标事件
      return {
        x: event.clientX,
        y: event.clientY
      };
    }
    return { x: 0, y: 0 };
  };

  // 计算两点之间的距离
  const getDistance = (pos1: { x: number, y: number }, pos2: { x: number, y: number }): number => {
    const deltaX = pos1.x - pos2.x;
    const deltaY = pos1.y - pos2.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  };

  // 获取多点触摸的位置
  const getTouchPositions = (event: React.TouchEvent): { x: number, y: number }[] => {
    const positions: { x: number, y: number }[] = [];
    for (let i = 0; i < event.touches.length; i++) {
      positions.push({
        x: event.touches[i].clientX,
        y: event.touches[i].clientY
      });
    }
    return positions;
  };

  // 检测是否在微信浏览器中
  const isWechatBrowser = (): boolean => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  };

  // 处理微信分享点击
  const handleWechatShare = async () => {
    try {
      console.log('📤 开始微信分享...');
      
      // 检查微信分享服务是否已初始化
      if (!wechatShareService.isInitialized()) {
        console.log('🔧 初始化微信分享服务...');
        
        // 初始化微信分享服务
        await wechatShareService.initialize({
          appId: WECHAT_CONFIG.APP_ID,
          title: WECHAT_CONFIG.DEFAULT_SHARE.title,
          desc: WECHAT_CONFIG.DEFAULT_SHARE.desc,
          link: WECHAT_CONFIG.DEFAULT_SHARE.link,
          imgUrl: WECHAT_CONFIG.DEFAULT_SHARE.imgUrl
        });
      }
      
      // 执行分享
      await wechatShareService.share({
        title: `${roomName} - AI试穿体验`,
        desc: '快来体验最新的AI试穿功能，感受科技与时尚的完美结合！',
        link: window.location.href,
        imgUrl: getCurrentDisplayClothes()?.clothesImageUrl || WECHAT_CONFIG.DEFAULT_SHARE.imgUrl
      });
      
      console.log('✅ 微信分享配置完成');
      
    } catch (error) {
      console.error('❌ 微信分享失败:', error);
      
      // 显示错误提示
      alert(`微信分享失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 监听微信分享准备就绪事件
  useEffect(() => {
    const handleWechatShareReady = (event: CustomEvent) => {
      console.log('📤 微信分享准备就绪:', event.detail);
      setIsWechatShareReady(true);
      setShowShareTip(true);
      
      // 根据不同类型显示不同的提示信息
      const { message, type } = event.detail;
      console.log('📤 分享提示类型:', type, '消息:', message);
      
      // 3秒后自动隐藏提示
      setTimeout(() => {
        setShowShareTip(false);
      }, 3000);
    };

    window.addEventListener('wechatShareReady', handleWechatShareReady as EventListener);

    return () => {
      window.removeEventListener('wechatShareReady', handleWechatShareReady as EventListener);
    };
  }, []);

  // 初始化登录参数
  useEffect(() => {
    // 首先尝试从路由state获取参数
    if (locationState.token && locationState.userId && locationState.phone && locationState.coCreationId) {
      console.log('✅ 从路由state获取登录参数');
      setLoginParams({
        token: locationState.token,
        userId: locationState.userId,
        phone: locationState.phone,
        coCreationId: locationState.coCreationId
      });
      
      // 如果路由state中有房间名称，也设置到状态中
      if (locationState.roomName) {
        setRoomName(locationState.roomName);
        console.log('✅ 从路由state获取到房间名称:', locationState.roomName);
      }
      
      // 即使从路由state获取登录参数，也要检查缓存中的服饰列表
      const cachedLoginData = getLoginCache();
      if (cachedLoginData && cachedLoginData.clothesList && cachedLoginData.clothesList.length > 0) {
        setClothesList(cachedLoginData.clothesList);
        console.log('✅ 从缓存获取到服饰列表:', cachedLoginData.clothesList);
      }
      return;
    }

    // 如果路由state没有参数，尝试从缓存获取
    console.log('🔍 路由state中没有登录参数，尝试从缓存获取');
    const cachedLoginData = getLoginCache();
    
    if (cachedLoginData) {
      console.log('✅ 从缓存获取登录参数成功');
      setLoginParams({
        token: cachedLoginData.token,
        userId: cachedLoginData.userId,
        phone: cachedLoginData.phone,
        coCreationId: cachedLoginData.coCreationId
      });
      
      // 如果缓存中有房间名称，也设置到状态中
      if (cachedLoginData.roomName) {
        setRoomName(cachedLoginData.roomName);
        console.log('✅ 从缓存获取到房间名称:', cachedLoginData.roomName);
      }
      
      // 如果缓存中有服饰列表，也设置到状态中
      if (cachedLoginData.clothesList && cachedLoginData.clothesList.length > 0) {
        setClothesList(cachedLoginData.clothesList);
        console.log('✅ 从缓存获取到服饰列表:', cachedLoginData.clothesList);
      }
    } else {
      console.log('❌ 缓存中没有有效的登录参数，跳转到登录页面');
      clearLoginCache();
      navigate('/login?redirect=' + encodeURIComponent(location.pathname));
    }
  }, [locationState]); // 只依赖locationState，避免重复执行

  // 初始化房间名称和服饰列表
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (!loginParams || initializedRef.current) return;
    
    initializedRef.current = true;
    
    // 如果当前房间名称还是默认值，尝试从 tryonService 获取
    if (roomName === 'PADA2024秀款礼服系列') {
      const roomNameFromService = tryonService.getRoomName();
      if (roomNameFromService) {
        setRoomName(roomNameFromService);
        console.log('✅ 从 tryonService 获取到房间名称:', roomNameFromService);
      } else {
        console.log('⚠️ tryonService 中没有房间名称，使用默认名称');
      }
    } else {
      console.log('✅ 已从缓存获取到房间名称，跳过 tryonService 获取');
    }

    // 获取服饰列表（只有当前状态为空时才尝试从服务获取）
    if (clothesList.length === 0) {
      const clothesListFromService = tryonService.getClothesList();
      if (clothesListFromService && clothesListFromService.length > 0) {
        setClothesList(clothesListFromService);
        console.log('✅ 从 tryonService 获取到服饰列表');
        console.log('服饰分类数量:', clothesListFromService.length);
      } else {
        console.log('⚠️ tryonService 中没有服饰列表，等待服务器数据');
        // 不清空列表，保持从缓存读取的数据
      }
    } else {
      console.log('✅ 服饰列表已存在，跳过从 tryonService 获取');
      console.log('服饰分类数量:', clothesList.length);
    }
  }, [loginParams, roomName, clothesList.length]); // 添加依赖项，但使用ref防止重复执行

  // 检查视频是否真正开始播放的函数
  const checkVideoPlayingStatus = (userId: string, domId: string) => {
    const videoElement = document.getElementById(domId);
    if (videoElement) {
      // 尝试多种方式查找video标签
      let videoTag = videoElement.querySelector('video');
      if (!videoTag) {
        // 如果直接查找不到，尝试查找canvas（RTC可能使用canvas）
        const canvas = videoElement.querySelector('canvas');
        if (canvas) {
          console.log(`✅ 找到canvas标签用于视频播放: ${domId}`);
          videoTag = canvas as any; // 临时处理
        }
      }
      
      if (videoTag) {
        // 设置视频样式以适应容器
        videoTag.style.width = '100%';
        videoTag.style.height = '100%';
        videoTag.style.objectFit = 'cover';
        
        const checkPlaying = () => {
          // 对于canvas，我们假设它总是"播放"的
          if (videoTag && (videoTag.tagName === 'CANVAS' || (!videoTag.paused && !videoTag.ended && videoTag.readyState > 2))) {
            console.log(`✅ 视频 ${userId} 已开始播放`);
            setVideoPlayingStatus(prev => ({
              ...prev,
              [userId]: true
            }));
          } else {
            // 继续检查，但限制检查次数
            setTimeout(checkPlaying, 1000);
          }
        };
        
        // 监听视频事件（仅对video标签）
        if (videoTag && videoTag.tagName === 'VIDEO') {
          videoTag.addEventListener('playing', () => {
            console.log(`✅ 视频 ${userId} 播放事件触发`);
            setVideoPlayingStatus(prev => ({
              ...prev,
              [userId]: true
            }));
          });
          
          videoTag.addEventListener('loadeddata', () => {
            console.log(`✅ 视频 ${userId} 数据加载完成`);
            checkPlaying();
          });
        }
        
        // 立即检查一次
        checkPlaying();
      } else {
        // 如果还没有video标签，延迟检查，但限制重试次数
        setTimeout(() => checkVideoPlayingStatus(userId, domId), 2000);
      }
    } else {
      // 如果DOM元素还没有创建，延迟检查，但限制重试次数
      setTimeout(() => checkVideoPlayingStatus(userId, domId), 2000);
    }
  };

  // 设置RTC事件处理器
  useEffect(() => {
    webSocketService.setRTCEventHandlers({
      onUserJoin: (userId: string) => {
        console.log('👤 用户加入RTC房间:', userId);
        if (userId === '1') {
          console.log('✅ 用户1加入房间');
        }
      },
      
      onUserLeave: (userId: string) => {
        console.log('👤 用户离开RTC房间:', userId);
        setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
        setVideoPlayingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[userId];
          return newStatus;
        });
      },
      
      onUserPublishStream: (userId: string, hasVideo: boolean, hasAudio: boolean) => {
        console.log('📹 用户发布流:', userId, { hasVideo, hasAudio });
        // 这个事件由tryonService处理，不需要在这里重复处理
      },
      
      onUserUnpublishStream: (userId: string) => {
        console.log('📹 用户取消发布流:', userId);
        setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
        setVideoPlayingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[userId];
          return newStatus;
        });
      },
      
      onError: (error: any) => {
        console.error('❌ RTC错误:', error);
      }
    });
  }, []);

  // 登台按钮点击处理
  const handleStartTryon = async () => {
    if (!loginParams) {
      console.warn('缺少登录参数，无法开始试穿');
      return;
    }

    if (hasStartedTryon.current) {
      console.log('试穿流程已启动，跳过重复执行');
      return;
    }

    try {
      hasStartedTryon.current = true;
      setShowSelectionScreen(false); // 隐藏选择界面，显示视频播放界面
      
      const rtcConfig: RTCVideoConfig = {
        appId: '643e46acb15c24012c963951',
        appKey: 'b329b39ca8df4b5185078f29d8d8025f',
        roomId: '1939613403762253825',
        userId: loginParams.userId
      };
      
      const config = {
        phone: loginParams.phone,
        coCreationId: loginParams.coCreationId,
        userId: loginParams.userId,
        accessToken: loginParams.token,
        rtcConfig,
      };
      
      console.log('开始自动试穿流程，配置:', config);
      await tryonService.startTryonFlow(config);
      
      console.log('✅ 试穿流程启动成功');
      
    } catch (error) {
      console.error('试穿流程启动失败:', error);
      hasStartedTryon.current = false;
      setShowSelectionScreen(true); // 出错时重新显示选择界面
    }
  };

  // 管理视频播放界面图标的自动隐藏
  useEffect(() => {
    if (!showSelectionScreen) {
      // 进入视频播放界面时，显示图标并开始定时器
      setShowVideoIcons(true);
      startIconHideTimer();
      
      return () => {
        // 清理定时器
        if (iconHideTimer) {
          clearTimeout(iconHideTimer);
          setIconHideTimer(null);
        }
      };
    }
  }, [showSelectionScreen]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (iconHideTimer) {
        clearTimeout(iconHideTimer);
      }
    };
  }, [iconHideTimer]);

  // 监听服饰列表更新事件
  useEffect(() => {
    const handleClothesListUpdate = (event: CustomEvent) => {
      const { clothesList } = event.detail;
      console.log('收到服饰列表更新事件');
      console.log('服饰分类数量:', clothesList?.length || 0);
      
      // 避免重复设置相同的数据
      setClothesList(prevClothesList => {
        // 如果新数据与当前数据相同，则不更新
        if (JSON.stringify(prevClothesList) === JSON.stringify(clothesList)) {
          console.log('服饰列表数据未变化，跳过更新');
          return prevClothesList;
        }
        console.log('服饰列表数据已更新');
        return clothesList || [];
      });
    };

    window.addEventListener('clothesListUpdate', handleClothesListUpdate as EventListener);

    return () => {
      window.removeEventListener('clothesListUpdate', handleClothesListUpdate as EventListener);
    };
  }, []);

  // 监听RTC视频流更新事件
  useEffect(() => {
    const handleVideoStreamUpdate = (event: CustomEvent) => {
      const { userId, domId, type } = event.detail;
      
      // 处理所有用户的视频流，不限制特定用户ID
      if (type === 'add') {
        setVideoStreams(prev => {
          if (prev.find(stream => stream.userId === userId)) {
            return prev;
          }
          return [...prev, { userId, domId }];
        });
        console.log('添加视频流:', userId, domId);
        

        
        // 开始检查视频播放状态
        setTimeout(() => {
          console.log(`🔍 开始检查视频播放状态: ${userId} -> ${domId}`);
          checkVideoPlayingStatus(userId, domId);
          
          // 多次检查，因为RTC SDK渲染可能需要时间
          const checkVideoElement = (attempt: number = 1) => {
            console.log(`🔍 第${attempt}次检查视频元素: ${domId}`);
            
            const videoElement = document.getElementById(domId);
            if (videoElement) {
              console.log(`✅ 找到视频DOM元素: ${domId}`);
              console.log(`🔍 DOM元素内容:`, videoElement.innerHTML);
              console.log(`🔍 DOM元素标签名:`, videoElement.tagName);
              console.log(`🔍 DOM元素类名:`, videoElement.className);
              
              // 尝试多种方式查找video标签
              let videoTag = videoElement.querySelector('video');
              if (!videoTag) {
                // 如果直接查找不到，尝试查找canvas（RTC可能使用canvas）
                const canvas = videoElement.querySelector('canvas');
                if (canvas) {
                  console.log(`✅ 找到canvas标签: ${domId}`);
                  videoTag = canvas as any; // 临时处理
                }
              }
              
              if (videoTag) {
                console.log(`✅ 找到video标签: ${domId}`);
                videoTag.style.width = '100%';
                videoTag.style.height = '100%';
                videoTag.style.objectFit = 'cover';
                
                // 添加更多调试信息
                console.log(`📹 视频元素信息:`, {
                  paused: videoTag.paused,
                  ended: videoTag.ended,
                  readyState: videoTag.readyState,
                  currentTime: videoTag.currentTime,
                  duration: videoTag.duration,
                  src: videoTag.src
                });
                
                // 标记视频为播放状态
                setVideoPlayingStatus(prev => ({
                  ...prev,
                  [userId]: true
                }));
                
                return true; // 找到视频元素，停止检查
              } else {
                console.log(`❌ 未找到video标签: ${domId}`);
                // 打印所有子元素
                const children = videoElement.children;
                console.log(`🔍 子元素数量:`, children.length);
                for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  console.log(`🔍 子元素 ${i}:`, {
                    tagName: child.tagName,
                    className: child.className,
                    id: child.id
                  });
                }
              }
            } else {
              console.log(`❌ 未找到视频DOM元素: ${domId}`);
            }
            
            // 如果还没找到且尝试次数少于10次，继续检查（增加重试次数）
            if (attempt < 10) {
              setTimeout(() => checkVideoElement(attempt + 1), 3000); // 增加间隔到3秒
            } else {
              console.log(`⚠️ 视频元素检查超时: ${domId}`);
            }
          };
          
          // 开始检查
          checkVideoElement();
        }, 2000); // 减少初始等待时间到2秒
      } else if (type === 'remove') {
        setVideoStreams(prev => prev.filter(stream => stream.userId !== userId));
        setVideoPlayingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[userId];
          return newStatus;
        });
        console.log('移除视频流:', userId);
      }
    };

    // 监听播放器事件
    const handlePlayerEvent = (event: CustomEvent) => {
      const { eventType, userId } = event.detail;
      console.log('🎬 收到播放器事件:', eventType, userId);
      
      if (eventType === 'onFirstFrame') {
        console.log('🎬 视频第一帧渲染完成，立即检查视频元素:', userId);
        const domId = `remoteStream_${userId}`;
        checkVideoPlayingStatus(userId, domId);
      }
    };

    window.addEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);
    window.addEventListener('rtcPlayerEvent', handlePlayerEvent as EventListener);

    return () => {
      window.removeEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);
      window.removeEventListener('rtcPlayerEvent', handlePlayerEvent as EventListener);
    };
  }, []);

  // 监听地图切换结果事件
  useEffect(() => {
    const handleMapChangeResult = (event: CustomEvent) => {
      const { success, code, mapName, errorText } = event.detail;
      
      console.log('🗺️ 地图切换结果事件:', {
        success,
        code,
        mapName,
        errorText
      });
      
      if (success) {
        console.log('✅ 地图切换成功!', mapName);
      } else {
        console.log('❌ 地图切换失败!', mapName, '原因:', errorText);
      }
    };

    // 监听WebSocket的地图切换结果
    window.addEventListener('mapChangeResult', handleMapChangeResult as EventListener);
    
    // 监听RTC的地图切换结果
    const handleRTCMapChangeResult = (event: CustomEvent) => {
      const { message, timestamp } = event.detail;
      
      console.log('🗺️ RTC地图切换结果事件:', {
        message,
        timestamp
      });
      
      // 解析消息内容
      if (message.includes('change_map')) {
        console.log('✅ RTC地图切换消息已收到:', message);
        // 这里可以添加更多处理逻辑
      }
    };

    window.addEventListener('rtcMapChangeResult', handleRTCMapChangeResult as EventListener);

    return () => {
      window.removeEventListener('mapChangeResult', handleMapChangeResult as EventListener);
      window.removeEventListener('rtcMapChangeResult', handleRTCMapChangeResult as EventListener);
    };
  }, []);

  // 如果缺少必要参数，显示加载页面
  if (!loginParams) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        flexDirection: 'column',
        padding: '20px'
      }}>
        <div style={{ fontSize: '16px', marginBottom: '10px', color: '#1890ff' }}>
          🔄 正在验证登录信息...
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          请稍等，正在从缓存读取登录信息
        </div>
      </div>
    );
  }

  // 选择界面
  if (showSelectionScreen) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#a8d5ba', // 浅绿色背景
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* 顶部标题区域 - 与视频播放界面对齐 */}
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(168,213,186,0.9) 0%, rgba(168,213,186,0.7) 50%, transparent 100%)',
          color: '#333',
          padding: '20px 20px 60px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {roomName}
          </h1>
        </div>

        {/* 中间图标区域 - 左右布局 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 20px 140px 20px', // 与视频播放界面相同的padding
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'stretch', // 改为stretch，让左右两侧高度一致
            justifyContent: 'space-between',
            maxWidth: '600px', // 增加最大宽度，给展开提供更多空间
            width: '100%',
            padding: '0 10px', // 减少左右padding，让icon更靠边缘
            height: '400px' // 固定高度，确保对齐
          }}>
            {/* 左侧动作和实景图标 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center', // 居中对齐
              alignItems: 'flex-start',
              height: '100%',
              gap: '40px', // 与右侧保持一致的间距
              position: 'relative',
              transform: 'translateY(30px)' // 向下移动
            }}>
              {/* 动作区域 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {/* 主动作图标 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                  onClick={() => handleActionClick()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    backgroundColor: isActionExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: isActionExpanded ? '2px solid #1890ff' : '2px solid transparent'
                  }}>
                    <img 
                      src={actionIcons[selectedActionIndex].icon} 
                      alt={actionIcons[selectedActionIndex].name} 
                      style={{
                        width: '30px',
                        height: '30px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>

                {/* 展开的动作选项 */}
                {isActionExpanded && (
                  <div style={{
                    display: 'flex',
                    gap: '8px', // 减少间距，确保不超出屏幕
                    animation: 'slideInFromLeft 0.3s ease'
                  }}>
                    {actionIcons.map((action, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '42px', // 适度缩小展开icon
                        height: '42px',
                        borderRadius: '10px', // 相应缩小圆角
                        backgroundColor: selectedActionIndex === index ? 'rgba(24,144,255,0.2)' : 'rgba(255,255,255,0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: selectedActionIndex === index ? '2px solid #1890ff' : '2px solid transparent'
                      }}
                        onClick={() => handleActionClick(index)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img 
                          src={action.icon} 
                          alt={action.name} 
                          style={{
                            width: '26px', // 相应缩小图片
                            height: '26px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 实景区域 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                position: 'relative' // 为绝对定位的展开选项提供定位基准
              }}>
                {/* 主实景图标 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                  onClick={() => handleRealSceneClick()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    backgroundColor: isRealSceneExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: isRealSceneExpanded ? '2px solid #52c41a' : '2px solid transparent'
                  }}>
                    <img 
                      src={realSceneIcons[selectedRealSceneIndex].icon} 
                      alt={realSceneIcons[selectedRealSceneIndex].name} 
                      style={{
                        width: '30px',
                        height: '30px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>

                {/* 展开的实景选项 */}
                {isRealSceneExpanded && (
                  <div style={{
                    position: 'absolute',
                    left: '70px', // 向右展开
                    top: '0',
                    display: 'flex',
                    gap: '8px', // 减少间距，确保不超出屏幕
                    animation: 'slideInFromLeft 0.3s ease',
                    zIndex: 20
                  }}>
                    {realSceneIcons.map((scene, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '42px', // 适度缩小展开icon
                        height: '42px',
                        borderRadius: '10px', // 相应缩小圆角
                        backgroundColor: selectedRealSceneIndex === index ? 'rgba(82,196,26,0.2)' : 'rgba(255,255,255,0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: selectedRealSceneIndex === index ? '2px solid #52c41a' : '2px solid transparent'
                      }}
                        onClick={() => handleRealSceneClick(index)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img 
                          src={scene.icon} 
                          alt={scene.name} 
                          style={{
                            width: '26px', // 相应缩小图片
                            height: '26px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧服装展示区域 - 纵向排列 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '40px', // 与左侧保持一致的间距
              alignItems: 'center',
              height: '100%',
              justifyContent: 'center', // 与左侧对齐方式一致
              overflow: 'hidden'
            }}>
                             {/* 1. 顶部：当前选中服装的缩略图 */}
               {getCurrentDisplayClothes() && (
                 <div style={{
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   width: '50px',
                   height: '50px',
                   borderRadius: '12px',
                   overflow: 'hidden',
                   backgroundColor: '#fff',
                   boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                   border: '2px solid #333'
                 }}>
                   <img 
                     src={getCurrentDisplayClothes()?.clothesImageUrl} 
                     alt={getCurrentDisplayClothes()?.clothesName || getCurrentDisplayClothes()?.classifyName || ''} 
                     style={{
                       width: '100%',
                       height: '100%',
                       objectFit: 'cover'
                     }}
                     onError={(e) => {
                       // 如果图片加载失败，使用分类图标
                       const target = e.target as HTMLImageElement;
                       const displayClothes = getCurrentDisplayClothes();
                       if (displayClothes) {
                         // 如果是具体服装，使用其分类的图标；如果是分类，使用分类图标
                         const categoryName = displayClothes.classifyName || selectedCategory || '';
                         target.src = getCategoryIcon(categoryName);
                       }
                       console.log('顶部服装图片加载失败，使用分类图标:', getCurrentDisplayClothes()?.clothesImageUrl);
                     }}
                     onLoad={() => {
                       console.log('顶部服装图片加载成功:', getCurrentDisplayClothes()?.clothesImageUrl);
                     }}
                   />
                 </div>
               )}

              {/* 2. 中间：服装分类或具体服装列表 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                alignItems: 'center',
                flex: 1,
                overflow: 'hidden',
                maxHeight: '400px'
              }}>
                {!isBrowsingClothes ? (
                  // 显示服装分类图标
                  <>
                    {getUniqueCategories().map((category, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                        onClick={() => handleCategoryClick(category)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '50px',
                          height: '50px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <img 
                            src={getCategoryIcon(category)} 
                            alt={category} 
                            style={{
                              width: '30px',
                              height: '30px',
                              objectFit: 'contain'
                            }}
                            onError={(e) => {
                              // 如果服务器图片加载失败，使用本地图标
                              const target = e.target as HTMLImageElement;
                              target.src = getClothesIcon(category);
                              console.log('分类图片加载失败，使用本地图标:', category);
                            }}
                            onLoad={() => {
                              console.log('分类图片加载成功:', category, getCategoryIcon(category));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  // 显示具体服装列表
                  <>
                    {/* 可滚动的服装缩略图列表 */}
                    <div 
                      className="clothes-scroll-container"
                      style={{
                        position: 'relative', // 为伪元素定位
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        alignItems: 'center',
                        maxHeight: '280px', // 固定高度以确保返回按钮可见
                        overflowY: 'auto', // 允许垂直滚动
                        overflowX: 'hidden',
                        paddingRight: '8px', // 为滚动条留出空间
                        // 自定义滚动条样式（Webkit浏览器）
                        WebkitOverflowScrolling: 'touch'
                      }}>
                      {selectedCategory && getClothesForCategory(selectedCategory)
                        .map((clothes, index) => (
                        <div key={clothes.id || index} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '50px',
                            height: '50px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0 // 防止在滚动容器中收缩
                          }}
                          onClick={() => handleClothesClick(clothes, index)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <img 
                            src={clothes.clothesImageUrl} 
                            alt={clothes.clothesName || clothes.classifyName || selectedCategory} 
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              // 如果图片加载失败，使用分类图标
                              const target = e.target as HTMLImageElement;
                              target.src = getCategoryIcon(selectedCategory || '');
                              console.log('服装图片加载失败，使用分类图标:', clothes.clothesImageUrl, '服装名:', clothes.clothesName);
                            }}
                            onLoad={() => {
                              console.log('服装图片加载成功:', clothes.clothesImageUrl, '服装名:', clothes.clothesName);
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* 返回按钮 - 固定在底部 */}
                    <button
                      onClick={handleBackToCategories}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#333',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        marginTop: '12px',
                        flexShrink: 0 // 确保按钮不会被挤压
                      }}
                    >
                      返回
                    </button>
                  </>
                )}
              </div>

              {/* 3. 底部：尺码图标 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                {/* <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <img 
                    src={sizeIcon} 
                    alt="尺码" 
                    style={{
                      width: '40px',
                      height: '40px',
                      objectFit: 'contain'
                    }}
                  />
                </div> */}
              </div>

              {/* 4. 微信分享图标 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                marginTop: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                  onClick={handleWechatShare}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '2px solid #07c160'
                  }}>
                    <img 
                      src={shareIcon} 
                      alt="微信分享" 
                      style={{
                        width: '30px',
                        height: '30px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部登台按钮 - 与视频播放界面底部对齐 */}
        <div style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          zIndex: 10,
          background: 'linear-gradient(0deg, rgba(168,213,186,0.9) 0%, rgba(168,213,186,0.7) 50%, transparent 100%)',
          padding: '60px 20px 20px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <button
            onClick={handleStartTryon}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              padding: '16px 60px',
              borderRadius: '25px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            登台
          </button>
        </div>

        {/* 右上角重新登录按钮 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('重新登录按钮被点击');
            // 清除缓存和服务状态
            clearLoginCache();
            tryonService.disconnect();
            console.log('✅ 已清除登录缓存和服务状态');
            navigate('/login');
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: '#ff4d4f !important',
            color: 'white !important',
            border: 'none !important',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer !important',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
            outline: 'none !important',
            opacity: 1,
            pointerEvents: 'auto',
            display: 'inline-block',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onMouseEnter={(e) => {
            console.log('鼠标悬停在重新登录按钮上');
            e.currentTarget.style.backgroundColor = '#ff7875';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            console.log('鼠标离开重新登录按钮');
            e.currentTarget.style.backgroundColor = '#ff4d4f';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            console.log('重新登录按钮被按下');
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            console.log('重新登录按钮被释放');
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
        >
          🔄 重新登录
        </button>

        {/* 开发环境测试微信分享按钮 */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('测试微信分享按钮被点击');
              handleWechatShare();
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '120px',
              backgroundColor: '#07c160 !important',
              color: 'white !important',
              border: 'none !important',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer !important',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              zIndex: 9999,
              boxShadow: '0 2px 8px rgba(7, 193, 96, 0.3)',
              outline: 'none !important',
              opacity: 1,
              pointerEvents: 'auto',
              display: 'inline-block',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#52c41a';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#07c160';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            📤 测试分享
          </button>
        )}
      </div>
    );
  }

  // 视频播放界面（原有的界面）
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* 顶部标题区域 - 放在正中间 */}
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: 200, // 提高z-index确保显示在视频和图标上方
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        color: '#fff',
        padding: '20px 20px 60px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {roomName}
        </h1>
      </div>

      {/* 主要内容区域 - 包含左侧图标、视频和右侧图标 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0', // 移除padding让视频铺满
        zIndex: 1,
        touchAction: 'none' // 屏蔽浏览器默认的触摸行为
      }} 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        
        {/* 暂停图标 - 显示在视频正中央 */}
        {isVideoPaused && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{
              width: 0,
              height: 0,
              borderTop: '18px solid transparent',
              borderBottom: '18px solid transparent',
              borderLeft: '28px solid white',
              marginLeft: '6px'
            }} />
          </div>
        )}
        
        {/* 左侧图标区域 */}
        {showVideoIcons && (
          <div style={{
            position: 'fixed',
            left: '10px', // 更靠近左边缘
            top: '50%',
            transform: 'translateY(-20px)', // 向下移动，与选择界面保持一致
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // 居中对齐
            alignItems: 'flex-start',
            gap: '40px', // 与选择界面保持一致的间距
            height: '200px', // 固定高度，确保对齐
            zIndex: 200, // 提高z-index确保显示在视频上方
            transition: 'opacity 0.3s ease',
            opacity: showVideoIcons ? 1 : 0
          }}>
            {/* 动作区域 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {/* 主动作图标 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoActionClick();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  backgroundColor: isActionExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: isActionExpanded ? '2px solid #1890ff' : '2px solid transparent'
                }}>
                  <img 
                    src={actionIcons[selectedActionIndex].icon} 
                    alt={actionIcons[selectedActionIndex].name} 
                    style={{
                      width: '30px',
                      height: '30px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

                              {/* 展开的动作选项 */}
                {isActionExpanded && (
                  <div style={{
                    display: 'flex',
                    gap: '8px', // 减少间距，确保不超出屏幕
                    animation: 'slideInFromLeft 0.3s ease'
                  }}>
                    {actionIcons.map((action, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '42px', // 适度缩小展开icon
                        height: '42px',
                        borderRadius: '10px', // 相应缩小圆角
                        backgroundColor: selectedActionIndex === index ? 'rgba(24,144,255,0.2)' : 'rgba(255,255,255,0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: selectedActionIndex === index ? '2px solid #1890ff' : '2px solid transparent'
                      }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVideoActionClick(index);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img 
                          src={action.icon} 
                          alt={action.name} 
                          style={{
                            width: '26px', // 相应缩小图片
                            height: '26px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* 实景区域 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              position: 'relative' // 为绝对定位的展开选项提供定位基准
            }}>
              {/* 主实景图标 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoRealSceneClick();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  backgroundColor: isRealSceneExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: isRealSceneExpanded ? '2px solid #52c41a' : '2px solid transparent'
                }}>
                  <img 
                    src={realSceneIcons[selectedRealSceneIndex].icon} 
                    alt={realSceneIcons[selectedRealSceneIndex].name} 
                    style={{
                      width: '30px',
                      height: '30px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* 展开的实景选项 */}
              {isRealSceneExpanded && (
                <div style={{
                  position: 'absolute',
                  left: '70px', // 向右展开
                  top: '0',
                  display: 'flex',
                  gap: '8px', // 减少间距，确保不超出屏幕
                  animation: 'slideInFromLeft 0.3s ease',
                  zIndex: 120
                }}>
                  {realSceneIcons.map((scene, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '42px', // 适度缩小展开icon
                      height: '42px',
                      borderRadius: '10px', // 相应缩小圆角
                      backgroundColor: selectedRealSceneIndex === index ? 'rgba(82,196,26,0.2)' : 'rgba(255,255,255,0.8)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: selectedRealSceneIndex === index ? '2px solid #52c41a' : '2px solid transparent'
                    }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVideoRealSceneClick(index);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <img 
                        src={scene.icon} 
                        alt={scene.name} 
                        style={{
                          width: '26px', // 相应缩小图片
                          height: '26px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 视频播放区域 - 全屏显示 */}
        {videoStreams.length === 0 ? (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            zIndex: 10
          }}>
            <div style={{
              textAlign: 'center',
              color: '#fff',
              padding: '40px 20px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
              <div style={{ fontSize: '20px', marginBottom: '12px' }}>
                等待视频流...
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>
                试穿流程正在进行中，请稍候
              </div>
              <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '10px' }}>
                当前视频流数量: {videoStreams.length}
              </div>
              <button 
                onClick={() => {
                  console.log('🔍 调试：检查所有视频流DOM元素');
                  videoStreams.forEach(stream => {
                    const element = document.getElementById(stream.domId);
                    if (element) {
                      console.log(`🔍 ${stream.domId}:`, {
                        tagName: element.tagName,
                        className: element.className,
                        innerHTML: element.innerHTML,
                        children: element.children.length
                      });
                    }
                  });
                }}
                style={{
                  marginTop: '10px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  backgroundColor: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                调试DOM结构
              </button>
            </div>
          </div>
        ) : (
          // 视频流全屏显示
          videoStreams.map(stream => (
            <div key={stream.userId} style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: '#000',
              zIndex: 10,
              overflow: 'hidden'
            }}>
              <div 
                id={stream.domId}
                style={{
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '16px',
                  position: 'relative'
                }}
              >
                {/* 只在视频未播放时显示加载文本 */}
                {!videoPlayingStatus[stream.userId] && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    zIndex: 2,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '20px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎬</div>
                    <div>加载视频中...</div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* 右侧服装图标区域 */}
        {showVideoIcons && (
          <div style={{
            position: 'fixed',
            right: '10px', // 更靠近右边缘
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // 与左侧对齐方式一致
            alignItems: 'center',
            gap: '20px', // 减少间距，给服装列表更多空间
            height: '400px', // 增加高度，与首页保持一致
            overflow: 'hidden',
            zIndex: 200, // 提高z-index确保显示在视频上方
            transition: 'opacity 0.3s ease',
            opacity: showVideoIcons ? 1 : 0
          }}>
            {/* 顶部：当前选中服装的缩略图 */}
            {getCurrentDisplayClothes() && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                border: '2px solid #fff'
              }}>
                <img 
                  src={getCurrentDisplayClothes()?.clothesImageUrl} 
                  alt={getCurrentDisplayClothes()?.clothesName || getCurrentDisplayClothes()?.classifyName || ''} 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const displayClothes = getCurrentDisplayClothes();
                    if (displayClothes) {
                      const categoryName = displayClothes.classifyName || selectedCategory || '';
                      target.src = getCategoryIcon(categoryName);
                    }
                  }}
                />
              </div>
            )}

            {/* 中间：服装分类或具体服装列表 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              alignItems: 'center',
              flex: 1,
              overflow: 'hidden',
              maxHeight: '400px' // 与首页保持一致
            }}>
              {!isBrowsingClothes ? (
                // 显示服装分类图标
                <>
                  {getUniqueCategories().map((category, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVideoCategoryClick(category);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}>
                        <img 
                          src={getCategoryIcon(category)} 
                          alt={category} 
                          style={{
                            width: '30px',
                            height: '30px',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getClothesIcon(category);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                // 显示具体服装列表
                <>
                  {/* 可滚动的服装缩略图列表 */}
                  <div 
                    className="clothes-scroll-container"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      alignItems: 'center',
                      maxHeight: '280px', // 与首页保持一致
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      paddingRight: '8px',
                      WebkitOverflowScrolling: 'touch'
                    }}>
                    {selectedCategory && getClothesForCategory(selectedCategory)
                      .map((clothes, index) => (
                      <div key={clothes.id || index} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '50px',
                          height: '50px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVideoClothesClick(clothes, index);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img 
                          src={clothes.clothesImageUrl} 
                          alt={clothes.clothesName || clothes.classifyName || selectedCategory} 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getCategoryIcon(selectedCategory || '');
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 返回按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVideoBackToCategories();
                    }}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#333',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      marginTop: '12px',
                      flexShrink: 0
                    }}
                  >
                    返回
                  </button>
                </>
              )}
            </div>

            {/* 微信分享图标 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWechatShare();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: '2px solid #07c160'
                }}>
                  <img 
                    src={shareIcon} 
                    alt="微信分享" 
                    style={{
                      width: '30px',
                      height: '30px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部控制区域 - 离开舞台按钮 */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200, // 提高z-index确保显示在视频上方
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* 离开舞台按钮 */}
        <button
          onClick={() => {
            console.log('🚪 用户点击离开舞台');
            
            // 断开WebSocket连接
            try {
              webSocketService.disconnect();
              console.log('✅ WebSocket连接已断开');
            } catch (error) {
              console.error('❌ 断开WebSocket连接失败:', error);
            }
            
            // 调用RTC消息处理器destroy
            try {
              rtcMessageHandler.destroy();
              console.log('✅ RTC消息处理器已销毁');
            } catch (error) {
              console.error('❌ 销毁RTC消息处理器失败:', error);
            }
            
            // 离开RTC房间
            try {
              rtcVideoService.leaveRoom();
              console.log('✅ 已离开RTC房间');
            } catch (error) {
              console.error('❌ 离开RTC房间失败:', error);
            }
            
            // 重置UI状态
            setShowSelectionScreen(true);
            hasStartedTryon.current = false;
            setIsVideoPaused(false);
            setShowVideoIcons(false);
            
            // 清理定时器
            if (iconHideTimer) {
              clearTimeout(iconHideTimer);
              setIconHideTimer(null);
            }
            
            console.log('✅ 离开舞台完成，已返回选择界面');
          }}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 'normal',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          离开舞台
        </button>
      </div>

      {/* 微信分享提示 */}
      {showShareTip && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 300,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          animation: 'fadeIn 0.3s ease',
          maxWidth: '300px',
          minWidth: '250px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📤</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>微信分享</div>
          <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
            请在微信中点击右上角菜单进行分享
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 