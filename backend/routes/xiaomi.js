const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const xiaomiService = require('../services/xiaomiService');

/**
 * @route POST /api/xiaomi/test-connection
 * @desc Test connection to Xiaomi Health API
 * @access Private
 */
router.post('/test-connection', [
  auth,
  body('authToken').notEmpty().withMessage('授权令牌是必需的')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { authToken } = req.body;
    const testResult = await xiaomiService.testConnection(authToken);
    
    res.json(testResult);
  } catch (error) {
    console.error('测试小米API连接时出错:', error);
    res.status(500).json({ message: error.message || '测试连接时出错' });
  }
});

/**
 * @route POST /api/xiaomi/sync
 * @desc Sync data from Xiaomi Health API
 * @access Private
 */
router.post('/sync', [
  auth,
  body('authToken').notEmpty().withMessage('授权令牌是必需的'),
  body('dataTypes').isArray().withMessage('数据类型必须是数组')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { authToken, dataTypes, historical, startDate, endDate } = req.body;
    const userId = req.user.id;
    
    const syncResult = await xiaomiService.syncData({
      userId,
      authToken,
      dataTypes,
      historical,
      startDate,
      endDate
    });
    
    // Update last sync time in user settings
    await xiaomiService.updateLastSync(userId);
    
    res.json(syncResult);
  } catch (error) {
    console.error('同步小米健康数据时出错:', error);
    res.status(500).json({ message: error.message || '同步数据时出错' });
  }
});

/**
 * @route GET /api/xiaomi/data
 * @desc Get synced health data for the user
 * @access Private
 */
router.get('/data', [
  auth,
  // Optional query params for filtering
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate, limit } = req.query;
    
    const data = await xiaomiService.getUserData({
      userId,
      type,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100
    });
    
    res.json(data);
  } catch (error) {
    console.error('获取小米健康数据时出错:', error);
    res.status(500).json({ message: error.message || '获取数据时出错' });
  }
});

/**
 * @route DELETE /api/xiaomi/data
 * @desc Delete synced health data
 * @access Private
 */
router.delete('/data', [
  auth,
  // Can add validation for data to delete
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate, all } = req.body;
    
    await xiaomiService.deleteUserData({
      userId,
      type,
      startDate,
      endDate,
      all
    });
    
    res.json({ message: '数据已成功删除' });
  } catch (error) {
    console.error('删除小米健康数据时出错:', error);
    res.status(500).json({ message: error.message || '删除数据时出错' });
  }
});

module.exports = router; 