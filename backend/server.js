const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 5002;

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // 允许前端应用的来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false // 不需要凭证
}));
app.use(express.json());
app.use(morgan('dev'));

// 确保data目录存在
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// 数据文件路径
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HEALTH_DATA_FILE = path.join(DATA_DIR, 'health_data.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profiles.json');

// 初始化数据文件
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(HEALTH_DATA_FILE)) {
  fs.writeFileSync(HEALTH_DATA_FILE, JSON.stringify([]));
}
if (!fs.existsSync(PROFILE_FILE)) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify([]));
}

// 辅助函数: 读取文件内容
const readDataFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
};

// 辅助函数: 写入文件内容
const writeDataFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    return false;
  }
};

// JWT密钥
const JWT_SECRET = 'xiaomi-health-tracker-secret-key';

// 中间件: 验证JWT令牌
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供授权令牌' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '令牌无效或已过期' });
    }
    req.user = user;
    next();
  });
};

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 基本验证
    if (!username || !email || !password) {
      return res.status(400).json({ message: '所有字段都是必需的' });
    }
    
    // 读取现有用户
    const users = readDataFile(USERS_FILE);
    
    // 检查邮箱是否已存在
    if (users.some(user => user.email === email)) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }
    
    // 密码哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 创建新用户
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    // 添加新用户并保存
    users.push(newUser);
    writeDataFile(USERS_FILE, users);
    
    // 创建并返回JWT令牌
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 基本验证
    if (!email || !password) {
      return res.status(400).json({ message: '请提供邮箱和密码' });
    }
    
    // 读取用户
    const users = readDataFile(USERS_FILE);
    
    // 查找用户
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }
    
    // 创建并返回JWT令牌
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户个人资料
app.get('/api/profile', authenticateToken, (req, res) => {
  try {
    const profiles = readDataFile(PROFILE_FILE);
    const profile = profiles.find(profile => profile.userId === req.user.id);
    
    if (!profile) {
      return res.status(404).json({ message: '未找到个人资料' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('获取个人资料错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建或更新用户个人资料
app.post('/api/profile', authenticateToken, (req, res) => {
  try {
    const profiles = readDataFile(PROFILE_FILE);
    const profileData = req.body;
    
    const existingProfileIndex = profiles.findIndex(profile => profile.userId === req.user.id);
    
    if (existingProfileIndex !== -1) {
      // 更新现有个人资料
      profiles[existingProfileIndex] = {
        ...profiles[existingProfileIndex],
        ...profileData,
        userId: req.user.id,
        updatedAt: new Date().toISOString()
      };
    } else {
      // 创建新个人资料
      profiles.push({
        userId: req.user.id,
        ...profileData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    writeDataFile(PROFILE_FILE, profiles);
    
    res.status(200).json({ message: '个人资料已保存' });
  } catch (error) {
    console.error('保存个人资料错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户的健康数据
app.get('/api/health', authenticateToken, (req, res) => {
  try {
    const healthData = readDataFile(HEALTH_DATA_FILE);
    const userHealthData = healthData.filter(data => data.userId === req.user.id);
    
    res.json(userHealthData);
  } catch (error) {
    console.error('获取健康数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户的最新健康数据
app.get('/api/health/latest', authenticateToken, (req, res) => {
  try {
    const healthData = readDataFile(HEALTH_DATA_FILE);
    const userHealthData = healthData.filter(data => data.userId === req.user.id);
    
    if (userHealthData.length === 0) {
      return res.status(404).json({ message: '未找到健康数据' });
    }
    
    // 按日期排序，获取最新记录
    const sortedData = userHealthData.sort((a, b) => 
      new Date(b.measuredAt) - new Date(a.measuredAt)
    );
    
    res.json(sortedData[0]);
  } catch (error) {
    console.error('获取最新健康数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加健康数据
app.post('/api/health', authenticateToken, (req, res) => {
  try {
    const healthData = readDataFile(HEALTH_DATA_FILE);
    const newData = req.body;
    
    // 添加用户ID和时间戳
    const healthRecord = {
      id: Date.now().toString(),
      userId: req.user.id,
      ...newData,
      measuredAt: newData.measuredAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    healthData.push(healthRecord);
    writeDataFile(HEALTH_DATA_FILE, healthData);
    
    res.status(201).json({ message: '健康数据已添加', record: healthRecord });
  } catch (error) {
    console.error('添加健康数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除健康数据
app.delete('/api/health/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    let healthData = readDataFile(HEALTH_DATA_FILE);
    
    // 确保只能删除自己的数据
    const recordIndex = healthData.findIndex(
      record => record.id === id && record.userId === req.user.id
    );
    
    if (recordIndex === -1) {
      return res.status(404).json({ message: '未找到记录或无权删除' });
    }
    
    // 移除记录
    healthData.splice(recordIndex, 1);
    writeDataFile(HEALTH_DATA_FILE, healthData);
    
    res.json({ message: '记录已删除' });
  } catch (error) {
    console.error('删除健康数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取健康洞察
app.get('/api/insights', authenticateToken, (req, res) => {
  try {
    const healthData = readDataFile(HEALTH_DATA_FILE);
    const userHealthData = healthData.filter(data => data.userId === req.user.id);
    
    if (userHealthData.length === 0) {
      return res.status(404).json({ message: '没有足够的数据生成洞察' });
    }
    
    // 排序健康数据（从新到旧）
    const sortedData = userHealthData.sort((a, b) => 
      new Date(b.measuredAt) - new Date(a.measuredAt)
    );
    
    // 处理查询参数
    const timeRange = req.query.time_range || 'month';
    const metric = req.query.metric || 'weight';
    
    // 过滤出指定时间范围内的数据
    const now = new Date();
    let timeFilter;
    
    switch(timeRange) {
      case 'week':
        timeFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        timeFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'three_months':
        timeFilter = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'six_months':
        timeFilter = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case 'year':
        timeFilter = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        timeFilter = new Date(0); // 所有数据
    }
    
    const filteredData = sortedData.filter(item => 
      new Date(item.measuredAt) >= timeFilter
    );
    
    if (filteredData.length === 0) {
      return res.status(404).json({ message: '所选时间范围内没有数据' });
    }
    
    // 准备时间线数据
    const timeline = filteredData.map(item => ({
      date: item.measuredAt,
      [metric]: item[metric]
    }));
    
    // 计算当前和变化
    const current = filteredData[0];
    let change = {};
    
    if (filteredData.length > 1) {
      const oldest = filteredData[filteredData.length - 1];
      change[metric] = current[metric] - oldest[metric];
    }
    
    // 计算统计信息
    const values = filteredData.map(item => item[metric]).filter(val => val !== undefined);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // 查找最大值和最小值的日期
    const maxIndex = filteredData.findIndex(item => item[metric] === max);
    const minIndex = filteredData.findIndex(item => item[metric] === min);
    
    const maxDate = {};
    const minDate = {};
    
    maxDate[metric] = filteredData[maxIndex].measuredAt;
    minDate[metric] = filteredData[minIndex].measuredAt;
    
    // 模拟一些分析洞察
    const insights = [];
    
    if (change[metric] > 0 && metric === 'weight') {
      insights.push({
        type: 'negative',
        title: '体重增加趋势',
        message: `在过去的${timeRange === 'week' ? '一周' : '一段时间'}里，您的体重增加了${change[metric].toFixed(1)}kg。考虑调整饮食和增加运动量。`
      });
    } else if (change[metric] < 0 && metric === 'weight') {
      insights.push({
        type: 'positive',
        title: '体重下降趋势',
        message: `在过去的${timeRange === 'week' ? '一周' : '一段时间'}里，您的体重减少了${Math.abs(change[metric]).toFixed(1)}kg。继续保持健康的生活方式！`
      });
    }
    
    if (metric === 'weight' && filteredData.length >= 5) {
      const variance = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
      );
      
      if (variance > 1) {
        insights.push({
          type: 'warning',
          title: '体重波动较大',
          message: '您的体重波动幅度较大，建议保持更规律的生活习惯和饮食模式。'
        });
      } else {
        insights.push({
          type: 'positive',
          title: '体重保持稳定',
          message: '您的体重保持相对稳定，这是良好健康管理的表现。'
        });
      }
    }
    
    // 返回洞察数据
    res.json({
      timeline,
      current: current,
      change,
      stats: {
        count: filteredData.length,
        avg: { [metric]: avg },
        max: { [metric]: max },
        min: { [metric]: min },
        max_date: maxDate,
        min_date: minDate
      },
      insights
    });
  } catch (error) {
    console.error('获取健康洞察错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取体重预测
app.post('/api/predict/weight', authenticateToken, (req, res) => {
  try {
    const { 
      diet_intensity, 
      exercise_intensity, 
      prediction_mode, 
      target_date, 
      target_weight 
    } = req.body;
    
    // 模拟预测计算
    const healthData = readDataFile(HEALTH_DATA_FILE);
    const userHealthData = healthData.filter(
      data => data.userId === req.user.id && data.weight
    );
    
    if (userHealthData.length === 0) {
      return res.status(404).json({ message: '没有足够的体重数据进行预测' });
    }
    
    // 获取当前体重（最新记录）
    const sortedData = userHealthData.sort((a, b) => 
      new Date(b.measuredAt) - new Date(a.measuredAt)
    );
    const currentWeight = sortedData[0].weight;
    
    // 基于强度计算每日体重变化率
    const baseWeightChangeRate = 0.1; // 基础每日变化率（kg）
    const dietFactor = (diet_intensity / 3) * 0.7; // 饮食影响因子
    const exerciseFactor = (exercise_intensity / 3) * 0.4; // 运动影响因子
    const dailyWeightChangeRate = baseWeightChangeRate * (dietFactor + exerciseFactor);
    
    let targetDate, targetWeight, daysRequired, timeline, milestones;
    
    if (prediction_mode === 'weight') {
      // 计算到达目标日期时的预测体重
      const today = new Date();
      const endDate = new Date(target_date);
      const daysDifference = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysDifference <= 0) {
        return res.status(400).json({ message: '目标日期必须在将来' });
      }
      
      // 模拟体重变化（假设减重目标）
      const totalWeightChange = dailyWeightChangeRate * daysDifference;
      targetWeight = currentWeight - totalWeightChange;
      daysRequired = daysDifference;
      
      // 生成时间线数据
      timeline = [];
      let currentDate = new Date();
      let weight = currentWeight;
      
      for (let i = 0; i <= daysDifference; i += Math.ceil(daysDifference / 10)) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);
        
        timeline.push({
          date: date.toISOString().split('T')[0],
          weight: weight - (dailyWeightChangeRate * i)
        });
      }
      
      // 添加最终日期点
      timeline.push({
        date: endDate.toISOString().split('T')[0],
        weight: targetWeight
      });
    } else {
      // 计算达到目标体重需要的天数
      const weightDifference = currentWeight - target_weight;
      daysRequired = Math.ceil(Math.abs(weightDifference) / dailyWeightChangeRate);
      
      if (weightDifference === 0) {
        return res.status(400).json({ message: '目标体重与当前体重相同' });
      }
      
      // 计算预计达成日期
      const today = new Date();
      const predictedDate = new Date(today);
      predictedDate.setDate(today.getDate() + daysRequired);
      targetDate = predictedDate.toISOString().split('T')[0];
      
      // 生成时间线数据
      timeline = [];
      let currentDate = new Date();
      
      for (let i = 0; i <= daysRequired; i += Math.ceil(daysRequired / 10)) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);
        
        const weightDelta = weightDifference > 0 
          ? -dailyWeightChangeRate * i 
          : dailyWeightChangeRate * i;
        
        timeline.push({
          date: date.toISOString().split('T')[0],
          weight: currentWeight + weightDelta
        });
      }
      
      // 添加最终日期点
      timeline.push({
        date: targetDate,
        weight: parseFloat(target_weight)
      });
    }
    
    // 生成里程碑
    milestones = [];
    
    // 开始里程碑
    milestones.push({
      date: new Date().toISOString().split('T')[0],
      title: '开始预测',
      description: `起始体重: ${currentWeight.toFixed(1)} kg`,
      significance: 'high'
    });
    
    // 中间里程碑
    if (daysRequired > 14) {
      const midpoint = Math.floor(daysRequired / 2);
      const midDate = new Date();
      midDate.setDate(midDate.getDate() + midpoint);
      
      const midWeight = prediction_mode === 'weight'
        ? currentWeight - (dailyWeightChangeRate * midpoint)
        : currentWeight - (weightDifference / 2);
      
      milestones.push({
        date: midDate.toISOString().split('T')[0],
        title: '中期检查点',
        description: `预计体重: ${midWeight.toFixed(1)} kg`,
        significance: 'medium'
      });
    }
    
    // 结束里程碑
    milestones.push({
      date: prediction_mode === 'weight' ? target_date : targetDate,
      title: prediction_mode === 'weight' ? '目标日期' : '预计达成日期',
      description: `预计体重: ${(prediction_mode === 'weight' ? targetWeight : target_weight).toFixed(1)} kg`,
      significance: 'high'
    });
    
    // 评估可行性
    let feasibility = 'medium';
    let analysis = '';
    
    if (dailyWeightChangeRate > 0.3) {
      feasibility = 'low';
      analysis = '您设定的目标可能过于激进。健康的体重变化速率通常在每周0.5-1kg之间。请考虑调整目标或延长时间。';
    } else if (dailyWeightChangeRate < 0.1) {
      feasibility = 'high';
      analysis = '您的目标设定非常合理，可以通过保持健康的饮食和适度的运动来实现。';
    } else {
      analysis = '您的目标挑战性适中，通过坚持饮食计划和规律运动可以实现。';
    }
    
    // 返回预测结果
    res.json({
      prediction_mode,
      start_weight: currentWeight,
      target_weight: prediction_mode === 'weight' ? targetWeight : parseFloat(target_weight),
      target_date: prediction_mode === 'weight' ? target_date : targetDate,
      days_required: daysRequired,
      daily_change_rate: dailyWeightChangeRate,
      timeline,
      milestones,
      feasibility,
      analysis
    });
  } catch (error) {
    console.error('体重预测错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取推荐
app.get('/api/recommendations', authenticateToken, (req, res) => {
  try {
    // 模拟推荐数据
    const recommendations = [
      {
        id: '1',
        title: '每天30分钟有氧运动',
        description: '适量的有氧运动可以帮助控制体重，改善心肺功能和整体健康状况。',
        type: 'exercise',
        intensity: 'medium',
        benefits: [
          '增强心肺功能',
          '帮助减重',
          '改善睡眠质量'
        ],
        image_url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c',
        rating: 4.5,
        link: 'https://www.health.harvard.edu/staying-healthy/the-importance-of-exercise-when-you-have-diabetes'
      },
      {
        id: '2',
        title: '减少精制碳水化合物摄入',
        description: '减少白面包、白米饭和甜食等精制碳水化合物的摄入，选择全谷物和复合碳水化合物。',
        type: 'diet',
        intensity: 'medium',
        benefits: [
          '稳定血糖水平',
          '增加饱腹感',
          '改善消化健康'
        ],
        image_url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352',
        rating: 4.0
      },
      {
        id: '3',
        title: '每天喝足够的水',
        description: '保持充分水分可以帮助新陈代谢，控制食欲，并支持身体的各种功能。',
        type: 'lifestyle',
        intensity: 'low',
        benefits: [
          '促进新陈代谢',
          '帮助控制食欲',
          '改善皮肤状况'
        ],
        image_url: 'https://images.unsplash.com/photo-1502035458144-454aa46b5230',
        rating: 5.0
      },
      {
        id: '4',
        title: '高强度间歇训练 (HIIT)',
        description: '短时间的高强度运动与休息间隔交替进行，能在较短时间内获得显著的健身效果。',
        type: 'exercise',
        intensity: 'high',
        benefits: [
          '高效燃烧卡路里',
          '提高代谢率',
          '节省锻炼时间'
        ],
        image_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798',
        rating: 4.2
      },
      {
        id: '5',
        title: '地中海饮食模式',
        description: '以蔬菜、水果、豆类、全谷物、橄榄油和适量的鱼类为主的饮食模式，被认为是最健康的饮食方式之一。',
        type: 'diet',
        intensity: 'medium',
        benefits: [
          '改善心脏健康',
          '提供均衡营养',
          '降低慢性疾病风险'
        ],
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        rating: 4.8
      },
      {
        id: '6',
        title: '改善睡眠质量',
        description: '保持规律的睡眠时间，创造良好的睡眠环境，避免睡前使用电子设备。',
        type: 'lifestyle',
        intensity: 'low',
        benefits: [
          '促进身体恢复',
          '改善情绪和认知功能',
          '帮助控制体重'
        ],
        image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55',
        rating: 4.5
      }
    ];
    
    res.json(recommendations);
  } catch (error) {
    console.error('获取推荐错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 服务器状态检查
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 未找到路由处理
app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

// 开始监听端口
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
}); 