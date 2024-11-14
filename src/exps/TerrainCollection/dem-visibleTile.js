import { mat4 } from "gl-matrix"
import { createShaderFromCode, createTexture2D, loadImage, createFrameBuffer, createRenderBuffer, enableAllExtensions, createVBO, createIBO } from "./glLib"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MercatorCoordinate } from 'mapbox-gl';

import debugCode from './shader/dem-visibleTile/debug.glsl'
import terrainMeshCode from './shader/dem-visibleTile/terrainMesh.glsl'
import terrainLayerCode from './shader/dem-visibleTile/terrainLayer.glsl'
import modelCode from './shader/dem-visibleTile/model.glsl'


export default class TerrainByDEMvisible {

    constructor() {
        this.id = 'test'
        this.type = 'custom'
        this.renderingMode = '3d'
        this.frame = 0.0

        this.proxyLayerID = 'pxy-layer'
        this.proxySourceID = 'pxy-source'

        this.vao = null
        this.isReady = false

        this.canvasWidth = 0
        this.canvasHeight = 0

        this.withContour = 1.0
        this.lightingMode = 2.0
        this.color = [0.0, 0.0, 0.0]
        this.elevationRange = [-66.513999999999996, 4.3745000000000003]

        this.meshes = []
        this.modelConfig = {
            lightPosition: [2, 4, 3],
            modelScale: 0.000005,
            modelPos: [120.53794466757358, 32.03551107103058],
        }
        this.modelConfig.mercatorPos = MercatorCoordinate.fromLngLat(this.modelConfig.modelPos, 0)
    }

