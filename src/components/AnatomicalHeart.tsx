import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The doll's own heart, detached from the full-resolution source model
 * (public/assets/heart.glb, extracted by scripts/extract-heart.py).
 * The sculpted shape and its baked vein texture are kept; the shader adds
 * wet-tissue colour grading, muscle striation, capillary marbling and
 * micro-bumps per pixel so it stays sharp at any resolution.
 */

export interface BeatSignal {
  /** 0..1 punchy envelope, spikes on kick drums / heartbeat. */
  value: number;
}

// ---------- shared GLSL ----------
const NOISE_GLSL = /* glsl */ `
vec3 hHash(vec3 p){
  p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));
  return -1.0+2.0*fract(sin(p)*43758.5453123);
}
float hNoise(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*(3.0-2.0*f);
  return mix(mix(mix(dot(hHash(i),f),dot(hHash(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                 mix(dot(hHash(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hHash(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hHash(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hHash(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                 mix(dot(hHash(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hHash(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
}
float hFbm(vec3 p){
  float a=0.5, s=0.0;
  for(int i=0;i<5;i++){ s+=a*hNoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; }
  return s;
}`;

interface FleshOptions {
  color: string;
  striation: number; // muscle fibre strength
  marbling: number; // vein/fat marbling strength
  bump: number;
  roughness: number;
}

function createFleshMaterial(
  opts: FleshOptions,
  glow: { value: number },
  map?: THREE.Texture | null,
  normalMap?: THREE.Texture | null,
) {
  const material = new THREE.MeshPhysicalMaterial({
    color: opts.color,
    map: map ?? null,
    normalMap: normalMap ?? null,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: opts.roughness,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    sheen: 0.6,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color("#ff6f7d"),
    specularIntensity: 0.9,
    side: THREE.FrontSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = glow;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vHeartPos;\nvarying vec3 vHeartNormalW;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvHeartPos = position*4.0;\nvHeartNormalW = normalize(mat3(modelMatrix) * objectNormal);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vHeartPos;
varying vec3 vHeartNormalW;
uniform float uGlow;
${NOISE_GLSL}
float heartHeight(vec3 p){
  // twisting myocardial fibres
  float twist = p.y*1.6;
  vec3 q = vec3(p.x*cos(twist)-p.z*sin(twist), p.y, p.x*sin(twist)+p.z*cos(twist));
  float fibres = sin(q.x*55.0 + q.y*18.0 + hFbm(p*3.0)*5.0)*0.5+0.5;
  float micro = hFbm(p*38.0);
  float large = hFbm(p*4.5);
  return fibres*${opts.striation.toFixed(3)} + micro*0.35 + large*0.6;
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  // grade the dull baked texture into wet, living crimson while keeping its
  // sculpted vein detail (dark texture areas become deep vessels)
  float lumT = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
  vec3 graded = mix(vec3(0.20,0.008,0.025), vec3(0.95,0.16,0.14), smoothstep(0.03,0.55,lumT));
  graded = mix(graded, vec3(0.30,0.04,0.12), (1.0-smoothstep(0.02,0.12,lumT))*0.6);
  diffuseColor.rgb = graded;
}
{
  float large = hFbm(vHeartPos*3.2);
  float mid = hFbm(vHeartPos*9.0 + 4.0);
  // deep crimson -> bright arterial red variation
  vec3 deep = diffuseColor.rgb*0.7;
  vec3 bright = diffuseColor.rgb*1.15 + vec3(0.04,0.0,0.01);
  diffuseColor.rgb = mix(deep, bright, smoothstep(-0.35,0.45,large+mid*0.5));
  // capillary marbling: thin dark-violet lines
  float veinA = 1.0 - smoothstep(0.0, 0.035, abs(hFbm(vHeartPos*6.0+11.0)));
  float veinB = 1.0 - smoothstep(0.0, 0.02, abs(hFbm(vHeartPos*14.0-3.0)));
  vec3 veinCol = vec3(0.16,0.02,0.07);
  diffuseColor.rgb = mix(diffuseColor.rgb, veinCol, (veinA*0.75+veinB*0.45)*${opts.marbling.toFixed(3)});
  // pale fatty sheen in grooves
  float fat = smoothstep(0.25,0.55,hFbm(vHeartPos*2.2+7.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78,0.58,0.36), fat*0.18*${opts.marbling.toFixed(3)});
}`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  float h = heartHeight(vHeartPos);
  vec3 sx = dFdx(-vViewPosition);
  vec3 sy = dFdy(-vViewPosition);
  vec3 r1 = cross(sy, normal);
  vec3 r2 = cross(normal, sx);
  float det = dot(sx, r1);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 grad = sign(det)*(dhx*r1 + dhy*r2);
  normal = normalize(abs(det)*normal - grad*${opts.bump.toFixed(4)});
}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  // faint inner life + radioactive rim backlight from the cavity
  float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))),0.0,1.0), 3.0);
  totalEmissiveRadiance += diffuseColor.rgb*0.10*uGlow;
  totalEmissiveRadiance += vec3(0.22,1.0,0.08)*fres*0.55*uGlow;
}`,
      );
  };
  material.customProgramCacheKey = () =>
    `flesh-${opts.color}-${opts.striation}-${opts.marbling}-${opts.bump}-${!!map}`;
  return material;
}

