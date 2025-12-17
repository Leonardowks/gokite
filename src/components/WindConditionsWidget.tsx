import { useState, useEffect, useCallback, useRef } from "react";
import { Wind, Waves, Thermometer, Compass, Sun, Cloud, CloudRain, Droplets, MapPin, RefreshCw, AlertCircle, ChevronUp } from "lucide-react";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

// Refresh interval: 1 minute
const REFRESH_INTERVAL_MS = 60 * 1000;

// Thresholds for significant changes
const WIND_SPEED_CHANGE_THRESHOLD = 5; // knots
const SIGNIFICANT_CONDITIONS: Array<LocationWeather['kiteCondition']> = ['excellent', 'poor'];

interface LocationWeather {
  location: string;
  state: string;
  windSpeed: number;
  windDirection: string;
  windDegrees: number;
  temperature: number;
  humidity: number;
  waveHeight: number;
  condition: "sunny" | "cloudy" | "rainy" | "partly-cloudy" | "stormy" | "foggy" | "snowy";
  kiteCondition: "excellent" | "good" | "moderate" | "poor";
}

// Fallback mock data
const mockWeatherData: LocationWeather[] = [
  {
    location: "Lagoa da Conceição",
    state: "SC",
    windSpeed: 18,
    windDirection: "NE",
    windDegrees: 45,
    temperature: 28,
    humidity: 65,
    waveHeight: 0.8,
    condition: "sunny",
    kiteCondition: "excellent"
  },
  {
    location: "Taíba",
    state: "CE",
    windSpeed: 22,
    windDirection: "E",
    windDegrees: 90,
    temperature: 31,
    humidity: 58,
    waveHeight: 1.2,
    condition: "partly-cloudy",
    kiteCondition: "excellent"
  }
];

const conditionIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  "partly-cloudy": Cloud,
  stormy: CloudRain,
  foggy: Cloud,
  snowy: Cloud
};

const kiteConditionConfig = {
  excellent: { label: "Excelente", variant: "success" as const, description: "Condições perfeitas para kite!" },
  good: { label: "Bom", variant: "default" as const, description: "Boas condições para praticar" },
  moderate: { label: "Moderado", variant: "warning" as const, description: "Vento variável, atenção" },
  poor: { label: "Fraco", variant: "urgent" as const, description: "Não recomendado para aulas" }
};

