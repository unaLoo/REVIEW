import mapboxgl, { MercatorCoordinate } from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css'
import * as Wuti from '../../webglFuncs/util'
import tilebelt from '@mapbox/tilebelt'
import fs from './shader/tileDraw.frag.glsl'
import vs from './shader/tileDraw.vert.glsl'
import * as dat from 'dat.gui'
import ScratchMap from './scratchMap'
import * as THREE from 'three'
import { mat4 } from "gl-matrix";

export default class InvasionLayer {

    id: string = 'invasion-layer';
    map: mapboxgl.Map | null = null;
    renderingMode: string = '2d';
    type: 'custom' = 'custom';

    source: string = '';
    tileSource: any;
    sourceCache: any;

    gl: WebGL2RenderingContext | null = null;
    rectProgram: WebGLProgram | null = null;
    matLocation: WebGLUniformLocation | null = null;
    cvSizeLocation: WebGLUniformLocation | null = null;
    sizeLocation: WebGLUniformLocation | null = null;
    uColorLocation: WebGLUniformLocation | null = null;
    aPosLocation: number | null = null;
    posBuffer: WebGLBuffer | null = null;
    vao: WebGLVertexArrayObject | null = null;

    ready: boolean = false;

    constructor(id: string) {
        this.map = null;
        this.gl = null;
        this.id = id;
        this.tileSource = null;
        this.source = this.id + 'Source'
        this.type = 'custom';
        this.renderingMode = '3d';
    }

    onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext) {
        this.map = map;
        this.gl = gl;

        this.createEmptySource();

        let vs = `#version 300 es
        in vec2 a_pos;
        uniform mat4 u_matrix;
        uniform vec2 canvasSize;
        uniform float size;
        // const vec2 pos[4] = vec2[4](vec2(0.0,0.0), vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0));
        void main(){
            // vec2 vertexPos = pos[gl_VertexID] * size;
            vec2 vertexPos = a_pos;
            gl_Position = u_matrix * vec4(vertexPos, 0.0, 1.0);
        }
        `
        let fs = `#version 300 es
        precision highp float;
        uniform vec3 color;
        out vec4 FragColor;
        void main() {
            FragColor = vec4(color/255.0, 0.3);
        }
        `
        const vShader = Wuti.createShader(gl, gl.VERTEX_SHADER, vs)!
        const fShader = Wuti.createShader(gl, gl.FRAGMENT_SHADER, fs)!
        this.rectProgram = Wuti.createProgram(gl, vShader, fShader)!;
        this.matLocation = gl.getUniformLocation(this.rectProgram, 'u_matrix')!
        this.cvSizeLocation = gl.getUniformLocation(this.rectProgram, 'canvasSize')!
        this.sizeLocation = gl.getUniformLocation(this.rectProgram, 'size')!
        this.uColorLocation = gl.getUniformLocation(this.rectProgram, 'color')!
        this.aPosLocation = gl.getAttribLocation(this.rectProgram, 'a_pos')!

        this.posBuffer = Wuti.createVBO(gl, [])
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.enableVertexAttribArray(this.aPosLocation);
        gl.vertexAttribPointer(this.aPosLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.ready = true;
    }


    render(gl: WebGL2RenderingContext, matrix: number[]) {

        console.log('render invasion layer');
        console.log(this.tilesInViewport)

        if (this.ready)
            this.tickLogic(gl, matrix)


    }

    get tilesInViewport() {
        return (this.map as any).style["_sourceCaches"][`other:${this.source}`]["_tiles"]
    }
    get theSourceCache() {
        return (this.map as any).style["_sourceCaches"]
    }

    createEmptySource() {
        const RECT = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "coordinates": [
                            [
                                [
                                    -180.0,
                                    85.5
                                ],
                                [
                                    -180.0,
                                    -85.5
                                ],
                                [
                                    180.0,
                                    -85.5
                                ],
                                [
                                    180.0,
                                    85.5
                                ],
                                [
                                    -180.0,
                                    85.5
                                ]
                            ]
                        ],
                        "type": "Polygon"
                    }
                }
            ]
        }
        this.map?.addSource(this.source, {
            type: 'geojson',
            data: RECT as any
        })
        this.map?.addLayer({
            id: this.id + '-proxy',
            type: 'fill',
            source: this.source,
            paint: {
                'fill-color': '#000000',
                'fill-opacity': 0.0
            }
        })

        this.tileSource = this.map?.getSource(this.source);

    }

    tickLogic(gl: WebGL2RenderingContext, matrix: number[]) {

        gl.useProgram(this.rectProgram);
        gl.uniformMatrix4fv(this.matLocation, false, matrix);
        gl.uniform2fv(this.cvSizeLocation, [1, 1]);
        gl.uniform1f(this.sizeLocation, 0.3);

        let tiles = this.tilesInViewport;
        let keys = Object.keys(tiles);
        for (let i = 0; i < keys.length; i++) {
            let tile = tiles[keys[i]];
            let [x, y, z] = [tile.tileID.canonical.x, tile.tileID.canonical.y, tile.tileID.canonical.z]
            const polygon = tilebelt.tileToGeoJSON([x, y, z]);
            const vertex = tilePolygonToVertex(polygon);
            gl.uniform3fv(this.uColorLocation, [233, 0, 0]);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW);
            gl.bindVertexArray(this.vao);
            gl.drawArrays(gl.LINE_STRIP, 0, 4);
        }


    }



}


