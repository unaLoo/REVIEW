import { mat4 } from "gl-matrix"
import { createShader, createTexture2D, loadImage, createFrameBuffer, createRenderBuffer, enableAllExtensions, createVBO, createIBO, createCustomMipmapTexture2D, createFboPoolforMipmapTexture, calculateMipmapLevels } from "./glLib"
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { MercatorCoordinate } from 'mapbox-gl';
// import * as dat from 'dat.gui'
import earcut from 'earcut'
import axios from "axios"
import mapboxgl from "mapbox-gl"


export class TerrainLayer {

    constructor() {

        this.id = 'terrainLayer'
        this.type = 'custom'
        this.renderingMode = '3d'
        this.frame = 0.0

        this.proxyLayerID = 'pxy-layer'
        this.proxySourceID = 'pxy-source'

        this.maskURL = '/mask/CJ.geojson'

        this.isReady = false

        this.canvasWidth = 0
        this.canvasHeight = 0

        this.exaggeration = 30.0
        this.withContour = 1.0
        this.withLighting = 1.0
        this.elevationRange = [-66.513999999999996, 4.3745000000000003]

        // for mipmap
        this.level = 0
    }

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
    }




    async onAdd(map, gl) {
        this.map = map
        this.gl = gl
        enableAllExtensions(gl)

        this.initProxy(map)
        this.proxySouceCache = map.style.getOwnSourceCache(this.proxySourceID);

        this.canvasWidth = gl.canvas.width
        this.canvasHeight = gl.canvas.height

        ///////////////////////////////////////////////////
        ///////////////// Load shaders

        this.maskProgram = await createShader(gl, '/shaders/1105/mask.glsl')
        this.meshProgram = await createShader(gl, '/shaders/1105/mesh.glsl')
        this.showProgram = await createShader(gl, '/shaders/1105/show.glsl')



        ///////////////////////////////////////////////////
        ///////////////// create textures
        this.maskTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.R8, gl.RED, gl.UNSIGNED_BYTE)

        const paletteBitmap = await loadImage('/images/contourPalette1D.png')
        this.paletteTexture = createTexture2D(gl, paletteBitmap.width, paletteBitmap.height, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paletteBitmap, gl.LINEAR)

        this.meshTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.RG32F, gl.RG, gl.FLOAT)

        const depthTexture = this.meshDepthTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT)
        ///////////////////////////////////////////////////
        ///////////////// Prepare buffers

        //// mask pass ////
        this.maskFbo = createFrameBuffer(gl, [this.maskTexture], null, null)

        let { vertexData, indexData } = await parseMultipolygon(this.maskURL)
        let maskPosBuffer = createVBO(gl, vertexData)
        let maskIdxBuffer = createIBO(gl, indexData) //Uint16 --> gl.UNSIGNED_SHORT
        this.maskElements = indexData.length

        this.maskVao = gl.createVertexArray()
        gl.bindVertexArray(this.maskVao)
        gl.enableVertexAttribArray(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, maskPosBuffer)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, maskIdxBuffer)
        gl.bindVertexArray(null)

        //// mesh Pass Vao ////
        let renderBuffer = createRenderBuffer(gl, this.canvasWidth, this.canvasHeight)
        this.meshFbo = createFrameBuffer(gl, [this.meshTexture], this.meshDepthTexture, renderBuffer)

        this.grid = createGrid(8192, 128 + 1)
        let posBuffer = createVBO(gl, this.grid.vertices)
        let idxBuffer = createIBO(gl, this.grid.indices)
        this.meshElements = this.grid.indices.length

        this.meshVao = gl.createVertexArray()
        gl.bindVertexArray(this.meshVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer)
        gl.bindVertexArray(null)



        await this.initDebug()

        this.isReady = true

    }

    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {*} matrix 
     * @returns 
     */
    render(gl, matrix) {
        if (!this.isReady) return
        this.frame++;

        const terrain = this.map.painter.terrain
        const tr = this.map.transform
        const tTiles = this.getTiles(this.proxySouceCache, terrain)
        const projMatrix = updateProjMatrix.call(this.map.transform, this.elevationRange[0] * 100.0)



        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 0: generate mask texture
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskFbo)
        gl.viewport(0.0, 0.0, this.canvasWidth, this.canvasHeight)
        gl.clearColor(0.0, 0.0, 0.0, 0.0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(this.maskProgram)
        gl.bindVertexArray(this.maskVao)
        gl.uniformMatrix4fv(gl.getUniformLocation(this.maskProgram, 'u_matrix'), false, matrix)
        gl.drawElements(gl.TRIANGLES, this.maskElements, gl.UNSIGNED_SHORT, 0)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        // this.doDebug(this.maskTexture)



        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 1: mesh pass 
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.meshFbo)
        gl.viewport(0.0, 0.0, this.canvasWidth, this.canvasHeight)

        gl.clearColor(0.0, 0.0, 0.0, 0.0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        
        gl.disable(gl.BLEND)

        gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LESS)

        gl.useProgram(this.meshProgram);
        gl.bindVertexArray(this.meshVao);

        for (let i = 0; i < tTiles.length; i++) {

            // let demTexture = null

            // let tile = tTiles[i].tile
            // let demTile = tTiles[i].demTile
            // let prevDemTile = tTiles[i].prevDemTile

            // let _demTile = null

            // if (demTile && demTile.demTexture) _demTile = demTile
            // else if (prevDemTile && prevDemTile.demTexture) _demTile = prevDemTile
            // else { console.log('no dem tile for', tile.tileID.toString()); continue }

            let demTexture = null

            let tile = tTiles[i].tile
            let demTile = tTiles[i].demTile
            let prevDemTile = tTiles[i].prevDemTile

            if (!tile || !demTile || !demTile.demTexture) continue
            if (tile && demTile && demTile.demTexture) {
                demTexture = demTile.demTexture.texture
            } else if (tile && prevDemTile && prevDemTile.demTexture) {
                demTexture = prevDemTile.demTexture.texture
            } else {
                console.log('no dem texture')
                continue
            }


            //// tile logic ////
            let posMatrix = tr.calculatePosMatrix(tile.tileID.toUnwrapped(), tr.worldSize);
            let tileMPMatrix = mat4.multiply([], projMatrix, posMatrix);

            const proxyId = tile.tileID.canonical;
            const demId = demTile.tileID.canonical;
            const demScaleBy = Math.pow(2, demId.z - proxyId.z);
            const uniforms = {};

            uniforms[`u_dem_tl`] = [proxyId.x * demScaleBy % 1, proxyId.y * demScaleBy % 1];
            uniforms['u_dem_size'] = 514 - 2;
            uniforms[`u_dem_scale`] = demScaleBy;
            uniforms['u_skirt_height'] = skirtHeight(tr.zoom, this.exaggeration, terrain.sourceCache._source.tileSize);
            uniforms['u_exaggeration'] = this.exaggeration

            //// tile render ////
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, demTexture)

            gl.uniformMatrix4fv(gl.getUniformLocation(this.meshProgram, 'u_matrix'), false, tileMPMatrix)
            gl.uniform1i(gl.getUniformLocation(this.meshProgram, 'float_dem_texture'), 0);
            gl.uniform2fv(gl.getUniformLocation(this.meshProgram, 'u_dem_tl'), uniforms['u_dem_tl']);
            gl.uniform1f(gl.getUniformLocation(this.meshProgram, 'u_dem_size'), uniforms['u_dem_size']);
            gl.uniform1f(gl.getUniformLocation(this.meshProgram, 'u_dem_scale'), uniforms['u_dem_scale']);
            gl.uniform1f(gl.getUniformLocation(this.meshProgram, 'u_exaggeration'), uniforms['u_exaggeration'])
            gl.uniform1f(gl.getUniformLocation(this.meshProgram, 'u_skirt_height'), uniforms['u_skirt_height'])

            gl.drawElements(gl.TRIANGLES, this.meshElements, gl.UNSIGNED_SHORT, 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        // this.doDebug(this.meshTexture)



        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 2: final show pass 
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height)

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.showProgram)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.meshTexture)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture)


        gl.uniform1i(gl.getUniformLocation(this.showProgram, 'meshTexture'), 0)
        gl.uniform1i(gl.getUniformLocation(this.showProgram, 'paletteTexture'), 1)
        gl.uniform1i(gl.getUniformLocation(this.showProgram, 'maskTexture'), 2)
        gl.uniform2fv(gl.getUniformLocation(this.showProgram, 'e'), this.elevationRange)
        gl.uniform1f(gl.getUniformLocation(this.showProgram, 'interval'), 1.0)
        gl.uniform1f(gl.getUniformLocation(this.showProgram, 'withContour'), this.withContour)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)


    }

    getTiles(sourceCache) {
        let tiles = []
        if (!!sourceCache) {
            // let demTiles = this.map.painter.terrain.visibleDemTiles
            // tiles = demTiles
            let _tiles = sourceCache.getVisibleCoordinates()
            // sortByDistanceToCamera(_tiles, this.map.painter)
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
    }


    async initDebug() {
        this.debugProgram = await createShader(this.gl, '/shaders/1105/debug.glsl')
    }
    // temp
    doDebug(texture) {
        let gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height)
        gl.useProgram(this.debugProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
        gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'mipmap'), 0.0)
        gl.uniform1i(gl.getUniformLocation(this.debugProgram, 'debugTexture'), 0)
        gl.uniform1i(gl.getUniformLocation(this.debugProgram, 'paletteTexture'), 1)
        gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'debugLevel'), 0)
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
        zoom: 16.096017911120207,
        // pitch: 10.71521535597063,
        pitch: 0,
    }

    // const map = new ScratchMap({
    const map = new mapboxgl.Map({
        accessToken: tk,
        // style: EmptyStyle,
        style: 'mapbox://styles/mapbox/dark-v11',
        // style: 'mapbox://styles/mapbox/dark-v11',
        // style: 'mapbox://styles/mapbox/satellite-streets-v12',
        container: 'map',
        projection: 'mercator',
        antialias: true,
        maxZoom: 22,
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

            map.addLayer(new TerrainLayer())
        })
}




//#region helper functions
async function parseMultipolygon(geojsonURL) {

    const geojson = (await axios.get(geojsonURL)).data
    let coordinate = geojson.features[0].geometry.coordinates[0]
    var data = earcut.flatten(coordinate)
    var triangle = earcut(data.vertices, data.holes, data.dimensions)
    coordinate = data.vertices.flat()
    return {
        vertexData: coordinate,
        indexData: triangle,
    }
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

function skirtHeight(zoom, terrainExaggeration, tileSize) {
    // Skirt height calculation is heuristic: provided value hides
    // seams between tiles and it is not too large: 9 at zoom 22, ~20000m at zoom 0.
    if (terrainExaggeration === 0) return 0;
    const exaggerationFactor = (terrainExaggeration < 1.0 && tileSize === 514) ? 0.25 / terrainExaggeration : 1.0;
    return 10 * Math.pow(1.5, 22 - zoom) * Math.max(terrainExaggeration, 1.0) * exaggerationFactor;
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

//#endregion