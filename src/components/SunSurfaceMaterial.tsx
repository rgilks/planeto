import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // Calculate world normal
    vWorldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform float time;
  uniform vec3 u_cameraPosition;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  // 3D Simplex noise
  // from https://github.com/stegu/webgl-noise/blob/master/src/noise3D.glsl
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -1.0+0.5 = -0.5 = D.y

    i = mod(i, 289.0);
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  // Fractional Brownian Motion (FBM) for 3D noise
  float fbm(vec3 p, float timeVal) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0; 
    int octaves = 6; // Increased octaves for more fine detail
    float lacunarity = 2.2; // How much detail is added or removed at each octave
    float persistence = 0.45; // How much roughness is maintained through the octaves

    for (int i = 0; i < octaves; i++) {
        // Modulate time influence per octave for more complex motion
        float octaveTime = timeVal * (1.0 + float(i) * 0.5);
        vec3 q = p * frequency + vec3(octaveTime * 0.2, octaveTime * 0.3, octaveTime * 0.1); // Anisotropic time influence
        value += amplitude * snoise(q);
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    return value;
  }

  void main() {
    float surfaceNoiseVal = fbm(vWorldPosition * 0.7, time * 0.035);
    surfaceNoiseVal = (surfaceNoiseVal + 0.8) / 1.6;
    surfaceNoiseVal = clamp(surfaceNoiseVal, 0.0, 1.0);

    float surfaceGlowFactor = pow(surfaceNoiseVal, 4.5);
    vec3 baseColorDark = vec3(0.8, 0.2, 0.0);
    vec3 baseColorBright = vec3(1.0, 0.5, 0.0);
    vec3 highlightColor = vec3(1.0, 0.95, 0.85);
    vec3 surfaceColor = mix(baseColorDark, baseColorBright, smoothstep(0.0, 0.6, surfaceNoiseVal));
    surfaceColor = mix(surfaceColor, highlightColor, surfaceGlowFactor);
    surfaceColor = surfaceColor * (0.6 + surfaceNoiseVal * 0.7);
    surfaceColor = clamp(surfaceColor, 0.0, 1.0); // Clamping before corona, allow overbright later if needed
    surfaceColor = pow(surfaceColor, vec3(0.9));

    // Corona Calculation
    vec3 viewDirection = normalize(u_cameraPosition - vWorldPosition);
    float rimDot = 1.0 - dot(viewDirection, vWorldNormal);
    float coronaIntensity = smoothstep(0.2, 0.8, rimDot); // Adjust these thresholds for falloff
    coronaIntensity = pow(coronaIntensity, 3.0); // Power for sharper falloff
    
    vec3 coronaColorValue = vec3(1.0, 0.6, 0.2) * coronaIntensity * 1.5; // Corona color and brightness

    vec3 finalColor = surfaceColor + coronaColorValue;
    finalColor = clamp(finalColor, 0.0, 1.0); // Final clamp after adding corona

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class SunShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        time: { value: 0 },
        u_cameraPosition: { value: new THREE.Vector3() },
      },
      vertexShader,
      fragmentShader,
      // transparent: true, // Might be needed for more advanced corona that extends beyond sphere
      // depthWrite: false,
    });
  }

  // Uniforms for the shader (time, etc.)
  // Make sure these are defined in your GLSL shader
  public get time(): number {
    return this.uniforms["time"].value;
  }
  public set time(v: number) {
    this.uniforms["time"].value = v;
  }

  public get cameraPosition(): THREE.Vector3 {
    return this.uniforms["u_cameraPosition"].value;
  }
  public set cameraPosition(v: THREE.Vector3) {
    this.uniforms["u_cameraPosition"].value = v;
  }
}