type RasterTileOption = {
    type: 'raster',
    tiles: string[],
}
type PlainSubdivisionInfo = {
    uvData: Float32Array,
    vertexData: Float32Array,
    indexData: Uint16Array
}
type controller = {
    exaggeration: number,
    mode: 'fill' | 'line' | 'point'
}

const MZSVIEWCONFIG = {
    center: [120.53794466757358, 32.03061107103058],
    zoom: 16.096017911120207,
    pitch: 10.71521535597063,
}

export class TileDrivenCustomLayer {

    id: string = 'invasion-layer';
    // map: mapboxgl.Map | null = null;
    map: any = null;
    gl: WebGL2RenderingContext | null = null;
    renderingMode: string = '3d';
    type: 'custom' = 'custom';
    gui: dat.GUI | null = null;

    //////////// CONST /////////////
    TILE_SIZE = 512;
    WIDTH_SEGMENTS = 10;
    HEIGHT_SEGMENTS = 10;

    EXAGERATION = 500;
    CONTROLLER: controller = {
        exaggeration: 500,
        mode: 'fill',
    }
    ////////////////////////////////CONST


    ///////////// TILE /////////////////
    source: string = '';
    tileSource: any;
    sourceCache: any;

    inputTileSourceID: string = '';
    inputTileSource: any; // mapbox source obj
    inputTileSourceCache: any; // mapbox source cache obj
    inputTileOption: RasterTileOption | null = null;
    proxyLayerID: string = '';

    globalPlainInfo: PlainSubdivisionInfo | null = null;
    ///////////////////////////////TILE


    /////////// gl ///////////////
    uvBuffer: WebGLBuffer | null = null;
    vertexBuffer: WebGLBuffer | null = null;
    indexBuffer: WebGLBuffer | null = null;

    inputTexture: WebGLTexture | null = null;
    outputTexture: WebGLTexture | null = null;

    program: WebGLProgram | null = null;
    glPositions: { [key: string]: any } = {};

    vao: WebGLVertexArrayObject | null = null;


    ////////////////////////////gl








    ready: boolean = false;

    constructor(id: string, tileOption: RasterTileOption) {
        this.id = id;
        this.inputTileSourceID = this.id + '-InputSource'
        this.inputTileSource = null
        this.inputTileOption = tileOption
        this.proxyLayerID = this.id + '-ProxyLayer'

    }

    onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext) {
        this.map = map;
        this.gl = gl;

        this.initGUI()

        this.createProxyLayer();

        let res = this.planeSubdivision(this.TILE_SIZE, this.TILE_SIZE, this.WIDTH_SEGMENTS, this.HEIGHT_SEGMENTS)
        this.globalPlainInfo = {
            uvData: new Float32Array(res.uvs),
            vertexData: new Float32Array(res.vertices),
            indexData: new Uint16Array(res.indices),
        }

        this.createGLProgram();


        this.ready = true;
    }


    render(gl: WebGL2RenderingContext, matrix: number[]) {


        // const viewProjectionMatrix = new Float32Array(matrix);
        // const transform = this.map.transform;
        // const camera = this.map.style.camera;
        // const projectionMatrix = new Float32Array(16),
        //     projectionMatrixI = new Float32Array(16),
        //     viewMatrix = new Float32Array(16),
        //     viewMatrixI = new Float32Array(16);

        // // from https://github.com/mapbox/mapbox-gl-js/blob/master/src/geo/transform.js#L556-L568
        // const halfFov = transform._fov / 2;
        // const groundAngle = Math.PI / 2 + transform._pitch;
        // const topHalfSurfaceDistance = Math.sin(halfFov) * transform.cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);
        // const furthestDistance = Math.cos(Math.PI / 2 - transform._pitch) * topHalfSurfaceDistance + transform.cameraToCenterDistance;
        // const farZ = furthestDistance * 1.01;

        // mat4.perspective(projectionMatrix, transform._fov, transform.width / transform.height, 1, farZ);
        // mat4.invert(projectionMatrixI, projectionMatrix);
        // mat4.multiply(viewMatrix, projectionMatrixI, viewProjectionMatrix);
        // mat4.invert(viewMatrixI, viewMatrix);

        // camera.projectionMatrix = new THREE.Matrix4().fromArray(<any>projectionMatrix);

        // camera.matrix = new THREE.Matrix4().fromArray(<any>viewMatrixI);
        // // camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

        // console.log(camera.matrix, matrix)

        // console.log(this.map.transform)


        if (!this.ready) return
        // this.map.update()
        // console.log(this.map.transform)

        // console.log('mat', matrix)
        this.tickLogic(gl, matrix)
        // this.map.triggerRepaint()
    }



    createProxyLayer() {

        this.map?.addSource(this.inputTileSourceID, this.inputTileOption!)
        this.map?.addLayer({
            id: this.proxyLayerID,
            source: this.inputTileSourceID,
            type: 'raster',
            paint: { "raster-opacity": 0.02 }
        })


        this.inputTileSource = this.map.getSource(this.inputTileSourceID)
        this.inputTileSourceCache = this.map_style_sourceCaches[this.inputTileSourceID]

        // if (this.inputTileSource) {
        //     this.inputTileSourceCache = this.map_style_sourceCaches[this.inputTileSourceID]
        //     // input tile 更新的回调
        //     this.inputTileSource.on('data', (e: any) => {
        //         // console.log('tile source update!! do something!!', e)

        //         // do something
        //         this.inputTileSourceCache.update(this.map.painter.transform);
        //     })
        // } else {
        //     console.log('this.inputTileSource not got')
        // }



        this.map.style._layers[this.id].source = this.inputTileSourceID
        // this.map.style._layers[this.id].aaa = 'aaa'


        window.addEventListener('keydown', e => {
            if (e.key === 't') {
                console.log(this.map.getZoom())
                console.log(this.map.getCenter())
                console.log(this.map.getPitch())
            }
            else if (e.key === 'q') {
                const res = this.createGrid(2);
                console.log(res)
            }
        })
    }

    createGLProgram() {
        let gl = this.gl!
        this.vertexBuffer = Wuti.createVBO(gl, this.globalPlainInfo!.vertexData)
        this.uvBuffer = Wuti.createVBO(gl, this.globalPlainInfo!.uvData)
        this.indexBuffer = Wuti.createIBO(gl, this.globalPlainInfo!.indexData)
        this.inputTexture = Wuti.createEmptyTexture(gl, this.TILE_SIZE, this.TILE_SIZE)
        this.outputTexture = Wuti.createEmptyTexture(gl, this.TILE_SIZE, this.TILE_SIZE)
        this.program = Wuti.createProgramFromSource(gl, vs, fs)!

        this.glPositions['a_pos'] = gl.getAttribLocation(this.program, 'a_pos')!
        this.glPositions['a_uv'] = gl.getAttribLocation(this.program, 'a_uv')!
        this.glPositions['u_matrix'] = gl.getUniformLocation(this.program, 'u_matrix')!
        this.glPositions['u_inputTile'] = gl.getUniformLocation(this.program, 'u_inputTile')!
        this.glPositions['u_tileInfo'] = gl.getUniformLocation(this.program, 'u_tileInfo')!
        this.glPositions['u_exaggeration'] = gl.getUniformLocation(this.program, 'u_exaggeration')!

        this.vao = gl.createVertexArray()!
        gl.bindVertexArray(this.vao)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
        gl.enableVertexAttribArray(this.glPositions['a_pos'])
        gl.vertexAttribPointer(this.glPositions['a_pos'], 2, gl.FLOAT, false, 0, 0)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer)
        gl.enableVertexAttribArray(this.glPositions['a_uv'])
        gl.vertexAttribPointer(this.glPositions['a_uv'], 2, gl.FLOAT, false, 0, 0)

        gl.bindVertexArray(null)

        // gl.bindBuffer(gl.ARRAY_BUFFER, null)
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)

        console.log('create program success!')

    }


    get map_style_layers() {
        return this.map.style._layers
    }
    get map_style_sourceCaches() {
        // return this.map.style
        return this.map.style["_otherSourceCaches"]
    }


    tickLogic(gl: WebGL2RenderingContext, matrix: number[]) {

        const tiles = this.inputTileSourceCache.getVisibleCoordinates()
            .map((tileid: any) => this.inputTileSourceCache.getTile(tileid))

        // const { x, y, z } = tiles[0].tileID["canonical"]
        // console.log(z, x, y)
        // console.log(tiles[0].tileID.projMatrix)

        let _tile = tiles[0]
        if(_tile){
            // same , only projection info , not matix data
            // console.log(_tile.projection)
            // console.log(this.map.transform.projection)

            console.log(this.map.transform.globeMatrix)
            console.log(matrix)

            console.log(_tile.tileTransform)
            console.log(_tile.projection)

        }

        tiles.forEach((tile: any) => {
            // the inputTexture
            // the outputTexture
            // the plainInfo

            if (!tile.texture.texture) return


            const { x, y, z } = tile.tileID["canonical"]
            // console.log(x, y, z)
            // console.log(tile.tileID.projMatrix)

            const inputTileTexture = tile.texture.texture
            const _indexData = this.globalPlainInfo!.indexData

            gl.useProgram(this.program)

            /// uniforms
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, inputTileTexture)
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

            gl.uniform1i(this.glPositions['u_inputTile'], 0)
            gl.uniformMatrix4fv(this.glPositions['u_matrix'], false, tile.tileID.projMatrix)
            // gl.uniformMatrix4fv(this.glPositions['u_matrix'], false, matrix)
            gl.uniform3fv(this.glPositions['u_tileInfo'], [x, y, z])
            gl.uniform1f(this.glPositions['u_exaggeration'], this.CONTROLLER.exaggeration)

            /// attributes
            gl.bindVertexArray(this.vao)
            // gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
            // gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW)
            // gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer)
            // gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW)


            /// index
            // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)

            const draw = {
                'fill': () => gl.drawElements(gl.TRIANGLES, _indexData.length, gl.UNSIGNED_SHORT, 0),
                'line': () => gl.drawElements(gl.LINES, _indexData.length, gl.UNSIGNED_SHORT, 0),
                'point': () => gl.drawElements(gl.POINTS, _indexData.length, gl.UNSIGNED_SHORT, 0)
            }

            draw[this.CONTROLLER.mode]()

        });


    }


    initGUI() {
        this.gui = new dat.GUI()
        this.gui.domElement.style.position = 'absolute'
        this.gui.domElement.style.top = '10vh'
        this.gui.domElement.style.right = '10vw'
        this.gui.add(this.CONTROLLER, 'exaggeration', 0, 1000, 10).onChange((value: number) => {
            this.CONTROLLER.exaggeration = Math.floor(value)
            this.map.triggerRepaint()
        })
        this.gui.add(this.CONTROLLER, 'mode', ['fill', 'line', 'point']).onChange((value: 'fill' | 'line' | 'point') => {
            this.CONTROLLER.mode = value
            this.map.triggerRepaint()
        })
        this.gui.open();
    }


    planeSubdivision(width: number, height: number, widthSegs: number, heightSegs: number) {


        const gridX = Math.floor(widthSegs);
        const gridY = Math.floor(heightSegs);

        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;

        const segment_width = width / gridX;
        const segment_height = height / gridY;

        const indices = [];
        const vertices = [];
        const uvs = [];

        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segment_height;
            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segment_width;
                vertices.push(x / width, y / width);
                uvs.push(ix / gridX, 1 - (iy / gridY));
            }
        }

        for (let iy = 0; iy < gridY; iy++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iy;
                const b = ix + gridX1 * (iy + 1);
                const c = (ix + 1) + gridX1 * (iy + 1);
                const d = (ix + 1) + gridX1 * iy;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }
        return {
            indices, vertices, uvs
        }

    }

    createGrid(count: number) {

        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));


        const EXTENT = 1;
        const size = count + 2;

        // Around the grid, add one more row/column padding for "skirt".
        // let boundsArray = new Array(size * size);
        // let indexArray = new Array((size - 1) * (size - 1) * 2);
        let boundsArray: Array<number> = [];
        let indexArray: Array<number> = [];
        let skirtIndexArray: Array<number> = [];

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
                boundsArray.push(xi + offset, yi);
            }
        }
        const skirtIndexArrayOffset = (size - 3) * (size - 3) * 2;

        // Grid indices:
        for (let j = 1; j < size - 2; j++) {
            for (let i = 1; i < size - 2; i++) {
                const index = j * size + i;
                indexArray.push(index + 1, index, index + size);
                indexArray.push(index + size, index + size + 1, index + 1);
            }
        }
        // Padding (skirt) indices:
        [0, size - 2].forEach(j => {
            for (let i = 0; i < size - 1; i++) {
                const index = j * size + i;
                skirtIndexArray.push(index + 1, index, index + size);
                skirtIndexArray.push(index + size, index + size + 1, index + 1);
            }
        });

        return {
            boundsArray,
            indexArray,
            skirtIndexArray,
        }

    }



}



