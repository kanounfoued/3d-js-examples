import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";

// resource links
// https://www.youtube.com/watch?v=2pUzJOfekVE

const vertex = `
  #ifdef GL_ES
  precision mediump float;
  #endif

  uniform float u_time;
  uniform float u_maxExtrusion;

  void main() {

    vec3 newPosition = position;
    if(u_maxExtrusion > 1.0) newPosition.xyz = newPosition.xyz * u_maxExtrusion + sin(u_time);
    else newPosition.xyz = newPosition.xyz * u_maxExtrusion;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );

  }
`;
const fragment = `
  #ifdef GL_ES
  precision mediump float;
  #endif

  uniform float u_time;

  vec3 colorA = vec3(0.196, 0.631, 0.886);
  vec3 colorB = vec3(0.192, 0.384, 0.498);

  void main() {

    vec3  color = vec3(0.0);
    float pct   = abs(sin(u_time));
          color = mix(colorA, colorB, pct);

    gl_FragColor = vec4(color, 1.0);

  }
`;

let camera,
  scene,
  renderer,
  mesh,
  target,
  controls,
  materials,
  twinkleTime,
  shader_material,
  sizes,
  isIntersecting,
  grabbing,
  sphere;

const canvas = document.querySelector(".canvas");
const container = document.querySelector(".container");

const spherical = new THREE.Spherical();
const rotationMatrix = new THREE.Matrix4(); // for rotation, translation, scale, position
const targetQuaternion = new THREE.Quaternion(); // for rotation
const clock = new THREE.Clock();
const speed = 2;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function init() {
  sizes = {
    width: container.offsetWidth,
    height: container.offsetHeight,
  };

  // Camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  // camera.position.z = 40;
  camera.position.set(40, 0, 0);

  // Scene
  scene = new THREE.Scene();

  // Cone geometry in the center of the globe
  // const geometry = new THREE.ConeGeometry(0.1, 0.5, 8);
  // geometry.rotateX(Math.PI * 0.5);
  // const material = new THREE.MeshNormalMaterial();
  // mesh = new THREE.Mesh(geometry, material);
  // scene.add(mesh);

  // Target Geometry

  const targetGeometry = new THREE.SphereGeometry(0.2);
  const targetMaterial = new THREE.MeshBasicMaterial({ color: "black" });
  target = new THREE.Mesh(targetGeometry, targetMaterial);
  scene.add(target);

  // Generate random point on a sphere

  // generateTarget();

  // Sphere
  const axesHelper = new THREE.AxesHelper(20);
  axesHelper.setColors("red", "green", "blue");

  const sphereGeometry = new THREE.SphereGeometry(20, 35, 35);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x0b2636,
    // wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.add(axesHelper);
  scene.add(sphere);

  // rendering the scene

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.clearColor();

  // adjusting the aspect when resizing the window
  // window.addEventListener("resize", onWindowResize);
  // ****************** New Code *****************

  const setShaderMaterial = () => {
    twinkleTime = 0.03;
    materials = [];
    shader_material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        u_time: { value: 1.0 },
        u_maxExtrusion: { value: 1.0 },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
    });
  };

  const setMap = () => {
    let activeLatLon = {};
    const dotSphereRadius = 20;

    const readImageData = (imageData) => {
      for (
        let i = 0, lon = -180, lat = 90;
        i < imageData.length;
        i += 4, lon++
      ) {
        if (!activeLatLon[lat]) activeLatLon[lat] = [];

        const red = imageData[i];
        const green = imageData[i + 1];
        const blue = imageData[i + 2];

        if (red > 100 && green > 100 && blue > 100) activeLatLon[lat].push(lon);

        if (lon === 180) {
          lon = -180;
          lat--;
        }
      }
    };

    const visibilityForCoordinate = (lon, lat) => {
      let visible = false;

      if (!activeLatLon[lat].length) return visible;

      const closest = activeLatLon[lat].reduce((prev, curr) => {
        return Math.abs(curr - lon) < Math.abs(prev - lon) ? curr : prev;
      });

      if (Math.abs(lon - closest) < 0.5) visible = true;

      return visible;
    };

    const calcPosFromLatLonRad = (lon, lat) => {
      var phi = (90 - lat) * (Math.PI / 180);
      var theta = (lon + 180) * (Math.PI / 180);

      const x = -(dotSphereRadius * Math.sin(phi) * Math.cos(theta));
      const z = dotSphereRadius * Math.sin(phi) * Math.sin(theta);
      const y = dotSphereRadius * Math.cos(phi);

      return new THREE.Vector3(x, y, z);
    };

    const createMaterial = (timeValue) => {
      const mat = shader_material.clone();
      mat.uniforms.u_time.value = timeValue * Math.sin(Math.random());
      materials.push(mat);
      return mat;
    };

    const setDots = () => {
      const dotDensity = 2.5;
      let vector = new THREE.Vector3();

      for (let lat = 90, i = 0; lat > -90; lat--, i++) {
        const radius =
          Math.cos(Math.abs(lat) * (Math.PI / 180)) * dotSphereRadius;
        const circumference = radius * Math.PI * 2;
        const dotsForLat = circumference * dotDensity;

        for (let x = 0; x < dotsForLat; x++) {
          const long = -180 + (x * 360) / dotsForLat;

          if (!visibilityForCoordinate(long, lat)) continue;

          vector = calcPosFromLatLonRad(long, lat);

          const dotGeometry = new THREE.CircleGeometry(0.1, 5);
          dotGeometry.lookAt(vector);
          dotGeometry.translate(vector.x, vector.y, vector.z);

          const m = createMaterial(i);
          const mesh = new THREE.Mesh(dotGeometry, m);

          scene.add(mesh);
        }
      }
    };

    const image = new Image();
    image.src = "./world_alpha_mini.jpg";

    image.onload = () => {
      image.needsUpdate = true;

      const imageCanvas = document.createElement("canvas");
      imageCanvas.width = image.width;
      imageCanvas.height = image.height;

      const context = imageCanvas.getContext("2d");
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(
        0,
        0,
        imageCanvas.width,
        imageCanvas.height
      );
      readImageData(imageData.data);

      setDots();
    };
  };

  setControls();
  setShaderMaterial();
  setMap();
  listenTo();
  render();
}

