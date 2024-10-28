
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import mapboxgl, { MercatorCoordinate } from 'mapbox-gl';

import { mat3, mat4, vec4, vec3 } from 'gl-matrix'
import * as GUI from 'dat.gui'
//#region gltf helper

class GLTFHelper {

    gltf = null;
    gl = null;
    constructor(gl, url) {
        this.gl = gl;
        this.url = url;

        this.load();
    }

    async load() {
        const baseURL = new URL(this.url, location.href);
        const gl = this.gl;

        // 0. load gltf file
        this.gltf = (await loadFile(this.url, 'json'));
        // 1. load arrayBuffer
        this.gltf.buffers = await Promise.all(
            this.gltf.buffers.map(buffer => {
                const url = new URL(buffer.uri, baseURL.href); // .bin url
                return loadFile(url, 'arrayBuffer');
            })
        )
        // const defaultMaterial = {
        //     uniforms: {
        //         u_diffuse: [.5, .8, 1, 1],
        //     },
        // };
        // 2. mesh
        this.gltf.meshes.forEach(mesh => {
            // one mesh have multiple primitives
            mesh.primitives.forEach(primitive => {
                // one primitive has attributes / indices / material / mode 

                // 01 attributes
                const attributes = {};
                let numElements = 0;
                for (const [attribName, attribIndex] of Object.entries(primitive.attributes)) {
                    const { accessor, buffer, stride } = getAccessorAndWebGLBuffer(gl, this.gltf, attribIndex);
                    numElements = accessor.count;
                    attributes[attribName] = {
                        buffer,
                        type: accessor.type,
                        numComponents: accessorTypeToNumComponents(accessor.type),
                        stride,
                        offset: accessor.byteOffset | 0,
                    }
                }
                const bufferInfo = {
                    attributes,
                    numElements,
                }
                // 02 indices
                if (primitive.indices) {
                    const { accessor, buffer } = getAccessorAndWebGLBuffer(gl, this.gltf, primitive.indices);
                    bufferInfo.numElements = accessor.count;
                    bufferInfo.indices = buffer;
                    bufferInfo.elementType = accessor.componentType;
                }
                // 03 material   ........
                primitive.material = this.gltf.materials && this.gltf.materials[primitive.material] || {
                    uniforms: { u_diffuse: [.5, .8, 1, 1], },
                };

                // 04 mode  [0,1,2,3,4] ==>[TRIANGLES, POINTS, LINES, LINE_LOOP, LINE_STRIP]
                primitive.mode = primitive.mode
            })



        });

        this.loadedCallback()


    }

    loadedCallback(fn) {
        console.log('loaded!', this.gltf)
        fn && fn()
    }
}




/////////////helpers///////////////
/**
 * @param {string} url 
 * @param {json | arrayBuffer} typeFunc 
 * @returns {Promise<json | arrayBuffer>}
 */
async function loadFile(url, typeFunc) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`could not load: ${url}`);
    }
    return await response[typeFunc]();
}
/**
 * 给定一个访问器下标返回一个访问器, WebGLBuffer和一个stride,  buffer是一整个，需要stride的！
 * @param {WebGL2RenderingContext} gl 
 * @param {*} gltf 
 * @param {number} accessorIndex 
 * @returns 
 */
function getAccessorAndWebGLBuffer(gl, gltf, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    if (!bufferView.webglBuffer) {
        const buffer = gl.createBuffer();
        const target = bufferView.target || gl.ARRAY_BUFFER;
        const arrayBuffer = gltf.buffers[bufferView.buffer];
        const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        bufferView.webglBuffer = buffer;
    }
    return {
        accessor,
        buffer: bufferView.webglBuffer,
        stride: bufferView.stride || 0,
    };
}
function throwNoKey(key) {
    throw new Error(`no key: ${key}`);
}
const accessorTypeToNumComponentsMap = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16,
};
/**
 * 根据accesor的type返回numComponents
 * @param {string} type 
 * @returns 
 */
