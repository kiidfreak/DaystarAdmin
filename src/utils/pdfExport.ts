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

  // Header
  doc.setFontSize(20);
  doc.setTextColor(75, 0, 130); // Purple color
  doc.text(title, 20, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${date}`, 20, 30);

  if (type === 'analytics') {
    // System Statistics Section
    if (systemStats) {
      doc.setFontSize(14);
      doc.setTextColor(75, 0, 130);
      doc.text('System Statistics', 20, 45);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      let y = 55;
      Object.entries(systemStats).forEach(([key, value]) => {
        doc.text(`${key.replace(/([A-Z])/g, ' $1')}: ${value}`, 20, y);
        y += 7;
      });
    }
    // Lecturer Statistics Table
    if (Array.isArray(lecturerStats) && lecturerStats.length > 0) {
      const tableHeaders = Object.keys(lecturerStats[0]).map(h => h.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()));
      const tableData = lecturerStats.map(l => Object.values(l));
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 100,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [75, 0, 130],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
    }
  } else {
    if (!Array.isArray(attendanceData)) {
      console.error("attendanceData is undefined or not an array.");
      return;
    }
    // Statistics
    const total = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'verified').length;
    const absent = attendanceData.filter(r => r.status === 'absent').length;
    const late = attendanceData.filter(r => r.status === 'pending').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    doc.setFontSize(14);
    doc.setTextColor(75, 0, 130);
    doc.text('Summary Statistics', 20, 45);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Records: ${total}`, 20, 55);
    doc.text(`Present: ${present}`, 20, 62);
    doc.text(`Absent: ${absent}`, 20, 69);
    doc.text(`Late: ${late}`, 20, 76);
    doc.text(`Attendance Rate: ${rate}%`, 20, 83);

    // Table
    const tableData = attendanceData.map(record => [
      record.studentName,
      record.courseCode,
      record.checkInTime,
      `${record.sessionStart} - ${record.sessionEnd}`,
      record.location,
      record.method,
      record.status
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

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 95,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [75, 0, 130],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
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

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, 20, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
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