'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Droplets, 
  Eye, 
  Thermometer,
  MapPin,
  RefreshCw,
  Search,
  Loader2
} from 'lucide-react';
import VoiceAssistantWidget from '@/components/VoiceAssistantWidget';

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
  current: {
    temperature_c: number;
    temperature_f: number;
    condition: string;
    icon: string;
    humidity: number;
    wind_kph: number;
    wind_dir: string;
    pressure_mb: number;
    feelslike_c: number;
    feelslike_f: number;
    uv: number;
  };
}

export default function WeatherPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState('muscat');
  const [searchLocation, setSearchLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (loc: string = location) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching weather for:', loc);
      const response = await fetch(`/api/weather?q=${encodeURIComponent(loc)}`);
      const data = await response.json();
      
      if (data.success) {
        setWeatherData(data.data);
        setLocation(loc);
      } else {
        setError(data.message || 'Failed to fetch weather data');
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Unable to fetch weather data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const handleSearch = () => {
    if (searchLocation.trim()) {
      fetchWeather(searchLocation.trim());
      setSearchLocation('');
    }
  };

  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
      return <Sun className="h-12 w-12 text-yellow-500" />;
    } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return <CloudRain className="h-12 w-12 text-blue-500" />;
    } else if (lowerCondition.includes('snow')) {
      return <CloudSnow className="h-12 w-12 text-blue-200" />;
    } else if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
      return <Cloud className="h-12 w-12 text-gray-500" />;
    } else {
      return <Sun className="h-12 w-12 text-yellow-500" />;
    }
  };

  const formatLocalTime = (localtime: string) => {
    try {
      const date = new Date(localtime);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return localtime;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl shadow-lg">
                <Sun className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('weatherTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('realTimeWeatherInfo')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchWeather()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
            </div>
          </div>
        </div>
        {/* Search Section */}
        <Card className="card-3d mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Search className="h-5 w-5 mr-2 text-primary" />
              {t('searchLocation')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder={t('enterCityName')}
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 text-black"
                disabled={loading}
              />
              <Button
                onClick={handleSearch}
                disabled={!searchLocation.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="card-3d">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-black mb-2">{t('error')}</h3>
                <p className="text-black">{error}</p>
                <Button
                  className="mt-4"
                  onClick={() => fetchWeather()}
                >
                  {t('tryAgain')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card className="card-3d">
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-black">{t('loadingWeatherData')}</p>
              </div>
            </CardContent>
          </Card>
        ) : weatherData ? (
          <div className="space-y-8">
            {/* Main Weather Card */}
            <Card className="card-3d">
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <MapPin className="h-5 w-5 mr-2 text-primary" />
                    <h2 className="text-2xl font-bold text-black">
                      {weatherData.location.name}, {weatherData.location.region}
                    </h2>
                  </div>
                  
                  <p className="text-black mb-6">
                    {formatLocalTime(weatherData.location.localtime)}
                  </p>

                  <div className="flex items-center justify-center space-x-8 mb-8">
                    <div className="text-center">
                      {weatherData.current.icon ? (
                        <img
                          src={`https:${weatherData.current.icon}`}
                          alt={weatherData.current.condition}
                          className="w-24 h-24 mx-auto mb-2"
                        />
                      ) : (
                        <div className="mb-2">
                          {getWeatherIcon(weatherData.current.condition)}
                        </div>
                      )}
                      <p className="text-black font-medium">
                        {weatherData.current.condition}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-6xl font-bold text-primary mb-2">
                        {Math.round(weatherData.current.temperature_c)}°
                      </div>
                      <p className="text-black">
                        {t('feelsLike')} {Math.round(weatherData.current.feelslike_c)}°C
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weather Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-3d">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-black">{t('humidity')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {weatherData.current.humidity}%
                      </p>
                    </div>
                    <Droplets className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-3d">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-black">{t('windSpeed')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {weatherData.current.wind_kph} km/h
                      </p>
                      <p className="text-xs text-black">
                        {weatherData.current.wind_dir}
                      </p>
                    </div>
                    <Wind className="h-8 w-8 text-gray-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-3d">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-black">{t('pressure')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {weatherData.current.pressure_mb} mb
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-3d">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-black">{t('uvIndex')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {weatherData.current.uv}
                      </p>
                      <p className="text-xs text-black">
                        {weatherData.current.uv <= 2 ? t('low') : 
                         weatherData.current.uv <= 5 ? t('moderate') :
                         weatherData.current.uv <= 7 ? t('high') : 
                         weatherData.current.uv <= 10 ? t('veryHigh') : t('extreme')}
                      </p>
                    </div>
                    <Sun className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Temperature Comparison */}
            <Card className="card-3d">
              <CardHeader>
                <CardTitle className="flex items-center text-black">
                  <Thermometer className="h-5 w-5 mr-2 text-primary" />
                  {t('temperatureDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Current</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {Math.round(weatherData.current.temperature_c)}°C
                    </p>
                    <p className="text-sm text-blue-700">
                      {Math.round(weatherData.current.temperature_f)}°F
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-800">Feels Like</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {Math.round(weatherData.current.feelslike_c)}°C
                    </p>
                    <p className="text-sm text-orange-700">
                      {Math.round(weatherData.current.feelslike_f)}°F
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Condition</p>
                    <p className="text-lg font-bold text-green-900">
                      {weatherData.current.condition}
                    </p>
                    <p className="text-sm text-green-700">
                      {weatherData.location.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
        
        {/* Voice Assistant Widget */}
        <VoiceAssistantWidget 
          page="weather" 
          position="fixed"
          size="md"
        />
      </div>
    </div>
  );
}