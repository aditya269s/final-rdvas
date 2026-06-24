import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 3D animated "smart highway" background built with raw Three.js.
 * Neon lane markers scroll toward the camera while low-poly vehicles flow
 * down the lanes — the immersive backdrop for the whole dashboard.
 */
export default function Scene3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04050b, 0.02);

    const camera = new THREE.PerspectiveCamera(
      62,
      mount.clientWidth / mount.clientHeight,
      0.1,
      400
    );
    camera.position.set(0, 5.5, 16);
    camera.lookAt(0, 2.5, -30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x4466aa, 1.1));
    const cyan = new THREE.PointLight(0x38e0ff, 120, 160);
    cyan.position.set(-14, 14, -8);
    scene.add(cyan);
    const violet = new THREE.PointLight(0xa78bfa, 100, 160);
    violet.position.set(16, 12, -22);
    scene.add(violet);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 420),
      new THREE.MeshStandardMaterial({
        color: 0x06080f,
        metalness: 0.5,
        roughness: 0.65,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -120;
    scene.add(ground);

    // Glowing side strips
    const makeStrip = (x: number, color: number) => {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 420),
        new THREE.MeshBasicMaterial({ color })
      );
      s.rotation.x = -Math.PI / 2;
      s.position.set(x, 0.03, -120);
      scene.add(s);
    };
    makeStrip(-9.2, 0x38e0ff);
    makeStrip(9.2, 0xa78bfa);

    // Lane dashes
    const dashGeo = new THREE.PlaneGeometry(0.28, 3.2);
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0x7fd8ff,
      transparent: true,
      opacity: 0.45,
    });
    const lanes = [-5.6, -1.9, 1.9, 5.6];
    const dashes: THREE.Mesh[] = [];
    for (const lx of lanes) {
      for (let z = -120; z <= 16; z += 13) {
        const d = new THREE.Mesh(dashGeo, dashMat);
        d.rotation.x = -Math.PI / 2;
        d.position.set(lx, 0.04, z);
        scene.add(d);
        dashes.push(d);
      }
    }

    // Vehicles
    const carColors = [
      0x38e0ff, 0xa78bfa, 0xfbbf24, 0x34d399, 0x60a5fa, 0xf472b6, 0xfb7185,
    ];
    const carGeo = new THREE.BoxGeometry(1.7, 1.2, 3.1);
    const edgeGeo = new THREE.EdgesGeometry(carGeo);
    const vehicles: { mesh: THREE.Group; speed: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const col = carColors[i % carColors.length];
      const body = new THREE.Mesh(
        carGeo,
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.3,
          metalness: 0.55,
          roughness: 0.35,
        })
      );
      body.position.y = 0.75;
      const edges = new THREE.LineSegments(
        edgeGeo,
        new THREE.LineBasicMaterial({ color: col })
      );
      edges.position.y = 0.75;
      g.add(body);
      g.add(edges);
      g.position.set(
        lanes[i % lanes.length] + (Math.random() - 0.5) * 0.6,
        0,
        -Math.random() * 120
      );
      scene.add(g);
      vehicles.push({ mesh: g, speed: 0.22 + Math.random() * 0.42 });
    }

    // Particles
    const pCount = 260;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 130;
      pPos[i * 3 + 1] = Math.random() * 34;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 260 - 40;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const points = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0x9fdcff,
        size: 0.2,
        transparent: true,
        opacity: 0.55,
      })
    );
    scene.add(points);

    let raf = 0;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.01;
      for (const d of dashes) {
        d.position.z += 0.65;
        if (d.position.z > 18) d.position.z -= 140;
      }
      for (const v of vehicles) {
        v.mesh.position.z += v.speed;
        if (v.mesh.position.z > 22) v.mesh.position.z = -120;
      }
      points.rotation.y = t * 0.02;
      camera.position.x = Math.sin(t * 0.3) * 0.7;
      camera.lookAt(0, 2.5, -30);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = (m as unknown as { material?: THREE.Material | THREE.Material[] }).material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 -z-10" aria-hidden />;
}
