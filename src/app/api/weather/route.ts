import { NextRequest, NextResponse } from 'next/server';

const WEATHER_API_KEY = '9b9f2a541a83438898d03333250707';
const WEATHER_API_URL = 'http://api.weatherapi.com/v1/current.json';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('q') || 'muscat';

    console.log('Fetching weather for location:', location);

    const weatherResponse = await fetch(`${WEATHER_API_URL}?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`);

    if (!weatherResponse.ok) {
      throw new Error(`Weather API failed with status: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    console.log('Weather API response:', weatherData);

    // Format the response for easier consumption
    const formattedWeather = {
      location: {
        name: weatherData.location.name,
        region: weatherData.location.region,
        country: weatherData.location.country,
        localtime: weatherData.location.localtime
      },
      current: {
        temperature_c: weatherData.current.temp_c,
        temperature_f: weatherData.current.temp_f,
        condition: weatherData.current.condition.text,
        icon: weatherData.current.condition.icon,
        humidity: weatherData.current.humidity,
        wind_kph: weatherData.current.wind_kph,
        wind_dir: weatherData.current.wind_dir,
        pressure_mb: weatherData.current.pressure_mb,
        feelslike_c: weatherData.current.feelslike_c,
        feelslike_f: weatherData.current.feelslike_f,
        uv: weatherData.current.uv
      }
    };

    return NextResponse.json({
      success: true,
      data: formattedWeather,
      message: 'Weather data retrieved successfully'
    });

  } catch (error: any) {
    console.error('Weather API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch weather data'
      },
      { status: 500 }
    );
  }
}