const mongoose = require('mongoose');

const HealthDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    required: true,
    enum: ['xiaomi', 'manual', 'other'],
    default: 'manual'
  },
  dataType: {
    type: String,
    required: true,
    enum: [
      'weight', 
      'bodyfat', 
      'bmi', 
      'muscle', 
      'water', 
      'bone', 
      'visceral_fat', 
      'basal_metabolism',
      'heart_rate',
      'steps',
      'sleep',
      'activity'
    ]
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Create compound index for faster queries and uniqueness
HealthDataSchema.index({ userId: 1, dataType: 1, timestamp: 1, source: 1 }, { unique: true });

// Index for common queries
HealthDataSchema.index({ userId: 1, dataType: 1, timestamp: -1 });

module.exports = mongoose.model('HealthData', HealthDataSchema); 