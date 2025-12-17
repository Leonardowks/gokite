import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOCATIONS = [
  { name: "Lagoa da Conceição", state: "SC", lat: -27.5969, lon: -48.4700 },
  { name: "Taíba", state: "CE", lat: -3.5089, lon: -38.9133 }
];

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

function getWeatherCondition(weatherId: number): string {
  if (weatherId >= 200 && weatherId < 300) return "stormy";
  if (weatherId >= 300 && weatherId < 600) return "rainy";
  if (weatherId >= 600 && weatherId < 700) return "snowy";
  if (weatherId >= 700 && weatherId < 800) return "foggy";
  if (weatherId === 800) return "sunny";
  if (weatherId > 800) return "cloudy";
  return "sunny";
}

function calculateKiteCondition(windSpeed: number): string {
  if (windSpeed >= 15 && windSpeed <= 25) return "excellent";
  if (windSpeed >= 12 && windSpeed <= 30) return "good";
  if (windSpeed >= 8 && windSpeed <= 35) return "moderate";
  return "poor";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');
    
    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Weather API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching weather data for', LOCATIONS.length, 'locations');

    const weatherPromises = LOCATIONS.map(async (location) => {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric&lang=pt_br`;
      
      console.log(`Fetching weather for ${location.name}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenWeather API error for ${location.name}:`, response.status, errorText);
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert wind speed from m/s to knots (1 m/s = 1.944 knots)
      const windSpeedKnots = Math.round(data.wind.speed * 1.944);
      
      return {
        name: location.name,
        state: location.state,
        windSpeed: windSpeedKnots,
        windDirection: getWindDirection(data.wind.deg || 0),
        windDegrees: data.wind.deg || 0,
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        condition: getWeatherCondition(data.weather[0]?.id || 800),
        description: data.weather[0]?.description || 'Céu limpo',
        icon: data.weather[0]?.icon || '01d',
        kiteCondition: calculateKiteCondition(windSpeedKnots),
        waveHeight: 0.5 + Math.random() * 1.5, // OpenWeather doesn't provide wave data, using estimate
        updatedAt: new Date().toISOString()
      };
    });

    const locations = await Promise.all(weatherPromises);
    
    console.log('Successfully fetched weather for all locations');

    return new Response(
      JSON.stringify({ locations, fetchedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching weather:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather data';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
