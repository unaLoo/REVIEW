import mapboxgl, { MercatorCoordinate } from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css'
import * as Wuti from '../../webglFuncs/util'
import fs from './shader/tileDraw.frag.glsl'
import vs from './shader/tileDraw.vert.glsl'
import * as dat from 'dat.gui'
import ScratchMap from './scratchMap'


type RasterTileOption = {
    type: 'raster' | 'raster-dem',
    tiles: string[],
}
type PlainSubdivisionInfo = {
    vertexData: Float32Array,
    indexData: Uint16Array,
    linesIndexData: Uint16Array,
    skirtIndexOffset: number,
}
type controller = {
    exaggeration: number,
    mode: 'fill' | 'line' | 'point'
}

const MZSVIEWCONFIG = {
    center: [120.53794466757358, 32.03061107103058],
    zoom: 16.096017911120207,
    // pitch: 10.71521535597063,
    pitch: 0,
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
    SEGMENTS = 128;

    EXAGERATION = 500;
    CONTROLLER: controller = {
        exaggeration: this.EXAGERATION,
        mode: 'fill',
    }
    ////////////////////////////////CONST


    ///////////// TILE /////////////////
    // terrain tile
    inputTileSourceID: string = '';
    inputTileSourceCache: any; // mapbox source cache obj
    inputTileOption: RasterTileOption | null = null;
    proxyLayerID: string = '';

    // image tile
    imageTileSourceID: string = '';
    imageTileSourceCache: any; // mapbox source cache obj
    imageTileOption: RasterTileOption | null = null;




    globalPlainInfo: PlainSubdivisionInfo | null = null;
    ///////////////////////////////TILE


    /////////// gl ///////////////
    vertexBuffer: WebGLBuffer | null = null;
    indexBuffer: WebGLBuffer | null = null;
    lineIndexBuffer: WebGLBuffer | null = null;

    inputTexture: WebGLTexture | null = null;
    outputTexture: WebGLTexture | null = null;

    program: WebGLProgram | null = null;
    glPositions: { [key: string]: any } = {};

    vao: WebGLVertexArrayObject | null = null;


    ////////////////////////////gl

    ready: boolean = false;

    constructor(id: string, tileOption: RasterTileOption, imageTileOption: RasterTileOption | null = null) {
        this.id = id;
        this.inputTileSourceID = this.id + '-InputSource'
        this.inputTileOption = tileOption
        this.proxyLayerID = this.id + '-ProxyLayer'

        // if (!imageTileOption) return
        // this.imageTileSourceID = this.id + '-ImageSource'
        // this.imageTileOption = imageTileOption

    }

    onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext) {
        this.map = map;
        this.gl = gl;
        this.initGUI()

        this.createProxyLayer();

        let res = this.planeSubdivision3(8192.0, this.SEGMENTS + 1)
        this.globalPlainInfo = {
            vertexData: new Float32Array(res.vertices),
            indexData: new Uint16Array(res.indices),
            linesIndexData: new Uint16Array(res.linesIndices),
            skirtIndexOffset: res.skirtIndicesOffset
        }

        this.createGLProgram();

        window.addEventListener('keydown', e => {
            if (e.key === 'f') {
                console.log(this.map?.style["_otherSourceCaches"])
            }
            if (e.key === 'u') {
                // this.map?.style["_otherSourceCaches"][this.inputTileSourceID]._update()
                this.inputTileSourceCache.update(this.map.painter.transform)
            }
        })

        this.ready = true;
    }


    render(gl: WebGL2RenderingContext, matrix: number[]) {

        if (!this.ready) return
        // this.map.update()
        // console.log(this.map.transform)

        // console.log('mat', matrix)
        this.tickLogic(gl, matrix)
        // this.map.triggerRepaint()
    }

    // createImage() {

    //     this.map.addSource(this.imageTileSourceID, this.imageTileOption)

    //     this.imageTileSourceCache = this.map?.style["_otherSourceCaches"][this.imageTileSourceID]

    //     this.map.getSource(this.imageTileSourceID).on('data', () => {
    //         console.log('image tile data update!')
    //     })

    // }

    createProxyLayer() {

        // proxy layer --> triggle the update source-data and use the tile-management
        this.map?.addSource(this.inputTileSourceID, this.inputTileOption!)
        this.map?.addLayer({
            id: 'ras',
            type: 'raster',
            source: this.inputTileSourceID,
            paint: {
                'raster-opacity': 0.01,
            }
        })


        // this.map?.addLayer({
        //     id: this.proxyLayerID,
        //     type: 'custom',
        //     onAdd: () => { },
        //     render: () => { },
        // })
        // this.map.style._layers[this.proxyLayerID].source = this.inputTileSourceID;


        this.inputTileSourceCache = this.map?.style["_otherSourceCaches"][this.inputTileSourceID]
        let inputSourceObject = this.map.getSource(this.inputTileSourceID)
        inputSourceObject.on('data', () => {
            this.inputTileSourceCache.update(this.map.painter.transform)
        })

        this.map.on('move', (e: any) => {
            console.log('move!')
        })






        // if (this.imageTileOption) {
        //     this.map.getSource(this.inputTileSourceID).on('data', () => {
        //         console.log('input tile data loaded, trigger update image tile')
        //         // this.map?.style["_otherSourceCaches"][this.imageTileSourceID].update(this.map.painter.transform);
        //         this.map?.style["_otherSourceCaches"][this.imageTileSourceID]._loadTile()
        //     })
        // }
    }

    createGLProgram() {

        let gl = this.gl!
        this.vertexBuffer = Wuti.createVBO(gl, this.globalPlainInfo!.vertexData)
        this.indexBuffer = Wuti.createIBO(gl, this.globalPlainInfo!.indexData)
        this.lineIndexBuffer = Wuti.createIBO(gl, this.globalPlainInfo!.linesIndexData)
        // this.inputTexture = Wuti.createEmptyTexture(gl, this.TILE_SIZE, this.TILE_SIZE)
        // this.outputTexture = Wuti.createEmptyTexture(gl, this.TILE_SIZE, this.TILE_SIZE)
        this.program = Wuti.createProgramFromSource(gl, vs, fs)!

        this.glPositions['a_pos'] = gl.getAttribLocation(this.program, 'a_pos')!
        this.glPositions['u_matrix'] = gl.getUniformLocation(this.program, 'u_matrix')!
        this.glPositions['u_inputTile'] = gl.getUniformLocation(this.program, 'u_inputTile')!
        this.glPositions['u_tileInfo'] = gl.getUniformLocation(this.program, 'u_tileInfo')!
        this.glPositions['u_exaggeration'] = gl.getUniformLocation(this.program, 'u_exaggeration')!

        this.vao = gl.createVertexArray()!
        gl.bindVertexArray(this.vao)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
        gl.enableVertexAttribArray(this.glPositions['a_pos'])
        gl.vertexAttribPointer(this.glPositions['a_pos'], 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)


        gl.bindVertexArray(null)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

        // gl.enable(gl.DEPTH_TEST)
        // gl.depthFunc(gl.LEQUAL)

        // console.log('create program success!')
    }

    getTileCoords(sourceCache: any) {

        let coordsAscending = sourceCache.getVisibleCoordinates();
        let coordsDescending = coordsAscending.slice().reverse();

        let coords = []
        if (sourceCache) {
            const coordsSet = coordsDescending
            coords = coordsSet[sourceCache.id];
            let visibleTiles = coordsDescending.map((tile: any) => tile.canonical.toString())
            // console.log(visibleTiles)
        }

        return coords
    }


    tickLogic(gl: WebGL2RenderingContext, matrix: number[]) {

        let theSourceCache = this.map?.style._otherSourceCaches[this.inputTileSourceID]
        this.getTileCoords(theSourceCache)


        const tiles = this.inputTileSourceCache.getVisibleCoordinates()
            .map((tileid: any) => this.inputTileSourceCache.getTile(tileid))

        // let _tiles = this.inputTileSourceCache._tiles
        // let tiles: any = []
        // for (let item in _tiles) {
        //     console.log(_tiles[item])
        //     let tileID = _tiles[item].tileID
        //     let tileItem = this.inputTileSourceCache.getTile(tileID)
        //     tiles.push({
        //         tileID: tileItem.tileID,
        //         texture: tileItem.texture,
        //     })
        // }
        // console.log(tiles)

        // const { x, y, z } = tiles[0].tileID["canonical"]
        // console.log(z, x, y)
        // console.log(tiles[0].tileID.projMatrix)

        let _tile = tiles[0]
        if (_tile) {
            console.log(_tile)
        }
        const _indexData = this.globalPlainInfo!.indexData
        const draw = {
            'fill': () => {
                // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
                // gl.drawElements(gl.TRIANGLES, _indexData.length, gl.UNSIGNED_SHORT, this.globalPlainInfo?.skirtIndexOffset!)
                gl.drawElements(gl.TRIANGLES, _indexData.length, gl.UNSIGNED_SHORT, 0)
            },
            'line': () => {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndexBuffer)
                gl.drawElements(gl.LINES, this.globalPlainInfo!.linesIndexData.length, gl.UNSIGNED_SHORT, 0)
            },
            'point': () => {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
                gl.drawElements(gl.POINTS, _indexData.length, gl.UNSIGNED_SHORT, 0)
            },
        }
        gl.useProgram(this.program)
        gl.bindVertexArray(this.vao)
        tiles.forEach((tile: any) => {
            // the inputTexture
            // the outputTexture
            // the plainInfo
            console.log(tile)
            if (!tile.texture.texture) return


            const { x, y, z } = tile.tileID["canonical"]
            console.log(x, y, z)
            // if (z !== Math.floor(this.map.transform.zoom)) return
            // 
            // console.log(tile.tileID.projMatrix)

            const inputTileTexture = tile.texture.texture

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

            draw[this.CONTROLLER.mode]()

            /// attributes
            // gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
            // gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW)
            // gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer)
            // gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW)


            /// index
            // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW)
            // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)

        });
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.bindVertexArray(null)


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


    planeSubdivision3(TILE_EXTENT: number, count: number) {

        // count --- 129
        // grid num -- 129 * 129
        // vertex num -- 130 * 130
        // valid size -- 128 * 128

        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));


        const EXTENT = TILE_EXTENT;
        const size = count + 2;

        // Around the grid, add one more row/column padding for "skirt".
        let vertices: Array<number> = [];
        let indices: Array<number> = [];
        let linesIndices: Array<number> = [];

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
                // vertices.push(xi , yi);
            }
        }

        let skirtIndicesOffset = 0;
        // Grid indices:
        for (let j = 1; j < size - 2; j++) {
            for (let i = 1; i < size - 2; i++) {
                const index = j * size + i;
                indices.push(index + 1, index, index + size);
                indices.push(index + size, index + size + 1, index + 1);

                skirtIndicesOffset += 6;

                linesIndices.push(index + 1, index);
                linesIndices.push(index, index + size);
                linesIndices.push(index + size, index + 1,);
            }
        }
        // Padding (skirt) indices:
        [0, size - 2].forEach(j => {
            for (let i = 0; i < size - 1; i++) {
                const index = j * size + i;
                indices.push(index + 1, index, index + size);
                indices.push(index + size, index + size + 1, index + 1);

                linesIndices.push(index + 1, index);
                linesIndices.push(index, index + size);
                linesIndices.push(index + size, index + 1,);
            }
        });
        return {
            vertices,
            indices,
            skirtIndicesOffset,
            linesIndices
        }
    }
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

    const map = new ScratchMap({
        accessToken: tk,
        // const map = new mapboxgl.Map({

        // style: EmptyStyle,
        // style: 'mapbox://styles/mapbox/light-v11',
        style: 'mapbox://styles/mapbox/dark-v11',
        // style: 'mapbox://styles/mapbox/satellite-streets-v12',
        container: 'map',
        projection: 'mercator' as any,
        antialias: true,
        maxZoom: 18,
        // minPitch: 0,
        center: MZSVIEWCONFIG.center as any,
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
        // .on('style.load', () => {
        //     map.addSource('mapbox-dem', {
        //         'type': 'raster-dem',
        //         'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        //         'tileSize': 512,
        //         'maxzoom': 14
        //     });
        //     // add the DEM source as a terrain layer with exaggerated height
        //     map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 10.0 });
        // });
        .on('load', () => {

            map.showTileBoundaries = true;
            // map.fitBounds([[120.0483046046972, 31.739366192168674], [120.98183604889795, 32.14476417588851]])

            //////////////////// EXMAPLE 1 ::   normal raster tile
            // map.addSource('some-png-tile-source', {
            //     type: "raster",
            //     tiles: [
            //         'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.webp?sku=101wRN1gMSNOn&access_token=' + tk
            //     ],
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


            //////////////////// EXMAPLE 3 ::  low resolution DEM raster tile
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


            //////////////////// EXMAPLE 4 ::  mapbox terrain-rgb tile
            // map.addSource('mapbox-dem', {
            //     'type': 'raster',
            //     'tiles': [
            //         // 'https://api.mapbox.com/v4/mapbox.terrain-rgb/3/1/1.pngraw?access_token=' + tk
            //         'https://api.mapbox.com/raster/v1/mapbox.mapbox-terrain-dem-v1/{z}/{x}/{y}.webp?sku=1014O3eLtuPmm&access_token=' + tk
            //     ]

            // });
            // map.addLayer({
            //     'id': 'terrain-raster',
            //     'type': 'raster',
            //     'source':'mapbox-dem',
            //     'paint': {
            //         'raster-opacity': 0.75,
            //         'raster-fade-duration': 300
            //     },
            // })
            // map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });


            // map.addSource('mapbox-dem', {
            //     'type': 'raster-dem',
            //     'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            //     'tileSize': 512,
            //     'maxzoom': 14
            // });
            // // add the DEM source as a terrain layer with exaggerated height
            // map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

            const anyLayer = new TileDrivenCustomLayer('any', {
                type: "raster",
                tiles: [
                    'http://localhost:8989/api/v1' + '/tile/raster/mzs/2020/Before/{x}/{y}/{z}',
                    // 'https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=' + tk,
                    // 'https://api.mapbox.com/raster/v1/mapbox.mapbox-terrain-dem-v1/{z}/{x}/{y}.webp?sku=101atFtO4sXfU&access_token=' + tk
                    // 'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.webp?sku=101wRN1gMSNOn&access_token=' + tk
                ],
            }
                // , {
                //     type: "raster",
                //     tiles: [
                //         // 'http://localhost:8989/api/v1' + '/tile/raster/mzs/2020/Before/{x}/{y}/{z}',
                //         'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.webp?sku=101wRN1gMSNOn&access_token=' + tk
                //     ],
                // }
            )
            map.addLayer(anyLayer as mapboxgl.AnyLayer)

        })
}