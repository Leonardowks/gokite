// Weather cache configuration
const WEATHER_CACHE_KEY = 'gokite_weather_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh cache
const STALE_TTL_MS = 60 * 60 * 1000; // 1 hour stale but usable

export interface CachedWeatherData {
  locations: WeatherLocation[];
  fetchedAt: string;
  cachedAt: number;
}

export interface WeatherLocation {
  name: string;
  state: string;
  windSpeed: number;
  windDirection: string;
  windDegrees: number;
  temperature: number;
  humidity: number;
  waveHeight: number;
  condition: string;
  kiteCondition: string;
  updatedAt: string;
}

export interface CacheStatus {
  isCached: boolean;
  isFresh: boolean;
  isStale: boolean;
  isExpired: boolean;
  ageMs: number;
  cachedAt: Date | null;
}

// Get cached weather data
export function getCachedWeather(): CachedWeatherData | null {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

// Save weather data to cache
export function setCachedWeather(data: { locations: WeatherLocation[]; fetchedAt: string }): void {
  const cacheData: CachedWeatherData = {
    ...data,
    cachedAt: Date.now(),
  };
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cacheData));
  console.log('[WeatherCache] Data cached at', new Date().toISOString());
}

// Clear weather cache
export function clearWeatherCache(): void {
  localStorage.removeItem(WEATHER_CACHE_KEY);
}

// Get cache status
export function getWeatherCacheStatus(): CacheStatus {
  const cached = getCachedWeather();
  
  if (!cached) {
    return {
      isCached: false,
      isFresh: false,
      isStale: false,
      isExpired: true,
      ageMs: 0,
      cachedAt: null,
    };
  }

  const now = Date.now();
  const ageMs = now - cached.cachedAt;
  const isFresh = ageMs < CACHE_TTL_MS;
  const isStale = ageMs >= CACHE_TTL_MS && ageMs < STALE_TTL_MS;
  const isExpired = ageMs >= STALE_TTL_MS;

  return {
    isCached: true,
    isFresh,
    isStale,
    isExpired,
    ageMs,
    cachedAt: new Date(cached.cachedAt),
  };
}

// Smart fetch with cache
export async function fetchWeatherWithCache(
  fetchFn: () => Promise<{ locations: WeatherLocation[]; fetchedAt: string } | null>
): Promise<{
  data: CachedWeatherData | null;
  source: 'network' | 'cache-fresh' | 'cache-stale' | 'cache-offline' | 'none';
  error?: string;
}> {
  const isOnline = navigator.onLine;
  const cached = getCachedWeather();
  const cacheStatus = getWeatherCacheStatus();

  // If offline, return cached data (even if stale)
  if (!isOnline) {
    if (cached) {
      console.log('[WeatherCache] Offline - serving cached data');
      return {
        data: cached,
        source: 'cache-offline',
      };
    }
    return {
      data: null,
      source: 'none',
      error: 'Offline e sem dados em cache',
    };
  }

  // If cache is fresh, return it without fetching
  if (cacheStatus.isFresh && cached) {
    console.log('[WeatherCache] Cache is fresh - skipping network request');
    return {
      data: cached,
      source: 'cache-fresh',
    };
  }

  // Try to fetch fresh data
  try {
    const freshData = await fetchFn();
    
    if (freshData) {
      setCachedWeather(freshData);
      return {
        data: {
          ...freshData,
          cachedAt: Date.now(),
        },
        source: 'network',
      };
    }
    
    // Fetch returned null, use stale cache if available
    if (cached) {
      console.log('[WeatherCache] Fetch failed - serving stale cache');
      return {
        data: cached,
        source: 'cache-stale',
        error: 'Falha ao atualizar - usando dados em cache',
      };
    }
    
    return {
      data: null,
      source: 'none',
      error: 'Nenhum dado disponível',
    };
  } catch (error) {
    console.error('[WeatherCache] Fetch error:', error);
    
    // On error, return stale cache if available
    if (cached) {
      return {
        data: cached,
        source: 'cache-stale',
        error: 'Erro na rede - usando dados em cache',
      };
    }
    
    return {
      data: null,
      source: 'none',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Get human-readable cache age
export function getCacheAgeText(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'agora';
  if (minutes === 1) return '1 min atrás';
  if (minutes < 60) return `${minutes} min atrás`;
  if (hours === 1) return '1 hora atrás';
  return `${hours} horas atrás`;
}
