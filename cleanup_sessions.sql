-- Clean up all sessions and related data
-- This script will remove all sessions, attendance records, and beacon assignments

-- 1. Delete all attendance records first (foreign key constraint)
DELETE FROM attendance_records;

-- 2. Delete all beacon assignments for sessions
DELETE FROM beacon_assignments WHERE session_id IS NOT NULL;

-- 3. Delete all class sessions
DELETE FROM class_sessions;

-- 4. Reset any auto-increment sequences if they exist
-- (PostgreSQL doesn't have auto-increment, but this is for completeness)

-- 5. Verify cleanup
SELECT 
    'attendance_records' as table_name, COUNT(*) as count 
FROM attendance_records
UNION ALL
SELECT 
    'class_sessions' as table_name, COUNT(*) as count 
FROM class_sessions
UNION ALL
SELECT 
    'beacon_assignments' as table_name, COUNT(*) as count 
FROM beacon_assignments WHERE session_id IS NOT NULL;

-- Expected result: All counts should be 0 