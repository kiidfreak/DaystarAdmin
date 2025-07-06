# UniConnect Web Admin Dashboard

## Project Overview

UniConnect is a comprehensive university attendance management system with a web admin dashboard that connects to your existing Supabase database and mobile app.

## Features

- **Real-time Attendance Tracking**: Live attendance data from your mobile app
- **Multi-role Dashboard**: Support for lecturers, admins, and head lecturers
- **QR Code Generation**: Generate QR codes for attendance sessions
- **Analytics & Reports**: Comprehensive attendance analytics and reporting
- **Student Management**: Full CRUD operations for student data
- **Course Management**: Manage courses and class schedules
- **BLE Beacon Management**: Add, remove, and assign beacons to courses/sessions
- **User Management**: Manage lecturers, students, and course assignments

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Custom glass morphism design system

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Test User Accounts

### Admin Users
- **Email**: `admin@uni.edu`
- **Role**: `admin`
- **Access**: All courses and features
- **My Classes**: Shows all 5 courses (CSE101-CSE105)

### Lecturer Users
- **Instructor 1**
  - **Email**: `instructor1@example.com`
  - **Role**: `lecturer`
  - **My Classes**: Shows 1 course (CSE101)
  
- **Instructor 2**
  - **Email**: `instructor2@example.com`
  - **Role**: `lecturer`
  - **My Classes**: Shows 4 courses (CSE102, CSE103, CSE104, CSE105)
  
- **Dr. John Smith**
  - **Email**: `john.smith@uni.edu`
  - **Role**: `lecturer`
  - **My Classes**: Shows 0 courses (no assignments)

## Course Filtering Behavior

The system automatically filters courses based on user role:

- **Admin Users**: See all courses in "My Classes" section
- **Lecturer Users**: See only courses assigned to them via `instructor_id`
- **Course assignments** are managed through the User Management section

## Database Schema

The app expects the following tables in your Supabase database:

### Users Table
- `id` (uuid, primary key)
- `full_name` (text)
- `email` (text, unique)
- `role` (text: 'admin', 'lecturer', 'student')
- `department` (text, optional)
- `phone` (text, optional)
- `office_location` (text, optional)
- `created_at` (timestamp)

### Courses Table
- `id` (uuid, primary key)
- `name` (text)
- `code` (text, unique)
- `instructor_id` (uuid, foreign key to users.id)
- `created_at` (timestamp)

### Class Sessions Table
- `id` (uuid, primary key)
- `course_id` (uuid, foreign key to courses.id)
- `session_date` (date)
- `start_time` (time, optional)
- `end_time` (time, optional)
- `location` (text, optional)
- `attendance_window_start` (time, optional)
- `attendance_window_end` (time, optional)
- `created_at` (timestamp)

### Attendance Records Table
- `id` (uuid, primary key)
- `student_id` (uuid, foreign key to users.id)
- `course_code` (text)
- `date` (date)
- `check_in_time` (timestamp)
- `method` (text: 'BLE', 'QR', 'MANUAL')
- `status` (text: 'verified', 'pending', 'absent')
- `created_at` (timestamp)

### Course Enrollments Table
- `student_id` (uuid, foreign key to users.id)
- `course_id` (uuid, foreign key to courses.id)

### BLE Beacons Table
- `id` (uuid, primary key)
- `mac_address` (text, unique)
- `name` (text)
- `uuid` (text)
- `major` (integer)
- `minor` (integer)
- `location` (text)
- `description` (text)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Beacon Assignments Table
- `id` (uuid, primary key)
- `beacon_id` (uuid, foreign key to ble_beacons.id)
- `course_id` (uuid, foreign key to courses.id)
- `session_id` (uuid, foreign key to class_sessions.id, optional)
- `created_at` (timestamp)

## Constants Integration

This web app uses the same constants structure as your mobile app:

- **Colors**: `src/constants/colors.ts` - Color palette and theme definitions
- **Typography**: `src/constants/typography.ts` - Font families, sizes, and text styles
- **Spacing**: `src/constants/spacing.ts` - Layout and component spacing
- **App Constants**: `src/constants/index.ts` - App-specific constants and validation rules

## API Integration

The app uses React Query hooks to fetch data from Supabase:

- **Users**: `useStudents()`, `useLecturers()`, `useUser()`, etc.
- **Attendance**: `useTodayAttendance()`, `useUpdateAttendanceStatus()`, etc.
- **Courses**: `useCourses()`, `useCoursesByInstructor()`, etc.
- **Sessions**: `useSessionsByCourse()`, `useCreateSession()`, etc.
- **Beacons**: `useBeacons()`, `useBeaconAssignments()`, etc.

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Dashboard components
│   └── ui/           # Reusable UI components
├── constants/         # App constants (colors, typography, etc.)
├── contexts/         # React contexts (UserContext)
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and API
├── pages/            # Page components
└── types/            # TypeScript type definitions
```

## Deployment

The app is configured for deployment on Vercel with automatic rewrites for client-side routing.

---

**URL**: https://lovable.dev/projects/19fbb95e-8875-45d8-a8e0-57fe527ed822

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/19fbb95e-8875-45d8-a8e0-57fe527ed822) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/19fbb95e-8875-45d8-a8e0-57fe527ed822) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