    /**
     * @param {WebGL2RenderingContext} gl 
     */
    async onAdd(map, gl) {

        this.initProxy(map)
        enableAllExtensions(gl)

        this.map = map
        this.gl = gl
        this.proxySouceCache = map.style.getOwnSourceCache(this.proxySourceID)

        this.canvasWidth = gl.canvas.width
        this.canvasHeight = gl.canvas.height

        // Load shaders
        this.program = await createShaderFromCode(gl, terrainMeshCode)
        this.showShader = await createShaderFromCode(gl, terrainLayerCode)
        this.modelProgram = await createShaderFromCode(gl, modelCode)

        // Load Image
        const paletteBitmap = await loadImage('/images/contourPalette1D.png')

        // Create textures
        this.dnormTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.RGBA32F, gl.RGBA, gl.FLOAT)
        this.dHsTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.RG32F, gl.RG, gl.FLOAT)

        this.paletteTexture = createTexture2D(gl, paletteBitmap.width, paletteBitmap.height, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paletteBitmap, gl.LINEAR)


        // Prepare buffers
        this.grid = createGrid(8192, 128 + 1)
        this.idxBuffer = createIBO(gl, this.grid.indices)
        this.posBuffer = createVBO(gl, this.grid.vertices)

        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer)
        gl.bindVertexArray(null)
        gl.bindVertexArray(null);


        // Prepare Passes
        this.layerRenderBuffer = createRenderBuffer(gl, this.canvasWidth, this.canvasHeight)
        this.layerPass = createFrameBuffer(gl, [this.dnormTexture, this.dHsTexture], null, this.layerRenderBuffer)



        // model
        const loader = new GLTFLoader();
        let gltf = this.gltf = await loader.loadAsync('/model/wind_turbine/scene.gltf')
        let supportMesh = gltf.scene.children[0].children[0].children[0].children[0].children[0]
        let bladesMesh = gltf.scene.children[0].children[0].children[0].children[1].children[0]
        bladesMesh.needRotate = true
        this.meshes = [this.initMesh(supportMesh), this.initMesh(bladesMesh)]


        await this.initDebug()
        this.isReady = true
    }

    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @returns 
     */
    render(gl, matrix) {
        // return;
        if (!this.isReady) return
        this.frame++;

        const u_dem_scale = 1.0
        const u_dem_tl = [0, 0]
        const terrain = this.map.painter.terrain
        // const renderableTiles = getTiles(this.proxySouceCache)
        // const sortedTiles = renderableTiles.sort((a, b) => b.tileID.canonical.z - a.tileID.canonical.z);
        const renderableTiles = terrain._visibleDemTiles
        const maxZoom = Math.max(...terrain._visibleDemTiles.map(tile => tile.tileID.canonical.z))
        const skirt = skirtHeight(this.map.transform.zoom, terrain.exaggeration(), terrain.sourceCache._source.tileSize)
        const projMatrix = updateProjMatrix.call(this.map.transform, this.elevationRange[0] * 100.0)

        // Tick Render
        // Pass 1: Layer Pass
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.layerPass)
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
        gl.viewport(0.0, 0.0, this.canvasWidth, this.canvasHeight)

        gl.clearStencil(0)
        gl.clearColor(9999.0, 0.0, 0.0, 0.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

        gl.disable(gl.BLEND)
        gl.depthFunc(gl.LESS)
        gl.enable(gl.DEPTH_TEST)
        gl.enable(gl.STENCIL_TEST)

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        for (const tile of renderableTiles) {

            const posMatrix = this.map.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), this.map.transform.worldSize)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tile.demTexture.texture)
            gl.uniform1i(gl.getUniformLocation(this.program, 'float_dem_texture'), 0)

            gl.uniform2fv(gl.getUniformLocation(this.program, 'u_dem_tl'), u_dem_tl)
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_dem_scale'), u_dem_scale)
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_exaggeration'), terrain.exaggeration())
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_matrix'), false, projMatrix)
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_modelMatrix'), false, posMatrix)
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_skirt_height'), isEdgeTile(tile.tileID.canonical, this.map.transform.renderWorldCopies) ? skirt / 10 : skirt)

            gl.stencilFunc(gl.GEQUAL, tile.tileID.canonical.z, 0xFF)
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)

            gl.drawElements(gl.TRIANGLES, this.grid.indices.length, gl.UNSIGNED_SHORT, 0);
        }
        gl.disable(gl.STENCIL_TEST);






        // Pass 2: Show Pass
        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height)
        gl.disable(gl.DEPTH_TEST)

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.showShader)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.dnormTexture)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_2D, this.dHsTexture)

        gl.uniform1i(gl.getUniformLocation(this.showShader, 'srcTexture'), 0)
        gl.uniform1i(gl.getUniformLocation(this.showShader, 'paletteTexture'), 1)
        gl.uniform1i(gl.getUniformLocation(this.showShader, 'dhsTexture'), 2)
        gl.uniform1f(gl.getUniformLocation(this.showShader, 'interval'), 1.0)
        gl.uniform1f(gl.getUniformLocation(this.showShader, 'withContour'), this.withContour)
        gl.uniform1f(gl.getUniformLocation(this.showShader, 'lightingMode'), this.lightingMode)
        gl.uniform2fv(gl.getUniformLocation(this.showShader, 'e'), new Float32Array(this.elevationRange))
        gl.uniform3fv(gl.getUniformLocation(this.showShader, 'contourColor'), new Float32Array(this.color))

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)



        // this.doDebug(this.dHsTexture)



        // Pass 3: Model Render Pass
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.enable(gl.DEPTH_TEST)
        // gl.enable(gl.CULL_FACE)
        // gl.clearColor(0.2, 0.2, 0.2, 0.2)
        gl.clear(gl.DEPTH_BUFFER_BIT)

        gl.useProgram(this.modelProgram)
        gl.uniformMatrix4fv(gl.getUniformLocation(this.modelProgram, 'uMatrix'), false, matrix)
        gl.uniform3fv(gl.getUniformLocation(this.modelProgram, 'uLightPosition'), this.modelConfig.lightPosition)

        // forEach meshes
        this.meshes.forEach(mesh => {
            let { modelMatrix, normalMatrix } = this.calcMatrix(mesh, mesh.needRotate)
            gl.uniformMatrix4fv(gl.getUniformLocation(this.modelProgram, 'uModelMatrix'), false, modelMatrix)
            gl.uniformMatrix4fv(gl.getUniformLocation(this.modelProgram, 'uNormalMatrix'), false, normalMatrix)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
            gl.bindVertexArray(mesh.vao)
            gl.drawElements(gl.TRIANGLES, mesh.geometry.index.count, gl.UNSIGNED_INT, 0);
        })

        this.map.triggerRepaint()

    }

    initProxy(map) {
        const pxy = {
            'terrain-rgb': () => {
                map.addSource(this.proxySourceID, {
                    'type': 'raster-dem',
                    'tiles': [
                        '/TTB/v0/terrain-rgb/{z}/{x}/{y}.png'
                    ],
                    'tileSize': 512,
                    'maxzoom': 14
                });
                map.setTerrain({ 'source': this.proxySourceID, 'exaggeration': 0. });
            }
        }
        pxy['terrain-rgb']()
    }

    initMesh(mesh) {
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
    }

    calcMatrix(mesh, rotate = false) {
        let modelMatrix = mat4.create()
        mat4.translate(modelMatrix, modelMatrix, [this.modelConfig.mercatorPos.x, this.modelConfig.mercatorPos.y, 0])
        mat4.scale(modelMatrix, modelMatrix, [this.modelConfig.modelScale, this.modelConfig.modelScale, this.modelConfig.modelScale])
        mat4.rotateX(modelMatrix, modelMatrix, 0.5 * Math.PI)
        mat4.multiply(modelMatrix, modelMatrix, mesh.matrixWorld.elements)
        rotate && mat4.rotateZ(modelMatrix, modelMatrix, this.frame * 0.05)

        let normalMatrix = mat4.create()
        mat4.invert(normalMatrix, modelMatrix)
        mat4.transpose(normalMatrix, normalMatrix)
        return {
            modelMatrix,
            normalMatrix
        }
    }

    async initDebug() {
        this.debugProgram = await createShaderFromCode(this.gl, debugCode)
    }
    doDebug(texture) {
        let gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        // gl.clearColor(0.0, 0.0, 0.0, 0.0)
        // gl.clear(gl.COLOR_BUFFER_BIT)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height)
        gl.useProgram(this.debugProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(gl.getUniformLocation(this.debugProgram, 'debugTexture'), 0)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
}





//#region Helper

function getTiles(sourceCache) {

    let tiles = []
    let tileIDs = []
    let tileCoords = []
    if (!!sourceCache) {
        tileIDs = sourceCache.getVisibleCoordinates();
        tileIDs.map(tileID => {
            tiles.push(sourceCache.getTile(tileID))
            tileCoords.push(tileID.canonical)
        })
    }
    return tiles.filter(tile => tile.demTexture && tile.demTexture.texture)
}

function createGrid(TILE_EXTENT, count) {

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
}

function isEdgeTile(cid, renderWorldCopies) {
    const numTiles = 1 << cid.z;
    return (!renderWorldCopies && (cid.x === 0 || cid.x === numTiles - 1)) || cid.y === 0 || cid.y === numTiles - 1;
}

function skirtHeight(zoom, terrainExaggeration, tileSize) {
    // Skirt height calculation is heuristic: provided value hides
    // seams between tiles and it is not too large: 9 at zoom 22, ~20000m at zoom 0.
    if (terrainExaggeration === 0) return 0;
    const exaggerationFactor = (terrainExaggeration < 1.0 && tileSize === 514) ? 0.25 / terrainExaggeration : 1.0;
    return 6 * Math.pow(1.5, 22 - zoom) * Math.max(terrainExaggeration, 1.0) * exaggerationFactor;
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

function updateProjMatrix(minElevation) {

    if (!this.height) return;

    const offset = this.centerOffset;
    const isGlobe = this.projection.name === 'globe';

    // Z-axis uses pixel coordinates when globe mode is enabled
    const pixelsPerMeter = this.pixelsPerMeter;

    if (this.projection.name === 'globe') {
        this._mercatorScaleRatio = mercatorZfromAltitude(1, this.center.lat) / mercatorZfromAltitude(1, GLOBE_SCALE_MATCH_LATITUDE);
    }

    const projectionT = getProjectionInterpolationT(this.projection, this.zoom, this.width, this.height, 1024);

    // 'this._pixelsPerMercatorPixel' is the ratio between pixelsPerMeter in the current projection relative to Mercator.
    // This is useful for converting e.g. camera position between pixel spaces as some logic
    // such as raycasting expects the scale to be in mercator pixels
    this._pixelsPerMercatorPixel = this.projection.pixelSpaceConversion(this.center.lat, this.worldSize, projectionT);

    this.cameraToCenterDistance = 0.5 / Math.tan(this._fov * 0.5) * this.height * this._pixelsPerMercatorPixel;

    this._updateCameraState();

    this._farZ = farthestPixelDistanceOnPlane(this, minElevation, pixelsPerMeter);

    // The larger the value of nearZ is
    // - the more depth precision is available for features (good)
    // - clipping starts appearing sooner when the camera is close to 3d features (bad)
    //
    // Smaller values worked well for mapbox-gl-js but deckgl was encountering precision issues
    // when rendering it's layers using custom layers. This value was experimentally chosen and
    // seems to solve z-fighting issues in deckgl while not clipping buildings too close to the camera.
    this._nearZ = this.height / 50;

    const zUnit = this.projection.zAxisUnit === "meters" ? pixelsPerMeter : 1.0;
    const worldToCamera = this._camera.getWorldToCamera(this.worldSize, zUnit);

    let cameraToClip;

    const cameraToClipPerspective = this._camera.getCameraToClipPerspective(this._fov, this.width / this.height, this._nearZ, this._farZ);
    // Apply offset/padding
    cameraToClipPerspective[8] = -offset.x * 2 / this.width;
    cameraToClipPerspective[9] = offset.y * 2 / this.height;

    if (this.isOrthographic) {
        const cameraToCenterDistance = 0.5 * this.height / Math.tan(this._fov / 2.0) * 1.0;

        // Calculate bounds for orthographic view
        let top = cameraToCenterDistance * Math.tan(this._fov * 0.5);
        let right = top * this.aspect;
        let left = -right;
        let bottom = -top;
        // Apply offset/padding
        right -= offset.x;
        left -= offset.x;
        top += offset.y;
        bottom += offset.y;

        cameraToClip = this._camera.getCameraToClipOrthographic(left, right, bottom, top, this._nearZ, this._farZ);

        const mixValue =
            this.pitch >= OrthographicPitchTranstionValue ? 1.0 : this.pitch / OrthographicPitchTranstionValue;
        lerpMatrix(cameraToClip, cameraToClip, cameraToClipPerspective, easeIn(mixValue));
    } else {
        cameraToClip = cameraToClipPerspective;
    }

    // @ts-expect-error - TS2345 - Argument of type 'Float64Array' is not assignable to parameter of type 'ReadonlyMat4'.
    const worldToClipPerspective = mat4.mul([], cameraToClipPerspective, worldToCamera);
    // @ts-expect-error - TS2345 - Argument of type 'Float64Array' is not assignable to parameter of type 'ReadonlyMat4'.
    let m = mat4.mul([], cameraToClip, worldToCamera);

    if (this.projection.isReprojectedInTileSpace) {
        // Projections undistort as you zoom in (shear, scale, rotate).
        // Apply the undistortion around the center of the map.
        const mc = this.locationCoordinate(this.center);
        const adjustments = mat4.identity([]);
        mat4.translate(adjustments, adjustments, [mc.x * this.worldSize, mc.y * this.worldSize, 0]);
        mat4.multiply(adjustments, adjustments, getProjectionAdjustments(this));
        mat4.translate(adjustments, adjustments, [-mc.x * this.worldSize, -mc.y * this.worldSize, 0]);
        mat4.multiply(m, m, adjustments);
        // @ts-expect-error - TS2345 - Argument of type 'number[] | Float32Array' is not assignable to parameter of type 'mat4'.
        mat4.multiply(worldToClipPerspective, worldToClipPerspective, adjustments);
        this.inverseAdjustmentMatrix = getProjectionAdjustmentInverted(this);
    } else {
        this.inverseAdjustmentMatrix = [1, 0, 0, 1];
    }

    // The mercatorMatrix can be used to transform points from mercator coordinates
    // ([0, 0] nw, [1, 1] se) to GL coordinates. / zUnit compensates for scaling done in worldToCamera.
    // @ts-expect-error - TS2322 - Type 'mat4' is not assignable to type 'number[]'. | TS2345 - Argument of type 'number[] | Float32Array' is not assignable to parameter of type 'ReadonlyMat4'.
    this.mercatorMatrix = mat4.scale([], m, [this.worldSize, this.worldSize, this.worldSize / zUnit, 1.0]);

    // this.projMatrix = m;
    return m
}

function getProjectionInterpolationT(projection, zoom, width, height, maxSize = Infinity) {
    const range = projection.range;
    if (!range) return 0;

    const size = Math.min(maxSize, Math.max(width, height));
    // The interpolation ranges are manually defined based on what makes
    // sense in a 1024px wide map. Adjust the ranges to the current size
    // of the map. The smaller the map, the earlier you can start unskewing.
    const rangeAdjustment = Math.log(size / 1024) / Math.LN2;
    const zoomA = range[0] + rangeAdjustment;
    const zoomB = range[1] + rangeAdjustment;
    const t = smoothstep(zoomA, zoomB, zoom);
    return t;
}

function smoothstep(e0, e1, x) {
    x = clamp((x - e0) / (e1 - e0), 0, 1);
    return x * x * (3 - 2 * x);
}




//#endregion