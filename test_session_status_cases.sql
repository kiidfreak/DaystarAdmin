-- Comprehensive test for session status logic
-- This script creates test sessions for different scenarios

-- Get current date and time for testing
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_time TIME := CURRENT_TIME;
    test_course_id UUID;
    
    -- Test scenarios
    upcoming_start TIME := '03:00:00';  -- Future time
    upcoming_end TIME := '04:00:00';
    
    ongoing_start TIME := '02:00:00';  -- Past time
    ongoing_end TIME := '03:00:00';    -- Future time
    
    completed_start TIME := '01:00:00'; -- Past time
    completed_end TIME := '02:00:00';  -- Past time
    
    yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
    tomorrow_date DATE := CURRENT_DATE + INTERVAL '1 day';
BEGIN
    -- Get the first available course
    SELECT id INTO test_course_id FROM courses LIMIT 1;
    
    -- Test Case 1: Upcoming session (today, future time)
    INSERT INTO class_sessions (
        course_id, session_date, start_time, end_time, location,
        attendance_window_start, attendance_window_end, created_at
    ) VALUES (
        test_course_id, current_date, upcoming_start, upcoming_end,
        'Test - Upcoming Session', 
        (current_date || ' 02:45:00')::timestamp, 
        (current_date || ' 03:15:00')::timestamp, 
        NOW()
    );
    
    -- Test Case 2: Ongoing session (today, current time within range)
    INSERT INTO class_sessions (
        course_id, session_date, start_time, end_time, location,
        attendance_window_start, attendance_window_end, created_at
    ) VALUES (
        test_course_id, current_date, ongoing_start, ongoing_end,
        'Test - Ongoing Session', 
        (current_date || ' 01:45:00')::timestamp, 
        (current_date || ' 03:15:00')::timestamp, 
        NOW()
    );
    
    -- Test Case 3: Completed session (today, past time)
    INSERT INTO class_sessions (
        course_id, session_date, start_time, end_time, location,
        attendance_window_start, attendance_window_end, created_at
    ) VALUES (
        test_course_id, current_date, completed_start, completed_end,
        'Test - Completed Session', 
        (current_date || ' 00:45:00')::timestamp, 
        (current_date || ' 02:15:00')::timestamp, 
        NOW()
    );
    
    -- Test Case 4: Past session (yesterday)
    INSERT INTO class_sessions (
        course_id, session_date, start_time, end_time, location,
        attendance_window_start, attendance_window_end, created_at
    ) VALUES (
        test_course_id, yesterday_date, '09:00:00', '10:30:00',
        'Test - Past Session', 
        (yesterday_date || ' 08:45:00')::timestamp, 
        (yesterday_date || ' 10:45:00')::timestamp, 
        NOW()
    );
    
    -- Test Case 5: Future session (tomorrow)
    INSERT INTO class_sessions (
        course_id, session_date, start_time, end_time, location,
        attendance_window_start, attendance_window_end, created_at
    ) VALUES (
        test_course_id, tomorrow_date, '09:00:00', '10:30:00',
        'Test - Future Session', 
        (tomorrow_date || ' 08:45:00')::timestamp, 
        (tomorrow_date || ' 10:45:00')::timestamp, 
        NOW()
    );
    
    RAISE NOTICE 'Test sessions created for different scenarios';
    RAISE NOTICE 'Current time: %, Current date: %', current_time, current_date;
    RAISE NOTICE 'Test sessions:';
    RAISE NOTICE '1. Upcoming: % % - %', current_date, upcoming_start, upcoming_end;
    RAISE NOTICE '2. Ongoing: % % - %', current_date, ongoing_start, ongoing_end;
    RAISE NOTICE '3. Completed: % % - %', current_date, completed_start, completed_end;
    RAISE NOTICE '4. Past: % 09:00 - 10:30', yesterday_date;
    RAISE NOTICE '5. Future: % 09:00 - 10:30', tomorrow_date;
END $$;

-- Verify all test sessions
SELECT 
    id,
    session_date,
    start_time,
    end_time,
    location,
    attendance_window_start,
    attendance_window_end,
    created_at
FROM class_sessions 
WHERE location LIKE 'Test - %'
ORDER BY session_date, start_time; 