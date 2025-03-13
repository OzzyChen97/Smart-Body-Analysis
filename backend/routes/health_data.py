from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from models.health_data import HealthData
from datetime import datetime, timedelta
import pandas as pd

health_data_bp = Blueprint('health_data', __name__)

@health_data_bp.route('/', methods=['GET'])
@jwt_required()
def get_health_data():
    """Get user health data with optional filtering"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Parse query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    metric = request.args.get('metric')
    limit = request.args.get('limit', default=30, type=int)
    
    # Base query
    query = HealthData.query.filter_by(user_id=user.id)
    
    # Apply filters
    if start_date:
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(HealthData.date >= start_date)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use ISO format.'}), 400
    
    if end_date:
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(HealthData.date <= end_date)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use ISO format.'}), 400
    
    # Order by date (newest first) and apply limit
    health_data = query.order_by(HealthData.date.desc()).limit(limit).all()
    
    # Convert to dictionaries
    result = [data.to_dict() for data in health_data]
    
    return jsonify(result), 200

@health_data_bp.route('/', methods=['POST'])
@jwt_required()
def add_health_data():
    """Add new health data entry"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    # Validate data has at least one health metric
    health_metrics = [
        'weight', 'bmi', 'body_fat', 'muscle_mass', 'water', 
        'visceral_fat', 'bone_mass', 'basal_metabolism', 'protein',
        'calories_consumed', 'calories_burned', 'steps', 'sleep_hours', 'water_intake'
    ]
    
    if not any(metric in data for metric in health_metrics):
        return jsonify({'message': 'At least one health metric is required'}), 400
    
    # Create new health data entry
    new_entry = HealthData(
        user_id=user.id,
        source=data.get('source', 'manual'),
        date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')) if data.get('date') else datetime.utcnow()
    )
    
    # Add all provided metrics
    for metric in health_metrics:
        if metric in data:
            setattr(new_entry, metric, data[metric])
    
    # Save to database
    db.session.add(new_entry)
    db.session.commit()
    
    return jsonify({
        'message': 'Health data added successfully',
        'data': new_entry.to_dict()
    }), 201

@health_data_bp.route('/<int:data_id>', methods=['PUT'])
@jwt_required()
def update_health_data(data_id):
    """Update an existing health data entry"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Find the health data entry
    entry = HealthData.query.filter_by(id=data_id, user_id=user.id).first()
    
    if not entry:
        return jsonify({'message': 'Health data entry not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    # Update fields
    health_metrics = [
        'weight', 'bmi', 'body_fat', 'muscle_mass', 'water', 
        'visceral_fat', 'bone_mass', 'basal_metabolism', 'protein',
        'calories_consumed', 'calories_burned', 'steps', 'sleep_hours', 'water_intake'
    ]
    
    for metric in health_metrics:
        if metric in data:
            setattr(entry, metric, data[metric])
    
    # Update date if provided
    if 'date' in data:
        entry.date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
    
    # Save changes
    db.session.commit()
    
    return jsonify({
        'message': 'Health data updated successfully',
        'data': entry.to_dict()
    }), 200

@health_data_bp.route('/<int:data_id>', methods=['DELETE'])
@jwt_required()
def delete_health_data(data_id):
    """Delete a health data entry"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Find the health data entry
    entry = HealthData.query.filter_by(id=data_id, user_id=user.id).first()
    
    if not entry:
        return jsonify({'message': 'Health data entry not found'}), 404
    
    # Delete entry
    db.session.delete(entry)
    db.session.commit()
    
    return jsonify({
        'message': 'Health data deleted successfully'
    }), 200

@health_data_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_health_summary():
    """Get summary statistics of user health data"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Get the last 90 days of data
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    health_data = HealthData.query.filter_by(user_id=user.id).filter(
        HealthData.date >= start_date,
        HealthData.date <= end_date
    ).order_by(HealthData.date).all()
    
    if not health_data:
        return jsonify({
            'message': 'No health data available',
            'summary': {}
        }), 200
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame([data.to_dict() for data in health_data])
    
    # Calculate summary statistics
    summary = {}
    
    # Numeric metrics to analyze
    metrics = [
        'weight', 'bmi', 'body_fat', 'muscle_mass', 'water', 
        'visceral_fat', 'bone_mass', 'basal_metabolism', 'protein',
        'calories_consumed', 'calories_burned', 'steps', 'sleep_hours', 'water_intake'
    ]
    
    for metric in metrics:
        if metric in df.columns and not df[metric].empty and df[metric].notna().any():
            current = df[metric].iloc[-1] if len(df) > 0 else None
            
            metric_summary = {
                'current': float(current) if current is not None else None,
                'min': float(df[metric].min()) if not df[metric].empty else None,
                'max': float(df[metric].max()) if not df[metric].empty else None,
                'avg': float(df[metric].mean()) if not df[metric].empty else None,
                'change': float(df[metric].iloc[-1] - df[metric].iloc[0]) if len(df) > 1 and metric in df.columns else None,
                'change_percent': float((df[metric].iloc[-1] - df[metric].iloc[0]) / df[metric].iloc[0] * 100) if len(df) > 1 and df[metric].iloc[0] != 0 and metric in df.columns else None
            }
            
            summary[metric] = metric_summary
    
    # Add overall stats
    summary['overall'] = {
        'total_records': len(df),
        'first_record_date': df['date'].min() if 'date' in df.columns and not df['date'].empty else None,
        'last_record_date': df['date'].max() if 'date' in df.columns and not df['date'].empty else None
    }
    
    return jsonify({
        'message': 'Health summary generated successfully',
        'summary': summary
    }), 200 