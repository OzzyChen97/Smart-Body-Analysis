const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Setting = require('../models/Setting');

/**
 * @route GET /api/settings/xiaomi
 * @desc Get Xiaomi health settings
 * @access Private
 */
router.get('/xiaomi', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let settings = await Setting.findOne({ userId, type: 'xiaomi' });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Setting({
        userId,
        type: 'xiaomi',
        autoSync: false,
        syncFrequency: 'daily',
        syncDataTypes: ['weight', 'bodyfat', 'bmi'],
        lastSync: null
      });
      
      await settings.save();
    }
    
    res.json({
      authToken: settings.authToken || '',
      autoSync: settings.autoSync,
      syncFrequency: settings.syncFrequency,
      syncDataTypes: settings.syncDataTypes,
      lastSync: settings.lastSync
    });
  } catch (error) {
    console.error('获取小米设置时出错:', error);
    res.status(500).json({ message: '获取设置时出错' });
  }
});

/**
 * @route POST /api/settings/xiaomi
 * @desc Save Xiaomi health settings
 * @access Private
 */
router.post('/xiaomi', [
  auth,
  body('authToken').notEmpty().withMessage('授权令牌是必需的'),
  body('autoSync').isBoolean().withMessage('自动同步必须是布尔值'),
  body('syncFrequency').isIn(['hourly', 'daily', 'weekly']).withMessage('无效的同步频率'),
  body('syncDataTypes').isArray().withMessage('数据类型必须是数组')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const { authToken, autoSync, syncFrequency, syncDataTypes } = req.body;
    
    let settings = await Setting.findOne({ userId, type: 'xiaomi' });
    
    if (settings) {
      // Update existing settings
      settings.authToken = authToken;
      settings.autoSync = autoSync;
      settings.syncFrequency = syncFrequency;
      settings.syncDataTypes = syncDataTypes;
    } else {
      // Create new settings
      settings = new Setting({
        userId,
        type: 'xiaomi',
        authToken,
        autoSync,
        syncFrequency,
        syncDataTypes
      });
    }
    
    await settings.save();
    
    res.json({
      message: '设置已成功保存',
      autoSync,
      syncFrequency,
      syncDataTypes
    });
  } catch (error) {
    console.error('保存小米设置时出错:', error);
    res.status(500).json({ message: '保存设置时出错' });
  }
});

/**
 * @route GET /api/settings/general
 * @desc Get general app settings
 * @access Private
 */
router.get('/general', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let settings = await Setting.findOne({ userId, type: 'general' });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Setting({
        userId,
        type: 'general',
        preferences: {
          theme: 'light',
          language: 'zh-CN',
          units: {
            weight: 'kg',
            height: 'cm'
          },
          dashboard: {
            widgets: ['weight', 'bodyfat', 'activity']
          }
        }
      });
      
      await settings.save();
    }
    
    res.json(settings.preferences);
  } catch (error) {
    console.error('获取通用设置时出错:', error);
    res.status(500).json({ message: '获取设置时出错' });
  }
});

/**
 * @route POST /api/settings/general
 * @desc Save general app settings
 * @access Private
 */
router.post('/general', [
  auth,
  body('preferences').isObject().withMessage('偏好设置必须是对象')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const { preferences } = req.body;
    
    let settings = await Setting.findOne({ userId, type: 'general' });
    
    if (settings) {
      // Update existing settings
      settings.preferences = preferences;
    } else {
      // Create new settings
      settings = new Setting({
        userId,
        type: 'general',
        preferences
      });
    }
    
    await settings.save();
    
    res.json({
      message: '设置已成功保存',
      preferences
    });
  } catch (error) {
    console.error('保存通用设置时出错:', error);
    res.status(500).json({ message: '保存设置时出错' });
  }
});

module.exports = router; 