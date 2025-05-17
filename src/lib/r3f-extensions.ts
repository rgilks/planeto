import { extend } from "@react-three/fiber";
import { SunShaderMaterial } from "@/components/SunSurfaceMaterial";

// Extend R3F with the new class
// R3F will typically make the JSX tag <sunShaderMaterial /> (lowercase first letter)
extend({ SunShaderMaterial }); // Key is the class name itself

// Augment ThreeElements for JSX support
declare module "@react-three/fiber" {
  interface ThreeElements {
    // JSX tag is typically lowercase version of the class name
    sunShaderMaterial: Partial<SunShaderMaterial> & {
      attach?: string;
      args?: ConstructorParameters<typeof SunShaderMaterial>;
      children?: React.ReactNode;
      key?: React.Key;
      ref?: React.Ref<SunShaderMaterial>;
      // You can add other common R3F props here if needed
      // For example, event handlers if your material supports them
    };
  }
}
