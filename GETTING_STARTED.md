# Mi Health Tracker 入门指南

本指南将帮助您设置和运行 Mi Health Tracker 项目。

## 项目概述

Mi Health Tracker 是一个健康监控系统，集成了小米智能体脂秤数据和用户输入的健康指标。它提供数据可视化、趋势分析和 AI 驱动的健康建议。

## 系统要求

- Python 3.8+
- Node.js 14+
- MySQL
- MongoDB
- Docker (可选)

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/mi-health-tracker.git
cd mi-health-tracker
```

### 2. 设置后端

```bash
# 创建并激活虚拟环境
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接和其他配置
```

### 3. 设置数据库

#### MySQL 设置

```bash
# 创建 MySQL 数据库
mysql -u root -p
```

在 MySQL 提示符下：

```sql
CREATE DATABASE mi_health_tracker;
CREATE USER 'mi_health'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON mi_health_tracker.* TO 'mi_health'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 初始化数据库

```bash
# 在 backend 目录中
python init_db.py
```

### 4. 设置前端

```bash
cd ../frontend
npm install
```

## 运行应用

### 方法 1：分别运行后端和前端

#### 运行后端

```bash
# 在 backend 目录中，确保虚拟环境已激活
flask run
```

#### 运行前端

```bash
# 在 frontend 目录中
npm start
```

### 方法 2：使用 Docker Compose

如果您已安装 Docker 和 Docker Compose，可以使用以下命令一键启动整个应用：

```bash
docker-compose up -d
```

## 访问应用

- 前端：http://localhost:3000
- 后端 API：http://localhost:5000

## 默认账户

初始化数据库时会创建一个示例用户：

- 邮箱：demo@example.com
- 密码：Password123

## 连接小米智能体脂秤

1. 登录应用
2. 导航到"小米设置"页面
3. 点击"扫描网络"查找设备，或手动输入设备 Token 和 IP 地址
4. 点击"连接设备"

## 项目结构

```
mi-health-tracker/
├── backend/              # Flask 后端
│   ├── app.py            # 主应用入口
│   ├── config.py         # 配置设置
│   ├── models/           # 数据库模型
│   ├── routes/           # API 端点
│   ├── services/         # 业务逻辑服务
│   ├── ml/               # 机器学习模型
│   └── utils/            # 工具函数
├── frontend/             # React 前端
│   ├── public/           # 静态文件
│   └── src/              # 源代码
│       ├── components/   # React 组件
│       ├── pages/        # 页面布局
│       ├── services/     # API 服务
│       └── utils/        # 工具函数
└── docker/               # Docker 配置
```

## 常见问题

### 数据库连接错误

确保您的 MySQL 和 MongoDB 服务正在运行，并且连接信息在 `.env` 文件中正确配置。

### 小米设备连接问题

- 确保小米设备和您的计算机在同一网络中
- 验证设备 Token 和 IP 地址是否正确
- 检查设备是否已开启并处于可发现状态

### API 请求失败

如果前端无法连接到后端 API，请检查：
- 后端服务是否正在运行
- CORS 设置是否正确
- 网络连接是否正常

## 下一步

- 探索健康数据仪表盘
- 添加手动健康记录
- 查看 AI 生成的健康建议和预测
- 设置定期数据同步

## 支持

如有问题或需要帮助，请提交 GitHub Issue 或联系项目维护者。 