# Mi Health Tracker

A comprehensive health monitoring system that integrates data from Xiaomi Smart Scale with user-input health metrics to provide visualization, trend analysis, and AI-driven health recommendations.

## Features

- **Automatic Data Sync**: Fetches weight, body fat, muscle mass, and other metrics from the Xiaomi Scale.
- **User Dashboard**:
  - Interactive charts for weight trends and body composition
  - Manual input forms for diet, exercise, and sleep logs
- **AI Insights**:
  - Predictive analytics for future weight trends
  - Anomaly detection for sudden weight changes
  - Personalized health recommendations
- **Multi-Platform Support**: Web and mobile-friendly interface

## Technology Stack

- **Backend**: Python (Flask), MySQL, python-miio (Xiaomi API)
- **Frontend**: React, Chart.js, Axios
- **Database**: MySQL (structured data), MongoDB (user logs)
- **AI/ML**: ARIMA (time series prediction), Isolation Forest (anomaly detection)
- **Deployment**: Docker, AWS EC2

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- MySQL
- MongoDB
- Docker (optional)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mi-health-tracker.git
   cd mi-health-tracker
   ```

2. Set up the backend:
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```
   cd frontend
   npm install
   ```

4. Configure database:
   - Create MySQL database
   - Update connection settings in `backend/config.py`
   - Set up MongoDB connection

5. Start the application:
   ```
   # Start backend
   cd backend
   flask run
   
   # Start frontend (in a new terminal)
   cd frontend
   npm start
   ```

## Configuration

Rename `.env.example` to `.env` and update the variables:

```
# Database
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=mi_health_tracker

# MongoDB
MONGO_URI=mongodb://localhost:27017/mi_health_tracker

# Xiaomi API
XIAOMI_TOKEN=your_device_token
XIAOMI_IP=your_device_ip
```

## Project Structure

```
mi-health-tracker/
├── backend/              # Flask backend
│   ├── app.py            # Main application entry
│   ├── config.py         # Configuration settings
│   ├── models/           # Database models
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic services
│   ├── ml/               # Machine learning models
│   └── utils/            # Utility functions
├── frontend/             # React frontend
│   ├── public/           # Static files
│   └── src/              # Source code
│       ├── components/   # React components
│       ├── pages/        # Page layouts
│       ├── services/     # API services
│       └── utils/        # Utility functions
└── docker/               # Docker configuration
```

## License

MIT

## Acknowledgments

- Xiaomi for their Smart Scale and API
- All open-source libraries used in this project 