function tilePolygonToVertex(tilePolygon: any) {
    const p = tilePolygon
    let [minLng, minLat, maxLng, maxLat] = [
        180,
        85.5,
        -180,
        -85.5
    ]
    for (let i = 0; i < p.coordinates[0].length; i++) {
        let lnglat = p.coordinates[0][i];
        if (lnglat[0] < minLng) minLng = lnglat[0];
        if (lnglat[0] > maxLng) maxLng = lnglat[0];
        if (lnglat[1] < minLat) minLat = lnglat[1];
        if (lnglat[1] > maxLat) maxLat = lnglat[1];
    }
    const vertex = []
    let min = MercatorCoordinate.fromLngLat([minLng, minLat])
    let max = MercatorCoordinate.fromLngLat([maxLng, maxLat])

    // vertex.push(min.x, min.y)
    // vertex.push(min.x, max.y)
    // vertex.push(max.x, min.y)
    // vertex.push(max.x, max.y)
    vertex.push(min.x, min.y)
    vertex.push(min.x, max.y)
    vertex.push(max.x, max.y)
    vertex.push(max.x, min.y)

    return vertex
}



export const initMap = () => {


    const EmptyStyle = {
        "version": 8,
        "name": "Empty",
        "sources": {
        },
        "layers": [
        ]
    }

    const map = new ScratchMap({
    // const map = new mapboxgl.Map({
        // style: EmptyStyle,
        style: 'mapbox://styles/mapbox/dark-v11',
        // style: 'mapbox://styles/mapbox/light-v11',
        // projection: 'mercator',
        accessToken: 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA',
        container: 'map',
        projection: 'mercator' as any,
        antialias: true,
        maxZoom: 18,
        minPitch: 0,
        center: MZSVIEWCONFIG.center as any,
        zoom: MZSVIEWCONFIG.zoom,
        pitch: MZSVIEWCONFIG.pitch,
    }).on('load', () => {

        map.showTileBoundaries = true;
        // map.fitBounds([[120.0483046046972, 31.739366192168674], [120.98183604889795, 32.14476417588851]])


        //////////////////// EXMAPLE 1 ::   osm raster tile
        // map.addSource('some-png-tile-source', {
        //     type: "raster",
        //     tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        // })
        // map.addLayer({
        //     id: 'png-tile-layer',
        //     type: 'raster',
        //     source: 'some-png-tile-source',
        //     paint: {
        //         "raster-opacity": 0.9,
        //     }
        // })


        //////////////////// EXMAPLE 2 ::  MZS DEM raster tile
        // map.addSource('mapRaster2020', {
        //     type: 'raster',
        //     tiles: [
        //         'http://172.21.212.166:8989/api/v1' + '/tile/raster/mzs/2020/Before/{x}/{y}/{z}',
        //     ],
        // })
        // map.addLayer({
        //     id: 'ras',
        //     type: 'raster',
        //     source: 'mapRaster2020',
        // })

        // const anyLayer = new InvasionLayer('invasion')
        // map.addLayer(anyLayer as mapboxgl.AnyLayer)


        //////////////////// EXMAPLE 3 ::  DMK DEM raster tile
        // map.addSource('mapRaster2020', {
        //     type: 'raster',
        //     tiles: [
        //         'http://172.21.212.238:8989/api/v0' + '/resource/raster/getRasterTile/66ee2ae4a2945bc8ed08c229/{z}/{x}/{y}',
        //     ],
        // })
        // map.addLayer({
        //     id: 'ras',
        //     type: 'raster',
        //     source: 'mapRaster2020',
        // })

        // const anyLayer = new InvasionLayer('invasion')
        // map.addLayer(anyLayer as mapboxgl.AnyLayer)


        const anyLayer = new TileDrivenCustomLayer('any', {
            type: "raster",
            // tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tiles: [
                'http://172.21.212.238:8989/api/v0' + '/resource/raster/getRasterTile/66ee2ae4a2945bc8ed08c229/{z}/{x}/{y}',
            ],
        })
        map.addLayer(anyLayer as mapboxgl.AnyLayer)





    })
}