from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from models.health_data import HealthData
from services.ml_service import HealthMLService
from datetime import datetime, timedelta

insights_bp = Blueprint('insights', __name__)
ml_service = HealthMLService()

@insights_bp.route('/weight-prediction', methods=['GET'])
@jwt_required()
def predict_weight():
    """Predict future weight based on historical data"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Get days parameter (default 30)
    days = request.args.get('days', default=30, type=int)
    if days < 1 or days > 365:
        return jsonify({'message': 'Days parameter must be between 1 and 365'}), 400
    
    # Get user's historical weight data
    health_data = HealthData.query.filter_by(user_id=user.id).order_by(HealthData.date.desc()).all()
    
    if not health_data:
        return jsonify({'message': 'No health data available for prediction'}), 404
    
    # Convert to list of dictionaries
    health_data_list = [data.to_dict() for data in health_data]
    
    # Make prediction
    prediction_result = ml_service.predict_weight(health_data_list, days)
    
    if not prediction_result.get('success'):
        return jsonify({
            'message': 'Failed to generate weight prediction',
            'error': prediction_result.get('error', 'Unknown error')
        }), 400
    
    return jsonify({
        'message': 'Weight prediction generated successfully',
        'prediction': prediction_result
    }), 200

@insights_bp.route('/anomaly-detection', methods=['GET'])
@jwt_required()
def detect_anomalies():
    """Detect anomalies in health metrics"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Get metric parameter (default weight)
    metric = request.args.get('metric', default='weight', type=str)
    
    # Valid metrics for anomaly detection
    valid_metrics = [
        'weight', 'bmi', 'body_fat', 'muscle_mass', 'water', 
        'visceral_fat', 'bone_mass', 'basal_metabolism', 'protein'
    ]
    
    if metric not in valid_metrics:
        return jsonify({
            'message': f'Invalid metric. Must be one of: {", ".join(valid_metrics)}'
        }), 400
    
    # Get user's historical health data
    health_data = HealthData.query.filter_by(user_id=user.id).order_by(HealthData.date.desc()).all()
    
    if not health_data:
        return jsonify({'message': 'No health data available for anomaly detection'}), 404
    
    # Convert to list of dictionaries
    health_data_list = [data.to_dict() for data in health_data]
    
    # Detect anomalies
    anomaly_result = ml_service.detect_anomalies(health_data_list, metric)
    
    if not anomaly_result.get('success'):
        return jsonify({
            'message': 'Failed to detect anomalies',
            'error': anomaly_result.get('error', 'Unknown error')
        }), 400
    
    return jsonify({
        'message': 'Anomaly detection completed successfully',
        'result': anomaly_result
    }), 200

@insights_bp.route('/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    """Get personalized health recommendations"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Get user's profile data
    user_data = user.to_dict()
    
    # Get user's recent health data
    health_data = HealthData.query.filter_by(user_id=user.id).order_by(HealthData.date.desc()).limit(30).all()
    
    if not health_data:
        return jsonify({'message': 'No health data available for recommendations'}), 404
    
    # Convert to list of dictionaries
    health_data_list = [data.to_dict() for data in health_data]
    
    # Generate recommendations
    recommendations = ml_service.get_health_recommendations(user_data, health_data_list)
    
    if not recommendations.get('success'):
        return jsonify({
            'message': 'Failed to generate recommendations',
            'error': recommendations.get('error', 'Unknown error')
        }), 400
    
    return jsonify({
        'message': 'Health recommendations generated successfully',
        'recommendations': recommendations
    }), 200

@insights_bp.route('/dashboard-data', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Get aggregated data for the user dashboard"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Get time range parameter (default 30 days)
    days = request.args.get('days', default=30, type=int)
    if days < 1 or days > 365:
        return jsonify({'message': 'Days parameter must be between 1 and 365'}), 400
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Get user's health data in range
    health_data = HealthData.query.filter_by(user_id=user.id).filter(
        HealthData.date >= start_date,
        HealthData.date <= end_date
    ).order_by(HealthData.date).all()
    
    if not health_data:
        return jsonify({'message': 'No health data available in the specified range'}), 404
    
    # Convert to list of dictionaries
    health_data_list = [data.to_dict() for data in health_data]
    
    # Get profile data
    user_data = user.to_dict()
    
    # Get latest metrics
    latest_metrics = health_data_list[0] if health_data_list else {}
    
    # Calculate weight change
    weight_change = None
    if len(health_data_list) > 1 and 'weight' in health_data_list[0] and 'weight' in health_data_list[-1]:
        weight_change = health_data_list[0]['weight'] - health_data_list[-1]['weight']
    
    # Get anomalies for main metrics
    anomalies = {}
    for metric in ['weight', 'body_fat', 'muscle_mass']:
        anomaly_result = ml_service.detect_anomalies(health_data_list, metric)
        if anomaly_result.get('success'):
            anomalies[metric] = anomaly_result.get('anomalies', [])
    
    # Get weight prediction (next 7 days)
    prediction = ml_service.predict_weight(health_data_list, 7)
    
    # Get recommendations
    recommendations = ml_service.get_health_recommendations(user_data, health_data_list)
    
    # Compile dashboard data
    dashboard_data = {
        'user_profile': user_data,
        'latest_metrics': latest_metrics,
        'weight_change': weight_change,
        'data_points': len(health_data_list),
        'health_data': health_data_list,
        'anomalies': anomalies,
        'prediction': prediction.get('predictions', []) if prediction.get('success') else [],
        'recommendations': recommendations.get('recommendations', []) if recommendations.get('success') else []
    }
    
    return jsonify({
        'message': 'Dashboard data retrieved successfully',
        'dashboard': dashboard_data
    }), 200 