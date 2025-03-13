import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Flask configuration
DEBUG = os.environ.get('FLASK_ENV') == 'development'
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-secret')

# Database configuration
MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'mi_health_tracker')
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DATABASE}"

# MongoDB configuration
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/mi_health_tracker')

# Xiaomi API configuration
XIAOMI_TOKEN = os.environ.get('XIAOMI_TOKEN')
XIAOMI_IP = os.environ.get('XIAOMI_IP')

# ML model configuration
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'ml', 'models')
WEIGHT_PREDICTION_MODEL = os.path.join(MODEL_DIR, 'weight_prediction.pkl')
ANOMALY_DETECTION_MODEL = os.path.join(MODEL_DIR, 'anomaly_detection.pkl')

# API configuration
API_PREFIX = '/api'
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

# Logging configuration
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO') 