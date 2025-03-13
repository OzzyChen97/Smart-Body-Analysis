# 🏃‍♀️ Mi Health Tracker 🏋️‍♂️ (v1.0)

A beautiful, comprehensive health tracking application that integrates with Xiaomi health devices to monitor and visualize your health data!

## ✨ Features

- 📊 Dashboard with health metrics visualization
- ⚖️ Weight tracking and body composition analysis
- 📈 Weight prediction and goal setting
- 🔄 Automatic data sync with Xiaomi health devices
- 📱 Responsive design for mobile and desktop
- 🔍 Health insights and personalized recommendations
- 👤 User profile management
- 📝 Manual data entry option

## 🚀 Getting Started

### Prerequisites

- Node.js (v14.x or higher)
- npm or Yarn
- Backend API service (included in the project)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mi-health-tracker.git
   cd mi-health-tracker
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   # or if using Yarn
   yarn install
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   # or if using Yarn
   yarn install
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm start
   # or if using Yarn
   yarn start
   ```
   This will start the backend on http://localhost:5002

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   # or if using Yarn
   yarn start
   ```
   This will start the frontend on http://localhost:3000

## 🧰 Tech Stack

- **Frontend**:
  - React.js
  - Material-UI
  - Recharts (for data visualization)
  - React Router
  - Axios

- **Backend**:
  - Node.js
  - Express
  - MongoDB (for data storage)
  - JWT Authentication

## 🐛 Known Issues

Some minor ESLint warnings remain but don't affect functionality:
- Unused variables and imports in various components
- React Hook dependencies warnings in HealthInsights.js

## 📝 Development Log

- **2023-06-15**: Project initialized with basic structure
- **2023-06-20**: Added dashboard and profile components
- **2023-06-25**: Implemented Xiaomi API integration
- **2023-06-30**: Added weight prediction feature
- **2023-07-05**: Implemented health insights and recommendations
- **2023-07-10**: Added manual data entry
- **2023-07-15**: Fixed JSX syntax errors in XiaomiSettings.js
- **2023-07-20**: Added recharts library for weight prediction visualization
- **2023-07-25**: Cleaned up unused imports across components
- **2023-08-01**: 🎉 Version 1.0 Released! Fixed all critical bugs and completed core functionality

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👏 Acknowledgements

- Xiaomi for their health devices and API
- Material-UI team for the excellent component library
- Recharts library for beautiful data visualizations
- All contributors to this project 