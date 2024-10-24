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
const vs = `#version 300 es

layout(location = 0) in vec2 a_position;

uniform mat4 u_matrix;
uniform sampler2D float_dem_texture;

const float MAPBOX_TILE_EXTENT = 8192.0f;

out vec2 v_uv;

vec2 uvCorrection(vec2 uv, vec2 dim) {
    return clamp(uv, vec2(0.0), dim - vec2(1.0));
}

float decodeFromTerrainRGB(vec3 rgb) {

    vec3 RGB = rgb * 255.0;    
    float height = -10000.0 + ((RGB.r * 256.0 * 256.0 + RGB.g * 256.0 + RGB.b) * 0.1);
    return height;
}

float linearSamplingTerrainRGB(sampler2D texture, vec2 uv, vec2 dim) {

    float tl = decodeFromTerrainRGB(textureLod(texture, uv / dim, 0.0).rgb);
    float tr = decodeFromTerrainRGB(textureLod(texture, uvCorrection(uv + vec2(1.0, 0.0), dim) / dim, 0.0).rgb);
    float bl = decodeFromTerrainRGB(textureLod(texture, uvCorrection(uv + vec2(0.0, 1.0), dim) / dim, 0.0).rgb);
    float br = decodeFromTerrainRGB(textureLod(texture, uvCorrection(uv + vec2(1.0, 1.0), dim) / dim, 0.0).rgb);
    float mix_x = fract(uv.x);
    float mix_y = fract(uv.y);
    float top = mix(tl, tr, mix_x);
    float bottom = mix(bl, br, mix_x);
    return mix(top, bottom, mix_y);
}

void main(){

    // vec2 dim = vec2(textureSize(float_dem_texture, 0));
    // float elevation = linearSamplingTerrainRGB(float_dem_texture, a_position * dim, dim);

    gl_Position = u_matrix * vec4(a_position * MAPBOX_TILE_EXTENT, 0.0, 1.0);
    v_uv = a_position;

}
`

const fs = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D float_dem_texture;

out vec4 outColor;



void main(){


    // outColor = vec4(texture(float_dem_texture, v_uv).rgb, 0.5);
    // outColor = vec4(1.0f,0.0f,0.0f,1.0f);
    outColor = vec4(0.8f);
}

`

const testLayer = {
    id: 'test',
    type: 'custom',
    renderingMode: '3d',

    proxySourceID: 'pxy-source',
    proxyLayerID: 'pxy-layer',

    vao: null,

    onAdd(map, gl) {
        this.initProxy(map)
        // this.proxySouceCache = map.style.getLayerSourceCache(map.getLayer(this.proxyLayerID))
        this.proxySouceCache = map.style.getOwnSourceCache(this.proxySourceID)
        this.program = createProgramFromSource(gl, vs, fs)

        this.posBuffer = createVBO(gl, [0, 0, 1.0, 0, 0, 1.0, 1.0, 1.0])

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        this.matLocation = gl.getUniformLocation(this.program, 'u_matrix');

        this.map = map;
        this.move = this.move.bind(this);
        map.on('move', e => {
            this.move()
        })
    },
    render(gl, matrix) {
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        this.getTiles(this.proxySouceCache).forEach(tile => {

            if (tile.demTexture && tile.demTexture.texture) {
                gl.uniformMatrix4fv(this.matLocation, false, tile.tileID.projMatrix)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, tile.demTexture.texture);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            else if (tile.texture && tile.texture.texture) {
                gl.uniformMatrix4fv(this.matLocation, false, tile.tileID.projMatrix)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, tile.texture.texture);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            else {
                gl.uniformMatrix4fv(this.matLocation, false, tile.tileID.projMatrix);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }


        })


    },
    move() {
        this.proxySouceCache.update(this.map.painter.transform);
    },
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
                map.setTerrain({ 'source': this.proxySourceID, 'exaggeration': 1.0 });
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
        // style: 'mapbox://styles/mapbox/light-v11',
        style: 'mapbox://styles/mapbox/dark-v11',
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

            map.showTileBoundaries = true;

            map.addLayer(testLayer)
        })
}