import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from models import db
from models.user import User
from models.health_data import HealthData
import datetime
import random

# Load environment variables
load_dotenv()

# Create a minimal Flask app for database initialization
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 
    f"mysql+pymysql://{os.environ.get('MYSQL_USER', 'root')}:{os.environ.get('MYSQL_PASSWORD', '')}@{os.environ.get('MYSQL_HOST', 'localhost')}/{os.environ.get('MYSQL_DATABASE', 'mi_health_tracker')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database
db.init_app(app)

def init_db():
    """Initialize the database with tables and sample data"""
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if there are any users
        if User.query.count() == 0:
            print("Creating sample user...")
            
            # Create a sample user
            sample_user = User(
                email="demo@example.com",
                username="demo_user",
                first_name="Demo",
                last_name="User",
                date_of_birth=datetime.date(1990, 1, 1),
                gender="male",
                height=175.0
            )
            sample_user.set_password("Password123")
            
            db.session.add(sample_user)
            db.session.commit()
            
            # Create sample health data for the past 30 days
            print("Creating sample health data...")
            
            # Base values
            base_weight = 75.0
            base_body_fat = 20.0
            base_muscle_mass = 55.0
            base_water = 60.0
            base_visceral_fat = 10.0
            base_bone_mass = 3.5
            base_basal_metabolism = 1700
            base_protein = 18.0
            
            # Create data for the past 30 days
            for i in range(30, 0, -1):
                date = datetime.datetime.now() - datetime.timedelta(days=i)
                
                # Add some random variation
                weight = base_weight + random.uniform(-1.0, 1.0)
                body_fat = base_body_fat + random.uniform(-1.0, 1.0)
                muscle_mass = base_muscle_mass + random.uniform(-0.5, 0.5)
                water = base_water + random.uniform(-2.0, 2.0)
                visceral_fat = base_visceral_fat + random.uniform(-0.5, 0.5)
                bone_mass = base_bone_mass + random.uniform(-0.1, 0.1)
                basal_metabolism = base_basal_metabolism + random.randint(-50, 50)
                protein = base_protein + random.uniform(-0.5, 0.5)
                
                # Create health data entry
                health_data = HealthData(
                    user_id=sample_user.id,
                    date=date,
                    weight=weight,
                    bmi=weight / ((sample_user.height / 100) ** 2),
                    body_fat=body_fat,
                    muscle_mass=muscle_mass,
                    water=water,
                    visceral_fat=visceral_fat,
                    bone_mass=bone_mass,
                    basal_metabolism=basal_metabolism,
                    protein=protein,
                    source='sample'
                )
                
                db.session.add(health_data)
            
            db.session.commit()
            
            print("Sample data created successfully!")
        else:
            print("Database already contains users. Skipping sample data creation.")

if __name__ == "__main__":
    init_db() 