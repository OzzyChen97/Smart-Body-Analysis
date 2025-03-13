import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from sklearn.ensemble import IsolationForest
import pickle
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml', 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

class HealthMLService:
    def __init__(self):
        """Initialize the Health ML Service"""
        self.weight_model_path = os.path.join(MODEL_DIR, 'weight_prediction.pkl')
        self.anomaly_model_path = os.path.join(MODEL_DIR, 'anomaly_detection.pkl')
        
        # Initialize models to None - they'll be loaded or trained when needed
        self.weight_model = None
        self.anomaly_model = None
    
    def _prepare_time_series_data(self, health_data, metric='weight'):
        """
        Prepare time series data for analysis
        
        Args:
            health_data (list): List of health data records
            metric (str): The metric to analyze
            
        Returns:
            pd.DataFrame: DataFrame with date index and metric values
        """
        # Convert to DataFrame
        df = pd.DataFrame(health_data)
        
        # Ensure 'date' is datetime type
        df['date'] = pd.to_datetime(df['date'])
        
        # Set date as index and sort
        df = df.set_index('date').sort_index()
        
        # Handle missing values
        if metric in df.columns:
            df = df[~df[metric].isna()]
            return df[[metric]]
        else:
            logger.warning(f"Metric {metric} not found in health data")
            return pd.DataFrame()
    
    def predict_weight(self, health_data, days=30):
        """
        Predict future weight based on historical data
        
        Args:
            health_data (list): List of health data records
            days (int): Number of days to predict
            
        Returns:
            dict: Prediction results
        """
        # Prepare data
        df = self._prepare_time_series_data(health_data, 'weight')
        if df.empty or len(df) < 10:  # Need sufficient data for prediction
            return {
                'success': False,
                'error': 'Insufficient data for prediction (need at least 10 weight records)'
            }
        
        try:
            # Train ARIMA model
            model = ARIMA(df, order=(5,1,0))  # Parameters can be optimized
            model_fit = model.fit()
            
            # Save the model
            with open(self.weight_model_path, 'wb') as f:
                pickle.dump(model_fit, f)
            
            # Generate forecast
            forecast = model_fit.forecast(steps=days)
            
            # Prepare result
            dates = [datetime.now() + timedelta(days=i) for i in range(1, days+1)]
            predictions = [
                {
                    'date': date.isoformat(),
                    'weight': float(weight)
                }
                for date, weight in zip(dates, forecast)
            ]
            
            return {
                'success': True,
                'predictions': predictions,
                'current_weight': float(df['weight'].iloc[-1]),
                'prediction_end_weight': float(forecast[-1]),
                'weight_change': float(forecast[-1] - df['weight'].iloc[-1])
            }
        except Exception as e:
            logger.error(f"Error in weight prediction: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_anomalies(self, health_data, metric='weight'):
        """
        Detect anomalies in health metrics
        
        Args:
            health_data (list): List of health data records
            metric (str): The metric to analyze
            
        Returns:
            dict: Anomaly detection results
        """
        # Prepare data
        df = self._prepare_time_series_data(health_data, metric)
        if df.empty or len(df) < 10:
            return {
                'success': False,
                'error': f'Insufficient data for {metric} anomaly detection'
            }
        
        try:
            # Train isolation forest model
            model = IsolationForest(contamination=0.05)  # Expect 5% anomalies
            df['anomaly'] = model.fit_predict(df)
            
            # Save the model
            with open(self.anomaly_model_path, 'wb') as f:
                pickle.dump(model, f)
            
            # Find anomalies (marked as -1 by isolation forest)
            anomalies = df[df['anomaly'] == -1]
            
            # Prepare result
            anomaly_points = [
                {
                    'date': index.isoformat(),
                    metric: float(row[metric]),
                    'deviation': abs(float(row[metric] - df[metric].mean()) / df[metric].std())
                }
                for index, row in anomalies.iterrows()
            ]
            
            return {
                'success': True,
                'anomalies': anomaly_points,
                'anomaly_count': len(anomaly_points),
                'total_records': len(df),
                'metric_mean': float(df[metric].mean()),
                'metric_std': float(df[metric].std())
            }
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_health_recommendations(self, user_data, health_data):
        """
        Generate personalized health recommendations
        
        Args:
            user_data (dict): User profile information
            health_data (list): List of health data records
            
        Returns:
            dict: Health recommendations
        """
        try:
            # Prepare data
            weight_df = self._prepare_time_series_data(health_data, 'weight')
            if weight_df.empty:
                return {
                    'success': False,
                    'error': 'Insufficient health data for recommendations'
                }
            
            # Get most recent metrics
            recent_health = health_data[0] if health_data else {}
            
            # Calculate BMI if we have weight and height
            bmi = None
            if recent_health.get('weight') and user_data.get('height'):
                height_m = user_data.get('height') / 100  # cm to m
                bmi = recent_health.get('weight') / (height_m * height_m)
            
            # Weight trend analysis
            weight_trend = None
            if len(weight_df) >= 3:
                recent_weights = weight_df['weight'].values[-3:]
                if recent_weights[2] > recent_weights[0]:
                    weight_trend = 'increasing'
                elif recent_weights[2] < recent_weights[0]:
                    weight_trend = 'decreasing'
                else:
                    weight_trend = 'stable'
            
            # Generate recommendations
            recommendations = []
            
            # BMI-based recommendations
            if bmi:
                if bmi < 18.5:
                    recommendations.append({
                        'category': 'nutrition',
                        'title': 'Increase Caloric Intake',
                        'description': 'Your BMI is below the healthy range. Consider increasing your daily caloric intake with nutrient-dense foods.'
                    })
                elif bmi >= 25:
                    recommendations.append({
                        'category': 'exercise',
                        'title': 'Increase Physical Activity',
                        'description': 'Your BMI indicates you may benefit from increased physical activity. Aim for at least 150 minutes of moderate exercise per week.'
                    })
                    recommendations.append({
                        'category': 'nutrition',
                        'title': 'Monitor Caloric Intake',
                        'description': 'Consider tracking your daily caloric intake to maintain a slight deficit for healthy weight loss.'
                    })
            
            # Body composition recommendations
            if recent_health.get('body_fat') and recent_health.get('body_fat') > 25:
                recommendations.append({
                    'category': 'exercise',
                    'title': 'Strength Training',
                    'description': 'Your body fat percentage may benefit from regular strength training. Aim for 2-3 sessions per week.'
                })
            
            if recent_health.get('muscle_mass') and recent_health.get('muscle_mass') < 30:
                recommendations.append({
                    'category': 'nutrition',
                    'title': 'Protein Intake',
                    'description': 'Consider increasing your protein intake to support muscle development. Aim for 1.6-2.2g per kg of body weight.'
                })
            
            # Weight trend recommendations
            if weight_trend == 'increasing':
                recommendations.append({
                    'category': 'lifestyle',
                    'title': 'Weight Management',
                    'description': 'Your weight has been increasing. Consider reviewing your diet and activity levels.'
                })
            elif weight_trend == 'decreasing' and bmi and bmi < 20:
                recommendations.append({
                    'category': 'nutrition',
                    'title': 'Healthy Weight Maintenance',
                    'description': 'Your weight has been decreasing. Ensure you\'re maintaining adequate nutrition for your activity level.'
                })
            
            # Water intake
            recommendations.append({
                'category': 'hydration',
                'title': 'Stay Hydrated',
                'description': 'Remember to drink at least 2 liters of water daily for optimal health.'
            })
            
            return {
                'success': True,
                'recommendations': recommendations,
                'bmi': bmi,
                'weight_trend': weight_trend
            }
        except Exception as e:
            logger.error(f"Error generating health recommendations: {e}")
            return {
                'success': False,
                'error': str(e)
            } 