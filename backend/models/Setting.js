const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['xiaomi', 'general', 'notification'],
    default: 'general'
  },
  authToken: {
    type: String,
    default: ''
  },
  autoSync: {
    type: Boolean,
    default: false
  },
  syncFrequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    default: 'daily'
  },
  syncDataTypes: {
    type: [String],
    default: ['weight', 'bodyfat', 'bmi']
  },
  lastSync: {
    type: Date,
    default: null
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Create compound index for uniqueness
SettingSchema.index({ userId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Setting', SettingSchema); 