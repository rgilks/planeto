export interface MoonData {
  id: string;
  name: string;
  radius: number;
  color: string;
  orbitRadius: number;
  orbitalPeriod: number;
}

export interface PlanetData {
  id: string;
  name: string;
  radius: number;
  color: string;
  orbitRadius: number;
  orbitalPeriod: number;
  moons?: MoonData[];
}

export interface StarData {
  id: string;
  name: string;
  type: string;
  luminosity: number;
  planets: PlanetData[];
}

export interface SolarSystemData {
  id: string;
  name: string;
  star: StarData;
}
