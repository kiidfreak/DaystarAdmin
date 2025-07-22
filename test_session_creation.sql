-- Test session creation with proper time formatting
-- This script creates a test session for today with current time

-- Get current date and time
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_time TIME := CURRENT_TIME;
    start_time TIME := '09:00:00';
    end_time TIME := '10:30:00';
    attendance_start TIME := '08:45:00';
    attendance_end TIME := '09:15:00';
    test_course_id UUID;
BEGIN
    -- Get the first available course
    SELECT id INTO test_course_id FROM courses LIMIT 1;
    
    -- Create a test session for today
    INSERT INTO class_sessions (
        course_id,
        session_date,
        start_time,
        end_time,
        location,
        attendance_window_start,
        attendance_window_end,
        created_at
    ) VALUES (
        test_course_id,
        current_date,
        start_time,
        end_time,
        'Test Location',
        attendance_start,
        attendance_end,
        NOW()
    );
    
    RAISE NOTICE 'Test session created for date: %, start: %, end: %', 
        current_date, start_time, end_time;
END $$;

-- Verify the created session
SELECT 
    id,
    course_id,
    session_date,
    start_time,
    end_time,
    location,
    attendance_window_start,
    attendance_window_end,
    created_at
FROM class_sessions 
WHERE session_date = CURRENT_DATE
ORDER BY created_at DESC; 