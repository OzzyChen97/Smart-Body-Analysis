const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const HealthData = require('../models/HealthData');

/**
 * @route POST /api/health-data
 * @desc Add new health data entry
 * @access Private
 */
router.post('/', [
  auth,
  body('dataType').notEmpty().withMessage('数据类型是必需的'),
  body('value').isNumeric().withMessage('数值必须是数字'),
  body('timestamp').isISO8601().withMessage('时间戳必须是有效的日期时间格式')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { dataType, value, timestamp, note, source = 'manual' } = req.body;
    const userId = req.user.id;
    
    // Check if this exact data point already exists
    const existingData = await HealthData.findOne({
      userId,
      dataType,
      timestamp: new Date(timestamp),
      source
    });
    
    if (existingData) {
      // Update if exists
      existingData.value = value;
      if (note) existingData.metadata.note = note;
      await existingData.save();
      
      return res.json({
        message: '健康数据已更新',
        data: existingData
      });
    }
    
    // Create new health data record
    const healthData = new HealthData({
      userId,
      dataType,
      value,
      timestamp: new Date(timestamp),
      source,
      metadata: note ? { note } : {}
    });
    
    await healthData.save();
    
    res.status(201).json({
      message: '健康数据已保存',
      data: healthData
    });
  } catch (error) {
    console.error('保存健康数据时出错:', error);
    res.status(500).json({ message: '保存健康数据时出错' });
  }
});

/**
 * @route GET /api/health-data
 * @desc Get health data for the user
 * @access Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate, limit = 100, source } = req.query;
    
    const query = { userId };
    
    if (type) {
      query.dataType = type;
    }
    
    if (source) {
      query.source = source;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    const data = await HealthData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json(data);
  } catch (error) {
    console.error('获取健康数据时出错:', error);
    res.status(500).json({ message: '获取健康数据时出错' });
  }
});

/**
 * @route GET /api/health-data/stats
 * @desc Get statistics for health data
 * @access Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, period = '30d' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const query = {
      userId,
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (type) {
      query.dataType = type;
    }
    
    const data = await HealthData.find(query).sort({ timestamp: 1 });
    
    // Calculate statistics
    let stats = {};
    
    if (data.length > 0) {
      if (type) {
        // Single type stats
        const values = data.map(item => item.value);
        stats = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          first: data[0].value,
          last: data[data.length - 1].value,
          change: data[data.length - 1].value - data[0].value,
          changePercent: ((data[data.length - 1].value - data[0].value) / data[0].value) * 100
        };
      } else {
        // Stats for each type
        const typeGroups = data.reduce((groups, item) => {
          if (!groups[item.dataType]) {
            groups[item.dataType] = [];
          }
          groups[item.dataType].push(item);
          return groups;
        }, {});
        
        for (const [type, items] of Object.entries(typeGroups)) {
          if (items.length > 0) {
            const values = items.map(item => item.value);
            stats[type] = {
              count: values.length,
              min: Math.min(...values),
              max: Math.max(...values),
              avg: values.reduce((sum, val) => sum + val, 0) / values.length,
              first: items[0].value,
              last: items[items.length - 1].value,
              change: items[items.length - 1].value - items[0].value,
              changePercent: ((items[items.length - 1].value - items[0].value) / items[0].value) * 100
            };
          }
        }
      }
    }
    
    res.json({
      period,
      startDate,
      endDate,
      stats
    });
  } catch (error) {
    console.error('获取健康数据统计时出错:', error);
    res.status(500).json({ message: '获取健康数据统计时出错' });
  }
});

/**
 * @route DELETE /api/health-data/:id
 * @desc Delete a health data entry
 * @access Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const healthDataId = req.params.id;
    
    const healthData = await HealthData.findById(healthDataId);
    
    if (!healthData) {
      return res.status(404).json({ message: '健康数据记录未找到' });
    }
    
    // Check if this health data belongs to the user
    if (healthData.userId.toString() !== userId) {
      return res.status(403).json({ message: '无权删除此记录' });
    }
    
    await healthData.remove();
    
    res.json({ message: '健康数据记录已删除' });
  } catch (error) {
    console.error('删除健康数据时出错:', error);
    res.status(500).json({ message: '删除健康数据时出错' });
  }
});

module.exports = router; 