export function WindConditionsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weatherData, setWeatherData] = useState<LocationWeather[]>(mockWeatherData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const previousDataRef = useRef<LocationWeather[] | null>(null);

  const checkForSignificantChanges = useCallback((oldData: LocationWeather[], newData: LocationWeather[]) => {
    newData.forEach((newLoc, idx) => {
      const oldLoc = oldData[idx];
      if (!oldLoc) return;

      const windSpeedChange = Math.abs(newLoc.windSpeed - oldLoc.windSpeed);
      const conditionChanged = oldLoc.kiteCondition !== newLoc.kiteCondition;

      // Notify on significant wind speed change
      if (windSpeedChange >= WIND_SPEED_CHANGE_THRESHOLD) {
        const direction = newLoc.windSpeed > oldLoc.windSpeed ? "aumentou" : "diminuiu";
        toast({
          title: `🌊 Vento ${direction} em ${newLoc.location}`,
          description: `${oldLoc.windSpeed} → ${newLoc.windSpeed} nós (${windSpeedChange > 0 ? '+' : ''}${newLoc.windSpeed - oldLoc.windSpeed} nós)`,
        });
      }

      // Notify on kite condition change to excellent or poor
      if (conditionChanged && SIGNIFICANT_CONDITIONS.includes(newLoc.kiteCondition)) {
        const config = kiteConditionConfig[newLoc.kiteCondition];
        const emoji = newLoc.kiteCondition === 'excellent' ? '🪁' : '⚠️';
        toast({
          title: `${emoji} ${newLoc.location}: ${config.label}`,
          description: config.description,
          variant: newLoc.kiteCondition === 'poor' ? 'destructive' : 'default',
        });
      }
    });
  }, []);

  const fetchWeatherData = useCallback(async (showRefreshAnimation = false) => {
    if (showRefreshAnimation) {
      setIsRefreshing(true);
    }

    try {
      console.log('Fetching weather data from edge function...');
      const { data, error } = await supabase.functions.invoke('get-weather');

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.locations && Array.isArray(data.locations)) {
        const formattedData: LocationWeather[] = data.locations.map((loc: any) => ({
          location: loc.name,
          state: loc.state,
          windSpeed: loc.windSpeed,
          windDirection: loc.windDirection,
          windDegrees: loc.windDegrees,
          temperature: loc.temperature,
          humidity: loc.humidity,
          waveHeight: Number(loc.waveHeight.toFixed(1)),
          condition: loc.condition as LocationWeather['condition'],
          kiteCondition: loc.kiteCondition as LocationWeather['kiteCondition']
        }));

        // Check for significant changes (only after initial load)
        if (previousDataRef.current && !isLoading) {
          checkForSignificantChanges(previousDataRef.current, formattedData);
        }

        previousDataRef.current = formattedData;
        setWeatherData(formattedData);
        setLastUpdate(new Date());
        setIsUsingMock(false);
        console.log('Weather data updated successfully');
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      setIsUsingMock(true);
      // Keep using current data (mock or last successful fetch)
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [checkForSignificantChanges, isLoading]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchWeatherData();

    const intervalId = setInterval(() => {
      fetchWeatherData();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchWeatherData]);

  const handleRefresh = () => {
    fetchWeatherData(true);
  };

  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "agora";
    if (diffMins === 1) return "1 min atrás";
    return `${diffMins} min atrás`;
  };

  const weather = weatherData[selectedLocation];
  const WeatherIcon = conditionIcons[weather?.condition] || Sun;
  const kiteConfig = kiteConditionConfig[weather?.kiteCondition] || kiteConditionConfig.moderate;

  // Loading skeleton for trigger
  if (isLoading) {
    return (
      <div className="w-full p-4 rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    );
  }

  // Calculate wind indicator rotation
  const windRotation = weather.windDegrees;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      {/* Compact Trigger - Always visible on Dashboard */}
      <DrawerTrigger asChild>
        <button className="w-full p-4 rounded-xl bg-gradient-to-r from-primary/5 via-cyan/5 to-primary/5 border border-primary/20 hover:border-primary/40 hover:shadow-ocean transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Wind icon with animation */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center shadow-sm group-hover:shadow-ocean transition-shadow">
                <Wind className="h-5 w-5 text-primary animate-wind" />
              </div>
              
              {/* Wind info */}
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">{weather.windSpeed}</span>
                  <span className="text-sm text-muted-foreground">nós</span>
                  <span className="text-sm font-medium text-primary">{weather.windDirection}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{weather.location}</span>
                </div>
              </div>
            </div>

            {/* Condition badge + expand indicator */}
            <div className="flex items-center gap-2">
              <PremiumBadge 
                variant={kiteConfig.variant} 
                size="sm" 
                pulse={weather.kiteCondition === "excellent"}
              >
                {kiteConfig.label}
              </PremiumBadge>
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </button>
      </DrawerTrigger>

      {/* Expanded Drawer Content */}
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center shadow-ocean">
                  <Wind className="h-5 w-5 text-primary animate-wind" />
                </div>
                <span>Condições de Vento</span>
              </DrawerTitle>
              <div className="flex items-center gap-2">
                {lastUpdate && (
                  <span className="text-xs text-muted-foreground">
                    {getTimeSinceUpdate()}
                  </span>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* Mock data warning */}
            {isUsingMock && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Usando dados de demonstração</span>
              </div>
            )}

            {/* Location Tabs */}
            <div className="flex gap-2 mt-4">
              {weatherData.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedLocation(idx)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    selectedLocation === idx 
                      ? "bg-primary/10 text-primary border border-primary/30" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {loc.location}
                </button>
              ))}
            </div>
          </DrawerHeader>

          <div className="px-4 pb-6">
            {/* Kite Condition Badge */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <PremiumBadge variant={kiteConfig.variant} size="lg" glow pulse={weather.kiteCondition === "excellent"}>
                  {kiteConfig.label} para Kite
                </PremiumBadge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <WeatherIcon className="h-5 w-5 text-accent" />
                {weather.temperature}°C
              </div>
            </div>

            {/* Main Wind Display */}
            <div className="relative flex items-center justify-center py-6">
              {/* Wind Circle */}
              <div className="relative w-36 h-36">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                
                {/* Animated glow ring */}
                <div className="absolute inset-2 rounded-full border-2 border-cyan/30 animate-pulse-soft" />
                
                {/* Inner gradient circle */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-cyan/10 flex flex-col items-center justify-center">
                  <span className="text-4xl font-display font-bold text-gradient-ocean">
                    {weather.windSpeed}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">nós</span>
                </div>

                {/* Wind direction indicator */}
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-cyan drop-shadow-lg"
                  style={{ transform: `translateX(-50%) rotate(${windRotation}deg)`, transformOrigin: 'center 72px' }}
                />
              </div>

              {/* Wind Direction Label */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                <Compass className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{weather.windDirection}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted/30 border border-border/30">
                <Waves className="h-5 w-5 text-primary mb-1.5" />
                <span className="text-lg font-bold text-foreground">{weather.waveHeight}m</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ondas</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted/30 border border-border/30">
                <Thermometer className="h-5 w-5 text-accent mb-1.5" />
                <span className="text-lg font-bold text-foreground">{weather.temperature}°</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Temp</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted/30 border border-border/30">
                <Droplets className="h-5 w-5 text-cyan mb-1.5" />
                <span className="text-lg font-bold text-foreground">{weather.humidity}%</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Umidade</span>
              </div>
            </div>

            {/* Condition Description */}
            <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-center">
                <span className="text-primary font-medium">{kiteConfig.description}</span>
                <span className="text-muted-foreground"> • Vento {weather.windDirection} constante</span>
              </p>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
