from flask_sqlalchemy import SQLAlchemy
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize SQLAlchemy
db = SQLAlchemy()

# Initialize MongoDB connection
mongo_client = MongoClient(os.environ.get('MONGO_URI', 'mongodb://localhost:27017/'))
mongo_db = mongo_client[os.environ.get('MONGO_DATABASE', 'mi_health_tracker')] 