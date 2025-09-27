"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei"
import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import type * as THREE from "three"
import { useComponentDebugLogger } from '@/lib/component-debug-logger'

function AnimatedSphere() {
  const meshRef = useRef<any>(null)
  const { renderCount } = useComponentDebugLogger('AnimatedSphere')

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color="#05b4ba"
        attach="material"
        distort={0.3}
        speed={2}
        roughness={0.4}
      />
    </Sphere>
  )
}

function NetworkNodes() {
  const groupRef = useRef<any>(null)
  const { renderCount } = useComponentDebugLogger('NetworkNodes')

  const nodes = useMemo(() => {
    const nodeArray = []
    for (let i = 0; i < 20; i++) {
      nodeArray.push({
        position: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ] as [number, number, number],
        scale: Math.random() * 0.5 + 0.1,
      })
    }
    return nodeArray
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {nodes.map((node, index) => (
        <Sphere key={index} args={[0.05, 8, 8]} position={node.position} scale={node.scale}>
          <meshBasicMaterial color="#05b4ba" transparent opacity={0.6} />
        </Sphere>
      ))}
    </group>
  )
}

export function Hero3D() {
  const { renderCount } = useComponentDebugLogger('Hero3D')

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#05b4ba" />

      <AnimatedSphere />
      <NetworkNodes />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
