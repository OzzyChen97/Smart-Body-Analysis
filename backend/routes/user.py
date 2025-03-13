from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from datetime import datetime

user_bp = Blueprint('user', __name__)

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get current user's profile"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

@user_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """Update current user's profile"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(public_id=current_user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    # Update user fields
    if 'first_name' in data:
        user.first_name = data['first_name']
    
    if 'last_name' in data:
        user.last_name = data['last_name']
    
    if 'date_of_birth' in data and data['date_of_birth']:
        try:
            user.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if 'gender' in data:
        user.gender = data['gender']
    
    if 'height' in data:
        user.height = data['height']
    
    # Save changes
    db.session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    }), 200

@user_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user_by_id(user_id):
    """Get a user by ID (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=current_user_id).first()
    
    # Simple admin check - in a real app, you'd have proper role management
    if not current_user or current_user.email != 'admin@example.com':
        return jsonify({'message': 'Unauthorized access'}), 403
    
    user = User.query.filter_by(public_id=user_id).first()
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

@user_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_users():
    """Get all users (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=current_user_id).first()
    
    # Simple admin check - in a real app, you'd have proper role management
    if not current_user or current_user.email != 'admin@example.com':
        return jsonify({'message': 'Unauthorized access'}), 403
    
    users = User.query.all()
    
    return jsonify({
        'count': len(users),
        'users': [user.to_dict() for user in users]
    }), 200 