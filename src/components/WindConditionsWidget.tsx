import { useState } from "react";
import { Wind, Waves, Thermometer, Compass, Sun, Cloud, CloudRain, Droplets, MapPin, RefreshCw } from "lucide-react";
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LocationWeather {
  location: string;
  state: string;
  windSpeed: number;
  windDirection: string;
  windDegrees: number;
  temperature: number;
  humidity: number;
  waveHeight: number;
  condition: "sunny" | "cloudy" | "rainy" | "partly-cloudy";
  kiteCondition: "excellent" | "good" | "moderate" | "poor";
}

// Mock data for kitesurf locations
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
  "partly-cloudy": Cloud
};

const kiteConditionConfig = {
  excellent: { label: "Excelente", variant: "success" as const, description: "Condições perfeitas para kite!" },
  good: { label: "Bom", variant: "default" as const, description: "Boas condições para praticar" },
  moderate: { label: "Moderado", variant: "warning" as const, description: "Vento variável, atenção" },
  poor: { label: "Fraco", variant: "urgent" as const, description: "Não recomendado para aulas" }
};

export function WindConditionsWidget() {
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const weather = mockWeatherData[selectedLocation];
  const WeatherIcon = conditionIcons[weather.condition];
  const kiteConfig = kiteConditionConfig[weather.kiteCondition];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Calculate wind indicator rotation
  const windRotation = weather.windDegrees;

  return (
    <PremiumCard variant="ocean" className="overflow-hidden">
      {/* Ocean wave header */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-cyan to-primary" />
      
      <PremiumCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <PremiumCardTitle className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center shadow-ocean">
              <Wind className="h-5 w-5 text-primary animate-wind" />
            </div>
            <span>Condições de Vento</span>
          </PremiumCardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Location Tabs */}
        <div className="flex gap-2 mt-4">
          {mockWeatherData.map((loc, idx) => (
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
      </PremiumCardHeader>

      <PremiumCardContent className="pt-0">
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
              <span className="text-xs text-muted-foreground font-medium">km/h</span>
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
      </PremiumCardContent>
    </PremiumCard>
  );
}
