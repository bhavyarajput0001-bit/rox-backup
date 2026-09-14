import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Environment } from '@react-three/drei';
import { useRoxStore } from '@rox/ui/store';

interface RoxCoreProps {
  autoRotate: boolean;
  focusMode: boolean;
}

export default function RoxCore({ autoRotate, focusMode }: RoxCoreProps) {
  const coreRef = useRef<THREE.Group>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const autoRotateRef = useRef(autoRotate);
  const focusModeRef = useRef(focusMode);

  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { focusModeRef.current = focusMode; }, [focusMode]);

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#030303']} />
      <fog attach="fog" args={['#030303', 5, 15]} />

      <ambientLight intensity={0.1} />

      <pointLight position={[5, 5, 5]} intensity={1.5} color="#FFB000" distance={15} />
      <pointLight position={[-5, -3, 2]} intensity={0.8} color="#FF8A00" distance={10} />
      <pointLight position={[0, 3, -5]} intensity={0.5} color="#FFD166" distance={8} />

      <RoxGroup ref={coreRef} isInteracting={isInteracting} autoRotateRef={autoRotateRef} focusModeRef={focusModeRef} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enableZoom={true}
        minDistance={3}
        maxDistance={12}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        onInteract={() => setIsInteracting(true)}
        onMouseUp={() => setIsInteracting(false)}
      />

      <Environment preset="warehouse" />
    </Canvas>
  );
}

function RoxGroup({ ref, isInteracting, autoRotateRef, focusModeRef }: any) {
  const group = useRef<THREE.Group>(null);
  const nucleus = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const state = useRoxStore((s) => s.coreState);
  const clock = useRef(new THREE.Clock());

  // Generate particle positions
  const particleCount = 800;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const r = 1.5 + Math.random() * 2.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const t = Math.random();
    colors[i * 3] = 1.0;
    colors[i * 3 + 1] = 0.5 + t * 0.3;
    colors[i * 3 + 2] = t * 0.2;
    sizes[i] = 0.02 + Math.random() * 0.04;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  useFrame((_, delta) => {
    if (!group.current) return;
    const elapsed = clock.current.getElapsedTime();

    // State-based animation speed
    const speedMult = state === 'thinking' ? 2 : state === 'executing' ? 3 : state === 'idle' ? 0.5 : 1;
    const rotSpeed = isInteracting ? 0 : speedMult;

    // Group rotation
    group.current.rotation.y += delta * 0.1 * rotSpeed;
    group.current.rotation.x = Math.sin(elapsed * 0.1) * 0.1;

    // Nucleus pulse
    if (nucleus.current) {
      const pulse = state === 'success' 
        ? 1.3 + Math.sin(elapsed * 5) * 0.1
        : 1.0 + Math.sin(elapsed * 0.8) * 0.05;
      nucleus.current.scale.setScalar(pulse);
      
      // Color based on state
      const color = state === 'error' 
        ? new THREE.Color('#E85D04')
        : state === 'success'
        ? new THREE.Color('#FFF2B2')
        : new THREE.Color('#FFB000');
      nucleus.current.material.color.lerp(color, 0.05);
    }

    // Shell breathing
    if (shell.current) {
      const breath = 1.0 + Math.sin(elapsed * 0.5) * 0.03;
      shell.current.scale.setScalar(breath);
    }

    // Rings rotation
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring: THREE.Object3D, i: number) => {
        ring.rotation.x += delta * (0.2 + i * 0.1) * rotSpeed;
        ring.rotation.z += delta * (0.15 + i * 0.05) * rotSpeed;
      });
    }

    // Particles gentle drift
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt(x * x + y * y + z * z);
        
        // Gentle orbital motion
        const angle = delta * 0.1 * rotSpeed;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        pos.setX(i, x * cos - z * sin);
        pos.setZ(i, x * sin + z * cos);
        
        // Keep particles within bounds
        if (dist > 4) {
          pos.setX(i, x * 0.99);
          pos.setY(i, y * 0.99);
          pos.setZ(i, z * 0.99);
        }
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      {/* Central Nucleus */}
      <mesh ref={nucleus}>
        <icosahedronGeometry args={[0.6, 2]} />
        <meshStandardMaterial
          color="#FFB000"
          emissive="#FF8A00"
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh scale={[0.4, 0.4, 0.4]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#FFF2B2"
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Holographic Shell */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial
          color="#FF8A00"
          wireframe
          transparent
          opacity={0.15}
          emissive="#FF8A00"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Second shell layer */}
      <mesh>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial
          color="#FFB000"
          wireframe
          transparent
          opacity={0.08}
          emissive="#FFB000"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Orbital Rings */}
      <group ref={ringsRef}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[Math.PI / 3 * i, 0, Math.PI / 6 * i]}>
            <torusGeometry args={[2 + i * 0.3, 0.008, 8, 100]} />
            <meshStandardMaterial
              color="#FFD166"
              emissive="#FF8A00"
              emissiveIntensity={0.5}
              transparent
              opacity={0.6 - i * 0.15}
            />
          </mesh>
        ))}
      </group>

      {/* Particle Field */}
      <points ref={particlesRef}>
        <bufferGeometry attach="geometry" {...{
          attributes: {
            position: { array: positions, count: particleCount, needsUpdate: true },
            color: { array: colors, count: particleCount },
            size: { array: sizes, count: particleCount },
          }
        }} />
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
