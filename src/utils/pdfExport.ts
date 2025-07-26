import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  title: string;
  date: string;
  systemStats?: {
    totalStudents: number;
    totalLecturers: number;
    totalCourses: number;
    averageAttendanceRate: number;
    todayAttendance: number;
  };
  lecturerStats?: Array<{
    name: string;
    email: string;
    totalCourses: number;
    totalSessions: number;
    averageAttendance: number;
    performanceScore: number;
  }>;
  attendanceData?: Array<{
    studentName: string;
    studentId: string;
    courseCode: string;
    checkInTime: string;
    method: string;
    status: string;
  }>;
  type: 'analytics' | 'attendance';
}

interface AttendanceData {
  studentName: string;
  studentId: string;
  courseCode: string;
  courseName: string;
  checkInTime: string;
  sessionStart: string;
  sessionEnd: string;
  location: string;
  method: string;
  status: string;
  date: string;
}

interface ExportOptions {
  title: string;
  date: string;
  attendanceData?: AttendanceData[];
  systemStats?: any;
  lecturerStats?: any;
  type: 'enhanced-attendance' | 'basic-attendance' | 'analytics';
}

export const exportToPDF = (options: ExportOptions) => {
  const { title, date, attendanceData, type, systemStats, lecturerStats } = options;

  const doc = new jsPDF();

  // Header with Navy Blue theme
  doc.setFillColor(0, 31, 63); // Navy Blue background
  doc.rect(0, 0, 210, 30, 'F');
  
  // Title with white text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Tally Check', 20, 15);
  
  doc.setFontSize(14);
  doc.text(title, 20, 25);
  
  // Reset text color for content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let yPosition = 40;

  if (type === 'analytics') {
    // System Statistics Section
    if (systemStats) {
      doc.setFillColor(240, 249, 255); // Light blue background
      doc.rect(10, yPosition, 190, 20, 'F');
      doc.setTextColor(0, 31, 63);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 System Statistics', 15, yPosition + 8);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let y = yPosition + 15;
      Object.entries(systemStats).forEach(([key, value]) => {
        doc.text(`${key.replace(/([A-Z])/g, ' $1')}: ${value}`, 15, y);
        y += 7;
      });
      yPosition = y + 10;
    }
    
    // Lecturer Statistics Table
    if (Array.isArray(lecturerStats) && lecturerStats.length > 0) {
      const tableHeaders = Object.keys(lecturerStats[0]).map(h => h.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()));
      const tableData = lecturerStats.map(l => Object.values(l));
      
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [0, 31, 63], // Navy Blue
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });
    }
  } else {
    if (!Array.isArray(attendanceData)) {
      console.error("attendanceData is undefined or not an array.");
      return;
    }
    
    // Summary Statistics with Navy Blue theme
    const total = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'verified').length;
    const absent = attendanceData.filter(r => r.status === 'absent').length;
    const late = attendanceData.filter(r => r.status === 'pending').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    doc.setFillColor(240, 249, 255); // Light blue background
    doc.rect(10, yPosition, 190, 20, 'F');
    doc.setTextColor(0, 31, 63);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 Summary Statistics', 15, yPosition + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Records: ${total}`, 15, yPosition + 15);
    doc.text(`Present: ${present}`, 60, yPosition + 15);
    doc.text(`Absent: ${absent}`, 105, yPosition + 15);
    doc.text(`Late: ${late}`, 150, yPosition + 15);
    doc.text(`Attendance Rate: ${rate}%`, 15, yPosition + 22);
    
    yPosition += 30;

    // Table with Navy Blue theme - Fixed data mapping
    const tableData = attendanceData.map(record => [
      record.studentName || 'Unknown',
      record.courseCode || 'N/A',
      record.checkInTime || 'N/A',
      record.sessionStart && record.sessionEnd ? `${record.sessionStart} - ${record.sessionEnd}` : 'N/A',
      record.location || 'N/A',
      record.method || 'N/A',
      record.status || 'N/A'
    ]);

    const tableHeaders = [
      'Student Name',
      'Course',
      'Check-in Time',
      'Session Time',
      'Location',
      'Method',
      'Status'
    ];

    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 31, 63], // Navy Blue
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
      },
    });
  }

  // Footer with Navy Blue theme
  doc.setFillColor(0, 31, 63);
  doc.rect(0, 280, 210, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 290);
  doc.text('Tally Check - Professional Attendance Management', 20, 295);

  // Save the PDF with proper error handling
  try {
    const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    console.log('PDF exported successfully:', filename);
  } catch (error) {
    console.error('Error saving PDF:', error);
  }
};

export const exportToCSV = (options: any) => {
  const { title, attendanceData, systemStats, lecturerStats, type } = options;

  let csvContent = '';

  if (type === 'analytics') {
    // Export systemStats
    if (systemStats) {
      const statsHeaders = Object.keys(systemStats);
      const statsValues = statsHeaders.map(key => systemStats[key]);
      csvContent += 'System Statistics\r\n';
      csvContent += statsHeaders.join(',') + '\r\n';
      csvContent += statsValues.join(',') + '\r\n\r\n';
    }
    // Export lecturerStats
    if (Array.isArray(lecturerStats) && lecturerStats.length > 0) {
      const lecturerHeaders = Object.keys(lecturerStats[0]);
      csvContent += 'Lecturer Statistics\r\n';
      csvContent += lecturerHeaders.join(',') + '\r\n';
      csvContent += lecturerStats.map(l => lecturerHeaders.map(h => `"${(l[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\r\n');
      csvContent += '\r\n';
    }
  } else if (Array.isArray(attendanceData) && attendanceData.length > 0) {
    // Define CSV headers (same as PDF table)
    const headers = [
      'Student Name',
      'Course',
      'Check-in Time',
      'Session Time',
      'Location',
      'Method',
      'Status'
    ];
    // Map attendanceData to CSV rows
    const rows = attendanceData.map(record => [
      record.studentName,
      record.courseCode,
      record.checkInTime,
      `${record.sessionStart} - ${record.sessionEnd}`,
      record.location,
      record.method,
      record.status
    ]);
    csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${(field ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
  } else {
    console.error("No data to export as CSV.");
    return;
  }

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Helper function to format attendance data for export
export const formatAttendanceDataForExport = (students: any[]) => {
  return students.map(student => ({
    studentName: student.name,
    studentId: student.studentId,
    courseCode: student.courseCode || 'N/A',
    checkInTime: student.checkInTime || 'N/A',
    method: student.method || 'N/A',
    status: student.status || 'N/A'
  }));
};

// Helper function to format analytics data for export
export const formatAnalyticsDataForExport = (systemStats: any, lecturerStats: any[]) => {
  return {
    systemStats: {
      totalStudents: systemStats?.totalStudents || 0,
      totalLecturers: systemStats?.totalLecturers || 0,
      totalCourses: systemStats?.totalCourses || 0,
      averageAttendanceRate: systemStats?.averageAttendanceRate || 0,
      todayAttendance: systemStats?.todayAttendance || 0
    },
    lecturerStats: lecturerStats?.map(lecturer => ({
      name: lecturer.name,
      email: lecturer.email,
      totalCourses: lecturer.totalCourses,
      totalSessions: lecturer.totalSessions,
      averageAttendance: lecturer.averageAttendance,
      performanceScore: lecturer.performanceScore
    })) || []
  };
}; 