import mapboxgl, { MercatorCoordinate } from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css'
import * as Wuti from '../../webglFuncs/util'
import tilebelt from '@mapbox/tilebelt'


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



        // this.move = this.move.bind(this);
        // this.onData = this.onData.bind(this);
        // this.onTerrainData = this.onTerrainData.bind(this);
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

    const Empty = {
        "version": 8,
        "name": "Empty",
        "sources": {
        },
        "layers": [
        ]
    }

    const map = new mapboxgl.Map({
        style: "mapbox://styles/mapbox/light-v11",
        center: [120.980697, 31.684162], // [ 120.556596, 32.042607 ], //[ 120.53525158459905, 31.94879239156117 ], // 120.980697, 31.684162
        // projection: 'mercator',
        accessToken: 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA',
        container: 'map',
        antialias: true,
        maxZoom: 18,
        zoom: 9 //10.496958973488436, // 16
    }).on('load', () => {

        // map.showTileBoundaries = true;
        console.log('map load!')
        // map.fitBounds([[120.0483046046972, 31.739366192168674], [120.98183604889795, 32.14476417588851]])

        const flowTextureLayer = new InvasionLayer('invasion')
        map.addLayer(flowTextureLayer as mapboxgl.AnyLayer)


    })
}