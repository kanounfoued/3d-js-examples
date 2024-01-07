import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";

let camera, scene, renderer, mesh, target;

const spherical = new THREE.Spherical();
const rotationMatrix = new THREE.Matrix4(); // for rotation, translation, scale, position
const targetQuaternion = new THREE.Quaternion(); // for rotation
const clock = new THREE.Clock();
const speed = 2;
const targetQuaternionCamera = new THREE.Quaternion();
const rotationMatrixCamera = new THREE.Matrix4();

function init() {
  // Camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  //   camera.position.z = 5;

  // Scene
  scene = new THREE.Scene();

  // Cone geometry in the center of the globe
  const geometry = new THREE.ConeGeometry(0.1, 0.5, 8);

  geometry.rotateX(Math.PI * 0.5);
  //   geometry.rotateY(Math.PI * 0.5);
  //   geometry.rotateZ(Math.PI * 1);
  const material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh(geometry, material);
  //   const axes = new THREE.AxesHelper();
  //   axes.material.depthTest = false;
  //   axes.renderOrder = 1;
  //   mesh.add(axes);
  scene.add(mesh);

  // Target Geometry

  const targetGeometry = new THREE.SphereGeometry(0.05);
  const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  target = new THREE.Mesh(targetGeometry, targetMaterial);
  scene.add(target);

  // Generate random point on a sphere

  generateTarget();

  // Sphere

  const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // rendering the scene

  renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // adjusting the aspect when resizing the window

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  TWEEN.update();

  if (!mesh?.quaternion?.equals(targetQuaternion)) {
    const step = speed * delta;
    mesh?.quaternion.rotateTowards(targetQuaternion, step);

    const { x, y, z } = target.position;
    camera?.lookAt(x, y, z);
  }

  //   if (!camera?.quaternion?.equals(targetQuaternionCamera)) {
  //     const step = speed * delta;
  //     camera?.quaternion.rotateTowards(targetQuaternionCamera, step);
  //   }

  renderer.render(scene, camera);
}

function generateTarget() {
  // generate a random point on a sphere
  spherical.theta = Math.random() * Math.PI * 2;
  spherical.phi = Math.acos(2 * Math.random() - 1);
  spherical.radius = 2;

  target.position.setFromSpherical(spherical);

  // added lines
  const cloneVector = target.position.clone();
  new TWEEN.Tween(camera.position)
    .to(cloneVector?.multiplyScalar(2), 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.lookAt(0, 0, 0);
    })
    .start();
  // added lines

  rotationMatrix.lookAt(target.position, mesh.position, mesh.up);
  //   rotationMatrixCamera.lookAt(camera.position, target.position, camera.up);
  targetQuaternion.setFromRotationMatrix(rotationMatrix);
  //   targetQuaternionCamera.setFromRotationMatrix(rotationMatrixCamera);

  setTimeout(generateTarget, 3000);
}

export function oriantationTransform() {
  init();
  animate();
}
