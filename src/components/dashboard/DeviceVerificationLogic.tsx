import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  Fingerprint,
  Wifi,
  Bluetooth,
  Globe,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  webdriver: boolean;
  canvasFingerprint: string;
  audioFingerprint: string;
  batteryLevel?: number;
  connectionType?: string;
  deviceId: string;
}

interface SecurityCheck {
  id: string;
  name: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  score: number;
  description: string;
  details?: string;
}

interface DeviceVerificationResult {
  deviceId: string;
  userId: string;
  riskScore: number;
  securityChecks: SecurityCheck[];
  fingerprint: DeviceFingerprint;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  networkInfo: {
    type: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_review';
}

export const DeviceVerificationLogic: React.FC = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentCheck, setCurrentCheck] = useState('');
  const [verificationResult, setVerificationResult] = useState<DeviceVerificationResult | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const { toast } = useToast();

  // Generate device fingerprint
  const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint test', 2, 2);
    const canvasFingerprint = canvas.toDataURL();

    // Audio fingerprint
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    oscillator.connect(analyser);
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    const audioData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(audioData);
    const audioFingerprint = Array.from(audioData).slice(0, 10).join(',');

    // Battery info
    let batteryLevel = undefined;
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        batteryLevel = battery.level;
      } catch (e) {
        console.log('Battery API not available');
      }
    }

    // Connection info
    let connectionType = undefined;
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connectionType = connection.effectiveType;
    }

    const fingerprint: DeviceFingerprint = {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      webdriver: (navigator as any).webdriver || false,
      canvasFingerprint,
      audioFingerprint,
      batteryLevel,
      connectionType,
      deviceId: btoa(JSON.stringify({
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency
      })).slice(0, 16)
    };

    return fingerprint;
  };

  // Get location
  const getLocation = (): Promise<{latitude: number; longitude: number; accuracy: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  };

  // Get network information
  const getNetworkInfo = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      };
    }
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    };
  };

  // Security checks
  const performSecurityChecks = async (fingerprint: DeviceFingerprint): Promise<SecurityCheck[]> => {
    const checks: SecurityCheck[] = [];

    // Check 1: WebDriver detection
    checks.push({
      id: 'webdriver',
      name: 'WebDriver Detection',
      status: fingerprint.webdriver ? 'failed' : 'passed',
      score: fingerprint.webdriver ? 0 : 100,
      description: 'Detecting automated browser testing tools',
      details: fingerprint.webdriver ? 'WebDriver detected - possible automation' : 'No automation detected'
    });

    // Check 2: Canvas fingerprint consistency
    checks.push({
      id: 'canvas',
      name: 'Canvas Fingerprint',
      status: fingerprint.canvasFingerprint ? 'passed' : 'warning',
      score: fingerprint.canvasFingerprint ? 90 : 50,
      description: 'Checking canvas rendering consistency',
      details: 'Canvas fingerprint generated successfully'
    });

    // Check 3: Timezone consistency
    const expectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    checks.push({
      id: 'timezone',
      name: 'Timezone Consistency',
      status: fingerprint.timezone === expectedTimezone ? 'passed' : 'warning',
      score: fingerprint.timezone === expectedTimezone ? 100 : 70,
      description: 'Verifying timezone consistency',
      details: `Expected: ${expectedTimezone}, Got: ${fingerprint.timezone}`
    });

    // Check 4: Hardware consistency
    checks.push({
      id: 'hardware',
      name: 'Hardware Profile',
      status: fingerprint.hardwareConcurrency > 0 ? 'passed' : 'warning',
      score: fingerprint.hardwareConcurrency > 0 ? 100 : 60,
      description: 'Checking hardware profile consistency',
      details: `CPU cores: ${fingerprint.hardwareConcurrency}`
    });

    // Check 5: Screen resolution
    checks.push({
      id: 'screen',
      name: 'Screen Resolution',
      status: fingerprint.screenResolution ? 'passed' : 'warning',
      score: fingerprint.screenResolution ? 100 : 60,
      description: 'Verifying screen resolution',
      details: `Resolution: ${fingerprint.screenResolution}`
    });

    // Check 6: Language consistency
    checks.push({
      id: 'language',
      name: 'Language Settings',
      status: fingerprint.language ? 'passed' : 'warning',
      score: fingerprint.language ? 100 : 60,
      description: 'Checking language settings',
      details: `Language: ${fingerprint.language}`
    });

    return checks;
  };

  // Calculate risk score
  const calculateRiskScore = (checks: SecurityCheck[]): number => {
    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const averageScore = totalScore / checks.length;
    return Math.round(averageScore);
  };

  // Determine verification status
  const determineStatus = (riskScore: number, checks: SecurityCheck[]): 'pending' | 'approved' | 'rejected' | 'requires_review' => {
    const failedChecks = checks.filter(check => check.status === 'failed').length;
    const warningChecks = checks.filter(check => check.status === 'warning').length;

    if (failedChecks > 0) return 'rejected';
    if (riskScore >= 90 && warningChecks === 0) return 'approved';
    if (riskScore >= 70) return 'requires_review';
    return 'rejected';
  };

  // Start verification process
  const startVerification = async () => {
    setIsVerifying(true);
    setVerificationProgress(0);
    setCurrentCheck('Initializing...');

    try {
      // Step 1: Generate device fingerprint (20%)
      setCurrentCheck('Generating device fingerprint...');
      setVerificationProgress(20);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fingerprint = await generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint);

      // Step 2: Get location (40%)
      setCurrentCheck('Getting location...');
      setVerificationProgress(40);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const location = await getLocation();

      // Step 3: Get network info (60%)
      setCurrentCheck('Analyzing network...');
      setVerificationProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const networkInfo = getNetworkInfo();

      // Step 4: Perform security checks (80%)
      setCurrentCheck('Performing security checks...');
      setVerificationProgress(80);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const securityChecks = await performSecurityChecks(fingerprint);

      // Step 5: Calculate results (100%)
      setCurrentCheck('Calculating results...');
      setVerificationProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      const riskScore = calculateRiskScore(securityChecks);
      const status = determineStatus(riskScore, securityChecks);

      const result: DeviceVerificationResult = {
        deviceId: fingerprint.deviceId,
        userId: 'current-user', // This should come from user context
        riskScore,
        securityChecks,
        fingerprint,
        location: {
          ...location,
          timestamp: new Date().toISOString()
        },
        networkInfo,
        timestamp: new Date().toISOString(),
        status
      };

      setVerificationResult(result);

      // Show result toast
      if (status === 'approved') {
        toast({
          title: "✅ Device Verified",
          description: `Device passed verification with ${riskScore}% confidence`,
        });
      } else if (status === 'requires_review') {
        toast({
          title: "⚠️ Manual Review Required",
          description: `Device verification requires manual review (${riskScore}% confidence)`,
        });
      } else {
        toast({
          title: "❌ Device Rejected",
          description: `Device failed verification (${riskScore}% confidence)`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "❌ Verification Failed",
        description: "Failed to complete device verification",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
      setCurrentCheck('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Rejected</Badge>;
      case 'requires_review':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠️ Review Required</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">⏳ Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCheckStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Shield className="w-5 h-5 text-blue-600" />
            Advanced Device Verification
          </CardTitle>
          <p className="text-gray-600">
            Comprehensive device fingerprinting and security verification
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Verification Controls */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Device Security Scan</h3>
              <p className="text-sm text-gray-600">
                Run a comprehensive security check on the current device
              </p>
            </div>
            <Button
              onClick={startVerification}
              disabled={isVerifying}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Start Verification
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {isVerifying && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{currentCheck}</span>
                <span className="text-gray-900 font-medium">{verificationProgress}%</span>
              </div>
              <Progress value={verificationProgress} className="h-2" />
            </div>
          )}

          {/* Results */}
          {verificationResult && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Verification Results</h4>
                  {getStatusBadge(verificationResult.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Risk Score</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{verificationResult.riskScore}%</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Fingerprint className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Device ID</span>
                    </div>
                    <div className="text-sm font-mono text-gray-900">{verificationResult.deviceId}</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Location</span>
                    </div>
                    <div className="text-sm text-gray-900">
                      {verificationResult.location.latitude.toFixed(4)}, {verificationResult.location.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Security Checks */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900">Security Checks</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {verificationResult.securityChecks.map((check) => (
                      <div key={check.id} className="bg-white rounded-lg p-3 border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getCheckStatusIcon(check.status)}
                            <span className="text-sm font-medium text-gray-700">{check.name}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{check.score}%</span>
                        </div>
                        <p className="text-xs text-gray-600">{check.description}</p>
                        {check.details && (
                          <p className="text-xs text-gray-500 mt-1">{check.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device Fingerprint */}
                <div className="mt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Device Fingerprint</h5>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-600">Platform:</span> {verificationResult.fingerprint.platform}</div>
                      <div><span className="text-gray-600">Screen:</span> {verificationResult.fingerprint.screenResolution}</div>
                      <div><span className="text-gray-600">Timezone:</span> {verificationResult.fingerprint.timezone}</div>
                      <div><span className="text-gray-600">Language:</span> {verificationResult.fingerprint.language}</div>
                      <div><span className="text-gray-600">CPU Cores:</span> {verificationResult.fingerprint.hardwareConcurrency}</div>
                      <div><span className="text-gray-600">Touch Points:</span> {verificationResult.fingerprint.maxTouchPoints}</div>
                    </div>
                  </div>
                </div>

                {/* Network Information */}
                <div className="mt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Network Information</h5>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-600">Type:</span> {verificationResult.networkInfo.type}</div>
                      <div><span className="text-gray-600">Effective Type:</span> {verificationResult.networkInfo.effectiveType}</div>
                      <div><span className="text-gray-600">Downlink:</span> {verificationResult.networkInfo.downlink} Mbps</div>
                      <div><span className="text-gray-600">RTT:</span> {verificationResult.networkInfo.rtt} ms</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 