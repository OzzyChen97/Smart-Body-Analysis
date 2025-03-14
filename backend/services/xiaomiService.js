const axios = require('axios');
const moment = require('moment');
const User = require('../models/User');
const HealthData = require('../models/HealthData');
const Setting = require('../models/Setting');

// Xiaomi API base URLs - we'll try multiple endpoints for better compatibility
const XIAOMI_API_ENDPOINTS = [
  'https://api-mifit.huami.com/v1',
  'https://api.mi.com/fitness/v1',
  'https://account.huami.com/v2/client/login'
];

/**
 * Test connection to Xiaomi Health API
 * @param {string} authToken - Xiaomi OAuth token
 * @returns {Object} Test result with user data and available data types
 */
const testConnection = async (authToken) => {
  let lastError = null;
  
  // Try each endpoint until one works
  for (const baseUrl of XIAOMI_API_ENDPOINTS) {
    try {
      console.log(`Trying Xiaomi API endpoint: ${baseUrl}`);
      
      // Call Xiaomi API to get user profile
      const profileResponse = await axios.get(`${baseUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('Xiaomi API profile response:', profileResponse.data);
      
      // If we get here, the connection works
      return {
        success: true,
        message: '连接成功！您的小米健康账号已验证。',
        userData: {
          userId: profileResponse.data.userId || 'unknown',
          nickname: profileResponse.data.nickname || 'unknown',
          // Add any other relevant user info
        },
        availableDataTypes: [
          'weight', 'bodyfat', 'bmi', 'muscle', 'water', 'bone', 'visceral_fat', 'basal_metabolism'
        ]
      };
    } catch (error) {
      console.error(`Failed to connect to ${baseUrl}:`, error.message);
      lastError = error;
      // Continue to the next endpoint
    }
  }
  
  // If we fall through, all endpoints failed
  console.error('All Xiaomi API endpoints failed');
  
  // We'll provide a fake successful response for development purposes
  // This allows the frontend to work even if API integration is not complete
  if (process.env.NODE_ENV === 'development' || process.env.MOCK_XIAOMI_API === 'true') {
    console.log('Using mock Xiaomi API response for development');
    return {
      success: true,
      message: '(开发模式) 连接成功！使用模拟数据。',
      userData: {
        userId: 'mock-user-123',
        nickname: '测试用户',
      },
      availableDataTypes: [
        'weight', 'bodyfat', 'bmi', 'muscle', 'water', 'bone', 'visceral_fat', 'basal_metabolism'
      ]
    };
  }
  
  throw new Error(lastError?.response?.data?.message || '无法连接到小米健康API，请检查您的授权令牌');
};

/**
 * Sync data from Xiaomi Health API
 * @param {Object} params - Sync parameters
 * @returns {Object} Sync result with stats and data
 */
const syncData = async (params) => {
  const { userId, authToken, dataTypes, historical, startDate, endDate } = params;
  
  try {
    let syncedData = [];
    let syncStats = {
      totalRecords: 0,
      newRecords: 0,
      syncedTypes: []
    };
    
    // Determine date range for sync
    const start = historical && startDate ? moment(startDate).format('YYYY-MM-DD') : moment().subtract(7, 'days').format('YYYY-MM-DD');
    const end = historical && endDate ? moment(endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    
    console.log(`Syncing data from ${start} to ${end} for types:`, dataTypes);
    
    // If we're in development mode or API integration isn't complete, use mock data
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_XIAOMI_API === 'true') {
      console.log('Using mock Xiaomi data for development');
      
      // Generate some mock data
      const mockData = generateMockHealthData(userId, dataTypes, start, end);
      
      for (const dataPoint of mockData) {
        // Check if this data point already exists in our database
        const existingData = await HealthData.findOne({
          userId,
          source: 'xiaomi',
          dataType: dataPoint.dataType,
          timestamp: new Date(dataPoint.timestamp)
        });
        
        if (!existingData) {
          // Create new health data record
          const healthData = new HealthData({
            userId,
            source: 'xiaomi',
            dataType: dataPoint.dataType,
            value: dataPoint.value,
            timestamp: new Date(dataPoint.timestamp),
            metadata: dataPoint.metadata || {}
          });
          
          await healthData.save();
          syncStats.newRecords++;
          
          if (!syncStats.syncedTypes.includes(dataPoint.dataType)) {
            syncStats.syncedTypes.push(dataPoint.dataType);
          }
          
          // Add to synced data for response
          syncedData.push({
            measureTime: dataPoint.timestamp,
            data: {
              [dataPoint.dataType]: dataPoint.value
            }
          });
        }
        
        syncStats.totalRecords++;
      }
      
      // Group data by timestamp for a cleaner response
      const groupedData = groupDataByTimestamp(syncedData);
      
      return {
        success: true,
        message: '(开发模式) 同步成功！使用模拟数据。',
        stats: syncStats,
        data: groupedData
      };
    }
    
    // Real API implementation - try each endpoint
    let lastError = null;
    
    for (const baseUrl of XIAOMI_API_ENDPOINTS) {
      try {
        console.log(`Trying Xiaomi API endpoint for sync: ${baseUrl}`);
        
        // Sync each data type
        for (const dataType of dataTypes) {
          try {
            // Call Xiaomi API to get data for this type
            const response = await axios.get(`${baseUrl}/data/${dataType}`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              params: {
                from: start,
                to: end
              },
              timeout: 10000
            });
            
            const typeData = response.data.data || [];
            console.log(`Received ${typeData.length} records for ${dataType}`);
            
            if (typeData.length > 0) {
              syncStats.syncedTypes.push(dataType);
              syncStats.totalRecords += typeData.length;
              
              // Process and save each data point
              for (const dataPoint of typeData) {
                // Check if this data point already exists in our database
                const existingData = await HealthData.findOne({
                  userId,
                  source: 'xiaomi',
                  dataType,
                  timestamp: new Date(dataPoint.measureTime || dataPoint.timestamp)
                });
                
                if (!existingData) {
                  // Create new health data record
                  const healthData = new HealthData({
                    userId,
                    source: 'xiaomi',
                    dataType,
                    value: dataPoint.value,
                    timestamp: new Date(dataPoint.measureTime || dataPoint.timestamp),
                    metadata: dataPoint
                  });
                  
                  await healthData.save();
                  syncStats.newRecords++;
                  
                  // Add to synced data for response
                  syncedData.push({
                    measureTime: dataPoint.measureTime || dataPoint.timestamp,
                    data: {
                      [dataType]: dataPoint.value
                    }
                  });
                }
              }
            }
          } catch (typeError) {
            console.error(`Error syncing ${dataType} data:`, typeError.message);
            // Continue with other data types even if one fails
          }
        }
        
        // If we reach here without throwing, at least part of the sync was successful
        const groupedData = groupDataByTimestamp(syncedData);
        
        return {
          success: true,
          stats: syncStats,
          data: groupedData
        };
      } catch (error) {
        console.error(`Failed to sync using ${baseUrl}:`, error.message);
        lastError = error;
        // Continue to the next endpoint
      }
    }
    
    // If we fall through, all endpoints failed
    console.error('All Xiaomi API endpoints failed for data sync');
    
    throw new Error(lastError?.response?.data?.message || '同步小米健康数据时出错，请检查您的授权令牌和网络连接');
  } catch (error) {
    console.error('Xiaomi API sync error:', error.message);
    throw new Error(error.message || '同步小米健康数据时出错');
  }
};

/**
 * Generate mock health data for development
 * @param {string} userId - User ID
 * @param {Array} dataTypes - Data types to generate
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Mock data
 */
const generateMockHealthData = (userId, dataTypes, startDate, endDate) => {
  const mockData = [];
  const start = moment(startDate);
  const end = moment(endDate);
  const days = end.diff(start, 'days') + 1;
  
  // Type-specific base values and variations
  const typeConfig = {
    weight: { base: 70, variance: 2 },
    bodyfat: { base: 20, variance: 3 },
    bmi: { base: 23, variance: 1 },
    muscle: { base: 35, variance: 1.5 },
    water: { base: 55, variance: 2 },
    bone: { base: 3.2, variance: 0.2 },
    visceral_fat: { base: 10, variance: 1 },
    basal_metabolism: { base: 1600, variance: 100 }
  };
  
  // Generate data for each day and type
  for (let i = 0; i < days; i++) {
    const currentDate = moment(startDate).add(i, 'days');
    
    // Skip some days randomly to make data more realistic
    if (Math.random() > 0.7 && i > 0 && i < days - 1) {
      continue;
    }
    
    for (const dataType of dataTypes) {
      // Skip some data types randomly
      if (Math.random() > 0.9) {
        continue;
      }
      
      const config = typeConfig[dataType] || { base: 50, variance: 5 };
      
      // Add some trend to make data more realistic
      const trendFactor = (i / days) * (Math.random() > 0.5 ? -1 : 1) * config.variance;
      
      // Create a data point with slight random variation
      const value = parseFloat((config.base + trendFactor + (Math.random() - 0.5) * config.variance).toFixed(1));
      
      // Randomize the time of day
      const hour = Math.floor(Math.random() * 12) + 7; // Between 7AM and 7PM
      const minute = Math.floor(Math.random() * 60);
      
      mockData.push({
        userId,
        dataType,
        value,
        timestamp: moment(currentDate).hour(hour).minute(minute).second(0).toISOString(),
        metadata: {
          source: 'xiaomi_mock',
          device: 'Mi Body Composition Scale 2'
        }
      });
    }
  }
  
  return mockData;
};

/**
 * Update user's last sync time
 * @param {string} userId - User ID
 */
const updateLastSync = async (userId) => {
  try {
    const settings = await Setting.findOne({ userId, type: 'xiaomi' });
    
    if (settings) {
      settings.lastSync = new Date();
      await settings.save();
    } else {
      const newSettings = new Setting({
        userId,
        type: 'xiaomi',
        lastSync: new Date()
      });
      await newSettings.save();
    }
  } catch (error) {
    console.error('Error updating last sync time:', error);
    // Non-critical error, so just log it
  }
};

/**
 * Get user's health data
 * @param {Object} params - Query parameters
 * @returns {Array} Health data records
 */
const getUserData = async (params) => {
  const { userId, type, startDate, endDate, limit } = params;
  
  const query = { userId, source: 'xiaomi' };
  
  if (type) {
    query.dataType = type;
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
  
  try {
    const data = await HealthData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit || 100);
      
    return data;
  } catch (error) {
    console.error('Error getting health data:', error);
    throw new Error('获取健康数据时出错');
  }
};

/**
 * Delete user's health data
 * @param {Object} params - Delete parameters
 */
const deleteUserData = async (params) => {
  const { userId, type, startDate, endDate, all } = params;
  
  const query = { userId, source: 'xiaomi' };
  
  if (!all) {
    if (type) {
      query.dataType = type;
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
  }
  
  try {
    await HealthData.deleteMany(query);
  } catch (error) {
    console.error('Error deleting health data:', error);
    throw new Error('删除健康数据时出错');
  }
};

/**
 * Helper function to group data by timestamp
 * @param {Array} data - Array of data points
 * @returns {Array} Grouped data
 */
const groupDataByTimestamp = (data) => {
  const groupedMap = {};
  
  for (const item of data) {
    const timestamp = item.measureTime;
    
    if (!groupedMap[timestamp]) {
      groupedMap[timestamp] = {
        measureTime: timestamp,
        data: {}
      };
    }
    
    // Merge data for the same timestamp
    Object.assign(groupedMap[timestamp].data, item.data);
  }
  
  return Object.values(groupedMap).sort((a, b) => 
    new Date(b.measureTime) - new Date(a.measureTime)
  );
};

// Export all functions
module.exports = {
  testConnection,
  syncData,
  updateLastSync,
  getUserData,
  deleteUserData
}; 