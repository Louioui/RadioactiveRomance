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

export interface InteractiveDollProps {
  analysis: MutableRefObject<AudioAnalysis>;
  playing: boolean;
  hoveredStoreTier?: "none" | "origin" | "matrix" | "aura";
  secretUnlocked: boolean;
  onHeartClick: () => void;
  orbit: number;
  reducedMotion: boolean;
  onReady: () => void;
}
const HEART = new THREE.Vector3(0.02, -0.58, 0.69);
const GREEN = new THREE.Color("#39ff14");
function Doll(props: InteractiveDollProps) {
  const { scene } = useGLTF("/assets/doll.glb");
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const cameraAngle = useRef(0);
  const tracking = useMemo(() => ({ value: new THREE.Vector2() }), []);
  const pulse = useMemo(() => ({ value: 0.5 }), []);
  const broken = useMemo(() => ({ value: 0 }), []);
  const model = useMemo(() => {
    scene.updateMatrixWorld(true);
    const copy = new THREE.Group();
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
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
        shader.uniforms.uPulse = pulse;
        shader.uniforms.uBroken = broken;
        shader.vertexShader =
          "uniform vec2 uLook; varying vec3 vDollPosition;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vDollPosition = position;
          float influence = smoothstep(0.35, 0.85, position.y);
          float a = uLook.x * influence;
          float b = uLook.y * influence;
          vec3 pivot = vec3(0.0, 0.45, 0.0);
          vec3 p = transformed - pivot;
          p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
          p.yz = mat2(cos(b), -sin(b), sin(b), cos(b)) * p.yz;
          transformed = p + pivot;`,
        );
        shader.fragmentShader =
          "varying vec3 vDollPosition; uniform float uPulse; uniform float uBroken;\n" +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float heartDistance=length((vDollPosition-vec3(0.02,-0.58,0.22))/vec3(0.26,0.37,0.26));
          float heartMask=1.0-smoothstep(0.6,1.05,heartDistance);
          if (uBroken > 0.5 && heartMask > 0.35) discard;
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.04,0.35,0.009),heartMask*0.72);
          totalEmissiveRadiance+=vec3(0.10,1.0,0.005)*heartMask*uPulse*(1.0-uBroken);`,
        );
      };
      child.material = material;
    });
    return copy;
  }, [scene, tracking, pulse, broken]);
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
    const { analyser, bins } = props.analysis.current;
    let bass = 0;
    if (analyser && props.playing) {
      analyser.getByteFrequencyData(bins);
      for (let i = 1; i < 5; i++) bass += bins[i];
      bass /= 1020;
    }
    props.analysis.current.bass = THREE.MathUtils.damp(
      props.analysis.current.bass,
      bass,
      12,
      dt,
    );
    const energy = props.analysis.current.bass;
    const idle = props.reducedMotion
      ? 0.15
      : Math.pow(Math.max(0, Math.sin(t * 2.4)), 8) * 0.3;
    pulse.value = 0.3 + energy * 0.9 + idle * 0.25;
    broken.value = props.secretUnlocked ? 1 : 0;
    if (light.current)
      light.current.intensity = props.secretUnlocked
        ? 0.2
        : 1.4 + energy * 8 + idle * 2;
    tracking.value.x = THREE.MathUtils.damp(
      tracking.value.x,
      props.reducedMotion ? 0 : state.pointer.x * 0.16,
      4,
      dt,
    );
    tracking.value.y = THREE.MathUtils.damp(
      tracking.value.y,
      props.reducedMotion ? 0 : -state.pointer.y * 0.09,
      4,
      dt,
    );
    if (group.current && !props.reducedMotion)
      group.current.position.y = Math.sin(t * 0.8) * 0.025;
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
    cameraAngle.current = THREE.MathUtils.damp(
      cameraAngle.current,
      props.orbit * Math.PI,
      5,
      dt,
    );
    const radius = state.size.width / state.size.height < 0.7 ? 9.8 : 8.3;
    state.camera.position.set(
      Math.sin(cameraAngle.current) * radius,
      0.05,
      Math.cos(cameraAngle.current) * radius,
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
        {!props.secretUnlocked && (
          <group position={HEART}>
            <mesh
              onClick={click}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "";
              }}
            >
              <sphereGeometry args={[0.32, 16, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        )}
        <pointLight
          ref={light}
          position={[HEART.x, HEART.y, HEART.z + 0.2]}
          color={GREEN}
          intensity={2}
          distance={3}
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
  const mesh = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const directions = useMemo(
    () =>
      Array.from(
        { length: 64 },
        (_, i) =>
          new THREE.Vector3(
            Math.sin(i * 2.399) * (0.5 + (i % 5) * 0.2),
            Math.cos(i * 2.399) * (0.5 + (i % 7) * 0.13),
            Math.sin(i * 7.12) * 1.4,
          ),
      ),
    [],
  );
  useFrame((_, dt) => {
    if (!mesh.current || !active || reducedMotion) return;
    elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current;
    mesh.current.visible = t < 3;
    for (let i = 0; i < 64; i++) {
      dummy.position.copy(HEART).addScaledVector(directions[i], t * 1.7);
      dummy.position.y -= t * t * 0.45;
      dummy.rotation.set(t * i, t * 0.7 * i, t);
      dummy.scale.setScalar(Math.max(0, 1 - t / 3) * 0.027);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, 64]}
      visible={active && !reducedMotion}
      frustumCulled={false}
    >
      <tetrahedronGeometry args={[1]} />
      <meshBasicMaterial color="#83ff3d" toneMapped={false} />
    </instancedMesh>
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