// ---------- glow shell ----------
const glowVertex = /* glsl */ `
varying vec3 vN; varying vec3 vV;
uniform float uExpand;
void main(){
  vec3 p = position + normal*uExpand;
  vec4 mv = modelViewMatrix*vec4(p,1.0);
  vN = normalize(normalMatrix*normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix*mv;
}`;
const glowFragment = /* glsl */ `
varying vec3 vN; varying vec3 vV;
uniform float uGlow; uniform vec3 uColor; uniform float uPower;
void main(){
  float f = pow(1.0 - clamp(abs(dot(vN,vV)),0.0,1.0), uPower);
  gl_FragColor = vec4(uColor * f * uGlow, f*uGlow);
}`;

export interface AnatomicalHeartProps {
  /** Heart geometry already in doll space, centred on its own pivot. */
  geometry: THREE.BufferGeometry;
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  beat: BeatSignal;
  glow: { value: number };
  visible: boolean;
  reducedMotion: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

export function AnatomicalHeart({
  geometry,
  map,
  normalMap,
  beat,
  glow,
  visible,
  reducedMotion,
  onClick,
}: AnatomicalHeartProps) {
  const materials = useMemo(() => {
    const muscle = createFleshMaterial(
      {
        color: "#ffffff",
        striation: 0.45,
        marbling: 0.7,
        bump: 0.006,
        roughness: 0.34,
      },
      glow,
      map,
      normalMap,
    );
    muscle.side = THREE.DoubleSide;
    const shell = new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms: {
        uGlow: glow,
        uColor: { value: new THREE.Color("#39ff14") },
        uPower: { value: 2.6 },
        uExpand: { value: 0.012 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return { muscle, shell };
  }, [glow, map, normalMap]);

  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials],
  );

  const root = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!root.current) return;
    const squeeze = reducedMotion ? 0 : beat.value;
    const t = state.clock.elapsedTime;
    // systole: the heart squeezes in, then relaxes
    const s = 1 - squeeze * 0.055;
    root.current.scale.set(s, 1 - squeeze * 0.03, s);
    if (!reducedMotion) root.current.rotation.y = Math.sin(t * 0.5) * 0.04;
  });

  return (
    <group
      ref={root}
      visible={visible}
      onClick={visible ? onClick : undefined}
      onPointerOver={() => {
        if (visible) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <mesh geometry={geometry} material={materials.muscle} />
      <mesh
        geometry={geometry}
        material={materials.shell}
        raycast={() => null}
      />
    </group>
  );
}
