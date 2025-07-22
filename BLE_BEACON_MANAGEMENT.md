# BLE Beacon Management System

## Overview

The BLE Beacon Management system allows HOD (Head of Department) users to manage BLE beacons and their connections to courses and class sessions. This system enables automatic attendance tracking through BLE beacon proximity detection.

**Note**: This system has been updated to work with your existing `ble_beacons` table schema, maintaining backward compatibility while adding new management features.

## Database Schema

### Existing ble_beacons Table (Enhanced)
```sql
-- Original table structure
CREATE TABLE public.ble_beacons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  mac_address character varying NOT NULL UNIQUE,
  name character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ble_beacons_pkey PRIMARY KEY (id)
);

-- New columns added for enhanced management
ALTER TABLE public.ble_beacons 
ADD COLUMN uuid VARCHAR(255),
ADD COLUMN major INTEGER DEFAULT 1,
ADD COLUMN minor INTEGER DEFAULT 1,
ADD COLUMN location VARCHAR(255),
ADD COLUMN description TEXT,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### New beacon_assignments Table
```sql
CREATE TABLE public.beacon_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    beacon_id UUID NOT NULL REFERENCES public.ble_beacons(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(beacon_id, course_id, session_id)
);
```

## Migration Process

### Step 1: Run the Migration Script
Execute the migration script to enhance your existing `ble_beacons` table:

```sql
-- Run database/update_beacon_schema.sql
-- This adds new columns while preserving existing data
```

### Step 2: Verify Migration
Run the test script to verify everything works:

```sql
-- Run database/test_beacon_migration.sql
-- This checks the migration and inserts test data
```

## Flow Diagram

```
HOD Dashboard
    ↓
BLE Beacon Manager
    ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Add Beacon    │    │  Edit Beacon    │    │ Delete Beacon   │
│                 │    │                 │    │                 │
│ • Name          │    │ • Update Info   │    │ • Remove from   │
│ • MAC Address   │    │ • Change Status │    │   all courses   │
│ • UUID (Optional)│   │ • Modify Loc    │    │ • Clean up      │
│ • Location      │    │                 │    │   assignments   │
│ • Description   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    ↓                         ↓                         ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Assign to       │    │ View Beacon     │    │ Beacon Status   │
│ Course          │    │ Assignments     │    │ Monitoring      │
│                 │    │                 │    │                 │
│ • Select Course │    │ • Course List   │    │ • Active/Inactive│
│ • Link Session  │    │ • Session Info  │    │ • Signal Strength│
│ • Set Range     │    │ • Coverage Area │    │ • Battery Level │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    ↓                         ↓                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Lecturer Workflow                          │
│                                                               │
│ 1. Lecturer creates class session                            │
│ 2. System checks for assigned beacons                        │
│ 3. Students approach beacon during session                   │
│ 4. Mobile app detects beacon proximity                       │
│ 5. Automatic attendance recording                            │
│ 6. Lecturer can verify/manage attendance                     │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### For HOD (Head of Department)

1. **Beacon Management**
   - Add new BLE beacons with MAC addresses
   - Edit beacon information (name, location, description)
   - Activate/deactivate beacons
   - Delete beacons (with automatic assignment cleanup)

2. **Course Assignment**
   - Assign beacons to specific courses
   - Link beacons to class sessions
   - View all beacon assignments
   - Remove beacon assignments

3. **Monitoring**
   - View beacon status (active/inactive)
   - Monitor beacon assignments
   - Track beacon coverage areas

### For Lecturers

1. **Session Management**
   - Create class sessions with assigned beacons
   - Set attendance windows
   - Monitor real-time attendance

2. **Attendance Tracking**
   - Automatic attendance via BLE proximity
   - Manual attendance verification
   - Attendance reports and analytics

### For Students

1. **Automatic Check-in**
   - Mobile app detects nearby beacons
   - Automatic attendance recording
   - Real-time status updates

## Technical Implementation

### Beacon Configuration
- **MAC Address**: Primary identifier for the beacon (required)
- **UUID**: Optional UUID for advanced beacon identification
- **Major/Minor**: Additional identifiers for beacon grouping
- **Location**: Physical location description
- **Status**: Active/Inactive state

### Assignment Logic
- Beacons can be assigned to courses
- Beacons can be linked to specific class sessions
- Multiple beacons can be assigned to the same course
- Assignment history is maintained

### Integration Points
- **Mobile App**: Detects beacon proximity and records attendance
- **Web Dashboard**: Manages beacons and assignments
- **Database**: Stores beacon data and assignments
- **Real-time Updates**: Live attendance tracking

## Security Considerations

1. **MAC Address Validation**: Ensures unique beacon identifiers
2. **Assignment Constraints**: Prevents duplicate assignments
3. **Cascade Deletion**: Proper cleanup when beacons are removed
4. **Access Control**: HOD-only beacon management

## Usage Instructions

### Setting Up a New Beacon

1. **HOD Login**: Access the BLE Beacon Manager
2. **Add Beacon**: Click "Add Beacon" button
3. **Configure**:
   - Name: Descriptive name (e.g., "Room 101 Beacon")
   - MAC Address: Hardware MAC address (required)
   - UUID: Optional UUID for advanced identification
   - Major/Minor: Additional identifiers
   - Location: Physical location
   - Description: Optional details
4. **Save**: Beacon is created and ready for assignment

### Assigning Beacon to Course

1. **Select Beacon**: Choose from available beacons
2. **Assign to Course**: Select target course
3. **Optional Session**: Link to specific class session
4. **Confirm**: Assignment is created

### Managing Attendance

1. **Lecturer**: Creates class session with assigned beacon
2. **Students**: Approach beacon during session
3. **Mobile App**: Automatically detects and records attendance
4. **Verification**: Lecturer can verify attendance in dashboard

## Benefits

1. **Automated Attendance**: Reduces manual tracking
2. **Real-time Monitoring**: Live attendance updates
3. **Accurate Data**: GPS and BLE proximity verification
4. **Scalable**: Multiple beacons per location
5. **Flexible**: Course and session-level assignments
6. **Backward Compatible**: Works with existing beacon data

## Migration Notes

- **Existing Data**: All existing beacon data is preserved
- **MAC Address**: Primary identifier (required field)
- **UUID**: Optional field for advanced beacon identification
- **New Features**: Assignment system and enhanced management
- **Compatibility**: Works with existing mobile app integration

## Future Enhancements

1. **Beacon Health Monitoring**: Battery level, signal strength
2. **Advanced Analytics**: Attendance patterns, location analytics
3. **Mobile Beacon Management**: Remote beacon configuration
4. **Integration APIs**: Third-party beacon system support
5. **Multi-location Support**: Campus-wide beacon network 