/**
 * Author: Huanyu Loo
 * Date: 2024-11-29
 * Description: 
 *      总结来说，默认用WebGL1，还在用attribute和varying，太老了，不推荐，在网上逛了一圈，启用webgl2
 * 的话甚至要自己拿context，而且仅支持webgl2众多特性的子集之一。
 *     建议直接上WebGPU!!!
 * 
*/


import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'

let containerDIV;
let renderer, scene, camera, stats;
let particleSystem, uniforms, geometry;

const particles = 10000;

const renderLoop = () => {
    const time = Date.now() * 0.005;
    particleSystem.rotation.z = 0.01 * time; //模型空间绕z轴旋转

    // 对size数组动态更新，可以自动映射到顶点属性buffer，估计是个setter访问器？
    const sizes = geometry.attributes.size.array;
    for (let i = 0; i < particles; i++) {
        sizes[i] = 10 * (1 + Math.sin(0.1 * i + time));
    }

    renderer.render(scene, camera);
    stats.update();
}

const onWindowResize = () => {

    camera.aspect = containerDIV.clientWidth / containerDIV.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(containerDIV.clientWidth, containerDIV.clientHeight);

}


export const main = () => {

    /////////////////////////////////////////////////
    ///////////// 000 base scene setup //////////////
    /////////////////////////////////////////////////
    containerDIV = document.getElementById('playground');

    camera = new THREE.PerspectiveCamera(40, containerDIV.clientWidth / containerDIV.clientWidth, 1, 10000)
    camera.position.z = 300;
    scene = new THREE.Scene();



    /////////////////////////////////////////////////
    ///////////// 001 uniforms setup ////////////////
    /////////////////////////////////////////////////
    // uniforms["pointTexture"]  <-->uniform pointTexture in shader
    uniforms = {
        pointTexture: {
            value: new THREE.TextureLoader().load('/images/spark1.png')
        }
    }


    //////////////////////////////////////////////////////////
    /// 003 create shader-program with THREE.ShaderMaterial ///
    //////////////////////////////////////////////////////////

    /*
        THREE add following attributes and uniforms automatically to shader:
        
        'uniform mat4 modelMatrix;',
        'uniform mat4 modelViewMatrix;',
        'uniform mat4 projectionMatrix;',
        'uniform mat4 viewMatrix;',
        'uniform mat3 normalMatrix;',
        'uniform vec3 cameraPosition;',
        'uniform bool isOrthographic;',
        'attribute vec3 position;',
        'attribute vec3 normal;',
        'attribute vec2 uv;',
    */

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            void main(){
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                // z --> the distance between camera and vertex
                gl_PointSize = size * (300.0 / length(mvPosition.z));
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            void main(){
                vec4 baseColor = vec4(vColor, 1.0);
                gl_FragColor = baseColor * texture2D(pointTexture, gl_PointCoord);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
    })


    ////////////////////////////////////////////////////////////////////
    /// 004 create vertex attribute buffer with THREE.BufferGeometry ///
    ////////////////////////////////////////////////////////////////////
    const radius = 200;
    geometry = new THREE.BufferGeometry();
    // vert attribute buffer
    const positions = []
    const colors = []
    const sizes = []

    const color = new THREE.Color();
    for (let i = 0; i < particles; i++) {

        positions.push((Math.random() * 2 - 1) * radius);
        positions.push((Math.random() * 2 - 1) * radius);
        positions.push((Math.random() * 2 - 1) * radius);

        color.setHSL(i / particles, 1.0, 0.5);
        colors.push(color.r, color.g, color.b);

        sizes.push(20);
    }
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    )
    geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
    )
    geometry.setAttribute(
        'size',
        new THREE.Float32BufferAttribute(sizes, 1)
    )

    particleSystem = new THREE.Points( geometry, shaderMaterial );
    scene.add( particleSystem );



    ///////////////////////////////////////////////////////////
    //// 005 create renderer, bind renderloop and set DOM /////
    ///////////////////////////////////////////////////////////
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerDIV.clientWidth, containerDIV.clientHeight);
    renderer.setAnimationLoop(renderLoop)
    containerDIV.appendChild(renderer.domElement);
    stats = new Stats();
    containerDIV.appendChild(stats.dom);

    window.onresize = onWindowResize;


}