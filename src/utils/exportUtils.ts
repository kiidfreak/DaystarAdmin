export const exportToCSV = async (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content with BOM for Excel compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in the value
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',')
    )
  ].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
  }
};

export const exportToExcel = async (data: any[], filename: string) => {
  // For now, we'll use CSV format as Excel can open CSV files
  // In a real implementation, you might want to use a library like 'xlsx'
  await exportToCSV(data, filename.replace('.xlsx', ''));
};

export const exportAttendanceReport = async (data: any[], format: 'csv' | 'excel' = 'csv') => {
  const exportData = data.map(record => ({
    'Student Name': record.users?.full_name || 'Unknown',
    'Student ID': record.users?.email || record.student_id || 'Unknown',
    'Course Code': record.course_code || 'Unknown',
    'Check-in Time': record.check_in_time ? new Date(record.check_in_time).toLocaleString() : 'N/A',
    'Check-out Time': record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'N/A',
    'Method': record.method || 'Unknown',
    'Status': record.status || 'Unknown',
    'Beacon ID': record.beacon_id || record.beacon_mac_address || 'N/A',
    'Date': record.date || new Date(record.check_in_time).toLocaleDateString()
  }));

  if (format === 'csv') {
    await exportToCSV(exportData, `attendance_report_${new Date().toISOString().split('T')[0]}`);
  } else {
    await exportToExcel(exportData, `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}; 