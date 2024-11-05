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
import tilebelt from "@mapbox/tilebelt";

const layerV0 = {
    id: 'test',
    type: 'custom',
    renderingMode: '3d',

    proxySourceID: 'pxy-source',
    proxyLayerID: 'pxy-layer',

    exaggeration: 30.0,

    vao: null,

    onAdd(map, gl) {
        this.initProxy(map);
        this.grid = this.createGrid(8192, 128 + 1);
        this.proxySouceCache = map.style.getOwnSourceCache(this.proxySourceID);

        ///////////////////////////
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

        //////////////////////////

        this.map = map;
        // this.move = this.move.bind(this);
        // map.on('move', e => {
        //     this.move()
        // })
    },
    render(gl, matrix) {
        // console.log(this.map.painter.terrain._updateTimestamp)
        const renderTimeStamp = performance.now()

        const projMatrix = this.updateProjectionMat.call(this.map.transform)
        // console.log(m)

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        // gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.BLEND)

        // gl.enable(gl.STENCIL_TEST)

        gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LESS)



        const tiles = this.getTiles(this.proxySouceCache)
        // console.log(tiles.map(t => t.prevDemTile.tileID.canonical))
        // console.log(tiles.map(t => t.demTile.tileID.canonical))
        let tr = this.map.transform;
        let terrain = this.map.painter.terrain;

        for (let i = 0; i < tiles.length; i++) {

            let demTexture = null

            let tile = tiles[i].tile
            let demTile = tiles[i].demTile
            let prevDemTile = tiles[i].prevDemTile

            if (!tile || !demTile || !demTile.demTexture) continue
            if (tile && demTile && demTile.demTexture) {
                demTexture = demTile.demTexture.texture
            } else if (tile && prevDemTile && prevDemTile.demTexture) {
                demTexture = prevDemTile.demTexture.texture
            } else {
                console.log('no dem texture')
                continue
            }


            // console.log(prevDemTile ? prevDemTile.tileID.canonical : null, demTile.tileID.canonical)
            if (demTileChanged(prevDemTile, demTile)) {
                console.log('dem changed')
            }

            // tile logic

            let posMatrix = this.map.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), this.map.transform.worldSize);
            let tileMPMatrix = mat4.multiply([], projMatrix, posMatrix);

            // let tileMPMatrix = tile.tileID.projMatrix

            const proxyId = tile.tileID.canonical;
            const demId = demTile.tileID.canonical;
            const demScaleBy = Math.pow(2, demId.z - proxyId.z);
            const uniforms = {};

            uniforms[`u_dem_tl`] = [proxyId.x * demScaleBy % 1, proxyId.y * demScaleBy % 1];
            uniforms['u_dem_size'] = 514 - 2;
            uniforms[`u_dem_scale`] = demScaleBy;
            uniforms['u_skirt_height'] = skirtHeight(tr.zoom, 1.0, terrain.sourceCache._source.tileSize);
            uniforms['u_exaggeration'] = this.exaggeration


            // tile render
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_matrix'), false, tileMPMatrix)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, demTexture);

            gl.uniform1i(gl.getUniformLocation(this.program, 'float_dem_texture'), 0);
            gl.uniform2fv(gl.getUniformLocation(this.program, 'u_dem_tl'), uniforms['u_dem_tl']);
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_dem_size'), uniforms['u_dem_size']);
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_dem_scale'), uniforms['u_dem_scale']);
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_exaggeration'), uniforms['u_exaggeration'])
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_skirt_height'), uniforms['u_skirt_height'])

            // gl.stencilFunc(gl.GEQUAL, tile.tileID.canonical.z, 0xFF)
            // gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE) 

            gl.drawElements(gl.TRIANGLES, this.grid.indices.length, gl.UNSIGNED_SHORT, 0);

        }
        // gl.disable(gl.STENCIL_TEST);




    },

    initProxy(map) {
        map.addSource('dem', {
            'type': 'raster-dem',
            // 'url': 'mapbox://mapbox.terrain-rgb',
            'tiles': [
                '/TTB/v0/terrain-rgb/{z}/{x}/{y}.png'
            ],
            'tileSize': 512,
            'maxzoom': 14
        })
        map.addSource(this.proxySourceID,
            {
                type: 'geojson',
                data: {
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "properties": {},
                        "geometry": {
                            "coordinates": [[[-1, 1], [1, 1], [1, -1], [-1, -1], [-1, 1]]],
                            "type": "Polygon"
                        }
                    }]
                }
            }
        )
        map.setTerrain({ 'source': 'dem', 'exaggeration': 0.1 });

        map.addLayer(
            {
                id: this.proxyLayerID,
                type: 'fill',
                source: this.proxySourceID,
                paint: {
                    'fill-color': '#006eff',
                    'fill-opacity': 0.01
                }
            }
        )

    },
    getTiles(sourceCache) {
        let tiles = []
        if (!!sourceCache) {
            // let demTiles = this.map.painter.terrain.visibleDemTiles
            // tiles = demTiles
            let _tiles = sourceCache.getVisibleCoordinates()
            sortByDistanceToCamera(_tiles, this.map.painter)
            _tiles = _tiles.reverse()
            console.log('sortedTile', _tiles.map(t => t.canonical.toString()))
            for (let i = 0; i < _tiles.length; i++) {
                let id = _tiles[i].key
                let tile = sourceCache.getTileByID(id)
                const nowDemTile = this.map.painter.terrain.terrainTileForTile[id]
                const prevDemTile = this.map.painter.terrain.prevTerrainTileForTile[id]

                tiles.push({
                    tile: tile,
                    demTile: nowDemTile,
                    prevDemTile: prevDemTile,
                })
            }
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
    updateProjectionMat(minElevation = -90.0, mercatorWorldSize = 1024000) {
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

        const cameraToClipPerspective = this._camera.getCameraToClipPerspective(this._fov, this.width / this.height, nearZ, farZ);
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

function skirtHeight(zoom, terrainExaggeration, tileSize) {
    // Skirt height calculation is heuristic: provided value hides
    // seams between tiles and it is not too large: 9 at zoom 22, ~20000m at zoom 0.
    if (terrainExaggeration === 0) return 0;
    const exaggerationFactor = (terrainExaggeration < 1.0 && tileSize === 514) ? 0.25 / terrainExaggeration : 1.0;
    return 10 * Math.pow(1.5, 22 - zoom) * Math.max(terrainExaggeration, 1.0) * exaggerationFactor;
}

function demTileChanged(prev, next) {
    if (prev == null || next == null)
        return false;
    if (!prev.hasData() || !next.hasData())
        return false;
    if (prev.demTexture == null || next.demTexture == null)
        return false;
    return prev.tileID.key !== next.tileID.key;
}


function sortByDistanceToCamera(tileIDs, painter) {
    const cameraCoordinate = painter.transform.pointCoordinate(painter.transform.getCameraPoint());
    const cameraPoint = { x: cameraCoordinate.x, y: cameraCoordinate.y };

    tileIDs.sort((a, b) => {
        if (b.overscaledZ - a.overscaledZ) return b.overscaledZ - a.overscaledZ;

        const aPoint = {
            x: a.canonical.x + (1 << a.canonical.z) * a.wrap,
            y: a.canonical.y
        };

        const bPoint = {
            x: b.canonical.x + (1 << b.canonical.z) * b.wrap,
            y: b.canonical.y
        };

        const cameraScaled = {
            x: cameraPoint.x * (1 << a.canonical.z),
            y: cameraPoint.y * (1 << a.canonical.z)
        };

        cameraScaled.x -= 0.5;
        cameraScaled.y -= 0.5;

        const distSqr = (point1, point2) => {
            const dx = point1.x - point2.x;
            const dy = point1.y - point2.y;
            return dx * dx + dy * dy;
        };

        return distSqr(cameraScaled, aPoint) - distSqr(cameraScaled, bPoint);
    });
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

            map.showTileBoundaries = true;

            map.addLayer(layerV0)
        })
}