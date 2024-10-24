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

import mapboxgl from "mapbox-gl";
import { mat4 } from "gl-matrix";
import shaderCode from './shader/V0.glsl'

const layerV0 = {
    id: 'test',
    type: 'custom',
    renderingMode: '3d',

    proxySourceID: 'pxy-source',
    proxyLayerID: 'pxy-layer',

    vao: null,

    onAdd(map, gl) {
        this.initProxy(map);
        this.grid = this.createGrid(8192, 128 + 1);
        this.proxySouceCache = map.style.getOwnSourceCache(this.proxySourceID);

        this.program = createProgramFromSource2(gl, shaderCode);

        this.posBuffer = createVBO(gl, this.grid.vertices);
        this.idxBuffer = createIBO(gl, this.grid.indices);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
        gl.bindVertexArray(null);

        this.matLocation = gl.getUniformLocation(this.program, 'u_matrix');

        this.map = map;
        // this.move = this.move.bind(this);
        // map.on('move', e => {
        //     this.move()
        // })
        console.log(this.map.style._layers)
    },
    render(gl, matrix) {

        const projMatrix = this.updateProjectionMat.call(this.map.transform)
        // console.log(m)

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        gl.disable(gl.DEPTH_TEST)

        let tilesBeingDrawn = []
        this.getTiles(this.proxySouceCache).forEach(tile => {

            if (tile.demTexture && tile.demTexture.texture) {

                const { x, y, z } = tile.tileID.canonical
                // console.log(x, y, z)
                // if (z !== Math.floor(this.map.getZoom()) - 2) return;

                tilesBeingDrawn.push({ x, y, z })

                let posMatrix = this.map.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), this.map.transform.worldSize);
                let tileMPMatrix = mat4.multiply([], projMatrix, posMatrix);

                gl.uniformMatrix4fv(this.matLocation, false, tileMPMatrix)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, tile.demTexture.texture);

                gl.drawElements(gl.TRIANGLES, this.grid.indices.length, gl.UNSIGNED_SHORT, 0);
            }
        })
        console.log(tilesBeingDrawn)

    },
    // move() {
    //     this.proxySouceCache.update(this.map.painter.transform);
    // },
    initProxy(map) {
        const pxy = {
            'rect': () => {
                map.addSource(this.proxySourceID,
                    {
                        type: 'geojson',
                        data: {
                            "type": "FeatureCollection",
                            "features": [{
                                "type": "Feature",
                                "properties": {},
                                "geometry": {
                                    "coordinates": [[[-180, 85], [180, 85], [180, -85], [-180, -85], [-180, 85]]],
                                    "type": "Polygon"
                                }
                            }]
                        }
                    }
                )
                map.addLayer(
                    {
                        id: this.proxyLayerID,
                        type: 'fill',
                        source: this.proxySourceID,
                        paint: {
                            'fill-color': '#006eff',
                            'fill-opacity': 0.1
                        }
                    }
                )
            },
            'raster': () => {
                map.addSource(this.proxySourceID,
                    {
                        type: 'raster',
                        tiles: [
                            // 'http://localhost:8989/api/v1' + '/tile/raster/mzs/2020/Before/{x}/{y}/{z}'
                            '/TTB/v0/terrain-rgb/{z}/{x}/{y}.png'
                        ],
                        maxZoom: 14
                    }
                )
                map.addLayer(
                    {
                        id: this.proxyLayerID,
                        type: 'raster',
                        source: this.proxySourceID,
                        paint: {
                            'raster-opacity': 0.1,
                        }
                    }
                )
            },
            'custom': () => {
                map.addSource(this.proxySourceID,
                    {
                        type: 'raster',
                        tiles: [
                            // 'http://localhost:8989/api/v1' + '/tile/raster/mzs/2020/Before/{x}/{y}/{z}'
                            '/TTB/v0/terrain-rgb/{z}/{x}/{y}.png'
                        ]
                    }
                )
                map.addLayer(
                    {
                        id: this.proxyLayerID,
                        type: 'custom',
                        onAdd() { },
                        render() { }
                    }
                )
                map.style._layers[this.proxyLayerID].source = this.proxySourceID;
            },
            'terrain-rgb': () => {
                map.addSource(this.proxySourceID, {
                    'type': 'raster-dem',
                    // 'url': 'mapbox://mapbox.terrain-rgb',
                    'tiles': [
                        '/TTB/v0/terrain-rgb/{z}/{x}/{y}.png'
                    ],
                    'tileSize': 512,
                    'maxzoom': 14
                });
                map.setTerrain({ 'source': this.proxySourceID, 'exaggeration': 0.1 });
            },
            'dem-ras': () => {
                map.addSource(this.proxySourceID, {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.terrain-rgb',
                    'tileSize': 512,
                    'maxzoom': 14
                })
                map.addLayer(
                    {
                        id: this.proxyLayerID,
                        type: 'custom',
                        onAdd() { },
                        render() { }
                    }
                )
                map.style._layers[this.proxyLayerID].source = this.proxySourceID;
            }
        }
        pxy['terrain-rgb']()
    },
    getTiles(sourceCache) {
        let tileIDs = []
        let tiles = []
        let tileCoords = []
        if (!!sourceCache) {
            tileIDs = sourceCache.getVisibleCoordinates();
            tileIDs.map(tileID => {
                tiles.push(sourceCache.getTile(tileID))
                tileCoords.push(tileID.canonical)
            })
            console.log(tileCoords)
        }
        return tiles
    },
    createGrid(TILE_EXTENT, count) {

        const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

        const EXTENT = TILE_EXTENT;
        const size = count + 2;

        // Around the grid, add one more row/column padding for "skirt".
        let vertices = [];
        let indices = [];
        let linesIndices = [];

        const step = EXTENT / (count - 1);
        const gridBound = EXTENT + step / 2;
        const bound = gridBound + step;

        // Skirt offset of 0x5FFF is chosen randomly to encode boolean value (skirt
        // on/off) with x position (max value EXTENT = 4096) to 16-bit signed integer.
        const skirtOffset = 24575; // 0x5FFF

        for (let y = -step; y < bound; y += step) {
            for (let x = -step; x < bound; x += step) {
                const offset = (x < 0 || x > gridBound || y < 0 || y > gridBound) ? skirtOffset : 0;
                const xi = clamp(Math.round(x), 0, EXTENT);
                const yi = clamp(Math.round(y), 0, EXTENT);
                vertices.push(xi + offset, yi);
            }
        }

        // let skirtIndicesOffset = 0;
        // // Grid indices:
        // for (let j = 1; j < size - 2; j++) {
        //     for (let i = 1; i < size - 2; i++) {
        //         const index = j * size + i;
        //         indices.push(index + 1, index, index + size);
        //         indices.push(index + size, index + size + 1, index + 1);

        //         skirtIndicesOffset += 6;

        //         linesIndices.push(index + 1, index);
        //         linesIndices.push(index, index + size);
        //         linesIndices.push(index + size, index + 1,);
        //     }
        // }
        // // Padding (skirt) indices:
        // [0, size - 2].forEach(j => {
        //     for (let i = 0; i < size - 1; i++) {
        //         const index = j * size + i;
        //         indices.push(index + 1, index, index + size);
        //         indices.push(index + size, index + size + 1, index + 1);

        //         linesIndices.push(index + 1, index);
        //         linesIndices.push(index, index + size);
        //         linesIndices.push(index + size, index + 1,);
        //     }
        // });
        const skirtIndicesOffset = (size - 3) * (size - 3) * 2;
        const quad = (i, j) => {
            const index = j * size + i;
            indices.push(index + 1, index, index + size);
            indices.push(index + size, index + size + 1, index + 1);
        };
        for (let j = 1; j < size - 2; j++) {
            for (let i = 1; i < size - 2; i++) {
                quad(i, j);
            }
        }
        // Padding (skirt) indices:
        [0, size - 2].forEach(j => {
            for (let i = 0; i < size - 1; i++) {
                quad(i, j);
                quad(j, i);
            }
        });
        return {
            vertices,
            indices,
            skirtIndicesOffset,
            linesIndices
        }
    },

    updateProjectionMat(minElevation = -80.0, mercatorWorldSize = 1024000) {
        const offset = this.centerOffset;
        const halfFov = this._fov / 2

        const pitch = this._pitch

        const cameraToSeaLevelDistance = ((this._camera.position[2] * this.worldSize) - minElevation) / Math.cos(pitch)
        const topHalfSurfaceDistance = Math.sin(halfFov) * cameraToSeaLevelDistance / Math.sin(Math.max(Math.PI / 2.0 - pitch - halfFov, 0.01))
        const furthestDistance = Math.sin(pitch) * topHalfSurfaceDistance + cameraToSeaLevelDistance
        const horizonDistance = cameraToSeaLevelDistance / this._horizonShift
        const farZ = Math.min(furthestDistance * 1.01, horizonDistance)
        // const farZ = farthestPixelDistanceOnPlane(this, minElevation * 30.0, this.pixelsPerMeter)
        const nearZ = this.height / 50.0

        //////////////////////////////////////

        const zUnit = this.projection.zAxisUnit === "meters" ? this.pixelsPerMeter : 1.0;
        const worldToCamera = this._camera.getWorldToCamera(this.worldSize, zUnit);
        let cameraToClip;

        const cameraToClipPerspective = this._camera.getCameraToClipPerspective(this._fov, this.width / this.height, 0.0, farZ);
        // Apply offset/padding
        cameraToClipPerspective[8] = -offset.x * 2 / this.width;
        cameraToClipPerspective[9] = offset.y * 2 / this.height;
        cameraToClip = cameraToClipPerspective;

        let m = mat4.mul([], cameraToClip, worldToCamera);
        return m;
    }

}

