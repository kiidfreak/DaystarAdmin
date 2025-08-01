import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fgezlqkecbnuqzgodmlz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZXpscWtlY2JudXF6Z29kbWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NTYzNTgsImV4cCI6MjA2NzAzMjM1OH0.NTaLSPuhEfysGM_E4u6r9rGytwhDHKuUgY6VxXn5kEQ'
);

async function testCourses() {
  console.log('Testing database connection...');
  
  try {
    // Test 1: Check if we can connect to the database
    console.log('1. Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('courses')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    console.log('✅ Database connection successful');
    
    // Test 2: Get all courses
    console.log('\n2. Fetching all courses...');
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        *,
        users!courses_instructor_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .order('code');
    
    if (coursesError) {
      console.error('❌ Error fetching courses:', coursesError);
      return;
    }
    
    console.log(`✅ Found ${courses?.length || 0} courses:`);
    if (courses && courses.length > 0) {
      courses.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.name} (${course.code}) - Instructor: ${course.users?.full_name || 'None'}`);
      });
    } else {
      console.log('   No courses found in database');
    }
    
    // Test 3: Get all users
    console.log('\n3. Fetching all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .order('full_name');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`✅ Found ${users?.length || 0} users:`);
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.full_name} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('   No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCourses(); 