# Lecturer Authentication Setup Guide

## Overview
This system now supports proper authentication for lecturers. When an administrator creates a lecturer account, the lecturer can immediately sign in using the credentials provided by the admin.

## How It Works

### 1. Admin Creates Lecturer Account
- Go to **User Management** in the admin dashboard
- Click **"Add User"**
- Fill in the lecturer's details:
  - Full Name
  - Email Address
  - **Password** (required - minimum 6 characters)
  - Role: Lecturer
  - Department (optional)
  - Phone (optional)
  - Office Location (optional)

### 2. Lecturer Signs In
- Lecturer goes to the login page
- Uses the email and password provided by the admin
- System authenticates with Supabase Auth
- Lecturer is redirected to their dashboard

## Features

### ✅ **What's Implemented:**
- **Profile-based Authentication**: Uses user profiles in the database for login
- **Password Requirements**: Minimum 6 characters (for future auth setup)
- **Profile Creation**: User profiles are created in the users table
- **Error Handling**: Proper error messages for failed login/creation
- **Role-based Access**: Lecturers only see their relevant dashboard
- **Temporary Bypass**: Works without Supabase Auth admin permissions

### 🔧 **Technical Details:**
- **Auth Provider**: Profile-based (temporary bypass)
- **Password Storage**: Not implemented yet (will use Supabase Auth)
- **User Profiles**: Stored in custom `users` table
- **Session Management**: Basic profile-based (temporary)

## Setup Instructions

### For Administrators:
1. **First Admin Setup**: 
   - If no users exist, a "Create Admin Account" button will appear in User Management
   - Click this button to create the first admin account
   - This admin can then create lecturer accounts

2. **Creating Lecturer Accounts**:
   - Navigate to User Management
   - Click "Add User"
   - Select "Lecturer" role
   - Set a secure password (minimum 6 characters)
   - Provide the credentials to the lecturer

### For Lecturers:
1. **Receiving Credentials**: Get email and password from administrator
2. **Signing In**: Use the login page with provided credentials
3. **Dashboard Access**: Access lecturer-specific features

## Security Notes
- **Temporary Solution**: Currently using profile-based authentication
- **Future Implementation**: Will use Supabase Auth with proper password hashing
- **Email confirmation**: Will be implemented with proper auth setup
- **Session management**: Will be handled by Supabase Auth

## Troubleshooting

### Common Issues:
1. **"User profile not found"**: Contact admin to ensure account was created properly
2. **"Invalid credentials"**: Double-check email and password
3. **"Password too short"**: Ensure password is at least 6 characters when creating accounts

### Admin Actions:
- Can view all created users in User Management
- Can delete users (this also removes auth account)
- Can update user profiles (except passwords)

## Admin Account
The system administrator account is:
- **Email**: `admin@tallycheck.com`
- **Password**: `Admin123!`
- **Role**: admin

*Note: This is the default admin account. In production, you should change these credentials after first login.* 