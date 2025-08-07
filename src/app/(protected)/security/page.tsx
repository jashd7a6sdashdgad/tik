'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Lock, 
  Eye, 
  Fingerprint, 
  Key, 
  Trash2,
  Download,
  CheckCircle,
  Activity,
  FileText,
  Database,
  UserCheck,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';

import { biometricAuth } from '@/lib/security/biometricAuth';
import { smartPrivacy, PrivacySettings } from '@/lib/security/smartPrivacy';
import { auditLogger, AuditReport } from '@/lib/security/auditLogger';
import VoiceAssistantWidget from '@/components/VoiceAssistantWidget';

interface BiometricCapabilities {
  hasFingerprint: boolean;
  hasFaceID: boolean;
  hasVoice: boolean;
  hasPIN: boolean;
  platformSupport: string[];
}

interface SecurityStatus {
  biometricEnabled: boolean;
  encryptionEnabled: boolean;
  privacyModeActive: boolean;
  auditLoggingEnabled: boolean;
  passwordStrength: number;
  lastSecurityCheck: Date;
  threatLevel: 'low' | 'medium' | 'high';
  dataRetentionCompliant: boolean;
}

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    biometricEnabled: false,
    encryptionEnabled: true,
    privacyModeActive: false,
    auditLoggingEnabled: true,
    passwordStrength: 85,
    lastSecurityCheck: new Date(),
    threatLevel: 'low',
    dataRetentionCompliant: true,
  });
  
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      
      // Load biometric capabilities
      const capabilities = await biometricAuth.getCapabilities();
      setBiometricCapabilities(capabilities);
      
      // Load privacy settings
      const settings = await smartPrivacy.getSettings();
      setPrivacySettings(settings);
      
      // Load audit report
      const report = await auditLogger.generateReport();
      setAuditReport(report);
      
      // Update security status
      const credentials = await biometricAuth.getStoredCredentials();
      setSecurityStatus(prev => ({
        ...prev,
        biometricEnabled: credentials.length > 0,
        privacyModeActive: settings.autoDeleteEnabled,
      }));
      
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSetup = async () => {
    try {
      setIsLoading(true);
      const credential = await biometricAuth.register('user1', 'mahboob');
      if (credential) {
        await auditLogger.logSecurityEvent('biometric_setup', true);
        setSecurityStatus(prev => ({ ...prev, biometricEnabled: true }));
        alert('Biometric authentication set up successfully!');
      }
    } catch (error) {
      await auditLogger.logSecurityEvent('biometric_setup', false, 'user1', { error: error.message });
      alert(`Biometric setup failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricTest = async () => {
    try {
      setIsLoading(true);
      const result = await biometricAuth.authenticate();
      await auditLogger.logAuthEvent('biometric_auth', result.success, 'user1', { 
        biometricType: result.biometricType 
      });
      
      if (result.success) {
        alert(`Biometric authentication successful! Type: ${result.biometricType}`);
      } else {
        alert(`Authentication failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Authentication error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrivacySettings = async (updates: Partial<PrivacySettings>) => {
    try {
      await smartPrivacy.updateSettings(updates);
      const newSettings = await smartPrivacy.getSettings();
      setPrivacySettings(newSettings);
      
      await auditLogger.logPrivacyEvent('privacy_settings_changed', true, 'user1', { 
        changes: updates 
      });
      
      setSecurityStatus(prev => ({ 
        ...prev, 
        privacyModeActive: newSettings.autoDeleteEnabled 
      }));
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
    }
  };

  const runPrivacyCleanup = async () => {
    try {
      setIsLoading(true);
      const result = await smartPrivacy.cleanupExpiredData();
      
      await auditLogger.logPrivacyEvent('data_cleanup', true, 'user1', {
        deleted: result.deleted,
        anonymized: result.anonymized
      });
      
      alert(`Cleanup completed: ${result.deleted} items deleted, ${result.anonymized} items anonymized`);
    } catch (error) {
      console.error('Privacy cleanup failed:', error);
      alert('Privacy cleanup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const exportAuditLogs = async () => {
    try {
      setIsLoading(true);
      const logs = await auditLogger.exportLogs('json');
      
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await auditLogger.logAction('audit_export', 'security', { success: true }, 'user1');
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      alert('Failed to export audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const runSecurityScan = async () => {
    try {
      setIsLoading(true);
      
      // Simulate security scan
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const integrity = await auditLogger.verifyIntegrity();
      const privacyReport = await smartPrivacy.getPrivacyReport();
      
      let threatLevel: SecurityStatus['threatLevel'] = 'low';
      if (integrity.issues.length > 0 || privacyReport.itemsNearExpiry.length > 10) {
        threatLevel = 'medium';
      }
      
      setSecurityStatus(prev => ({
        ...prev,
        threatLevel,
        lastSecurityCheck: new Date(),
      }));
      
      await auditLogger.logSecurityEvent('security_scan', true, 'user1', {
        integrityIssues: integrity.issues.length,
        threatLevel,
      });
      
      alert(`Security scan completed. Threat level: ${threatLevel}`);
    } catch (error) {
      console.error('Security scan failed:', error);
      alert('Security scan failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Security & Privacy Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your security settings, privacy controls, and audit logs
          </p>
        </div>
        
        <Button 
          onClick={runSecurityScan} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Security Scan
        </Button>
      </div>

      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                securityStatus.threatLevel === 'low' ? 'bg-green-100' :
                securityStatus.threatLevel === 'medium' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Shield className={`w-4 h-4 ${
                  securityStatus.threatLevel === 'low' ? 'text-green-600' :
                  securityStatus.threatLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Threat Level</p>
                <p className="font-semibold capitalize text-gray-900 dark:text-gray-100">{securityStatus.threatLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Fingerprint className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Biometric Auth</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {securityStatus.biometricEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Privacy Mode</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {securityStatus.privacyModeActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Password Strength</p>
                <div className="flex items-center gap-2">
                  <Progress value={securityStatus.passwordStrength} className="w-16 h-2" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{securityStatus.passwordStrength}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="biometric">Biometric</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Activity className="w-5 h-5" />
                  Security Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-gray-100">Encryption</span>
                  <Badge variant={securityStatus.encryptionEnabled ? "default" : "destructive"}>
                    {securityStatus.encryptionEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-gray-100">Audit Logging</span>
                  <Badge variant={securityStatus.auditLoggingEnabled ? "default" : "destructive"}>
                    {securityStatus.auditLoggingEnabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-gray-100">Data Retention</span>
                  <Badge variant={securityStatus.dataRetentionCompliant ? "default" : "secondary"}>
                    {securityStatus.dataRetentionCompliant ? 'Compliant' : 'Review Needed'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-gray-100">Last Security Check</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {securityStatus.lastSecurityCheck.toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {auditReport && (
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <BarChart3 className="w-5 h-5" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Total Events</span>
                    <span className="font-semibold">{auditReport.totalEntries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Success Rate</span>
                    <span className="font-semibold text-green-600">
                      {auditReport.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Security Events</span>
                    <span className="font-semibold">{auditReport.securityEvents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Privacy Events</span>
                    <span className="font-semibold">{auditReport.privacyEvents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Anomalies</span>
                    <Badge variant={auditReport.anomalies.length > 0 ? "destructive" : "default"}>
                      {auditReport.anomalies.length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="biometric" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5" />
                Biometric Authentication
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Set up and manage biometric authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {biometricCapabilities && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`p-3 rounded-full mx-auto w-fit ${
                      biometricCapabilities.hasFingerprint ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Fingerprint className={`w-6 h-6 ${
                        biometricCapabilities.hasFingerprint ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">Fingerprint</p>
                    <p className="text-xs text-muted-foreground">
                      {biometricCapabilities.hasFingerprint ? 'Available' : 'Not Available'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`p-3 rounded-full mx-auto w-fit ${
                      biometricCapabilities.hasFaceID ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Eye className={`w-6 h-6 ${
                        biometricCapabilities.hasFaceID ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">Face ID</p>
                    <p className="text-xs text-muted-foreground">
                      {biometricCapabilities.hasFaceID ? 'Available' : 'Not Available'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`p-3 rounded-full mx-auto w-fit ${
                      biometricCapabilities.hasVoice ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Zap className={`w-6 h-6 ${
                        biometricCapabilities.hasVoice ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">Voice</p>
                    <p className="text-xs text-muted-foreground">
                      {biometricCapabilities.hasVoice ? 'Available' : 'Not Available'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="p-3 rounded-full mx-auto w-fit bg-blue-100">
                      <Key className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">PIN</p>
                    <p className="text-xs text-muted-foreground">Always Available</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-4">
                <Button 
                  onClick={handleBiometricSetup}
                  disabled={isLoading || !biometricCapabilities?.platformSupport.length}
                  className="flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Set Up Biometric
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleBiometricTest}
                  disabled={isLoading || !securityStatus.biometricEnabled}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Test Authentication
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Privacy Controls
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Manage data retention, auto-deletion, and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {privacySettings && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Auto-Delete Expired Data</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Automatically delete data after retention period
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.autoDeleteEnabled}
                      onCheckedChange={(checked) => 
                        updatePrivacySettings({ autoDeleteEnabled: checked })
                      }
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Data Retention Periods</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(privacySettings.retentionPeriods).map(([type, days]) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <span className="capitalize">{type.replace(/([A-Z])/g, ' $1')}</span>
                          <Badge variant="secondary">{days} days</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Data Minimization</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Collect only necessary data
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.dataMinimization.collectOnlyNecessary}
                      onCheckedChange={(checked) => 
                        updatePrivacySettings({
                          dataMinimization: {
                            ...privacySettings.dataMinimization,
                            collectOnlyNecessary: checked
                          }
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={runPrivacyCleanup}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Run Cleanup Now
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encryption" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Encryption Management
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Manage encrypted storage and data protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-medium">AES-256</p>
                  <p className="text-sm text-muted-foreground">Encryption Standard</p>
                </div>
                
                <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Key className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium">PBKDF2</p>
                  <p className="text-sm text-muted-foreground">Key Derivation</p>
                </div>
                
                <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-medium">Client-Side</p>
                  <p className="text-sm text-muted-foreground">Zero-Knowledge</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Encrypted Storage Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Sensitive Data</span>
                    <Badge variant="default">Encrypted</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Authentication Data</span>
                    <Badge variant="default">Encrypted</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Audit Logs</span>
                    <Badge variant="default">Encrypted</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Personal Information</span>
                    <Badge variant="default">Encrypted</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Logs
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Review system activity and security events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {auditReport && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{auditReport.totalEntries}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {auditReport.successRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{auditReport.securityEvents}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Security Events</p>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{auditReport.anomalies.length}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Anomalies</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Event Categories</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(auditReport.entriesByCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm capitalize text-gray-900 dark:text-gray-100">{category}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Top Actions</h4>
                    <div className="space-y-2">
                      {auditReport.topActions.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{item.action.replace(/_/g, ' ')}</span>
                          <Badge variant="outline">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={exportAuditLogs}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Logs
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Voice Assistant Widget */}
      <VoiceAssistantWidget 
        page="security" 
        position="fixed"
        size="md"
      />
    </div>
  );
}