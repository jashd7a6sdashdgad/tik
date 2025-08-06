'use client';

import { useState } from 'react';
import { SyncConflict } from '@/lib/sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, User, Smartphone, Monitor } from 'lucide-react';

interface SyncConflictDialogProps {
  conflict: SyncConflict | null;
  onResolve: (conflict: SyncConflict, useLocal: boolean) => void;
  onClose: () => void;
}

export default function SyncConflictDialog({ 
  conflict, 
  onResolve, 
  onClose 
}: SyncConflictDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | null>(null);

  if (!conflict) return null;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDataPreview = (data: any) => {
    if (!data) return 'No data';
    
    // Extract key information based on data type
    if (data.description) return data.description;
    if (data.name) return data.name;
    if (data.title) return data.title;
    if (data.content) return data.content.slice(0, 100) + '...';
    
    return JSON.stringify(data).slice(0, 100) + '...';
  };

  const handleResolve = () => {
    if (!selectedResolution) return;
    onResolve(conflict, selectedResolution === 'local');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div>
              <CardTitle className="text-xl">Sync Conflict Detected</CardTitle>
              <CardDescription>
                The same {conflict.type} has been modified on multiple devices. 
                Choose which version to keep.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Local Version */}
            <div className="space-y-4">
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedResolution === 'local' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedResolution('local')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-lg">Local Version</h3>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    This Device
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    Modified: {formatTimestamp(conflict.localData.lastModified || Date.now())}
                  </div>
                  
                  <div className="mt-3">
                    <h4 className="font-medium mb-2">Content Preview:</h4>
                    <div className="bg-gray-50 p-3 rounded border text-sm">
                      {getDataPreview(conflict.localData)}
                    </div>
                  </div>
                  
                  {conflict.localData.synced === false && (
                    <Badge variant="outline" className="mt-2">
                      Not synced yet
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Remote Version */}
            <div className="space-y-4">
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedResolution === 'remote' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedResolution('remote')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Monitor className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">Remote Version</h3>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Other Device
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    Modified: {formatTimestamp(conflict.timestamp)}
                  </div>
                  
                  <div className="mt-3">
                    <h4 className="font-medium mb-2">Content Preview:</h4>
                    <div className="bg-gray-50 p-3 rounded border text-sm">
                      {getDataPreview(conflict.remoteData)}
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="mt-2 bg-blue-50">
                    From cloud
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Comparison */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Detailed Comparison</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2 text-green-700">Local Changes</h4>
                <pre className="bg-green-50 p-3 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(conflict.localData, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-blue-700">Remote Changes</h4>
                <pre className="bg-blue-50 p-3 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(conflict.remoteData, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Conflict Resolution Options */}
          <div className="border-t mt-6 pt-6">
            <h3 className="font-semibold mb-4">Resolution Strategy</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="keep-local"
                  name="resolution"
                  checked={selectedResolution === 'local'}
                  onChange={() => setSelectedResolution('local')}
                  className="mt-1"
                />
                <label htmlFor="keep-local" className="cursor-pointer">
                  <div className="font-medium">Keep Local Version</div>
                  <div className="text-sm text-gray-600">
                    Use the version from this device and sync it to other devices
                  </div>
                </label>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="keep-remote"
                  name="resolution"
                  checked={selectedResolution === 'remote'}
                  onChange={() => setSelectedResolution('remote')}
                  className="mt-1"
                />
                <label htmlFor="keep-remote" className="cursor-pointer">
                  <div className="font-medium">Keep Remote Version</div>
                  <div className="text-sm text-gray-600">
                    Use the version from the other device and overwrite local changes
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={!selectedResolution}
              className="min-w-24"
            >
              Resolve Conflict
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}