from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from models.health_data import HealthData
from services.xiaomi_service import XiaomiScaleService
import os

xiaomi_bp = Blueprint('xiaomi', __name__)

@xiaomi_bp.route('/connect', methods=['POST'])
@jwt_required()
def connect_xiaomi_device():
    """Connect to a Xiaomi scale device"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    # Extract device credentials
    token = data.get('token') or os.environ.get('XIAOMI_TOKEN')
    ip = data.get('ip') or os.environ.get('XIAOMI_IP')
    
    if not token or not ip:
        return jsonify({'message': 'Xiaomi device token and IP are required'}), 400
    
    # Initialize Xiaomi service and try to connect
    xiaomi_service = XiaomiScaleService(token=token, ip=ip)
    connected = xiaomi_service.connect()
    
    if not connected:
        return jsonify({'message': 'Failed to connect to Xiaomi device'}), 400
    
    # Save device credentials to user profile
    user.xiaomi_token = token
    user.xiaomi_device_id = ip
    db.session.commit()
    
    return jsonify({
        'message': 'Successfully connected to Xiaomi device',
        'device_ip': ip
    }), 200

@xiaomi_bp.route('/sync', methods=['POST'])
@jwt_required()
def sync_data():
    """Sync data from Xiaomi scale"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Check if user has Xiaomi device set up
    if not user.xiaomi_token or not user.xiaomi_device_id:
        return jsonify({'message': 'Xiaomi device not configured for this user'}), 400
    
    # Initialize Xiaomi service
    xiaomi_service = XiaomiScaleService(token=user.xiaomi_token, ip=user.xiaomi_device_id)
    
    # Try to connect
    connected = xiaomi_service.connect()
    if not connected:
        return jsonify({'message': 'Failed to connect to Xiaomi device'}), 400
    
    # Get data from device
    scale_data = xiaomi_service.get_scale_data()
    
    if not scale_data:
        return jsonify({'message': 'Failed to retrieve data from Xiaomi device'}), 400
    
    # Create health data entry
    new_entry = HealthData(
        user_id=user.id,
        source='xiaomi',
        weight=scale_data.get('weight'),
        bmi=scale_data.get('bmi'),
        body_fat=scale_data.get('body_fat'),
        muscle_mass=scale_data.get('muscle_mass'),
        water=scale_data.get('water'),
        visceral_fat=scale_data.get('visceral_fat'),
        bone_mass=scale_data.get('bone_mass'),
        basal_metabolism=scale_data.get('basal_metabolism'),
        protein=scale_data.get('protein')
    )
    
    # Save to database
    db.session.add(new_entry)
    db.session.commit()
    
    return jsonify({
        'message': 'Data synced successfully from Xiaomi device',
        'data': new_entry.to_dict()
    }), 201

@xiaomi_bp.route('/discover', methods=['GET'])
@jwt_required()
def discover_devices():
    """Discover Xiaomi devices on the network"""
    # Initialize Xiaomi service
    xiaomi_service = XiaomiScaleService()
    
    # Discover devices
    devices = xiaomi_service.discover_devices()
    
    if not devices:
        return jsonify({
            'message': 'No Xiaomi devices found on the network',
            'devices': []
        }), 200
    
    return jsonify({
        'message': f'Found {len(devices)} Xiaomi devices',
        'devices': devices
    }), 200

@xiaomi_bp.route('/status', methods=['GET'])
@jwt_required()
def device_status():
    """Check Xiaomi device connection status"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Check if user has Xiaomi device set up
    if not user.xiaomi_token or not user.xiaomi_device_id:
        return jsonify({
            'message': 'Xiaomi device not configured',
            'connected': False
        }), 200
    
    # Initialize Xiaomi service
    xiaomi_service = XiaomiScaleService(token=user.xiaomi_token, ip=user.xiaomi_device_id)
    
    # Try to connect
    connected = xiaomi_service.connect()
    
    return jsonify({
        'message': 'Xiaomi device status retrieved',
        'connected': connected,
        'device_ip': user.xiaomi_device_id if connected else None
    }), 200 