function animate() {
  requestAnimationFrame(animate);

  TWEEN.update();
  const delta = clock.getDelta();
  if (!mesh?.quaternion?.equals(targetQuaternion)) {
    const step = speed * delta;
    mesh?.quaternion.rotateTowards(targetQuaternion, step);
  }

  renderer.render(scene, camera);
}

function generateTarget() {
  // generate a random point on a sphere
  spherical.theta = Math.random() * Math.PI * 2;
  spherical.phi = Math.acos(2 * Math.random() - 1);
  spherical.radius = 20;

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

  // rotationMatrix.lookAt(target.position, mesh.position, mesh.up);
  // targetQuaternion.setFromRotationMatrix(rotationMatrix);

  setTimeout(generateTarget, 3000);
}

const setControls = () => {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.2;
  controls.enableDamping = true;
  controls.enableRotate = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  // controls.minPolarAngle = Math.PI / 2 - 0.5;
  // controls.maxPolarAngle = Math.PI / 2 + 0.5;
};

const listenTo = () => {
  window.addEventListener("click", click.bind(this));
  // window.addEventListener("mousemove", mousemove.bind(this));
};

function render() {
  TWEEN.update();

  materials.forEach((el) => {
    el.uniforms.u_time.value += twinkleTime;
  });

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render.bind(this));
}

function setSpot(_x, _y, _z) {
  // // cairo
  // const lat = 30.0444;
  // const long = 31.2357;
  // algiers
  // const lat = 36.7538;
  // const long = 3.0588;
  // new york
  // const lat = 40.73061;
  // const long = -73.935242;
  // Sousa
  const lat = -6.7599;
  const long = -38.2305;
  const r = 20;

  const lat_in_radian = (90 - lat) * (Math.PI / 180);
  const long_in_radian = (180 + long) * (Math.PI / 180);

  const x = r * -(Math.sin(lat_in_radian) * Math.cos(long_in_radian));
  const z = r * Math.sin(lat_in_radian) * Math.sin(long_in_radian);
  const y = r * Math.cos(lat_in_radian);

  console.log(x, y, z);
  target.position.set(x, y, z);
}

function mousemove(event) {
  isIntersecting = false;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(sphere);
  console.log(intersects);
  if (intersects[0]) {
    isIntersecting = true;
    if (!grabbing) document.body.style.cursor = "pointer";
  } else {
    if (!grabbing) document.body.style.cursor = "default";
  }
}

function click(event) {
  isIntersecting = false;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(sphere);

  if (intersects[0]) {
    isIntersecting = true;
    const { point } = intersects[0];
    setSpot(point.x, point.y, point.z);

    const cloneVector = target.position.clone();
    new TWEEN.Tween(camera.position)
      .to(cloneVector?.multiplyScalar(2), 1000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        camera.lookAt(0, 0, 0);
      })
      .start();
    renderer.render(scene, camera);
    if (!grabbing) document.body.style.cursor = "pointer";
  } else {
    if (!grabbing) document.body.style.cursor = "default";
  }
}

export function oriantationTransform() {
  init();
  // render();
  // animate();
}
