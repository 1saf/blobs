import * as THREE from 'three';
import { TweenMax, Power2 } from 'gsap/TweenMax';
import noise from 'noisejs-ilmiont';

import './styles.css';

const map = (num: any, in_min: any, in_max: any, out_min: any, out_max: any) => {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const distance = (a: any, b: any) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const d = Math.sqrt( dx * dx + dy * dy );
    return d;
}

class Blobs {
    _canvas: HTMLCanvasElement;
    _width: number;
    _height: number;
    _renderer: THREE.WebGLRenderer;
    _scene: THREE.Scene;
    _camera: THREE.PerspectiveCamera;
    _mouse = new THREE.Vector2(0, 0);
    _currentGeometry: THREE.Geometry;
    _currentMesh: THREE.Mesh;
    _originalVertices: any = {};
    _spring = { scale: 1 };
    _maxDist: number;
    _currentBlobType = 'box';

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._width = canvas.offsetWidth;
        this._height = canvas.offsetHeight;
        this._renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        this.setupScene();
        this.setupLights();
        this.setupBlob();
        this.setupPlane();
        this.setupResize();
        this.setupMouseListener();
        this.setupClick();
    }

    setupScene() {
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(this._width, this._height);
        this._renderer.setClearColor(0xebebeb, 0);
        this._renderer.shadowMap.enabled = true;
        // this._renderer.shadowMapSoft = true;

        this._scene = new THREE.Scene();
        this._scene.fog = new THREE.Fog(0x000000, 10, 950);
        
        // setup the viewing frustrum
        const aspectRatio = this._width / this._height;
        const fov = 100;
        const nearPlane = 1;
        const farPlane = 10000;
        this._camera = new THREE.PerspectiveCamera(
            fov,
            aspectRatio,
            nearPlane,
            farPlane
        );
        this._camera.position.x = 0;
        this._camera.position.y = 0;
        this._camera.position.z = 300;
        this._maxDist = distance(this._mouse, { x: this._width / 2, y: this._height / 2 });;
    }

    setupLights() {
        const hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0x000000, 0.5);
        const shadowLight = new THREE.DirectionalLight(0xff8f16, 0.4);
        const generalLight = new THREE.DirectionalLight(0xfff150, 0.25);
        const otherLight = new THREE.DirectionalLight(0xfff150, 0.15);

        shadowLight.position.set(0, 450, 350);
        shadowLight.castShadow = true;
        shadowLight.shadow.camera.left = -650;
        shadowLight.shadow.camera.right = 650;
        shadowLight.shadow.camera.top = 650;
        shadowLight.shadow.camera.bottom = -650;
        shadowLight.shadow.camera.near = 1;
        shadowLight.shadow.camera.far = 1000;
    
        shadowLight.shadow.mapSize.width = 4096;
        shadowLight.shadow.mapSize.height = 4096;

        generalLight.position.set(-600, 350, 350);
        otherLight.position.set(0, -250, 300);

        this._scene.add(hemisphereLight);
        this._scene.add(shadowLight);
        this._scene.add(generalLight);
        this._scene.add(otherLight);
    }

    nextBlobGeometry(currentBlobType: string) {
        const vertex = this._width > 575 ? 80 : 40;
        switch (currentBlobType) {
            case 'torus':
                this._currentBlobType = 'box';
                return new THREE.BoxGeometry(100, 100, 100, vertex, vertex, vertex);
            case 'box':
                this._currentBlobType = 'sphere';
                return new THREE.SphereGeometry(100, vertex, vertex);
            case 'sphere':
                this._currentBlobType = 'torus';
                return new THREE.TorusGeometry(100, 25, vertex, vertex);
            default:
                return new THREE.SphereGeometry(100, vertex, vertex);
        }
    }

    setupBlob() {
        this._scene.remove(this._currentMesh);
        this._currentGeometry = this.nextBlobGeometry(this._currentBlobType);
        for (let i = 0; i < this._currentGeometry.vertices.length; i++) {
            let vector = this._currentGeometry.vertices[i];
            this._originalVertices[i] = vector.clone();
        }
        const blobMaterial = new THREE.MeshStandardMaterial({
            emissive: 0xbd4be3,
            emissiveIntensity: 0.5,
            roughness: 0.9,
            metalness: 0.8,
            
            side: THREE.FrontSide,
        });

        this._currentMesh = new THREE.Mesh(this._currentGeometry, blobMaterial);
        this._currentMesh.castShadow = true;
        this._currentMesh.receiveShadow = true;
        this._scene.add(this._currentMesh);
    }


    setupPlane() {
        const planeGeometry = new THREE.PlaneBufferGeometry(2000, 2000);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.y = -150;
        plane.position.x = 0;
        plane.position.z = 0;
        plane.rotation.x = Math.PI / 180 * -90;
        plane.receiveShadow = true;
        this._scene.add(plane);
    }

    setupMouseListener() {
        const onMouseMove = (e: any) => {
            TweenMax.to(this._mouse, 0.8, {
                x : e.clientX || e.pageX || e.touches[0].pageX || 0,
                y: e.clientY || e.pageY || e.touches[0].pageY || 0,
                ease: Power2.easeOut
            });
        }
        ['mousemove', 'touchmove'].forEach(event => {
            window.addEventListener(event, onMouseMove);  
        });
    }

    setupClick() {
        ['mousedown', 'touchstart'].forEach(event => {
            const handleOnClick = () => {
                this.setupBlob();
            };
            window.addEventListener(event, handleOnClick);
        });
    }

    setupResize() {
        const onResize = () => {
            this._canvas.style.width = '';
            this._canvas.style.height = '';
            this._width = this._canvas.offsetWidth;
            this._height = this._canvas.offsetHeight;
            this._camera.aspect = this._width / this._height;
            this._camera.updateProjectionMatrix(); 
            const maxDist = distance(this._mouse, {x: this._width / 2, y: this._height / 2});
            this._renderer.setSize(this._width, this._height);
        }
        let resizeTm: any;
        window.addEventListener('resize', function(){
            onResize();
        });
    }

    maxDist = () => distance(this._mouse, { x: this._width / 2, y: this._height / 2 });

    updateVertices = (time: any) => {
        let dist: any = new THREE.Vector2(0, 0);
        dist = distance(this._mouse, { x: this._width / 2, y: this._height / 2 });
        dist = dist / this._maxDist;

        dist = map(dist, 1, 0, 0, 1);
        for(let i = 0; i < this._currentGeometry.vertices.length; i++) {
            let vector = this._currentGeometry.vertices[i];
            vector.copy(this._originalVertices[i]);
            const perlin = noise.simplex3(
                (vector.x * 0.006) + (time * 0.0005),
                (vector.y * 0.006) + (time * 0.0005),
                (vector.z * 0.010)
            );
            const ratio = ((perlin * 0.3 * (dist + 0.1)) + 0.8);
            vector.multiplyScalar(ratio);
        }
        this._currentGeometry.verticesNeedUpdate = true;
    }

    render = (a: any) => {
        requestAnimationFrame(this.render);
        this._currentMesh.rotation.y = -4 + map(this._mouse.x, 0, this._width, 0, 4);
        this._currentMesh.rotation.z = 4 + map(this._mouse.y, 0, this._height, 0, -4);
        this._currentMesh.scale.set(this._spring.scale, this._spring.scale, this._spring.scale);
        this.updateVertices(a);
        this._renderer.clear();
        this._renderer.render(this._scene, this._camera);
    }

    renderScene() {
        requestAnimationFrame(this.render);
        this._renderer.render(this._scene, this._camera);
    }

};

const canvas: HTMLCanvasElement = document.querySelector('#bubble');
const blobs = new Blobs(canvas);

blobs.renderScene();