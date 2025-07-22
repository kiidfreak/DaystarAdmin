# 📱 Mobile App QR Code Integration Guide

## 🎯 **Overview**
This guide explains how to integrate QR code functionality into the mobile app for student check-in, using the `check_in_prompts` table.

## 🗄️ **Database Schema**

### `check_in_prompts` Table
```sql
CREATE TABLE check_in_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  course_name TEXT NOT NULL,
  created_timestamp BIGINT NOT NULL, -- Unix timestamp
  expires_at BIGINT NOT NULL, -- Unix timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 **API Endpoints**

### 1. **Validate QR Code**
```typescript
// POST /api/qr/validate
interface QRValidationRequest {
  qrCodeId: string;
  studentId: string;
}

interface QRValidationResponse {
  success: boolean;
  courseId: string;
  courseName: string;
  sessionId?: string;
  message: string;
}
```

### 2. **Get Active QR Codes**
```typescript
// GET /api/qr/active/{courseId}
interface ActiveQRResponse {
  id: string;
  courseId: string;
  courseName: string;
  expiresAt: number;
  timeLeft: number; // seconds
}
```

## 📱 **Mobile App Implementation**

### **1. QR Code Scanner Component**
```typescript
import React, { useState, useEffect } from 'react';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface QRScannerProps {
  onQRCodeScanned: (qrCodeId: string) => void;
  onError: (error: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onQRCodeScanned, onError }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    onQRCodeScanned(data);
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={{ flex: 1 }}
      />
      {scanned && (
        <TouchableOpacity onPress={() => setScanned(false)}>
          <Text>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

### **2. QR Code Validation Service**
```typescript
// services/qrCodeService.ts
import { supabase } from '../lib/supabase';

export class QRCodeService {
  static async validateQRCode(qrCodeId: string, studentId: string) {
    try {
      // First, validate the QR code exists and is not expired
      const { data: qrCode, error: qrError } = await supabase
        .from('check_in_prompts')
        .select(`
          *,
          courses!check_in_prompts_course_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq('id', qrCodeId)
        .gte('expires_at', Date.now())
        .single();

      if (qrError || !qrCode) {
        throw new Error('Invalid or expired QR code');
      }

      // Check if student is enrolled in the course
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_course_enrollments')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', qrCode.course_id)
        .eq('status', 'active')
        .single();

      if (enrollmentError || !enrollment) {
        throw new Error('Student not enrolled in this course');
      }

      // Find active session for the course
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const { data: session, error: sessionError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('course_id', qrCode.course_id)
        .eq('session_date', today)
        .gte('start_time', currentTime)
        .lte('end_time', currentTime)
        .single();

      if (sessionError || !session) {
        throw new Error('No active session found for this course');
      }

      // Create attendance record
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .insert({
          student_id: studentId,
          session_id: session.id,
          course_id: qrCode.course_id,
          course_code: qrCode.courses?.code,
          course_name: qrCode.courses?.name,
          date: today,
          status: 'verified',
          method: 'QR',
          check_in_time: new Date().toISOString(),
          verified_by: null
        })
        .select()
        .single();

      if (attendanceError) {
        throw new Error('Failed to record attendance');
      }

      return {
        success: true,
        courseId: qrCode.course_id,
        courseName: qrCode.courses?.name || qrCode.course_name,
        sessionId: session.id,
        message: 'Attendance recorded successfully'
      };

    } catch (error) {
      return {
        success: false,
        courseId: '',
        courseName: '',
        sessionId: '',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getActiveQRCode(courseId: string) {
    try {
      const { data, error } = await supabase
        .from('check_in_prompts')
        .select('*')
        .eq('course_id', courseId)
        .gte('expires_at', Date.now())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }
}
```

### **3. QR Code Check-in Screen**
```typescript
// screens/QRCheckInScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { QRScanner } from '../components/QRScanner';
import { QRCodeService } from '../services/qrCodeService';
import { useAuth } from '../hooks/useAuth';

export const QRCheckInScreen: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const { user } = useAuth();

  const handleQRCodeScanned = async (qrCodeId: string) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to check in');
      return;
    }

    setCheckingIn(true);
    setIsScanning(false);

    try {
      const result = await QRCodeService.validateQRCode(qrCodeId, user.id);
      
      if (result.success) {
        Alert.alert(
          'Check-in Successful!',
          `You have been checked in for ${result.courseName}`,
          [{ text: 'OK', onPress: () => setIsScanning(true) }]
        );
      } else {
        Alert.alert('Check-in Failed', result.message, [
          { text: 'OK', onPress: () => setIsScanning(true) }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred', [
        { text: 'OK', onPress: () => setIsScanning(true) }
      ]);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleError = (error: string) => {
    Alert.alert('Scanner Error', error);
  };

  if (checkingIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Processing check-in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Code Check-in</Text>
      <Text style={styles.subtitle}>Scan the QR code displayed by your instructor</Text>
      
      {isScanning ? (
        <QRScanner
          onQRCodeScanned={handleQRCodeScanned}
          onError={handleError}
        />
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setIsScanning(true)}
          >
            <Text style={styles.buttonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
  },
});
```

## 🔄 **Real-time Updates**

### **1. QR Code Status Subscription**
```typescript
// hooks/useQRCodeStatus.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useQRCodeStatus = (courseId: string) => {
  const [activeQRCode, setActiveQRCode] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    // Get initial QR code status
    const getActiveQRCode = async () => {
      const { data } = await supabase
        .from('check_in_prompts')
        .select('*')
        .eq('course_id', courseId)
        .gte('expires_at', Date.now())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveQRCode(data);
        const remaining = Math.max(0, data.expires_at - Date.now());
        setTimeLeft(Math.floor(remaining / 1000));
      }
    };

    getActiveQRCode();

    // Subscribe to QR code changes
    const subscription = supabase
      .channel('qr-code-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_in_prompts',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setActiveQRCode(payload.new);
            const remaining = Math.max(0, payload.new.expires_at - Date.now());
            setTimeLeft(Math.floor(remaining / 1000));
          } else if (payload.eventType === 'DELETE') {
            setActiveQRCode(null);
            setTimeLeft(0);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [courseId]);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeQRCode && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setActiveQRCode(null);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQRCode, timeLeft]);

  return { activeQRCode, timeLeft };
};
```

## 🎨 **UI Components**

### **1. QR Code Display Component**
```typescript
// components/QRCodeDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeDisplayProps {
  qrCodeId: string;
  courseName: string;
  timeLeft: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeId,
  courseName,
  timeLeft
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{courseName}</Text>
      <Text style={styles.subtitle}>QR Code Check-in</Text>
      
      <View style={styles.qrContainer}>
        <QRCode
          value={qrCodeId}
          size={200}
          color="#000000"
          backgroundColor="#ffffff"
        />
      </View>
      
      <Text style={styles.timer}>Time remaining: {formatTime(timeLeft)}</Text>
      <Text style={styles.instruction}>
        Students can scan this QR code to check in
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  timer: {
    fontSize: 18,
    color: '#8b5cf6',
    fontWeight: '600',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});
