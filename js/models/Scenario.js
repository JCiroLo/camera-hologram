import * as THREE from "three";
import MusicPlayer from "./MusicPlayer.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { CinematicCamera } from "three/addons/cameras/CinematicCamera.js";

import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
import { DotScreenShader } from "three/addons/shaders/DotScreenShader.js";
import { RGBShiftShader } from "three/addons/shaders/RGBShiftShader.js";
import { SepiaShader } from "three/addons/shaders/SepiaShader.js";

const noise = new SimplexNoise();

const Utils = {
  fractionate: (val, minVal, maxVal) => (val - minVal) / (maxVal - minVal),
  modulate: (val, minVal, maxVal, outMin, outMax) =>
    outMin + Utils.fractionate(val, minVal, maxVal) * (outMax - outMin),
  avg: (arr) => arr.reduce((sum, b) => sum + b) / arr.length,
  max: (arr) => arr.reduce((a, b) => Math.max(a, b)),
};

export default class Scenario {
  constructor(container) {
    this.container = document.querySelector(container);
    this.frequencies = null;
    this.constants = {
      width: window.innerWidth,
      height: window.innerHeight,
      get normalizedWidth() {
        return this.width / 100;
      },
      get normalizedHeight() {
        return this.height / 100;
      },
    };
    this.config = {
      grid: {
        w: 120,
        h: 90,
      },
      camera: {
        velocity: 0.05,
        radius: 10,
        focalLength: 3,
        mouseX: 0,
        mouseY: 0,
        action: "other",
      },
      particles: {
        scale: 10,
        velocity: 1,
        growthFactor: {
          max: 20,
          min: 0,
          value: 0,
        },
      },
      effects: {
        bloomPass: {
          exposure: 0.7619,
          strength: 0,
          threshold: 0,
          radius: 1,
        },
        afterimagePass: {
          value: 0,
        },
        filmPass: {
          noiseIntensity: 0.37,
          scanlinesIntensity: 0.025,
          scanlinesCount: 649,
          grayscale: false,
        },
        pixelateShader: {
          value: 10,
        },
        dotScreenShader: {
          value: 10,
        },
        RGBShiftShader: {
          value: 0.0015,
        },
      },
    };
  }

