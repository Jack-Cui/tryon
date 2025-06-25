#!/bin/bash

echo "开始部署React应用到nginx..."

# 1. 安装依赖
echo "安装依赖..."
npm install

# 2. 构建项目
echo "构建项目..."
npm run build

# 3. 检查构建是否成功
if [ ! -d "build" ]; then
    echo "构建失败，build目录不存在"
    exit 1
fi

echo "构建成功！"

# 4. 复制nginx配置到系统目录（需要sudo权限）
echo "配置nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/tryon
sudo ln -sf /etc/nginx/sites-available/tryon /etc/nginx/sites-enabled/

# 5. 测试nginx配置
echo "测试nginx配置..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "nginx配置测试通过"
    # 6. 重启nginx
    echo "重启nginx..."
    sudo systemctl reload nginx
    echo "部署完成！"
else
    echo "nginx配置测试失败，请检查配置文件"
    exit 1
fi 