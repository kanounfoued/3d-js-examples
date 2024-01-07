import * as THREE from "three";

export function main() {
  const canvas = document.createElement("canvas");
  canvas.style.width = "800px";
  canvas.style.height = "400";
  document.body.appendChild(canvas);
  //   const canvas = document.querySelector("#c");

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const fov = 75;
  const aspect = 2; // default
  const near = 0.1;
  const far = 5;

  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  const scene = new THREE.Scene();

  const width = 1;
  const height = 1;
  const depth = 1;
  const boxGeometry = new THREE.BoxGeometry(width, height, depth);

  //   const material = new THREE.MeshBasicMaterial({ color: "red" });
  const material = new THREE.MeshPhongMaterial({ color: "red" });
  const material1 = new THREE.MeshPhongMaterial({ color: "green" });
  const material2 = new THREE.MeshPhongMaterial({ color: "blue" });

  const cube = new THREE.Mesh(boxGeometry, material);
  const cube1 = new THREE.Mesh(boxGeometry, material1);
  cube1.position.x = 2;
  const cube2 = new THREE.Mesh(boxGeometry, material2);
  cube2.position.x = -2;

  // light
  const color = 0xffffff;
  const intensity = 3;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-1, 2, 4);

  scene.add(cube);
  scene.add(cube1);
  scene.add(cube2);
  scene.add(light);

  function render(time) {
    time *= 0.001;
    cube.rotation.x = time;
    cube.rotation.y = time;

    cube1.rotation.x = time;
    cube1.rotation.y = time;

    cube2.rotation.x = time;
    cube2.rotation.y = time;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
