import type { SolarSystemData } from "./index";
import { v4 as uuidv4 } from "uuid";

export const sampleSolarSystem: SolarSystemData = {
  id: uuidv4(),
  name: "Sol",
  star: {
    id: uuidv4(),
    name: "Sun",
    type: "G-type main-sequence star",
    luminosity: 1,
    planets: [
      {
        id: uuidv4(),
        name: "Mercury",
        radius: 0.383,
        color: "#A9A9A9",
        orbitRadius: 5,
        orbitalPeriod: 5, // Simplified for visualization
      },
      {
        id: uuidv4(),
        name: "Venus",
        radius: 0.949,
        color: "#FFA500",
        orbitRadius: 8,
        orbitalPeriod: 8,
      },
      {
        id: uuidv4(),
        name: "Earth",
        radius: 1,
        color: "#0077BE",
        orbitRadius: 12,
        orbitalPeriod: 10,
        moons: [
          {
            id: uuidv4(),
            name: "Moon",
            radius: 0.273,
            color: "#D3D3D3",
            orbitRadius: 1.5, // Relative to Earth
            orbitalPeriod: 2, // Relative to Earth
          },
        ],
      },
      {
        id: uuidv4(),
        name: "Mars",
        radius: 0.532,
        color: "#FF4500",
        orbitRadius: 18,
        orbitalPeriod: 15,
      },
    ],
  },
};
