import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { AudioAnalysis } from "../audio/useAudioEngine";
import { AnatomicalHeart } from "./AnatomicalHeart";

export interface InteractiveDollProps {
  analysis: MutableRefObject<AudioAnalysis>;
  playing: boolean;
  hoveredStoreTier?: "none" | "origin" | "matrix" | "aura";
  secretUnlocked: boolean;
  onHeartClick: () => void;
  reducedMotion: boolean;
  onReady: () => void;
}
/** Heart pivot in normalised doll space; set once the heart model loads. */
const HEART_POS = new THREE.Vector3(0.07, -0.45, 0.06);
const CAVITY = new THREE.Vector3(0.07, -0.45, -0.05);
const CAVITY_SIZE = new THREE.Vector3(0.3, 0.4, 0.25);
/** Doll vertices closer than this to the detached heart are cut away. */
const CUT_DISTANCE = 0.0016;

/** Spatial hash of heart vertices so doll vertices can be tested quickly. */
function buildHash(pos: THREE.BufferAttribute, cell: number) {
  const map = new Map<string, number[]>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(
      Math.floor(pos.getX(i) / cell),
      Math.floor(pos.getY(i) / cell),
      Math.floor(pos.getZ(i) / cell),
    );
    let list = map.get(k);
    if (!list) map.set(k, (list = []));
    list.push(i);
  }
  const r2 = cell * cell;
  return (x: number, y: number, z: number) => {
    const cx = Math.floor(x / cell),
      cy = Math.floor(y / cell),
      cz = Math.floor(z / cell);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (let c = -1; c <= 1; c++) {
          const list = map.get(key(cx + a, cy + b, cz + c));
          if (!list) continue;
          for (const i of list) {
            const dx = pos.getX(i) - x,
              dy = pos.getY(i) - y,
              dz = pos.getZ(i) - z;
            if (dx * dx + dy * dy + dz * dz < r2) return true;
          }
        }
    return false;
  };
}
const GREEN = new THREE.Color("#39ff14");
function Doll(props: InteractiveDollProps) {
  const { scene } = useGLTF("/assets/doll.glb");
  const heartGltf = useGLTF("/assets/heart.glb");
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const cavityLight = useRef<THREE.PointLight>(null);
  const heartGroup = useRef<THREE.Group>(null);
  const tracking = useMemo(() => ({ value: new THREE.Vector2() }), []);
  const roll = useMemo(() => ({ value: 0 }), []);
  const breath = useMemo(() => ({ value: 0 }), []);
  const pulse = useMemo(() => ({ value: 0.5 }), []);
  const broken = useMemo(() => ({ value: 0 }), []);
  const beat = useMemo(() => ({ value: 0 }), []);
  const heartParts = useRef<{
    geometry: THREE.BufferGeometry;
    map: THREE.Texture | null;
    normalMap: THREE.Texture | null;
  } | null>(null);
  const glow = useMemo(() => ({ value: 0.6 }), []);
  const onset = useRef({
    prev: new Float32Array(1024),
    mean: 0,
    varc: 0,
    since: 1,
    burst: 0,
    count: 0,
    // smoothed copies of the beat for body motion (the heart stays punchy)
    g1: 0,
    g2: 0,
    side: 0,
  });
  const model = useMemo(() => {
    scene.updateMatrixWorld(true);
    const copy = new THREE.Group();
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const k = 3.6 / size.y;
    // --- detach the heart: take it from heart.glb, normalise like the doll
    let heartMesh: THREE.Mesh | null = null;
    heartGltf.scene.traverse((o) => {
      if (!heartMesh && o instanceof THREE.Mesh) heartMesh = o;
    });
    const hm = heartMesh as THREE.Mesh | null;
    if (!hm) throw new Error("heart.glb has no mesh");
    const rawHeartPos = hm.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const isHeart = buildHash(rawHeartPos, CUT_DISTANCE);
    const heartGeometry = hm.geometry.clone();
    heartGeometry.translate(-center.x, -center.y, -center.z);
    heartGeometry.scale(k, k, k);
    heartGeometry.computeBoundingBox();
    const hb = heartGeometry.boundingBox!;
    const hc = hb.getCenter(new THREE.Vector3());
    const hs = hb.getSize(new THREE.Vector3());
    heartGeometry.translate(-hc.x, -hc.y, -hc.z);
    HEART_POS.copy(hc);
    CAVITY.set(hc.x, hc.y, hc.z - hs.z * 0.35);
    CAVITY_SIZE.set(hs.x * 0.5, hs.y * 0.5, hs.z * 0.85);
    const heartMaterial = hm.material as THREE.MeshStandardMaterial;
    heartParts.current = {
      geometry: heartGeometry,
      map: heartMaterial.map,
      normalMap: heartMaterial.normalMap,
    };
    scene.traverse((source) => {
      if (!(source instanceof THREE.Mesh)) return;
      const geometry = source.geometry.clone();
      for (const name of ["position", "normal"]) {
        const attr = geometry.getAttribute(name);
        if (!attr) continue;
        const values = new Float32Array(attr.count * 3);
        for (let i = 0; i < attr.count; i++) {
          values[i * 3] = attr.getX(i);
          values[i * 3 + 1] = attr.getY(i);
          values[i * 3 + 2] = attr.getZ(i);
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
      }
      geometry.applyMatrix4(source.matrixWorld);
      // remove the doll's own heart triangles – the heart is now its own mesh
      const index = geometry.getIndex();
      const p = geometry.getAttribute("position");
      if (index) {
        const near = new Uint8Array(p.count);
        for (let i = 0; i < p.count; i++)
          near[i] = isHeart(p.getX(i), p.getY(i), p.getZ(i)) ? 1 : 0;
        const kept: number[] = [];
        for (let t = 0; t < index.count; t += 3) {
          const a = index.getX(t),
            b = index.getX(t + 1),
            c = index.getX(t + 2);
          if (near[a] + near[b] + near[c] >= 2) continue;
          kept.push(a, b, c);
        }
        geometry.setIndex(kept);
      }
      const child = new THREE.Mesh(geometry, source.material);
      copy.add(child);
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.translate(-center.x, -center.y, -center.z);
      child.geometry.scale(3.6 / size.y, 3.6 / size.y, 3.6 / size.y);
      const original = child.material as THREE.MeshStandardMaterial;
      const material = original.clone();
      material.roughness = 0.85;
      material.metalness = 0.04;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uLook = tracking;
        shader.uniforms.uRoll = roll;
        shader.uniforms.uBreath = breath;
        shader.uniforms.uPulse = pulse;
        shader.uniforms.uBroken = broken;
        shader.vertexShader =
          "uniform vec2 uLook; uniform float uRoll; uniform float uBreath; varying vec3 vDollPosition;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vDollPosition = position;
          // breathing: the torso swells gently, legs and head stay put
          float chest = smoothstep(-1.25, -0.75, position.y) * (1.0 - smoothstep(0.15, 0.5, position.y));
          transformed.xz *= 1.0 + uBreath * chest;
          transformed.y += uBreath * chest * 0.6 * (position.y + 1.0) * 0.25;
          // head: look (yaw/pitch) + tired tilt (roll) about the neck
          float influence = smoothstep(0.35, 0.85, position.y);
          float a = uLook.x * influence;
          float b = uLook.y * influence;
          float c = uRoll * influence;
          vec3 pivot = vec3(0.0, 0.45, 0.0);
          vec3 p = transformed - pivot;
          p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
          p.yz = mat2(cos(b), -sin(b), sin(b), cos(b)) * p.yz;
          p.xy = mat2(cos(c), -sin(c), sin(c), cos(c)) * p.xy;
          transformed = p + pivot;`,
        );
        shader.fragmentShader =
          "varying vec3 vDollPosition; uniform float uPulse; uniform float uBroken;\n" +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float heartDistance=length((vDollPosition-vec3(0.07,-0.45,0.05))/vec3(0.42,0.5,0.4));
          float heartMask=1.0-smoothstep(0.6,1.05,heartDistance);
          // torn burlap around the detached heart catches the cavity light
          totalEmissiveRadiance += vec3(0.16,1.0,0.06)*heartMask*0.35*uPulse*(1.0-uBroken*0.85);`,
        );
      };
      child.material = material;
    });
    return copy;
  }, [scene, heartGltf, tracking, roll, breath, pulse, broken]);
  useEffect(() => {
    props.onReady();
    return () => {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    };
  }, [model, props.onReady]);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05),
      t = state.clock.elapsedTime;
    const audio = props.analysis.current;
    const o = onset.current;
    o.since += dt;
    let energy = 0;
    if (audio.beatAnalyser && props.playing) {
      const an = audio.beatAnalyser;
      const bins = audio.beatBins;
      an.getFloatFrequencyData(bins);
      // kick band ~40–150 Hz. Spectral flux = how much louder it just got.
      const hz = an.context.sampleRate / an.fftSize;
      const lo = Math.max(1, Math.floor(40 / hz));
      const hi = Math.ceil(150 / hz);
      let flux = 0;
      let level = 0;
      for (let i = lo; i <= hi; i++) {
        const v = Math.max(0, (bins[i] + 100) / 100); // dB -> 0..1
        level += v;
        flux += Math.max(0, v - o.prev[i]);
        o.prev[i] = v;
      }
      const n = hi - lo + 1;
      level /= n;
      flux /= n;
      energy = level;
      // adaptive threshold: mean + 1.5σ of the last ~1.5 s of flux
      o.mean = THREE.MathUtils.damp(o.mean, flux, 1.5, dt);
      const dev = (flux - o.mean) ** 2;
      o.varc = THREE.MathUtils.damp(o.varc, dev, 1.5, dt);
      const threshold = o.mean + 1.5 * Math.sqrt(o.varc) + 0.004;
      if (flux > threshold && o.since > 0.13) {
        o.burst = Math.min(1, 0.65 + (flux - threshold) * 12);
        o.since = 0;
        o.count++;
      }
    } else {
      o.prev.fill(0);
    }
    audio.bass = THREE.MathUtils.damp(audio.bass, energy, 12, dt);
    o.burst *= Math.exp(-dt * 9);
    // resting "lub-dub" at ~66 bpm when the music is paused
    const phase = (t * 1.1) % 1;
    const lubDub =
      Math.exp(-((phase - 0.05) ** 2) / 0.002) +
      0.6 * Math.exp(-((phase - 0.22) ** 2) / 0.002);
    const idle = props.reducedMotion ? 0 : props.playing ? 0 : lubDub;
    beat.value = Math.min(1, Math.max(o.burst, idle * 0.7));
    glow.value = props.secretUnlocked ? 0 : 0.35 + beat.value * 1.4;
    pulse.value = 0.35 + beat.value * 1.3;
    broken.value = props.secretUnlocked ? 1 : 0;
    if (light.current)
      light.current.intensity = props.secretUnlocked
        ? 0.15
        : 0.5 + beat.value * 4;
    if (cavityLight.current)
      cavityLight.current.intensity = props.secretUnlocked
        ? 0.25
        : 0.4 + beat.value * 3;
    // ---- smooth groove: two cascaded easings turn the sharp kick envelope
    // into a rounded swell, so the body flows with the beat instead of snapping
    {
      const o2 = onset.current;
      const target = props.playing && !props.reducedMotion ? beat.value : 0;
      o2.g1 = THREE.MathUtils.damp(o2.g1, target, 14, dt);
      o2.g2 = THREE.MathUtils.damp(o2.g2, o2.g1, 9, dt);
      o2.side = THREE.MathUtils.damp(
        o2.side,
        o2.count % 2 ? 1 : -1,
        3.5,
        dt,
      );
    }
    // ---- idle life: small, slow, layered movements (no scrolling needed)
    const still = props.reducedMotion;
    const sigh = Math.pow(Math.max(0, Math.sin(t * 0.21)), 24); // rare deep breath
    breath.value = still
      ? 0
      : (Math.sin(t * 1.25) * 0.5 + 0.5) * 0.018 + sigh * 0.025;
    // slow wandering gaze + occasional glance to the side
    const glance = Math.sin(t * 0.13) > 0.85 ? Math.sin(t * 0.13 * 3) * 0.18 : 0;
    const idleYaw = still
      ? 0
      : Math.sin(t * 0.23) * 0.1 + Math.sin(t * 0.61) * 0.03 + glance;
    // weary nod; on the music it bobs with the kick drum
    const idlePitch = still
      ? 0
      : Math.sin(t * 0.37) * 0.035 +
        sigh * 0.06 +
        -onset.current.g2 * 0.2;
    tracking.value.x = THREE.MathUtils.damp(
      tracking.value.x,
      (still ? 0 : state.pointer.x * 0.16) + idleYaw,
      4,
      dt,
    );
    tracking.value.y = THREE.MathUtils.damp(
      tracking.value.y,
      (still ? 0 : -state.pointer.y * 0.09) + idlePitch,
      7,
      dt,
    );
    // the head rests heavy on its hand, tilting side to side
    // on the music the head also snaps to alternating sides with each kick
    const side = onset.current.side;
    const groove = onset.current.g2;
    roll.value = still
      ? 0
      : Math.sin(t * 0.43) * 0.05 +
        Math.sin(t * 0.17) * 0.03 -
        sigh * 0.04 +
        side * groove * 0.07;
    if (group.current && !still) {
      // body bounces down and leans in on every kick
      group.current.position.y =
        Math.sin(t * 0.8) * 0.02 + sigh * 0.02 - groove * 0.055;
      group.current.rotation.y = Math.sin(t * 0.19) * 0.09;
      group.current.rotation.z =
        Math.sin(t * 0.47) * 0.012 + side * groove * 0.018;
      group.current.rotation.x = Math.sin(t * 0.31) * 0.01 + groove * 0.045;
      group.current.scale.setScalar(1.14 * (1 + groove * 0.012));
    }
    // keep the detached heart inside the breathing chest
    if (heartGroup.current) {
      const b = 1 + breath.value;
      heartGroup.current.position.set(HEART_POS.x * b, HEART_POS.y, HEART_POS.z * b);
    }
    const premium =
      props.playing ||
      props.hoveredStoreTier === "matrix" ||
      props.hoveredStoreTier === "aura";
    if (rim.current)
      rim.current.intensity = THREE.MathUtils.damp(
        rim.current.intensity,
        premium ? 4 : 1.8,
        3,
        dt,
      );
    const radius = state.size.width / state.size.height < 0.7 ? 9.8 : 8.3;
    // a slow, barely-there camera drift keeps the scene alive
    const drift = still ? 0 : 1;
    state.camera.position.set(
      Math.sin(t * 0.11) * 0.25 * drift,
      0.05 + Math.sin(t * 0.17) * 0.08 * drift,
      radius,
    );
    state.camera.lookAt(0, 0, 0);
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    props.onHeartClick();
  };
  return (
    <>
      <ambientLight intensity={0.32} />
      <directionalLight position={[-3, 5, 5]} color="#e1e4d2" intensity={2.3} />
      <directionalLight
        ref={rim}
        position={[4, 2, -2]}
        color="#ae5897"
        intensity={1.8}
      />
      <directionalLight position={[-3, 0, -3]} color="#7bffb8" intensity={2} />
      <group ref={group} scale={1.14}>
        <primitive object={model} />
        {/* dark, wet chest cavity behind the heart */}
        <mesh position={CAVITY} scale={CAVITY_SIZE}>
          <sphereGeometry args={[1, 64, 48]} />
          <meshStandardMaterial
            color="#1a0508"
            roughness={0.55}
            emissive="#0d3a08"
            emissiveIntensity={props.secretUnlocked ? 0.08 : 0.3}
            side={THREE.BackSide}
          />
        </mesh>
        <pointLight
          ref={cavityLight}
          position={[CAVITY.x, CAVITY.y, CAVITY.z - 0.05]}
          color={GREEN}
          intensity={1}
          distance={0.8}
          decay={2}
        />
        <pointLight
          position={[HEART_POS.x - 0.15, HEART_POS.y + 0.25, HEART_POS.z + 0.6]}
          color="#ffd6cc"
          intensity={props.secretUnlocked ? 0 : 1.6}
          distance={1.2}
          decay={2}
        />
        {heartParts.current && (
          <group ref={heartGroup} position={HEART_POS}>
            <AnatomicalHeart
              geometry={heartParts.current.geometry}
              map={heartParts.current.map}
              normalMap={heartParts.current.normalMap}
              beat={beat}
              glow={glow}
              visible={!props.secretUnlocked}
              reducedMotion={props.reducedMotion}
              onClick={click}
            />
          </group>
        )}
        <pointLight
          ref={light}
          position={[HEART_POS.x, HEART_POS.y, HEART_POS.z + 0.35]}
          color={GREEN}
          intensity={2}
          distance={1.4}
          decay={2}
        />
        <Fragments
          active={props.secretUnlocked}
          reducedMotion={props.reducedMotion}
        />
      </group>
    </>
  );
}
function Fragments({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const flesh = useRef<THREE.InstancedMesh>(null);
  const sparks = useRef<THREE.InstancedMesh>(null);
  const flash = useRef<THREE.PointLight>(null);
  const elapsed = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const FLESH = 46;
  const SPARKS = 140;
  const seeds = useMemo(() => {
    const make = (n: number, speed: number) =>
      Array.from({ length: n }, (_, i) => {
        const u = Math.sin(i * 12.9898) * 43758.5453;
        const r = u - Math.floor(u);
        const theta = i * 2.399 + r;
        const z = 0.2 + 0.8 * ((i * 0.618) % 1);
        const s = Math.sqrt(1 - z * z);
        return {
          dir: new THREE.Vector3(
            Math.cos(theta) * s,
            Math.sin(theta) * s + 0.25,
            z,
          ).multiplyScalar(speed * (0.6 + r * 0.8)),
          spin: new THREE.Vector3(r * 9, (1 - r) * 7, r * 5),
          size: 0.4 + r * 0.9,
        };
      });
    return { flesh: make(FLESH, 1.3), sparks: make(SPARKS, 2.4) };
  }, []);
  useFrame((_, dt) => {
    if (!active || reducedMotion) return;
    elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current;
    if (flash.current) flash.current.intensity = 18 * Math.exp(-t * 4);
    const write = (
      mesh: THREE.InstancedMesh | null,
      list: typeof seeds.flesh,
      life: number,
      gravity: number,
      base: number,
    ) => {
      if (!mesh) return;
      mesh.visible = t < life;
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        dummy.position.copy(HEART_POS).addScaledVector(s.dir, t);
        dummy.position.y -= t * t * gravity;
        dummy.rotation.set(t * s.spin.x, t * s.spin.y, t * s.spin.z);
        dummy.scale.setScalar(Math.max(0, 1 - t / life) * base * s.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    write(flesh.current, seeds.flesh, 2.6, 0.9, 0.035);
    write(sparks.current, seeds.sparks, 1.8, 0.25, 0.014);
  });
  const on = active && !reducedMotion;
  return (
    <>
      <pointLight
        ref={flash}
        position={HEART_POS}
        color={GREEN}
        intensity={0}
        distance={4}
        decay={2}
      />
      <instancedMesh
        ref={flesh}
        args={[undefined, undefined, FLESH]}
        visible={on}
        frustumCulled={false}
      >
        <dodecahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          color="#9a1018"
          roughness={0.3}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive="#2a0003"
        />
      </instancedMesh>
      <instancedMesh
        ref={sparks}
        args={[undefined, undefined, SPARKS]}
        visible={on}
        frustumCulled={false}
      >
        <tetrahedronGeometry args={[1]} />
        <meshBasicMaterial color="#83ff3d" toneMapped={false} />
      </instancedMesh>
    </>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-error">
        The 3D signal is offline.
        <br />
        The music is still here.
      </div>
    ) : (
      this.props.children
    );
  }
}
export function InteractiveDoll(props: InteractiveDollProps) {
  return (
    <SceneBoundary>
      <Canvas
        camera={{ position: [0, 0, 8.3], fov: 35 }}
        dpr={[1, 1.7]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        fallback={
          <div className="scene-error">
            The music is here, even without WebGL.
          </div>
        }
      >
        <Suspense
          fallback={
            <Html center>
              <div className="loading-signal">
                ASSEMBLING THE SIGNAL
                <span />
              </div>
            </Html>
          }
        >
          <Doll {...props} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
