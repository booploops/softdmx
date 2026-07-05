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
import { useShowStore } from 'src/stores/show';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useThemeStore } from 'src/stores/theme';
import { readThemeCanvasPalette } from 'src/utils/theme-css';

type VisualizerFixture = {
  name: string;
  position?: FixturePosition;
};

const props = defineProps<{
  fixtures?: VisualizerFixture[];
  selectedFixtures?: string[];
  snapEnabled?: boolean;
  snapStep?: number;
  showGrid?: boolean;
  showStagePlane?: boolean;
  enableOrbit?: boolean;
  allowDrag?: boolean;
}>();

const emit = defineEmits<{
  'select-fixture': [name: string];
  'move-fixture': [name: string, position: { x: number; y: number; z: number }];
}>();

const containerRef = ref<HTMLElement | null>(null);
const dmx = useDMXStore();
const showStore = useShowStore();
const themeStore = useThemeStore();
const resolvedFixtures = computed(() =>
  props.fixtures ??
  showStore.document.fixtures.map((fixture) => ({
    name: fixture.name,
    position: fixture.position,
  }))
);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let fixtureMeshes = new Map<string, THREE.Mesh>();
let gridHelper: THREE.GridHelper | null = null;
let stagePlane: THREE.Mesh | null = null;
let controls: OrbitControls | null = null;
let dragFixtureName: string | null = null;
let dragPointerId: number | null = null;
let suppressClick = false;
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let animationId = 0;
let resizeObserver: ResizeObserver | null = null;
const selectedFixtureSet = computed(() => new Set(props.selectedFixtures ?? []));

function snapValue(value: number): number {
  if (!props.snapEnabled) return value;
  const step = Math.max(0.05, props.snapStep ?? 1);
  return Math.round(value / step) * step;
}

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
  const palette = readThemeCanvasPalette();

  const width = containerRef.value.clientWidth || 640;
  const height = containerRef.value.clientHeight || 400;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.background);

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
  camera.position.set(0, 12, 18);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  gridHelper = new THREE.GridHelper(24, 24, palette.grid, palette.grid);
  gridHelper.visible = props.showGrid !== false;
  scene.add(gridHelper);

  stagePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 })
  );
  stagePlane.rotation.x = -Math.PI / 2;
  stagePlane.position.y = -0.01;
  stagePlane.visible = props.showStagePlane !== false;
  scene.add(stagePlane);

  fixtureMeshes.clear();
  const fixtures = resolvedFixtures.value;
  fixtures.forEach((fixture, index) => {
    const pos = resolveFixturePosition(fixture.position, index, fixtures.length);
    const geometry = new THREE.CylinderGeometry(0.25, 0.35, 1.2, 12);
    const material = new THREE.MeshStandardMaterial({
      color: palette.fixture,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, 0.6, pos.z);
    mesh.userData.fixtureName = fixture.name;
    scene!.add(mesh);
    fixtureMeshes.set(fixture.name, mesh);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.innerHTML = '';
  containerRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = props.enableOrbit !== false;
  controls.enableZoom = props.enableOrbit !== false;
  controls.enabled = props.enableOrbit !== false;
  controls.target.set(0, 0, 0);
  controls.update();

  renderer.domElement.addEventListener('click', onCanvasClick);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerEnd);
  renderer.domElement.addEventListener('pointercancel', onPointerEnd);
}

function createRaycaster(event: MouseEvent | PointerEvent): THREE.Raycaster | null {
  if (!camera || !scene || !renderer) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  return raycaster;
}

function onCanvasClick(event: MouseEvent) {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const raycaster = createRaycaster(event);
  if (!raycaster || !scene) return;
  const hits = raycaster.intersectObjects(scene.children, true);
  const hit = hits.find((h) => h.object.userData.fixtureName);
  if (hit?.object.userData.fixtureName) {
    emit('select-fixture', hit.object.userData.fixtureName as string);
  }
}

function onPointerDown(event: PointerEvent) {
  if (props.allowDrag === false) return;
  const raycaster = createRaycaster(event);
  if (!raycaster || !scene || !renderer) return;
  const hits = raycaster.intersectObjects(scene.children, true);
  const hit = hits.find((entry) => entry.object.userData.fixtureName);
  const fixtureName = hit?.object.userData.fixtureName as string | undefined;
  if (!fixtureName) return;
  dragFixtureName = fixtureName;
  dragPointerId = event.pointerId;
  suppressClick = false;
  if (controls) controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (props.allowDrag === false) return;
  if (!dragFixtureName || dragPointerId !== event.pointerId) return;
  const raycaster = createRaycaster(event);
  if (!raycaster || !camera) return;
  const targetPoint = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragPlane, targetPoint)) return;
  suppressClick = true;
  emit('move-fixture', dragFixtureName, {
    x: snapValue(targetPoint.x),
    y: 0,
    z: snapValue(targetPoint.z),
  });
}

function onPointerEnd(event: PointerEvent) {
  if (!renderer || dragPointerId !== event.pointerId) return;
  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
  dragFixtureName = null;
  dragPointerId = null;
  if (controls) controls.enabled = props.enableOrbit !== false;
}

function animate() {
  if (!renderer || !scene || !camera) return;
  const palette = readThemeCanvasPalette();

  for (const [name, mesh] of fixtureMeshes) {
    const intensity = intensityForFixture(name);
    const isSelected = selectedFixtureSet.value.has(name);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(isSelected ? palette.selected : palette.fixture);
    mat.emissive.setRGB(intensity, intensity * 0.6, intensity * 0.2);
    mat.emissiveIntensity = intensity * 2;
    mesh.scale.setScalar(isSelected ? 1.2 : 1);
  }

  controls?.update();
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
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerup', onPointerEnd);
    renderer.domElement.removeEventListener('pointercancel', onPointerEnd);
    renderer.dispose();
  }
  controls?.dispose();
  controls = null;
  fixtureMeshes.clear();
  gridHelper = null;
  stagePlane = null;
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
  resolvedFixtures,
  () => {
    dispose();
    buildScene();
    attachResizeObserver();
    animate();
  },
  { deep: true }
);

watch(
  () => props.selectedFixtures,
  () => {
    // Selection visuals are applied in animation loop; trigger immediate repaint as well.
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  },
  { deep: true }
);

watch(
  () => themeStore.resolvedTheme,
  () => {
    if (!renderer || !scene) return;
    const palette = readThemeCanvasPalette();
    scene.background = new THREE.Color(palette.background);
    if (gridHelper) {
      const color = new THREE.Color(palette.grid);
      const material = gridHelper.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => {
          const typed = entry as THREE.Material & { color?: THREE.Color };
          typed.color?.set(color);
        });
      } else {
        const typed = material as THREE.Material & { color?: THREE.Color };
        typed.color?.set(color);
      }
    }
  },
  { deep: true }
);

watch(
  () => [props.showGrid, props.showStagePlane, props.enableOrbit],
  () => {
    if (gridHelper) gridHelper.visible = props.showGrid !== false;
    if (stagePlane) stagePlane.visible = props.showStagePlane !== false;
    if (controls) {
      const enabled = props.enableOrbit !== false;
      controls.enabled = enabled;
      controls.enablePan = enabled;
      controls.enableZoom = enabled;
    }
  }
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
