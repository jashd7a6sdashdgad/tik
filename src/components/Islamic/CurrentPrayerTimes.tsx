'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, Compass, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { prayerTimesService, PrayerTimesData, PrayerSettings, PrayerTime } from '@/lib/islamic/prayerTimes';

interface CurrentPrayerTimesProps {
  settings: PrayerSettings;
}

export function CurrentPrayerTimes({ settings }: CurrentPrayerTimesProps) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        setLoading(true);
        setError(null);
        const times = await prayerTimesService.getPrayerTimes();
        setPrayerTimes(times);
        
        // Find next prayer
        const next = await prayerTimesService.getNextPrayer();
        setNextPrayer(next);
      } catch (err) {
        setError('Failed to fetch prayer times');
        console.error('Error fetching prayer times:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrayerTimes();
  }, [settings]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const applyAdjustment = (time: string, adjustment: number): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + adjustment;
    
    const adjustedHours = Math.floor(totalMinutes / 60) % 24;
    const adjustedMinutes = totalMinutes % 60;
    
    return `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (prayerTime: string): string => {
    const now = currentTime;
    const [hours, minutes] = prayerTime.split(':').map(Number);
    const prayer = new Date();
    prayer.setHours(hours, minutes, 0, 0);
    
    if (prayer < now) {
      prayer.setDate(prayer.getDate() + 1);
    }
    
    const diff = prayer.getTime() - now.getTime();
    const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursRemaining > 0) {
      return `${hoursRemaining}h ${minutesRemaining}m`;
    }
    return `${minutesRemaining}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading prayer times...</span>
      </div>
    );
  }

  if (error || !prayerTimes) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error || 'Unable to load prayer times'}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Please check your internet connection and location settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location and Date Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4" />
          <span>{prayerTimes.location.city}, {prayerTimes.location.country}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>{currentTime.toLocaleDateString()}</span>
        </div>
      </div>

      <Separator />

      {/* Prayer Times Grid */}
      <div className="grid grid-cols-1 gap-3">
        {prayerTimes.prayers.map((prayer) => {
          const adjustedTime = applyAdjustment(prayer.time, settings.adjustments[prayer.name]);
          const adjustment = settings.adjustments[prayer.name];
          const isNext = nextPrayer?.name === prayer.name;
          
          return (
            <div 
              key={prayer.name} 
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isNext ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${isNext ? 'bg-blue-500' : 'bg-gray-400'}`} />
                <div>
                  <div className="font-medium capitalize">{prayer.displayName}</div>
                  {adjustment !== 0 && (
                    <div className="text-xs text-muted-foreground">
                      Original: {prayer.time} ({adjustment > 0 ? '+' : ''}{adjustment}m)
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="font-mono text-lg">{adjustedTime}</div>
                  {isNext && (
                    <div className="text-xs text-blue-600">
                      in {getTimeRemaining(adjustedTime)}
                    </div>
                  )}
                </div>
                {isNext && (
                  <Badge variant="default" className="bg-blue-500">
                    Next
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sunrise:</span>
            <span className="font-mono">{prayerTimes.sunrise}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sunset:</span>
            <span className="font-mono">{prayerTimes.sunset}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Qibla:</span>
            <div className="flex items-center space-x-1">
              <Compass className="h-3 w-3" />
              <span className="font-mono">{Math.round(prayerTimes.qiblaDirection)}°</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method:</span>
            <span className="text-xs">{prayerTimes.calculationMethod}</span>
          </div>
        </div>
      </div>

      {/* Legend for adjustments */}
      {Object.values(settings.adjustments).some(adj => adj !== 0) && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Prayer times shown include your manual adjustments. 
            Original times are displayed in gray when adjustments are applied.
          </p>
        </div>
      )}
    </div>
  );
}