```

## 🧪 **Testing Checklist**

### **QR Code Generation**
- [ ] Admin can generate QR codes for specific courses
- [ ] QR codes have configurable expiration times
- [ ] QR codes are stored in the database
- [ ] QR code history is maintained

### **QR Code Scanning**
- [ ] Mobile app can scan QR codes
- [ ] QR code validation works correctly
- [ ] Student enrollment is verified
- [ ] Active session is found
- [ ] Attendance is recorded properly

### **Real-time Updates**
- [ ] QR code status updates in real-time
- [ ] Countdown timer works correctly
- [ ] QR code expires automatically
- [ ] Mobile app receives updates

### **Error Handling**
- [ ] Invalid QR codes are rejected
- [ ] Expired QR codes are rejected
- [ ] Unenrolled students are rejected
- [ ] No active session errors are handled
- [ ] Network errors are handled gracefully

## 🚀 **Deployment Notes**

1. **Database Migration**: Ensure the `check_in_prompts` table is created
2. **API Endpoints**: Deploy QR code validation endpoints
3. **Mobile App**: Update mobile app with QR scanning functionality
4. **Real-time**: Configure Supabase real-time subscriptions
5. **Testing**: Test QR code flow end-to-end

## 📊 **Analytics Integration**

The QR code system integrates with the existing attendance analytics:
- QR check-ins are recorded with `method: 'QR'`
- Check-in times are stored for detailed reporting
- QR usage statistics are available in admin dashboard
- Course-specific QR code history is maintained

This implementation provides a robust, database-backed QR code system for student check-in with real-time updates and comprehensive error handling. 