function farthestPixelDistanceOnPlane(tr, minElevation, pixelsPerMeter) {
    // Find the distance from the center point [width/2 + offset.x, height/2 + offset.y] to the
    // center top point [width/2 + offset.x, 0] in Z units, using the law of sines.
    // 1 Z unit is equivalent to 1 horizontal px at the center of the map
    // (the distance between[width/2, height/2] and [width/2 + 1, height/2])
    const fovAboveCenter = tr.fovAboveCenter;

    // Adjust distance to MSL by the minimum possible elevation visible on screen,
    // this way the far plane is pushed further in the case of negative elevation.
    const minElevationInPixels = minElevation * pixelsPerMeter;
    const cameraToSeaLevelDistance = ((tr._camera.position[2] * tr.worldSize) - minElevationInPixels) / Math.cos(tr._pitch);
    const topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(Math.max(Math.PI / 2.0 - tr._pitch - fovAboveCenter, 0.01));

    // Calculate z distance of the farthest fragment that should be rendered.
    const furthestDistance = Math.sin(tr._pitch) * topHalfSurfaceDistance + cameraToSeaLevelDistance;
    const horizonDistance = cameraToSeaLevelDistance * (1 / tr._horizonShift);

    // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
    return Math.min(furthestDistance * 1.01, horizonDistance);
}

export const initMap = () => {

    // const tk = 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA'
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
        zoom: 16.096017911120207,
        // pitch: 10.71521535597063,
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


        // container: 'map',
        // zoom: 14,
        // center: [-114.26608, 32.7213],
        // pitch: 80,
        // bearing: 41,
        // // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
        // style: 'mapbox://styles/mapbox/satellite-streets-v12'
    })

        .on('load', () => {

            // map.showTileBoundaries = true;

            map.addLayer(layerV0)
        })
}