function accessorTypeToNumComponents(type) {
    return accessorTypeToNumComponentsMap[type] || throwNoKey(type);
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @returns 
 */
function createVaoWithBufferInfo(gl, bufferInfo) {
    console.log(bufferInfo)
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);

}
//#endregion



////////////////////////////////////////



/////////////////////////////
const modelLayer = {

    id: 'model-layer',
    type: 'custom',
    renderingMode: '3d',

    prepare: false,
    frame: 0,

    config: {
        lightPosition: [2, 4, 3],
        modelLngLat: [120.53794466757358, 32.03061107103058],
        modelScale: 0.000005,
    },

    drawInfo: {},

    async onAdd(map, gl) {
        this.map = map
        this.gl = gl
        const loader = new GLTFLoader();
        this.gltf = await loader.loadAsync('/model/wind_turbine/scene.gltf')
        this.afterLoad()
        this.initGUI()


        this.initLighter()





        this.prepare = true;
        /////debug 
        window.addEventListener('keydown', (e) => {
            if (e.key === 'm') {
                console.log(map.transform)
            }
        })
    },

    /**
     * @param {WebGL2RenderingContext} gl 
     * @param {*} matrix 
     */
    render(gl, matrix) {
        if (!this.prepare) return
        this.frame++

        this.drawLighter(matrix)

        /////////// tick logic  /////////////////

        let mercatorPos = MercatorCoordinate.fromLngLat(this.config.modelLngLat)
        let scale = this.config.modelScale
        let lightPos = this.config.lightPosition

        /////////// render logic //////////////

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.enable(gl.DEPTH_TEST)
        // gl.enable(gl.CULL_FACE)
        // gl.clearColor(0.2, 0.2, 0.2, 0.2)
        gl.clear(gl.DEPTH_BUFFER_BIT)

        gl.useProgram(this.program)
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uMatrix'), false, matrix)
        gl.uniform3fv(gl.getUniformLocation(this.program, 'uLightPosition'), lightPos)

        // forEach meshes
        this.meshes.forEach((mesh, index) => {
            let modelMatrix = this.calcModelMatrix(mesh, mercatorPos, scale, mesh.needRotate)
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uModelMatrix'), false, modelMatrix)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, mesh.texture)
            gl.bindVertexArray(mesh.vao)
            gl.drawElements(gl.TRIANGLES, mesh.geometry.index.count, gl.UNSIGNED_INT, 0);
        })

        this.map.triggerRepaint()

    },
    calcModelMatrix(mesh, mercatorPos, scale, rotate = false) {

        let modelMatrix = mat4.create()
        mat4.translate(modelMatrix, modelMatrix, [mercatorPos.x, mercatorPos.y, 0])// 局部坐标系原点移动

        mat4.rotateX(modelMatrix, modelMatrix, 0.5 * Math.PI)
        mat4.scale(modelMatrix, modelMatrix, [scale, scale, scale])
        mat4.multiply(modelMatrix, modelMatrix, mesh.matrixWorld.elements)// 模型部件translate
        if (rotate) mat4.rotateZ(modelMatrix, modelMatrix, this.frame * 0.05)
        return modelMatrix
    },
    async afterLoad() {
        let gltf = this.gltf
        let gl = this.gl

        let supportMesh = gltf.scene.children[0].children[0].children[0].children[0].children[0]
        let bladesMesh = gltf.scene.children[0].children[0].children[0].children[1].children[0]
        // console.log(supportMesh, bladesMesh)
        const vertShaderSource =
            `#version 300 es
            layout(location = 0) in vec4 aPosition;
            layout(location = 1) in vec4 aNormal;
            layout(location = 2) in vec2 aUV;
            uniform mat4 uMatrix;
            uniform mat4 uModelMatrix;
            out vec3 vPosition;
            out vec3 vNormal;
            out vec2 vUV;
            void main()
            {
                gl_Position = uMatrix * uModelMatrix * aPosition;
                vPosition = (uModelMatrix * aPosition).rgb; // in world space
                mat3 normalMatrix = transpose(inverse(mat3(uModelMatrix)));
                vNormal = normalize(normalMatrix * vec3(aNormal));
                vUV = aUV;
            }`

        const fragShaderSource =
            `#version 300 es
             precision mediump float;
             const vec3 lightColor = vec3(1.0, 1.0, 1.0);
             const vec3 ambientLight = vec3(0.2, 0.2, 0.2);
             uniform vec3 uLightPosition;
             uniform sampler2D uImage;
             in vec3 vPosition;
             in vec3 vNormal;
             in vec2 vUV;
             out vec4 fragColor;
             void main()
             {
                vec4 color = texture(uImage, vUV);                
                vec3 normal = normalize(vNormal);
                vec3 lightDirection = normalize(uLightPosition - vPosition);
                float nDotL = max(dot(lightDirection, normal), 0.0);
                vec3 diffuse = lightColor * color.rgb * nDotL;
                fragColor = vec4(diffuse, color.a);

                // vec3 ambient = ambientLight * color.rgb;
                //  fragColor = vec4(diffuse + ambient, color.a);
                // fragColor = vec4(1.0,0.0,0.0,0.5);
                // fragColor = color;
             }`


        let program = this.program = createProgramFromSource(gl, vertShaderSource, fragShaderSource)
        gl.useProgram(program)

        // this.mesh = this.createVAOwithMeshGeometry(supportMesh)

        this.meshes = []
        this.meshes.push(this.createVAOwithMeshGeometry(supportMesh))
        this.meshes.push(this.createVAOwithMeshGeometry(bladesMesh))
        this.meshes[1].needRotate = true

    },

    createVAOwithMeshGeometry(mesh) {
        let gl = this.gl;
        const vertPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.attributes.position.array, gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.attributes.normal.array, gl.STATIC_DRAW);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.attributes.uv.array, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.geometry.index.array, gl.STATIC_DRAW);//uint32
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        let vao = mesh.vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuffer);
        gl.vertexAttribPointer(0, mesh.geometry.attributes.position.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(1, mesh.geometry.attributes.normal.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(2);
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.vertexAttribPointer(2, mesh.geometry.attributes.uv.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bindVertexArray(null);

        // addon
        const imageBitmap = mesh.material.map.source.data;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageBitmap.width, imageBitmap.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap);
        gl.bindTexture(gl.TEXTURE_2D, null);

        mesh.texture = texture;
        return mesh
    },

    initGUI() {
        const gui = new GUI.GUI()
        gui.addFolder('Light Position')
        gui.add(this.config.lightPosition, 0, -10, 10, 0.1).onChange(value => this.config.lightPosition[0] = value)
        gui.add(this.config.lightPosition, 1, -10, 10, 0.1).onChange(value => this.config.lightPosition[1] = value)
        gui.add(this.config.lightPosition, 2, -10, 10, 0.1).onChange(value => this.config.lightPosition[2] = value)
        gui.addFolder('Model Position')
        gui.add(this.config.modelLngLat, 0, 119.99, 121.01, 0.00001).onChange(value => this.config.modelLngLat[0] = value)
        gui.add(this.config.modelLngLat, 1, 31.99, 33.01, 0.00001).onChange(value => this.config.modelLngLat[1] = value)
        gui.addFolder('Model Scale')
        gui.add(this.config, 'modelScale', 0.000001, 0.0001, 0.000001).onChange(value => this.config.modelScale = value)

        return gui
    },

    test(matrix, modelMatrix) {
        let umat = mat4.fromValues(...matrix)
        let umodel = modelMatrix
        let pos = vec4.fromValues(-1, 32.04850769042969, 1.4206569194793701, 1)
        let norm = vec4.fromValues(-0.5453476905822754, -0.8382100462913513, -0, 1)

        // vertex transform
        // vec4.transformMat4(pos, pos, umodel)
        // vec4.transformMat4(pos, pos, umat)
        // vec4.divide(pos, pos, [pos[3], pos[3], pos[3], pos[3]])
        // console.log('final pos', pos)

        // normal transform
        let unorm = mat3.create()
        mat3.fromMat4(unorm, umodel)
        mat3.invert(unorm, unorm)
        mat3.transpose(unorm, unorm)
        let normal = vec3.fromValues(-0.5453476905822754, -0.8382100462913513, -0)
        vec3.transformMat3(normal, normal, unorm)


        console.log('norm matrix', unorm)
        console.log('final norm', norm)
    },

    initLighter() {
        const vs = `#version 300 es
        in vec4 position;
        uniform mat4 uMatrix;
        uniform vec2 uCanvasSize;
        vec4[] vertices = vec4[4](
            vec4(-1.0, -1.0, 0.0, 0.0),
            vec4(1.0, -1.0, 1.0, 0.0),
            vec4(-1.0, 1.0, 0.0, 1.0),
            vec4(1.0, 1.0, 1.0, 1.0)
        );
        const float factor = 25.0;

        out vec2 offset;

        void main(){
            
            vec2 off = vertices[gl_VertexID].xy * factor / uCanvasSize;
            vec4 posInCS = uMatrix * vec4((position.xy),position.zw);
            vec4 posInSS = posInCS / posInCS.w;
            vec2 pos = (posInSS.xy + off);
            vec4 finalPos = vec4(pos, 0.0, 1.0) * posInCS.w;

            gl_Position = finalPos;
            offset = vertices[gl_VertexID].xy;

        }
        `
        const fs = `#version 300 es
        precision mediump float;
        in vec2 offset;
        out vec4 fragColor;
        void main() {
            float dis = length(offset);
            vec3 color = vec3(255.0,128.0,0.0) / 255.0;
            fragColor = vec4(color, dis>1.0? 0.0 : 1.0);
        }
        `
        this.lightProgram = createProgramFromSource(this.gl, vs, fs)
    },

    drawLighter(matrix) {
        const gl = this.gl
        const lightPos = [120.53794466757358, 32.03061107103058, 20000]
        const mercatorPos = MercatorCoordinate.fromLngLat([lightPos[0], lightPos[1]], lightPos[2])
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.useProgram(this.lightProgram)
        gl.uniformMatrix4fv(gl.getUniformLocation(this.lightProgram, 'uMatrix'), false, matrix)
        gl.uniform2f(gl.getUniformLocation(this.lightProgram, 'uCanvasSize'), gl.canvas.width, gl.canvas.height)
        gl.vertexAttrib3fv(0, [mercatorPos.x, mercatorPos.y, mercatorPos.z])
        // gl.drawArrays(gl.TRIANGLES_STRIP, 0, 4)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }



}


export const initMap = () => {
    const tk = 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA'
    const EmptyStyle = {
        "version": 8,
        "name": "Empty",
        "sources": {
        },
        "layers": [
        ]
    }
    const MZSVIEWCONFIG = {
        center: [120.53794466757358, 32.03061107103058],
        zoom: 11.096017911120207,
        pitch: 0,
    }

    // const map = new ScratchMap({
    const map = new mapboxgl.Map({
        accessToken: tk,
        // style: EmptyStyle,
        style: 'mapbox://styles/mapbox/light-v11',
        // style: 'mapbox://styles/mapbox/dark-v11',
        // style: 'mapbox://styles/mapbox/satellite-streets-v12',
        container: 'map',
        projection: 'mercator',
        antialias: true,
        maxZoom: 18,
        // minPitch: 0,
        center: MZSVIEWCONFIG.center,
        zoom: MZSVIEWCONFIG.zoom,
        pitch: MZSVIEWCONFIG.pitch,

    })
        .on('load', () => {

            // map.showTileBoundaries = true;
            // map.addLayer(modelLayer2)
            map.addLayer(modelLayer)
        })
}

//#region utils
function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}
function createShader2(gl, type, source) {
    const versionDefinition = '#version 300 es\n'
    const module = gl.createShader(type)
    if (type === gl.VERTEX_SHADER) source = versionDefinition + '#define VERTEX_SHADER\n' + source
    else if (type === gl.FRAGMENT_SHADER) source = versionDefinition + '#define FRAGMENT_SHADER\n' + source

    gl.shaderSource(module, source)
    gl.compileShader(module)
    if (!gl.getShaderParameter(module, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shader module: ' + gl.getShaderInfoLog(module))
        gl.deleteShader(module)
        return null
    }

    return module
}
function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}
function createProgram2(gl, vs, fs, outVaryings) {
    var prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    if (outVaryings) {
        gl.transformFeedbackVaryings(prg, outVaryings, gl.SEPARATE_ATTRIBS);
    }
    gl.linkProgram(prg);
    var success = gl.getProgramParameter(prg, gl.LINK_STATUS);
    if (success) {
        console.log('program created successfully');
        return prg;
    }
    console.warn(gl.getProgramInfoLog(prg));
    gl.deleteProgram(prg);
}
function createProgramFromSource(gl, vs, fs) {
    var vShader = createShader(gl, gl.VERTEX_SHADER, vs);
    var fShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
    var program = createProgram(gl, vShader, fShader);
    return program;
}
function createProgramFromSource2(gl, shaderSource) {
    var vShader = createShader2(gl, gl.VERTEX_SHADER, shaderSource);
    var fShader = createShader2(gl, gl.FRAGMENT_SHADER, shaderSource);
    var program = createProgram(gl, vShader, fShader);
    return program;
}
function resizeCanvasToDisplaySize(canvas) {
    // 获取浏览器显示的画布的CSS像素值
    var displayWidth = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;
    // 检查画布大小是否相同。
    var needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
    if (needResize) {
        // 使画布大小相同
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
    return needResize;
}
function loadImageBitmap(url) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                // 创建一个Image对象
                var image = new Image();
                image.src = url;
                // 当图片加载完成时，使用createImageBitmap函数来创建ImageBitmap
                image.onload = function () {
                    createImageBitmap(image).then(resolve).catch(reject);
                };
                // 当图片加载失败时，拒绝Promise
                image.onerror = function () {
                    reject(new Error('Image failed to load'));
                };
                // 设置图片的src属性为提供的URL
            })];
        });
    });
}
function createEmptyTexture(gl, width, height) {
    if (width === void 0) { width = null; }
    if (height === void 0) { height = null; }
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    if (width && height) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    return texture;
}
function initGL(canvasId) {
    var canvas = document.querySelector("#".concat(canvasId));
    var gl = canvas.getContext('webgl2', {
        premultipliedAlpha: true
    });
    if (!gl) {
        console.warn('webgl2 not supported!');
        return;
    }
    resizeCanvasToDisplaySize(gl.canvas);
    return gl;
}
function createVBO(gl, data) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (data instanceof Array)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    else
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
}
///// default float32
function updateVBO(gl, buffer, data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (data instanceof Array)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    else
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}
function createIBO(gl, data, offset) {
    if (offset === void 0) { offset = 0; }
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    if (data instanceof Array)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW, offset, data.length - offset);
    else
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW, offset, data.length - offset);
    return indexBuffer;
}
function updateIBO(gl, buffer, data) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    if (data instanceof Array)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
    else
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
}
function createCanvasSizeTexture(gl, type) {
    if (type === void 0) { type = 'RGBA8'; }
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    if (type === 'RGBA8') {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    else if (type === 'RG32F') {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, gl.canvas.width, gl.canvas.height, 0, gl.RG, gl.FLOAT, new Float32Array(gl.canvas.width * gl.canvas.height * 2).fill(0));
    }
    return texture;
}
function encodeFloatToDouble(value) {
    var result = new Float32Array(2);
    result[0] = value;
    var delta = value - result[0];
    result[1] = delta;
    return result;
}
//#endregion
