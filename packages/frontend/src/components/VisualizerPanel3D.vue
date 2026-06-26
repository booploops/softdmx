<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { FixturePosition } from '@softdmx/engine';
import { resolveFixturePosition } from '@softdmx/engine';
import { useDMXStore } from 'src/stores/dmx';
import * as THREE from 'three';

type VisualizerFixture = {
  name: string;
  position?: FixturePosition;
};

const props = defineProps<{
  fixtures: VisualizerFixture[];
}>();

const emit = defineEmits<{ 'select-fixture': [name: string] }>();

const containerRef = ref<HTMLElement | null>(null);
const dmx = useDMXStore();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let fixtureMeshes = new Map<string, THREE.Mesh>();
let animationId = 0;
let resizeObserver: ResizeObserver | null = null;

function intensityForFixture(name: string): number {
  const prefix = `show://${name}/`;
  let max = 0;
  for (const channel of dmx.channels) {
    const path = channel.path;
    const value = Number(channel.value) || 0;
    if (path.startsWith(prefix)) {
      max = Math.max(max, value);
    }
  }
  return max / 255;
}

function buildScene() {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth || 640;
  const height = containerRef.value.clientHeight || 400;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0e10);

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
  camera.position.set(0, 12, 18);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const grid = new THREE.GridHelper(24, 24, 0x333344, 0x222233);
  scene.add(grid);

  const stage = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 })
  );
  stage.rotation.x = -Math.PI / 2;
  stage.position.y = -0.01;
  scene.add(stage);

  fixtureMeshes.clear();
  props.fixtures.forEach((fixture, index) => {
    const pos = resolveFixturePosition(fixture.position, index, props.fixtures.length);
    const geometry = new THREE.CylinderGeometry(0.25, 0.35, 1.2, 12);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x * 0.05, 0.6, pos.z * 0.05);
    mesh.userData.fixtureName = fixture.name;
    scene!.add(mesh);
    fixtureMeshes.set(fixture.name, mesh);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.innerHTML = '';
  containerRef.value.appendChild(renderer.domElement);

  renderer.domElement.addEventListener('click', onCanvasClick);
}

function onCanvasClick(event: MouseEvent) {
  if (!camera || !scene || !renderer) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  const hit = hits.find((h) => h.object.userData.fixtureName);
  if (hit?.object.userData.fixtureName) {
    emit('select-fixture', hit.object.userData.fixtureName as string);
  }
}

function animate() {
  if (!renderer || !scene || !camera) return;

  for (const [name, mesh] of fixtureMeshes) {
    const intensity = intensityForFixture(name);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.setRGB(intensity, intensity * 0.6, intensity * 0.2);
    mat.emissiveIntensity = intensity * 2;
  }

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

function resize() {
  if (!containerRef.value || !renderer || !camera) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  if (width < 1 || height < 1) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function attachResizeObserver() {
  if (!containerRef.value) return;
  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(containerRef.value);
}

function dispose() {
  cancelAnimationFrame(animationId);
  resizeObserver?.disconnect();
  if (renderer) {
    renderer.domElement.removeEventListener('click', onCanvasClick);
    renderer.dispose();
  }
  fixtureMeshes.clear();
  renderer = null;
  scene = null;
  camera = null;
}

onMounted(() => {
  buildScene();
  animate();
  attachResizeObserver();
});

onBeforeUnmount(dispose);

watch(
  () => props.fixtures,
  () => {
    dispose();
    buildScene();
    attachResizeObserver();
    animate();
  },
  { deep: true }
);
</script>

<template>
  <div ref="containerRef" class="visualizer-3d sdmx-canvas-wrap" role="img" aria-label="3D stage visualizer" />
</template>

<style scoped>
.visualizer-3d {
  flex: 1 1 auto;
  min-height: 200px;
  width: 100%;
  overflow: hidden;
}
</style>
