'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Moon, Clock, MapPin } from 'lucide-react';
import { prayerTimesService, PrayerTimesData, PrayerTime } from '@/lib/islamic/prayerTimes';
import { islamicCalendarService } from '@/lib/islamic/islamicCalendar';

interface PrayerTimesWidgetProps {
  compact?: boolean;
  showLocation?: boolean;
  showHijriDate?: boolean;
}

export default function PrayerTimesWidget({ 
  compact = false, 
  showLocation = true,
  showHijriDate = true 
}: PrayerTimesWidgetProps) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hijriDate, setHijriDate] = useState<string>('');

  useEffect(() => {
    const loadPrayerTimes = async () => {
      try {
        const times = await prayerTimesService.getPrayerTimes();
        setPrayerTimes(times);
        
        const next = await prayerTimesService.getNextPrayer();
        setNextPrayer(next);
        
        if (showHijriDate) {
          const hijri = islamicCalendarService.getTodaysHijriDate();
          setHijriDate(hijri.formatted);
        }
      } catch (error) {
        console.error('Failed to load prayer times:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrayerTimes();

    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Refresh prayer times every hour
    const prayerInterval = setInterval(loadPrayerTimes, 3600000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(prayerInterval);
    };
  }, [showHijriDate]);

  const getTimeRemaining = (prayerTime: string) => {
    const now = new Date();
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
      <Card className={compact ? 'w-full' : 'w-full max-w-md'}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prayerTimes) {
    return (
      <Card className={compact ? 'w-full' : 'w-full max-w-md'}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Unable to load prayer times
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">
                {nextPrayer ? `Next: ${nextPrayer.displayName}` : 'Prayer Times'}
              </span>
            </div>
            {nextPrayer && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {nextPrayer.time}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {getTimeRemaining(nextPrayer.time)}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Moon className="h-5 w-5 text-green-600" />
          <span>Prayer Times</span>
        </CardTitle>
        {showLocation && prayerTimes.location && (
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{prayerTimes.location.city}, {prayerTimes.location.country}</span>
          </div>
        )}
        {showHijriDate && hijriDate && (
          <p className="text-sm text-muted-foreground">{hijriDate}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {prayerTimes.prayers.map((prayer, index) => (
          <div 
            key={prayer.name}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              prayer.isNext 
                ? 'bg-green-50 border border-green-200' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                prayer.isNext ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className={`font-medium ${
                prayer.isNext ? 'text-green-700' : 'text-gray-700'
              }`}>
                {prayer.displayName}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{prayer.time}</span>
              </div>
              
              {prayer.isNext && prayer.timeRemaining && (
                <Badge variant="secondary" className="text-xs">
                  {prayer.timeRemaining}
                </Badge>
              )}
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sunrise: {prayerTimes.sunrise}</span>
            <span>Sunset: {prayerTimes.sunset}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Method: {prayerTimes.calculationMethod}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}