import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, Sparkles, Float } from '@react-three/drei'
import * as THREE from 'three'

// 6 agent nodes distributed across the wide hero constellation
const AGENT_NODES = [
  { name: 'Data Agent', pos: [-3.4, 0.9, -0.6] as [number, number, number], color: '#6366f1' },
  { name: 'Validation Gate', pos: [-1.9, -0.8, 0.2] as [number, number, number], color: '#4f46e5' },
  { name: 'EDA Agent', pos: [-0.5, 1.2, -0.9] as [number, number, number], color: '#3b82f6' },
  { name: 'ML Agent', pos: [1.2, -0.9, 0.4] as [number, number, number], color: '#8b5cf6' },
  { name: 'Visualization Agent', pos: [2.2, 0.9, -0.4] as [number, number, number], color: '#06b6d4' },
  { name: 'Insight Agent', pos: [3.5, -0.6, -0.7] as [number, number, number], color: '#a855f7' },
]

// Pipeline data flow channels connecting the 6 nodes
const CONNECTIONS: [number, number][] = [
  [0, 1], // Data -> Validation
  [1, 2], // Validation -> EDA
  [1, 3], // Validation -> ML
  [2, 4], // EDA -> Visualization
  [3, 4], // ML -> Visualization
  [4, 5], // Visualization -> Insight
  [2, 5], // EDA -> Insight cross link
  [3, 5], // ML -> Insight cross link
  [0, 2], // ambient flow link
  [3, 5], // ambient flow link
]

const ClusterGroup: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null)

  // Gentle, ambient drift of the multi-agent network
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
      groupRef.current.rotation.x += delta * 0.015
    }
  })

  return (
    <group ref={groupRef}>
      {/* 6 Agent Nodes - Primitive Icosahedrons with Soft Glow */}
      {AGENT_NODES.map((node, i) => (
        <mesh key={i} position={node.pos}>
          <icosahedronGeometry args={[0.16, 1]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.65}
            roughness={0.25}
            metalness={0.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}

      {/* Delicate Network Filaments connecting agents */}
      {CONNECTIONS.map(([startIdx, endIdx], i) => (
        <Line
          key={i}
          points={[AGENT_NODES[startIdx].pos, AGENT_NODES[endIdx].pos]}
          color="#818cf8"
          lineWidth={1.2}
          transparent
          opacity={0.32}
        />
      ))}

      {/* Sparse depth particles for ambient atmosphere */}
      <Sparkles
        count={45}
        scale={[9, 5, 4]}
        size={2.2}
        speed={0.25}
        color="#a5b4fc"
        opacity={0.45}
      />
    </group>
  )
}

export const HeroVisualization: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden -z-10">
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <pointLight position={[6, 6, 6]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-6, -6, -3]} intensity={0.7} color="#818cf8" />
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
          <ClusterGroup />
        </Float>
      </Canvas>
    </div>
  )
}
