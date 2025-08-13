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
import shareIcon from '../../assets/相机.png';
import realSceneIcon from '../../assets/实景.png';
import realSceneActionIcon from '../../assets/实景动作.png';
import { apiService, authAPI } from '../../services/api';

const Long = require('long');

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
  const [touchStartTime, setTouchStartTime] = useState<number>(0); // 触摸开始时间
  const [isProcessingClick, setIsProcessingClick] = useState(false); // 是否正在处理点击
  
  // 缩放事件相关状态
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [lastScaleDistance, setLastScaleDistance] = useState<number | null>(null);
  
  // 视频暂停状态
  const [isVideoPaused, setIsVideoPaused] = useState(false);
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
  const [showVideoIcons, setShowVideoIcons] = useState(true); // 视频播放时是否显示左右侧图标 - 常驻显示
  const [iconHideTimer, setIconHideTimer] = useState<NodeJS.Timeout | null>(null); // 图标自动隐藏定时器

  // 新增状态：微信分享相关
  const [isWechatShareReady, setIsWechatShareReady] = useState(false); // 微信分享是否已准备好
  const [showShareTip, setShowShareTip] = useState(false); // 是否显示分享提示

  // 新增状态：用户是否已离开过舞台
  const [hasLeftStage, setHasLeftStage] = useState(false);

  // 录制相关状态
  const [isRecording, setIsRecording] = useState(false); // 是否正在录制
  const [isRecordPaused, setIsRecordPaused] = useState(false); // 是否暂停录制
  const [recordedChunks, setRecordedChunks] = useState<any[]>([]); // 录制数据
  const [showRecordUI, setShowRecordUI] = useState(false); // 是否显示录制UI
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null); // 录制完成的视频
  const [recordTime, setRecordTime] = useState(0); // 录制时间（秒）
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null); // 录制计时器

  // 获取当前视频流的video/canvas元素
  const getCurrentVideoElement = (): HTMLVideoElement | HTMLCanvasElement | null => {
    if (videoStreams.length > 0) {
      const domId = videoStreams[0].domId;
      const videoElement = document.getElementById(domId);
      if (videoElement) {
        // 优先video标签，其次canvas
        const videoTag = videoElement.querySelector('video') as HTMLVideoElement | null;
        if (videoTag) {
          return videoTag;
        }
        const canvasTag = videoElement.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvasTag) {
          return canvasTag;
        }
      }
    }
    
    // 如果找不到视频流，尝试从所有video元素中获取
    const allVideos = document.querySelectorAll('video');
    for (const video of allVideos) {
      if (video.srcObject instanceof MediaStream) {
        return video;
      }
    }
    
    // 尝试从所有canvas元素中获取
    const allCanvases = document.querySelectorAll('canvas');
    for (const canvas of allCanvases) {
      if (canvas.width > 0 && canvas.height > 0) {
        return canvas;
      }
    }
    
    return null;
  };

  // 开始录制
  const handleStartRecord = async () => {
    try {
      console.log('📹 开始录制流程...');
      
      // 直接尝试屏幕录制，这是最可靠的方法
      let stream: MediaStream | null = null;
      
      try {
        console.log('📹 尝试屏幕录制');
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        console.log('📹 屏幕录制成功');
      } catch (e) {
        console.error('❌ 屏幕录制失败:', e);
        
        // 备用方案：尝试简单的屏幕录制
        try {
          console.log('📹 尝试简单屏幕录制');
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true
          });
          console.log('📹 简单屏幕录制成功');
        } catch (e2) {
          console.error('❌ 简单屏幕录制也失败:', e2);
        }
      }
      
      if (!stream) {
        console.error('❌ 所有录制方法都失败');
        alert('无法获取屏幕录制权限，请允许屏幕共享');
        return;
      }
      
      // 验证流是否有效
      if (stream.getTracks().length === 0) {
        console.error('❌ MediaStream没有轨道');
        alert('视频流无效，无法录制');
        return;
      }
      
      // 检查是否有视频轨道
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.error('❌ MediaStream没有视频轨道');
        alert('没有视频轨道，无法录制');
        return;
      }
      
      console.log('📹 视频轨道信息:', videoTracks.map(track => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      })));
      
      console.log('📹 获取到MediaStream，轨道数量:', stream.getTracks().length);
      stream.getTracks().forEach((track, index) => {
        console.log(`📹 轨道[${index}]:`, {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        });
      });
      
      // 检查浏览器支持的MIME类型
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else {
        console.warn('⚠️ 浏览器不支持常见视频格式，使用默认格式');
      }
      
      console.log('📹 使用MIME类型:', mimeType);
      
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 1000000 // 降低到1Mbps，提高兼容性
      });
      
      mediaRecorderRef.current = recorder;
      setRecordedChunks([]);
      setRecordedBlob(null);
      setRecordTime(0);
      
      // 清理之前的计时器
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      
      recorder.ondataavailable = (e: BlobEvent) => {
        console.log('📹 ondataavailable事件触发');
        console.log('📹 数据块详情:', {
          data: e.data,
          size: e.data?.size,
          type: e.data?.type,
          timestamp: e.timeStamp
        });
        
        if (e.data && e.data.size > 0) {
          console.log('📹 录制数据块大小:', e.data.size, 'bytes');
          setRecordedChunks(prev => [...prev, e.data]);
        } else {
          console.warn('⚠️ 录制数据块为空');
        }
      };
      
      recorder.onstop = () => {
        console.log('📹 录制结束，处理录制数据');
        const chunks = recordedChunks.concat();
        console.log('📹 录制数据块数量:', chunks.length);
        
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mimeType });
          console.log('📹 创建blob，大小:', blob.size, 'bytes');
          setRecordedBlob(blob);
          setShowRecordUI(true); // 录制结束后显示结果浮层
        } else {
          console.warn('⚠️ 没有录制数据');
          alert('录制失败，请重试');
        }
        
        // 清理计时器
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
      };
      
      recorder.onerror = (event) => {
        console.error('❌ 录制错误:', event);
        alert('录制过程中出现错误，请重试');
      };
      
      recorder.start(1000); // 每秒生成一个数据块
      setIsRecording(true);
      setIsRecordPaused(false);
      
      // 开始计时
      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
      
      console.log('📹 录制开始成功');
      
    } catch (error) {
      console.error('❌ 启动录制失败:', error);
      alert('启动录制失败，请重试');
    }
  };

  useEffect(() => {
    if (loginParams?.token) {
      let intervalId: NodeJS.Timeout;
      
      const checkLoginStatus = async () => {
        try {
          const response = await authAPI.checkLogin(loginParams?.token);
          const parsed = authAPI.parseCheckLoginResponse(response);
          
          if (parsed?.status === 424) {
            console.log('账号在其他地方登录');
            // 立即清理定时器，防止重复弹窗
            if (intervalId) {
              clearInterval(intervalId);
            }
            alert('账号在其他地方登录，请重新登录');
            window.location.href = '/login';
            return; // 提前返回，不执行后续代码
          } else {
            console.log('账号未在其他地方登录')
          }
        } catch (error) {
          console.error('检查登录状态失败:', error);
        }
      };
      // Initial check
      checkLoginStatus();
      
      // Set up interval for periodic checks
      intervalId = setInterval(checkLoginStatus, 5000);
      
      // Cleanup interval on unmount
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
    
    
  }, [loginParams?.token]);

  // 暂停/恢复录制
  const handleTogglePauseRecord = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      setIsRecordPaused(true);
    } else if (recorder.state === 'paused') {
      recorder.resume();
      setIsRecordPaused(false);
    }
  };

  // 停止录制
  const handleStopRecord = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      console.log('📹 停止录制');
      recorder.stop();
    }
    setIsRecording(false);
    setIsRecordPaused(false);
    
    // 清理计时器
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  // 退出录制界面，回到视频播放
  const handleExitRecordUI = () => {
    setShowRecordUI(false);
    setIsRecording(false);
    setIsRecordPaused(false);
    setRecordedChunks([]);
    setRecordedBlob(null);
    setRecordTime(0);
    
    // 清理计时器
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
  };

  // 存草稿（本地下载）
  const handleSaveDraft = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tryon_record_${Date.now()}.webm`;
    a.click();
    
    // 延迟清理URL，确保下载完成
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // 仅分享（微信分享）
  const handleShareOnly = async () => {
    if (!recordedBlob) return;
    // 微信内直接调起分享
    if (isWechatBrowser()) {
      // 这里可以上传到服务器后返回可分享链接，或直接用微信JS-SDK分享
      // 这里只弹提示
      alert('请在微信中点击右上角菜单进行分享');
    } else {
      alert('请在微信内打开页面后分享');
    }
  };

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

  // 获取分类ID
  const getClassifyId = (classifyName: string): number => {
    const classifyIdMap: {[key: string]: number} = {
      '上衣': 1,
      '下装': 2,
      '外套': 3,
      '套装': 4,
      '帽子': 5,
      '鞋子': 6,
      '裙子': 7,
      '袜子': 8,
      '连衣裙': 9,
    };
    return classifyIdMap[classifyName] || 1; // 默认返回上衣ID
  };

  // 发送更换服装RTC请求
  const sendChangeGarmentRequest = async (clothesItemInfoList: any[], isClothesSuit: boolean) => {
    try {
      console.log('👕 准备发送更换服装RTC请求:', {
        clothesItemInfoList: clothesItemInfoList,
        isClothesSuit: isClothesSuit
      });

      // 检查RTC连接状态
      if (!rtcVideoService.getConnectionStatus()) {
        console.error('❌ RTC未连接，无法发送更换服装请求');
        return;
      }

      // 构建服装参数
      const garment1Id = clothesItemInfoList.length >= 1 ? clothesItemInfoList[0].clothesId : 0;
      const garment2Id = clothesItemInfoList.length >= 2 ? clothesItemInfoList[1].clothesId : 0;
      const garment3Id = clothesItemInfoList.length >= 3 ? clothesItemInfoList[2].clothesId : 0;
      const garment1Size = 4; // 默认尺寸，实际应该从服务器获取
      const garment2Size = garment2Id > 0 ? 4 : 1; // 默认尺寸，实际应该从服务器获取
      const garment3Size = garment3Id > 0 ? 4 : 1; // 默认尺寸，实际应该从服务器获取

      console.log('👕 构建的服装参数:', {
        garment1Id, garment2Id, garment3Id,
        garment1Size, garment2Size, garment3Size
      });

      // 发送更换服装消息
      rtcVideoService.sendChangeGarment(garment1Id, garment2Id, garment3Id, garment1Size, garment2Size, garment3Size);
      
      console.log('✅ 更换服装RTC消息发送成功');
      
    } catch (error) {
      console.error('❌ 发送更换服装RTC消息失败:', error);
    }
  };

  // 处理衣服管理逻辑
  const handleClothesManagement = async (clothesItem: any) => {
    const classifyId = selectedClassifyId || getClassifyId(clothesItem.classifyName);
    const clothesId = clothesItem.clothesId;
    
    console.log('👕 开始处理衣服管理逻辑:', {
      classifyId: classifyId,
      clothesId: clothesId,
      classifyName: clothesItem.classifyName,
      suitIds: clothesItem.suitIds
    });

    let newClothesItemInfoList: any[] = [];
    let newMClothesSuit = false;

    if (classifyId === 4) {
      // 套装
      newMClothesSuit = true;
      
      // 处理套装逻辑
      const suitIds = clothesItem.suitIds || '';
      const arr = suitIds.split(',');
      
      if (suitIds === '' || arr.length === 0) {
        const item = {
          classifyId: classifyId,
          clothesId: clothesId
        };
        newClothesItemInfoList.push(item);
      } else {
        for (let i = 0; i < arr.length; ++i) {
          const longValue = Long.fromString(arr[i]);
          const item = {
            classifyId: classifyId,
            clothesId: longValue
          };
          newClothesItemInfoList.push(item);
        }
      }
      
      console.log('👕 套装处理完成:', newClothesItemInfoList);
      
    } else {
      // 非套装
      if (mClothesSuit) {
        // 之前是套装
        newMClothesSuit = false;
        
        const item = {
          classifyId: classifyId,
          clothesId: clothesId
        };
        newClothesItemInfoList.push(item);
        
        console.log('👕 从套装切换到非套装:', newClothesItemInfoList);
        
      } else {
        // 之前不是套装
        newClothesItemInfoList = [...mClothesItemInfoList];
        
        // 1. 删除存储的同类型衣服
        for (let i = newClothesItemInfoList.length - 1; i >= 0; --i) {
          const item = newClothesItemInfoList[i];
          if (item.classifyId === classifyId) {
            newClothesItemInfoList.splice(i, 1);
          }
        }

        // 2. 特殊处理
        // 穿裙子 脱下上下衣
        if (classifyId === 7) {
          for (let i = newClothesItemInfoList.length - 1; i >= 0; --i) {
            const item = newClothesItemInfoList[i];
            if (item.classifyId === 1 || item.classifyId === 2) {
              newClothesItemInfoList.splice(i, 1);
            }
          }
        }

        // 穿上下衣 脱下裙子
        if (classifyId === 1 || classifyId === 2) {
          for (let i = newClothesItemInfoList.length - 1; i >= 0; --i) {
            const item = newClothesItemInfoList[i];
            if (item.classifyId === 7) {
              newClothesItemInfoList.splice(i, 1);
            }
          }
        }

        let index = -1;
        for (let i = 0; i < newClothesItemInfoList.length; ++i) {
          const item = newClothesItemInfoList[i];
          if (classifyId === item.classifyId) {
            item.clothesId = clothesId;
            newClothesItemInfoList[i] = item;
            index = i;
          }
        }

        if (newClothesItemInfoList.length >= 3) {
          newClothesItemInfoList.splice(0, 1);
        }

        const cii = {
          classifyId: classifyId,
          clothesId: clothesId
        };
        newClothesItemInfoList.push(cii);
        
        console.log('👕 非套装处理完成:', newClothesItemInfoList);
      }
    }
    
    // 更新状态
    setMClothesSuit(newMClothesSuit);
    setMClothesItemInfoList(newClothesItemInfoList);
    
    // 发送RTC请求，直接传递最新的数据
    await sendChangeGarmentRequest(newClothesItemInfoList, newMClothesSuit);
  };

  // 动作图标数组
  const actionIcons = [
    { icon: actionIcon, name: '情侣笔芯' },
    { icon: balletIcon, name: '芭蕾' }
  ];

  // 默认动作图标（未展开时显示）
  const defaultActionIcon = { icon: actionIcon, name: '动作' };

  // 实景图标数组，对应不同的地图
  const realSceneIcons = [
    { icon: realSceneActionIcon, name: '教堂', mapName: 'Maps_jiaotang' },
    { icon: realSceneActionIcon, name: '广场', mapName: 'Maps_guangchang' },
    { icon: realSceneActionIcon, name: '博物馆', mapName: 'Maps_Museum' },
    { icon: realSceneActionIcon, name: '沙滩', mapName: 'Maps_shatan' },
    { icon: realSceneActionIcon, name: '其他', mapName: 'Maps_udraper' }
  ];

  // 衣服管理相关状态
  const [mClothesItemInfoList, setMClothesItemInfoList] = useState<any[]>([]);
  const [mClothesSuit, setMClothesSuit] = useState<boolean>(false);
  const [selectedClassifyId, setSelectedClassifyId] = useState<number | null>(null);

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
    
    // 设置当前选中的分类ID
    const classifyId = getClassifyId(category);
    setSelectedClassifyId(classifyId);
    
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
  const handleClothesClick = async (clothesItem: any, index: number) => {
    // 更新顶部显示的服装 - 使用在当前分类下的相对索引
    setSelectedClothesIndex(index);
    
    // 打印详细的衣服信息日志
    console.log('👕 选中服装详细信息:', {
      服装名称: clothesItem.clothesName || '未知',
      服装分类: clothesItem.classifyName || '未知',
      服装ID: clothesItem.clothesId || '未知',
      图片URL: clothesItem.clothesImageUrl || '未知',
      分类内索引: index,
      完整对象: clothesItem
    });
    
    console.log('选中服装:', clothesItem, '分类内索引:', index);
    console.log('选中服装图片URL:', clothesItem.clothesImageUrl);
    
    // 处理衣服管理逻辑
    await handleClothesManagement(clothesItem);
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
    console.log('🎬 当前视频暂停状态:', isVideoPaused);
    
    // 直接切换暂停状态，不检查RTC连接
    const newPausedState = !isVideoPaused;
    setIsVideoPaused(newPausedState);
    console.log('⏸️ 切换视频暂停状态:', newPausedState);
    
    // 直接控制视频元素暂停/播放
    const videoElement = getCurrentVideoElement();
    if (videoElement && videoElement.tagName === 'VIDEO') {
      const video = videoElement as HTMLVideoElement;
      if (newPausedState) {
        video.pause();
        console.log('⏸️ 视频元素已暂停');
      } else {
        video.play().catch(error => {
          console.error('❌ 播放视频失败:', error);
        });
        console.log('▶️ 视频元素已播放');
      }
    } else {
      console.log('⚠️ 未找到可控制的视频元素，元素类型:', videoElement?.tagName);
    }
    
    // 尝试发送RTC消息（不阻塞UI）
    try {
      if (rtcVideoService.getConnectionStatus()) {
        console.log('👆 发送点击触摸消息');
        rtcVideoService.sendTouchScreen(
          proto.eTouchType.click,
          { x: 0, y: 0, z: 0 },
          Date.now()
        );
        console.log('✅ 点击触摸消息发送成功');
      } else {
        console.log('⚠️ RTC未连接，跳过消息发送');
      }
    } catch (error) {
      console.error('❌ 发送点击触摸消息失败:', error);
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
    
    // 移除隐藏定时器，让icon常驻显示
    // startIconHideTimer();
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
    
    // 移除隐藏定时器，让icon常驻显示
    // startIconHideTimer();
  };

  // 处理视频播放界面的服装分类点击
  const handleVideoCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setIsBrowsingClothes(true);
    
    // 设置当前选中的分类ID
    const classifyId = getClassifyId(category);
    setSelectedClassifyId(classifyId);
    
    // 移除隐藏定时器，让icon常驻显示
    // startIconHideTimer();
    
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
    
    // 移除隐藏定时器，让icon常驻显示
    // startIconHideTimer();
  };

  // 处理视频播放界面的服装点击
  const handleVideoClothesClick = async (clothesItem: any, index: number) => {
    // 更新顶部显示的服装 - 使用在当前分类下的相对索引
    setSelectedClothesIndex(index);
    
    // 打印详细的衣服信息日志
    console.log('🎬 视频界面选中服装详细信息:', {
      服装名称: clothesItem.clothesName || '未知',
      服装分类: clothesItem.classifyName || '未知',
      服装ID: clothesItem.clothesId || '未知',
      图片URL: clothesItem.clothesImageUrl || '未知',
      分类内索引: index,
      完整对象: clothesItem
    });
    
    console.log('选中服装:', clothesItem, '分类内索引:', index);
    console.log('选中服装图片URL:', clothesItem.clothesImageUrl);
    
    // 处理衣服管理逻辑
    await handleClothesManagement(clothesItem);
    
    // 移除隐藏定时器，让icon常驻显示
    // startIconHideTimer();
  };

  // 处理触摸开始事件
  const handleTouchStart = (event: React.TouchEvent | React.MouseEvent) => {
    console.log('👆 handleTouchStart 被调用');
    
    const pos = getEventPosition(event);
    setLastTouchPos(pos);
    setIsDragging(false);
    setTouchStartTime(Date.now()); // 记录触摸开始时间
    
    // 检测多点触摸（缩放手势）
    if ('touches' in event && event.touches.length === 2) {
      // 双指触摸时阻止默认行为
      event.preventDefault();
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
    // 双指缩放逻辑
    if ('touches' in event && event.touches.length === 2 && initialDistance !== null) {
      event.preventDefault();
      const positions = getTouchPositions(event as React.TouchEvent);
      const currentDistance = getDistance(positions[0], positions[1]);
      const scaleDelta = currentDistance - (lastScaleDistance || initialDistance);
      if (Math.abs(scaleDelta) > 5) {
        if (!rtcVideoService.getConnectionStatus()) return;
        try {
          // 缩小缩放比例，使用0.1的缩放因子
          const scaleFactor = 0.1;
          rtcVideoService.sendTouchScreen(
            proto.eTouchType.scale,
            { x: scaleDelta * scaleFactor, y: 0, z: 0 },
            Date.now()
          );
        } catch {}
        setLastScaleDistance(currentDistance);
      }
      return; // 只要是双指缩放，后面单指逻辑都不走
    }
    // 单指拖动逻辑
    if (!lastTouchPos) return;
    const currentPos = getEventPosition(event);
    const deltaX = currentPos.x - lastTouchPos.x;
    const deltaY = currentPos.y - lastTouchPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    // 拖动阈值恢复到10像素
    if (distance > 10) {
      setIsDragging(true);
      if (!rtcVideoService.getConnectionStatus()) return;
      try {
        const rotationScale = 0.3;
        // 修复旋转方向：向上移动时Y值为负，向下移动时Y值为正
        rtcVideoService.sendTouchScreen(
          proto.eTouchType.rotate,
          { x: deltaX * rotationScale, y: -deltaY * rotationScale, z: 0 },
          Date.now()
        );
        if (!isVideoPaused) setIsVideoPaused(true);
      } catch {}
    }
  };

  // 处理触摸结束事件
  const handleTouchEnd = (event: React.TouchEvent | React.MouseEvent) => {
    if (isDragging) {
      // 拖动结束
    }
    const currentPos = getEventPosition(event);
    const deltaX = currentPos.x - (lastTouchPos?.x || 0);
    const deltaY = currentPos.y - (lastTouchPos?.y || 0);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const touchDuration = Date.now() - touchStartTime;
    // 点击判定：距离<20像素，时间0~500ms
    if (!isDragging && lastTouchPos) {
      if (distance < 20 && touchDuration >= 0 && touchDuration <= 500) {
        const clickX = currentPos.x;
        const clickY = currentPos.y;
        const isLeftIconArea = clickX >= 10 && clickX <= 120 && clickY >= window.innerHeight * 0.3 && clickY <= window.innerHeight * 0.7;
        const isRightIconArea = clickX >= window.innerWidth - 120 && clickX <= window.innerWidth - 10 && clickY >= window.innerHeight * 0.3 && clickY <= window.innerHeight * 0.7;
        if (!isLeftIconArea && !isRightIconArea) {
          handleVideoAreaClick();
        }
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

  // 调试双指缩放功能
  const debugPinchZoom = () => {
    console.log('🔍 双指缩放调试信息:');
    console.log('  - 初始距离:', initialDistance);
    console.log('  - 最后缩放距离:', lastScaleDistance);
    console.log('  - RTC连接状态:', rtcVideoService.getConnectionStatus());
    console.log('  - 触摸事件处理器已绑定');
    console.log('  - 触摸事件阻止默认行为已启用');
    console.log('  - 浏览器用户代理:', navigator.userAgent);
    console.log('  - 是否支持触摸事件:', 'ontouchstart' in window);
    console.log('  - 是否支持多点触摸:', 'ontouchstart' in window && 'touches' in TouchEvent.prototype);
    
    // 检查触摸事件处理器
    const videoContainer = document.querySelector('[style*="touchAction: none"]');
    if (videoContainer) {
      console.log('  - 找到视频容器元素:', videoContainer);
      console.log('  - 视频容器样式:', videoContainer.getAttribute('style'));
    } else {
      console.log('  - 未找到视频容器元素');
    }
    
    // 测试触摸事件
    try {
      const testEvent = new TouchEvent('touchstart', {
        touches: [
          new Touch({ clientX: 100, clientY: 100, identifier: 1 } as any),
          new Touch({ clientX: 200, clientY: 200, identifier: 2 } as any)
        ]
      });
      console.log('  - 测试双指触摸事件创建成功:', testEvent);
    } catch (error) {
      console.log('  - 测试双指触摸事件创建失败:', error);
    }
    
    // 检查是否有其他元素阻止了触摸事件
    const allElements = document.querySelectorAll('*');
    const elementsWithTouchAction = Array.from(allElements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.touchAction !== 'auto';
    });
    console.log('  - 设置了touchAction的元素数量:', elementsWithTouchAction.length);
    elementsWithTouchAction.slice(0, 5).forEach(el => {
      console.log('    - 元素:', el.tagName, 'touchAction:', window.getComputedStyle(el).touchAction);
    });
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
    // console.log('🔍 路由state中没有登录参数，尝试从缓存获取');
    const cachedLoginData = getLoginCache();
    
    if (cachedLoginData) {
      // console.log('✅ 从缓存获取登录参数成功');
      setLoginParams({
        token: cachedLoginData.token,
        userId: cachedLoginData.userId,
        phone: cachedLoginData.phone,
        coCreationId: cachedLoginData.coCreationId
      });
      
      // 如果缓存中有房间名称，也设置到状态中
      if (cachedLoginData.roomName) {
        setRoomName(cachedLoginData.roomName);
        // console.log('✅ 从缓存获取到房间名称:', cachedLoginData.roomName);
      }
      
      // 如果缓存中有服饰列表，也设置到状态中
      if (cachedLoginData.clothesList && cachedLoginData.clothesList.length > 0) {
        setClothesList(cachedLoginData.clothesList);
        // console.log('✅ 从缓存获取到服饰列表:', cachedLoginData.clothesList);
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
        // console.log('✅ 从 tryonService 获取到房间名称:', roomNameFromService);
      } else {
        console.log('⚠️ tryonService 中没有房间名称，使用默认名称');
      }
    } else {
      // console.log('✅ 已从缓存获取到房间名称，跳过 tryonService 获取');
    }

    // 获取服饰列表（只有当前状态为空时才尝试从服务获取）
    if (clothesList.length === 0) {
      const clothesListFromService = tryonService.getClothesList();
      if (clothesListFromService && clothesListFromService.length > 0) {
        setClothesList(clothesListFromService);
        // console.log('✅ 从 tryonService 获取到服饰列表');
        // console.log('服饰分类数量:', clothesListFromService.length);
      } else {
        console.log('⚠️ tryonService 中没有服饰列表，等待服务器数据');
        // 不清空列表，保持从缓存读取的数据
      }
    } else {
      // console.log('✅ 服饰列表已存在，跳过从 tryonService 获取');
      // console.log('服饰分类数量:', clothesList.length);
    }

    // 自动执行登台流程（只有在用户没有离开过舞台时才执行）
    const autoStartTryon = async () => {
      // 延迟一点时间确保页面完全加载
      setTimeout(async () => {
        if (!hasLeftStage) {
          console.log('🚀 自动开始登台流程...');
          await handleStartTryon();
        } else {
          console.log('⚠️ 用户已离开过舞台，跳过自动登台');
          
          // 即使离开过舞台，也要检查RTC连接状态
          if (!rtcVideoService.getConnectionStatus()) {
            console.log('🔄 检测到RTC未连接，尝试重新连接...');
            await handleStartTryon();
          }
        }
      }, 1000);
    };

    autoStartTryon();
  }, [loginParams]); // 只依赖loginParams，避免重复执行

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

    // 检查RTC连接状态，如果已连接则跳过
    if (rtcVideoService.getConnectionStatus()) {
      console.log('RTC已连接，跳过重复初始化');
      setShowSelectionScreen(false); // 确保显示视频播放界面
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

    // 监听RTC连接状态变化
    const handleRTCConnectionStatus = () => {
      if (rtcVideoService.getConnectionStatus()) {
        console.log('✅ RTC连接成功，重置试穿流程标志');
        hasStartedTryon.current = false; // 重置标志，允许重新连接
      }
    };

    // 定期检查RTC连接状态
    const rtcStatusCheckInterval = setInterval(handleRTCConnectionStatus, 5000); // 每5秒检查一次

    window.addEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);
    window.addEventListener('rtcPlayerEvent', handlePlayerEvent as EventListener);

    return () => {
      window.removeEventListener('rtcVideoStreamUpdate', handleVideoStreamUpdate as EventListener);
      window.removeEventListener('rtcPlayerEvent', handlePlayerEvent as EventListener);
      clearInterval(rtcStatusCheckInterval);
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

  // 清理录制相关资源
  useEffect(() => {
    return () => {
      // 组件卸载时清理资源
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.stop();
        }
      }
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
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: isActionExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: isActionExpanded ? '2px solid #1890ff' : '2px solid transparent'
                  }}>
                    <img 
                      src={isActionExpanded ? actionIcons[selectedActionIndex].icon : defaultActionIcon.icon} 
                      alt={isActionExpanded ? actionIcons[selectedActionIndex].name : defaultActionIcon.name} 
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#333',
                    fontWeight: 'normal',
                    textAlign: 'center',
                    lineHeight: '1',
                    whiteSpace: 'nowrap'
                  }}>
                    {isActionExpanded ? actionIcons[selectedActionIndex].name : defaultActionIcon.name}
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
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                        onClick={() => handleActionClick(index)}
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
                          width: '40px', // 缩小尺寸
                          height: '40px',
                          borderRadius: '10px', // 与主图标保持一致
                          backgroundColor: selectedActionIndex === index ? 'rgba(24,144,255,0.2)' : 'rgba(255,255,255,0.8)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: selectedActionIndex === index ? '2px solid #1890ff' : '2px solid transparent'
                        }}>
                          <img 
                            src={action.icon} 
                            alt={action.name} 
                            style={{
                              width: '20px', // 缩小图标尺寸
                              height: '20px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        <div style={{
                          fontSize: '9px', // 缩小字体
                          color: selectedActionIndex === index ? '#1890ff' : '#333',
                          fontWeight: selectedActionIndex === index ? 'bold' : 'normal',
                          textAlign: 'center',
                          lineHeight: '1',
                          whiteSpace: 'nowrap'
                        }}>
                          {action.name}
                        </div>
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
                    width: '40px', // 缩小尺寸
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: isRealSceneExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: isRealSceneExpanded ? '2px solid #52c41a' : '2px solid transparent'
                  }}>
                    <img 
                      src={realSceneIcons[selectedRealSceneIndex].icon} 
                      alt={realSceneIcons[selectedRealSceneIndex].name} 
                      style={{
                        width: '24px', // 缩小图标尺寸
                        height: '24px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div style={{
                    fontSize: '10px', // 缩小字体
                    color: '#333',
                    fontWeight: 'normal',
                    textAlign: 'center',
                    lineHeight: '1',
                    whiteSpace: 'nowrap'
                  }}>
                    {realSceneIcons[selectedRealSceneIndex].name}
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
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                        onClick={() => handleRealSceneClick(index)}
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
                          width: '40px', // 缩小尺寸
                          height: '40px',
                          borderRadius: '10px', // 与主图标保持一致
                          backgroundColor: selectedRealSceneIndex === index ? 'rgba(82,196,26,0.2)' : 'rgba(255,255,255,0.8)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: selectedRealSceneIndex === index ? '2px solid #52c41a' : '2px solid transparent'
                        }}>
                          <img 
                            src={scene.icon} 
                            alt={scene.name} 
                            style={{
                              width: '20px', // 缩小图标尺寸
                              height: '20px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        <div style={{
                          fontSize: '9px', // 缩小字体
                          color: selectedRealSceneIndex === index ? '#52c41a' : '#333',
                          fontWeight: selectedRealSceneIndex === index ? 'bold' : 'normal',
                          textAlign: 'center',
                          lineHeight: '1',
                          whiteSpace: 'nowrap'
                        }}>
                          {scene.name}
                        </div>
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
              gap: '15px', // 进一步减少间距，给衣服列表更多空间
              alignItems: 'center',
              height: '100%',
              justifyContent: 'flex-start', // 改为顶部对齐，给衣服列表更多空间
              overflow: 'hidden',
              paddingTop: '20px' // 添加顶部间距
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
                maxHeight: '280px' // 与视频页面保持一致
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
                          width: '40px', // 缩小尺寸
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <img 
                            src={getCategoryIcon(category)} 
                            alt={category} 
                            style={{
                              width: '24px', // 缩小图标尺寸
                              height: '24px',
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
                      maxHeight: '320px', // 增加高度，显示更多衣服
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
                            width: '40px', // 缩小尺寸
                            height: '40px',
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
                    width: '40px', // 缩小尺寸
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '2px solid #07c160'
                  }}>
                    <img 
                      src={shareIcon} 
                      alt="微信分享" 
                      style={{
                        width: '24px', // 缩小图标尺寸
                        height: '24px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部登台按钮 - 已隐藏，改为自动执行 */}
        {/* <div style={{
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
        </div> */}

        {/* 自动登台提示 */}
        {/* {showSelectionScreen && !hasLeftStage && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #fff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            正在自动登台...
          </div>
        )} */}



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

        {/* 开发环境调试双指缩放按钮 */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('调试双指缩放按钮被点击');
              debugPinchZoom();
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '200px',
              backgroundColor: '#1890ff !important',
              color: 'white !important',
              border: 'none !important',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer !important',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              zIndex: 9999,
              boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
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
              e.currentTarget.style.backgroundColor = '#40a9ff';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1890ff';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔍 调试缩放
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
        onTouchCancel={handleTouchEnd}
      >
        
        {/* 暂停图标 - 显示在视频正中央 */}
        {/* {isVideoPaused && (
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
        )} */}
        
        {/* 左侧图标区域 - 常驻显示 */}
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
          pointerEvents: 'auto', // 确保点击事件正常工作
          touchAction: 'none' // 防止触摸事件被阻止
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
                  e.preventDefault();
                  e.stopPropagation();
                  handleVideoActionClick();
                }}
                onTouchStart={(e) => {
                  // 只处理单指触摸，双指触摸让给缩放处理
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                  }
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
                  width: '40px', // 缩小尺寸
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: isActionExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: isActionExpanded ? '2px solid #1890ff' : '2px solid transparent'
                }}>
                  <img 
                    src={isActionExpanded ? actionIcons[selectedActionIndex].icon : defaultActionIcon.icon} 
                    alt={isActionExpanded ? actionIcons[selectedActionIndex].name : defaultActionIcon.name} 
                    style={{
                      width: '24px', // 缩小图标尺寸
                      height: '24px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '10px', // 缩小字体
                  color: '#fff',
                  fontWeight: 'normal',
                  textAlign: 'center',
                  lineHeight: '1',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}>
                  {isActionExpanded ? actionIcons[selectedActionIndex].name : defaultActionIcon.name}
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
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                        onClick={(e) => {
                          e.preventDefault();
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
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px', // 缩小尺寸
                          height: '40px',
                          borderRadius: '10px', // 与主图标保持一致
                          backgroundColor: selectedActionIndex === index ? 'rgba(24,144,255,0.2)' : 'rgba(255,255,255,0.8)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          border: selectedActionIndex === index ? '2px solid #1890ff' : '2px solid transparent'
                        }}>
                          <img 
                            src={action.icon} 
                            alt={action.name} 
                            style={{
                              width: '20px', // 缩小图标尺寸
                              height: '20px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        <div style={{
                          fontSize: '9px', // 缩小字体
                          color: selectedActionIndex === index ? '#1890ff' : '#fff',
                          fontWeight: selectedActionIndex === index ? 'bold' : 'normal',
                          textAlign: 'center',
                          lineHeight: '1',
                          whiteSpace: 'nowrap',
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          {action.name}
                        </div>
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
                  e.preventDefault();
                  e.stopPropagation();
                  handleVideoRealSceneClick();
                }}
                onTouchStart={(e) => {
                  // 只处理单指触摸，双指触摸让给缩放处理
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                  }
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
                  width: '40px', // 缩小尺寸
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: isRealSceneExpanded ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: isRealSceneExpanded ? '2px solid #52c41a' : '2px solid transparent'
                }}>
                  <img 
                    src={realSceneIcons[selectedRealSceneIndex].icon} 
                    alt={realSceneIcons[selectedRealSceneIndex].name} 
                    style={{
                      width: '24px', // 缩小图标尺寸
                      height: '24px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '10px', // 缩小字体
                  color: '#fff',
                  fontWeight: 'normal',
                  textAlign: 'center',
                  lineHeight: '1',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}>
                  {realSceneIcons[selectedRealSceneIndex].name}
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
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                      onClick={(e) => {
                        e.preventDefault();
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
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px', // 缩小尺寸
                        height: '40px',
                        borderRadius: '10px', // 与主图标保持一致
                        backgroundColor: selectedRealSceneIndex === index ? 'rgba(82,196,26,0.2)' : 'rgba(255,255,255,0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        border: selectedRealSceneIndex === index ? '2px solid #52c41a' : '2px solid transparent'
                      }}>
                        <img 
                          src={scene.icon} 
                          alt={scene.name} 
                          style={{
                            width: '20px', // 缩小图标尺寸
                            height: '20px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                      <div style={{
                        fontSize: '9px', // 缩小字体
                        color: selectedRealSceneIndex === index ? '#52c41a' : '#fff',
                        fontWeight: selectedRealSceneIndex === index ? 'bold' : 'normal',
                        textAlign: 'center',
                        lineHeight: '1',
                        whiteSpace: 'nowrap',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                      }}>
                        {scene.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        

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
            {/* <div style={{
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
            </div> */}
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
                {/* {!videoPlayingStatus[stream.userId] && (
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
                )} */}
              </div>
            </div>
          ))
        )}

        {/* 右侧服装图标区域 - 常驻显示 */}
        <div style={{
          position: 'fixed',
          right: '10px', // 更靠近右边缘
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start', // 改为顶部对齐，与首页保持一致
          alignItems: 'center',
          gap: '15px', // 与首页保持一致
          height: '400px', // 增加高度，与首页保持一致
          overflow: 'hidden',
          zIndex: 200, // 提高z-index确保显示在视频上方
          pointerEvents: 'auto', // 确保点击事件正常工作
          touchAction: 'none', // 防止触摸事件被阻止
          paddingTop: '20px' // 添加顶部间距，与首页保持一致
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
              maxHeight: '280px' // 与首页保持一致
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
                        e.preventDefault();
                        e.stopPropagation();
                        handleVideoCategoryClick(category);
                      }}
                      onTouchStart={(e) => {
                        // 只处理单指触摸，双指触摸让给缩放处理
                        if (e.touches.length === 1) {
                          e.stopPropagation();
                        }
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
                  
                  {/* 录制按钮 - 在右侧和衣服图标垂直排列 */}
                  <div
                    onClick={isRecording ? handleStopRecord : handleStartRecord}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      marginTop: '8px'
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
                      backgroundColor: isRecording ? 'rgba(255, 119, 117, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      border: isRecording ? '2px solid #ff7875' : '2px solid #07c160'
                    }}>
                      <img 
                        src={shareIcon} 
                        alt={isRecording ? "结束录制" : "录制"} 
                        style={{
                          width: '30px',
                          height: '30px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    <div style={{
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                    }}>
                      {isRecording ? '结束录制' : '录制'}
                    </div>
                  </div>
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
                      maxHeight: '320px', // 与首页保持一致
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
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoClothesClick(clothes, index);
                        }}
                        onTouchStart={(e) => {
                          // 只处理单指触摸，双指触摸让给缩放处理
                          if (e.touches.length === 1) {
                            e.stopPropagation();
                          }
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
                      e.preventDefault();
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

            {/* 微信分享图标 - 已移除，现在用作录制按钮 */}
          </div>
      </div>

      {/* 底部控制区域 - 已移除，按钮现在在录制按钮旁边 */}

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

      {/* 双指缩放提示 - 只在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '20px',
          fontSize: '14px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ marginBottom: '8px' }}>🔍 双指缩放测试</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            在视频区域使用双指进行缩放操作
          </div>
        </div>
      )}

              {/* 录制时间显示 - 在离开舞台按钮上方居中 */}
            {isRecording && (
              <div style={{
                position: 'fixed',
                bottom: '90px', // 在离开舞台按钮上方30px
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '8px 16px',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                zIndex: 300
              }}>
                {Math.floor(recordTime / 60).toString().padStart(2, '0')}:{(recordTime % 60).toString().padStart(2, '0')}
              </div>
            )}
            
            {/* 离开舞台按钮 - 完全透明，在底部中间 */}
            {!showSelectionScreen && !showRecordUI && (
              <div style={{
                position: 'fixed',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 300
              }}>
                <button
                  onClick={async () => {
                    try {
                      console.log('🚪 用户点击离开舞台按钮');
                      
                      // 断开WebSocket连接
                      if (webSocketService) {
                        webSocketService.disconnect();
                        console.log('✅ WebSocket连接已断开');
                      }
                      
                      // 断开RTC连接
                      if (rtcVideoService) {
                        try {
                          await rtcVideoService.leaveRoom();
                          rtcVideoService.destroy();
                          console.log('✅ RTC连接已断开');
                        } catch (error) {
                          console.warn('⚠️ RTC断开时出现警告:', error);
                        }
                      }
                      
                      // 断开试衣服务
                      if (tryonService) {
                        tryonService.disconnect();
                        console.log('✅ 试衣服务已断开');
                      }
                      
                      // 清理录制相关资源
                      if (mediaRecorderRef.current) {
                        if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
                          mediaRecorderRef.current.stop();
                        }
                        mediaRecorderRef.current = null;
                      }
                      
                      // 清理状态
                      setIsRecording(false);
                      setIsRecordPaused(false);
                      setRecordedChunks([]);
                      setRecordedBlob(null);
                      setShowRecordUI(false);
                      setShowSelectionScreen(true);
                      setHasLeftStage(true);
                      
                      console.log('✅ 所有资源已清理，准备返回首页');
                      
                      // 返回首页
                      navigate('/');
                      
                    } catch (error) {
                      console.error('❌ 离开舞台时发生错误:', error);
                      // 即使出错也返回首页
                      navigate('/');
                    }
                  }}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '25px',
                    padding: '12px 30px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    backdropFilter: 'blur(5px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  离开舞台
                </button>
              </div>
            )}

              {/* 录制结果浮层 - 只显示视频效果 */}
        {showRecordUI && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pointerEvents: 'auto'
          }}>
            {/* 主要内容区域 - 视频预览 */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            }}>
              {/* 视频预览区域 - 使用实际录制的视频帧 */}
              <div style={{
                width: '100%',
                maxWidth: '400px',
                height: '600px',
                backgroundColor: '#007AFF',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '20px'
              }}>
                {/* 如果有录制的视频，显示视频预览 */}
                {recordedBlob && (
                  <video
                    src={URL.createObjectURL(recordedBlob)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '20px'
                    }}
                    onLoadedData={(e) => {
                      // 设置视频到某一帧（比如第1秒）
                      const video = e.target as HTMLVideoElement;
                      video.currentTime = 1;
                    }}
                    onError={(e) => {
                      console.error('❌ 视频预览加载失败:', e);
                    }}
                    preload="metadata"
                    muted
                  />
                )}
                
                {/* 播放按钮覆盖层 */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  color: '#007AFF',
                  zIndex: 10
                }}>
                  ▶
                </div>
                
                {/* 视频时长显示 */}
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  zIndex: 10
                }}>
                  00:05/00:21
                </div>
              </div>

              {/* 视频时间轴 */}
              <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '10px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '5px',
                  overflowX: 'auto'
                }}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} style={{
                      width: '30px',
                      height: '40px',
                      backgroundColor: '#52c41a',
                      borderRadius: '4px',
                      flexShrink: 0
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 30px 30px 30px',
              backgroundColor: 'rgba(0,0,0,0.9)'
            }}>
              {/* 左上返回按钮 */}
              <button
                onClick={handleExitRecordUI}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ←
              </button>

              {/* 左下存草稿 */}
              <button
                onClick={handleSaveDraft}
                style={{
                  background: '#fff',
                  color: '#333',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                disabled={!recordedBlob}
              >
                📄 存草稿
              </button>

              {/* 中间仅分享 */}
              <button
                onClick={handleShareOnly}
                style={{
                  background: '#07c160',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                disabled={!recordedBlob}
              >
                📤 仅分享
              </button>
            </div>

            {/* 离开舞台按钮 */}
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000
            }}>
              <button
                onClick={async () => {
                  try {
                    console.log('🚪 用户点击离开舞台按钮');
                    
                    // 断开WebSocket连接
                    if (webSocketService) {
                      webSocketService.disconnect();
                      console.log('✅ WebSocket连接已断开');
                    }
                    
                    // 断开RTC连接
                    if (rtcVideoService) {
                      try {
                        await rtcVideoService.leaveRoom();
                        rtcVideoService.destroy();
                        console.log('✅ RTC连接已断开');
                      } catch (error) {
                        console.warn('⚠️ RTC断开时出现警告:', error);
                      }
                    }
                    
                    // 断开试衣服务
                    if (tryonService) {
                      tryonService.disconnect();
                      console.log('✅ 试衣服务已断开');
                    }
                    
                    // 清理录制相关资源
                    if (mediaRecorderRef.current) {
                      if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
                        mediaRecorderRef.current.stop();
                      }
                      mediaRecorderRef.current = null;
                    }
                    
                    // 清理状态
                    setIsRecording(false);
                    setIsRecordPaused(false);
                    setRecordedChunks([]);
                    setRecordedBlob(null);
                    setShowRecordUI(false);
                    setShowSelectionScreen(true);
                    setHasLeftStage(true);
                    
                    console.log('✅ 所有资源已清理，准备返回首页');
                    
                    // 返回首页
                    navigate('/');
                    
                  } catch (error) {
                    console.error('❌ 离开舞台时发生错误:', error);
                    // 即使出错也返回首页
                    navigate('/');
                  }
                }}
                style={{
                  backgroundColor: '#ff4d4f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 30px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 77, 79, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff7875';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff4d4f';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                🚪 离开舞台
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default Home; 