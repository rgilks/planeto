import { extend } from "@react-three/fiber";
import { SunShaderMaterial } from "@/components/SunSurfaceMaterial";

extend({ SunShaderMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    sunShaderMaterial: Partial<SunShaderMaterial> & {
      attach?: string;
      args?: ConstructorParameters<typeof SunShaderMaterial>;
      children?: React.ReactNode;
      key?: React.Key;
      ref?: React.Ref<SunShaderMaterial>;
    };
  }
}