  _createStats() {
    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);
  }

  _createGUI() {
    this.gui = new GUI();

    const cameraControl = this.gui.addFolder("Camera");
    cameraControl.close();

    cameraControl
      .add(this.config.camera, "velocity", 0, 1, 0.01)
      .onChange((value) => {
        this.config.camera.velocity = value;
      });

    cameraControl
      .add(this.config.camera, "radius", 5, 100)
      .onChange((value) => {
        this.config.camera.radius = value;
      });

    cameraControl
      .add(this.config.camera, "focalLength", 1, 25)
      .onChange((value) => {
        this.camera.setLens(value);
      });

    const afterImageEffect = this.gui.addFolder("After image");
    afterImageEffect.close();

    this.afterimagePass.uniforms.damp.value = this.config.afterimagePass.value;

    afterImageEffect
      .add(this.config.afterimagePass, "value", 0.0, 1.0)
      .onChange((value) => {
        this.afterimagePass.uniforms.damp.value = Number(value);
      });

    const bloomEffect = this.gui.addFolder("Bloom");
    bloomEffect.close();

    bloomEffect
      .add(this.config.bloomPass, "threshold", 0.0, 1.0)
      .onChange((value) => {
        this.bloomPass.threshold = Number(value);
      });

    bloomEffect
      .add(this.config.bloomPass, "radius", 0.0, 1.0, 0.01)
      .onChange((value) => {
        this.bloomPass.radius = Number(value);
      });

    const filmEffect = this.gui.addFolder("Film");
    filmEffect.close();

    filmEffect
      .add(this.config.filmPass, "noiseIntensity", 0, 3)
      .onChange((value) => {
        this.filmPass.uniforms.nIntensity.value = value;
      });

    filmEffect
      .add(this.config.filmPass, "scanlinesIntensity", 0, 1.0)
      .onChange((value) => {
        this.filmPass.uniforms.sIntensity.value = value;
      });

    filmEffect
      .add(this.config.filmPass, "scanlinesCount", 0, 2048)
      .onChange((value) => {
        this.filmPass.uniforms.sCount.value = value;
      });

    filmEffect.add(this.config.filmPass, "grayscale").onChange((value) => {
      this.filmPass.uniforms.grayscale.value = value;
    });
  }

  _createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);
  }

  _createScene() {
    this.scene = new THREE.Scene();
    // this.scene.background = new THREE.Color(0xffffff)
  }

  _createCamera() {
    this.camera = new CinematicCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    this.camera.setLens(this.config.camera.focalLength);
    this.camera.position.y = this.config.camera.radius;
    // this.scene.add(this.camera)
  }

  _createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = true;
  }

  _createLights() {
    // this.ambientLight = new THREE.AmbientLight(0xffffff, 0);
    // this.scene.add(this.ambientLight);
  }

  /**
   * [Get image pixel data]
   * @param {HTMLVideoElement} image - Image
   * */
  _getImageData(video) {
    const { w, h } = this.config.grid;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(video, 0, 0, w, h);

    return ctx.getImageData(0, 0, w, h);
  }

  _createParticles() {
    const textureLoader = new THREE.TextureLoader();

    const texture = textureLoader.load("../../textures/particle.png");

    const geometry = new THREE.BufferGeometry();
    const vertices_base = [];
    const colors_base = [];

    const width = this.config.grid.w;
    const height = this.config.grid.h;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const posX = -x + width / 2;
        const posY = 0;
        const posZ = y - height / 2;
        vertices_base.push(posX, posY, posZ);

        const r = 1.0;
        const g = 1.0;
        const b = 1.0;
        colors_base.push(r, g, b);
      }
    }

    const vertices = new Float32Array(vertices_base);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

    const colors = new Float32Array(colors_base);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Set shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: {
          type: "f",
          value: 0.0,
        },
        size: {
          type: "f",
          value: this.config.particles.scale,
        },
        color: {
          value: new THREE.Color("white"),
        },
      },
      vertexShader: vertexSource,
      fragmentShader: fragmentSource,
      transparent: true,
      // depthWrite: false,
      // blending: THREE.MultiplyBlending,
    });

    this.particlesPlane = new THREE.Points(geometry, material);
    // this.particlesPlane.rotation.y = -Math.PI/2;
    this.scene.add(this.particlesPlane);
  }

  _drawParticles(t) {
    const particles = this.particlesPlane;

    if (particles) {
      const imageData = this._getImageData(this.webcam);
      const length = particles.geometry.attributes.position.count;

      for (let i = 0; i < length; i++) {
        const index = i * 4;
        const r = imageData.data[index] / 255;
        const g = imageData.data[index + 1] / 255;
        const b = imageData.data[index + 2] / 255;
        const gray = (r + g + b) / 3;

        particles.geometry.attributes.position.setY(
          i,
          (1 - gray) * this.config.particles.growthFactor.value
        );
        particles.geometry.attributes.color.setX(i, r);
        particles.geometry.attributes.color.setY(i, g);
        particles.geometry.attributes.color.setZ(i, b);
      }

      particles.material.uniforms.size.value = this.config.particles.scale;
      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.color.needsUpdate = true;
    }
  }

  /**
   * Preloads music buffers
   * @param {MusicPlayer} musicPlayer - Music Player
   * */
  _createAudio(musicPlayer) {
    this.musicPlayer = musicPlayer;
    this.audioContext = new AudioContext();

    const samples = this.musicPlayer.samples;

    const song1 = this.audioContext.createMediaElementSource(
      samples[0].element
    );

    const song2 = this.audioContext.createMediaElementSource(
      samples[1].element
    );

    const song3 = this.audioContext.createMediaElementSource(
      samples[2].element
    );

    this.audioAnalyser = this.audioContext.createAnalyser();

    song1.connect(this.audioAnalyser);
    song2.connect(this.audioAnalyser);
    song3.connect(this.audioAnalyser);

    this.audioAnalyser.connect(this.audioContext.destination);

    this.audioAnalyser.fftSize = 2048;

    this.audioArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
  }

  _createPostEffects() {
    const { effects } = this.config;
    this.composer = new EffectComposer(this.renderer);

    this.renderScene = new RenderPass(this.scene, this.camera);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      effects.bloomPass.strength,
      effects.bloomPass.radius,
      effects.bloomPass.threshold
    );

    this.afterimagePass = new AfterimagePass(effects.afterimagePass.value);

    this.filmPass = new FilmPass(
      effects.filmPass.noiseIntensity,
      effects.filmPass.scanlinesIntensity,
      effects.filmPass.scanlinesCount,
      effects.filmPass.grayscale
    );

    this.renderPixelatedPass = new RenderPixelatedPass(
      effects.pixelateShader.value,
      this.scene,
      this.camera
    );
    this.renderPixelatedPass.normalEdgeStrength = 0;
    this.renderPixelatedPass.depthEdgeStrength = 0;

    this.dotScreenPass = new ShaderPass(DotScreenShader);
    this.dotScreenPass.uniforms.scale.value = effects.dotScreenShader.value;

    this.RGBShiftPass = new ShaderPass(RGBShiftShader);
    this.RGBShiftPass.uniforms.amount.value = effects.RGBShiftShader.value;

    this.sepiaPass = new ShaderPass(SepiaShader);
    this.sepiaPass.uniforms.amount.value = 2;

    this.gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);

    this.composer.addPass(this.renderScene);
  }

  _initWebcam() {
    this.webcam = document.createElement("video");
    this.webcam.id = "webcam";
    this.webcam.autoplay = true;
    this.webcam.width = 640;
    this.webcam.height = 480;

    // Get image from camera
    navigator.mediaDevices
      .getUserMedia({
        video: { width: this.webcam.width, height: this.webcam.height },
        audio: false,
      })
      .then((stream) => {
        this.webcam.srcObject = stream;
        this._createParticles();
      })
      .catch((e) => {
        alert("ERROR: " + e.message);
      });
  }

  /**
   * Scenario initializer
   * @param {MusicPlayer} musicPlayer - MusicPlayer instance
   * */
  init(musicPlayer) {
    this._createStats();
    this._createRenderer();
    this._createScene();
    this._createCamera();
    // this._createControls();
    this._createLights();
    this._createPostEffects();
    // this._createGUI();
    this._createAudio(musicPlayer);
    this._initWebcam();
    this.onSongChange(musicPlayer.currentSong);

    this.renderer.setAnimationLoop(() => this._animate());
  }

  _animateCamera() {
    const { height, width, normalizedWidth, normalizedHeight } = this.constants;
    const { mouseX, mouseY, velocity, radius, action } = this.config.camera;
    const { x, y, z } = this.camera.position;

    if (action === "top") {
      this.camera.position.x = 0;
      this.camera.position.y = radius * 2;
      this.camera.position.z = 0;
    } else if (action === "left") {
      this.camera.position.x = -this.config.grid.w / 4;
      this.camera.position.y = radius * 4;
      this.camera.position.z = this.config.grid.h / 4;
    } else if (action === "right") {
      this.camera.position.x = this.config.grid.w / 4;
      this.camera.position.y = radius * 4;
      this.camera.position.z = this.config.grid.h / 4;
    } else {
      this.camera.position.x += (mouseX - x) * velocity;
      this.camera.position.y += (mouseY * radius - y) * velocity;
      this.camera.position.z = 1;
      // this.camera.position.z +=
      //   (normalizedWidth - Math.abs(mouseX) * 2 + -z) * velocity;
    }

    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.updateMatrixWorld();
  }

  _animateEffects() {
    const { upperMaxFr, upperAvgFr, overallAvg, lowerMaxFr, lowerAvgFr } =
      this.frequencies;

    // Treble max: 0.36, Treble avg: 0.08, avg: 100, bass max: 0.50, bass avg: 0.32.

    const { growthFactor } = this.config.particles;

    this.config.particles.growthFactor.value = Utils.modulate(
      overallAvg,
      0,
      100,
      growthFactor.min,
      growthFactor.max
    );

    this.config.effects.afterimagePass.value = Utils.modulate(
      upperAvgFr,
      0,
      0.1,
      0.5,
      1
    );

    this.config.effects.RGBShiftShader.value = Utils.modulate(
      upperMaxFr,
      0,
      0.36,
      0,
      0.02
    );

    this.config.effects.dotScreenShader.value = Utils.modulate(
      lowerAvgFr,
      0,
      0.32,
      20,
      1
    );

    this.config.effects.bloomPass.strength = Utils.modulate(
      upperAvgFr,
      0,
      0.1,
      0,
      this.musicPlayer.currentSong === 1 ? 0.5 : 2
    );

    this.afterimagePass.uniforms.damp.value =
      this.config.effects.afterimagePass.value;

    this.RGBShiftPass.uniforms.amount.value =
      this.config.effects.RGBShiftShader.value;

    this.dotScreenPass.uniforms.scale.value =
      this.config.effects.dotScreenShader.value;

    this.bloomPass.strength = this.config.effects.bloomPass.strength;
  }

  _animateLights() {
    const { overallAvg } = this._getFrequencies(
      this.audioAnalyser,
      this.audioArray
    );

    const lights = Utils.modulate(overallAvg, 0, 20, 0.5, 0);
    const bloom = Utils.modulate(overallAvg, 0, 20, 1.67, 0.42);

    // this.ambientLight.intensity = lights;

    this.bloomPass.strength = Number(bloom);
    this.config.bloomPass.strength = bloom;
  }

  _animate() {
    if (this.musicPlayer.isPlaying()) {
    }

    this._drawParticles();
    this._getMusicFrequencies();
    this._animateCamera();
    this._animateEffects();

    this.composer.render();
    this.stats?.update();
  }

  _getMusicFrequencies() {
    this.audioAnalyser.getByteFrequencyData(this.audioArray);

    const length = this.audioArray.length;

    const lowerHalfArray = this.audioArray.slice(0, length / 2 - 1);
    const upperHalfArray = this.audioArray.slice(length / 2 - 1, length - 1);

    const overallAvg = Utils.avg(this.audioArray);
    const lowerMax = Utils.max(lowerHalfArray);
    const lowerAvg = Utils.avg(lowerHalfArray);
    const upperMax = Utils.max(upperHalfArray);
    const upperAvg = Utils.avg(upperHalfArray);

    const lowerMaxFr = lowerMax / lowerHalfArray.length;
    const lowerAvgFr = lowerAvg / lowerHalfArray.length;
    const upperMaxFr = upperMax / upperHalfArray.length;
    const upperAvgFr = upperAvg / upperHalfArray.length;

    this.frequencies = {
      overallAvg,
      lowerMaxFr,
      lowerAvgFr,
      upperMaxFr,
      upperAvgFr,
    };
  }

  getAudioContext() {
    return this.audioContext;
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  onMouseMove(event) {
    const { width, height } = this.constants;
    this.config.camera.mouseX = (event.clientX - width / 2) / 100;
    this.config.camera.mouseY = (event.clientY - height / 2) / 100;
  }

  onSongChange(index) {
    if (index === 0) {
      this.composer.removePass(this.renderPixelatedPass);
      this.composer.removePass(this.bloomPass);

      this.composer.removePass(this.sepiaPass);
      this.composer.removePass(this.filmPass);

      this.composer.addPass(this.afterimagePass);
      this.composer.addPass(this.dotScreenPass);
      this.composer.addPass(this.RGBShiftPass);

      this.config.particles.scale = 10;
      this.config.particles.growthFactor.max = 10;
    } else if (index === 1) {
      this.composer.removePass(this.afterimagePass);
      this.composer.removePass(this.dotScreenPass);
      this.composer.removePass(this.RGBShiftPass);

      this.composer.removePass(this.sepiaPass);
      this.composer.removePass(this.filmPass);
      this.composer.removePass(this.bloomPass);

      this.composer.addPass(this.renderPixelatedPass);
      this.composer.addPass(this.bloomPass);

      this.config.particles.scale = 1;
      this.config.particles.growthFactor.max = 5;
    } else if (index === 2) {
      this.composer.removePass(this.afterimagePass);
      this.composer.removePass(this.dotScreenPass);
      this.composer.removePass(this.RGBShiftPass);

      this.composer.removePass(this.renderPixelatedPass);
      this.composer.removePass(this.bloomPass);

      this.composer.addPass(this.sepiaPass);
      this.composer.addPass(this.filmPass);
      this.composer.addPass(this.bloomPass);

      this.config.particles.scale = 10;
      this.config.particles.growthFactor.max = 20;
    }
    // this.composer.addPass(this.gammaCorrectionPass);
  }

  onCameraChange(action) {
    this.config.camera.action = action;
  }
}

const vertexSource = `
attribute vec3 color;
uniform float time;
uniform float size;
varying vec3 vColor;
varying float vGray;

void main() {
    // To fragmentShader
    vColor = color;
    vGray = (vColor.x + vColor.y + vColor.z) / 3.0;

    // Set vertex size
    // gl_PointSize = size * vGray * 3.0;
    gl_PointSize = size*((0.5 * vGray) + 0.5);

    // Set vertex position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentSource = `
varying vec3 vColor;
varying float vGray;

void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float ll = length(xy);
  gl_FragColor = vec4(vColor, step(ll, 0.5));
}
`;
