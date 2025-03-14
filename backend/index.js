// Import routes
const xiaomiRoutes = require('./routes/xiaomi');
const settingsRoutes = require('./routes/settings');
const healthDataRoutes = require('./routes/healthData');

// Define Routes
app.use('/api/xiaomi', xiaomiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/health-data', healthDataRoutes); 