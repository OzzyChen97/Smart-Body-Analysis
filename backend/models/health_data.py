from . import db
from datetime import datetime

class HealthData(db.Model):
    __tablename__ = 'health_data'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Metrics from Xiaomi Scale
    weight = db.Column(db.Float)  # in kg
    bmi = db.Column(db.Float)
    body_fat = db.Column(db.Float)  # percentage
    muscle_mass = db.Column(db.Float)  # in kg
    water = db.Column(db.Float)  # percentage
    visceral_fat = db.Column(db.Float)
    bone_mass = db.Column(db.Float)  # in kg
    basal_metabolism = db.Column(db.Integer)  # in kcal
    protein = db.Column(db.Float)  # percentage
    
    # Manual input metrics
    calories_consumed = db.Column(db.Integer)  # in kcal
    calories_burned = db.Column(db.Integer)  # in kcal
    steps = db.Column(db.Integer)
    sleep_hours = db.Column(db.Float)
    water_intake = db.Column(db.Float)  # in liters
    
    # Meta information
    source = db.Column(db.String(50))  # 'xiaomi', 'manual', etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'weight': self.weight,
            'bmi': self.bmi,
            'body_fat': self.body_fat,
            'muscle_mass': self.muscle_mass,
            'water': self.water,
            'visceral_fat': self.visceral_fat,
            'bone_mass': self.bone_mass,
            'basal_metabolism': self.basal_metabolism,
            'protein': self.protein,
            'calories_consumed': self.calories_consumed,
            'calories_burned': self.calories_burned,
            'steps': self.steps,
            'sleep_hours': self.sleep_hours,
            'water_intake': self.water_intake,
            'source': self.source,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 