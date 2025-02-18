import axios from "axios";
import * as util from '../../webglFuncs/util'
import mapbox from 'mapbox-gl'
import { mat4 } from "gl-matrix";
import 'mapbox-gl/dist/mapbox-gl.css'
import { Delaunay } from 'd3-delaunay'
import earcut from 'earcut'

class PointLayer {

    id: string
    geoUrl: string
    type: string = 'custom'

    ready: boolean = false
    map: mapbox.Map | null = null

    program: WebGLProgram | null = null
    Locations: { [name: string]: number | WebGLUniformLocation | null } = {}
    indexLength: number = 0

    vao: WebGLVertexArrayObject | null = null
    positionBuffer: WebGLBuffer | null = null
    indexBuffer: WebGLBuffer | null = null

    data: any

    constructor(id: string, url: string) {
        this.id = id
        this.geoUrl = url
        this.map = null
    }

    async onAdd(map: mapbox.Map, gl: WebGL2RenderingContext) {
        this.map = map

        this.data = await this.parsePolygon(this.geoUrl)
        var vertexData = this.data.vertexData
        var indexData = this.data.indexData


        const vsSource = (await axios.get('/shaders/04polygon/polygon.vert.glsl')).data
        const fsSource = (await axios.get('/shaders/04polygon/polygon.frag.glsl')).data
        const vs = util.createShader(gl, gl.VERTEX_SHADER, vsSource)!
        const fs = util.createShader(gl, gl.FRAGMENT_SHADER, fsSource)!
        this.program = util.createProgram(gl, vs, fs)!

        this.Locations['a_postion'] = gl.getAttribLocation(this.program!, 'a_position')
        this.Locations['u_matrix'] = gl.getUniformLocation(this.program!, 'u_matrix')

        console.log(this.Locations)

        this.vao = gl.createVertexArray()!
        gl.bindVertexArray(this.vao)

        this.positionBuffer = util.createVBO(gl, vertexData)
        gl.enableVertexAttribArray(this.Locations['a_postion'] as number)
        gl.vertexAttribPointer(
            this.Locations['a_postion'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
        // this.indexBuffer = util.createVBO(gl, indexData)
        // const indexBuffer = util.createIBO(gl, indexData)
        gl.bindVertexArray(null)

        this.indexLength = indexData.length
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


        this.ready = true
    }

    render(gl: WebGL2RenderingContext, matrix: Array<number>) {
        if (this.ready) {
            // console.log('render')

            const tr = (this.map as any).transform

            let vertexData = []
            for (let i = 0; i < this.data.vertexData.length; i += 2) {
                let [mx, my] = [this.data.vertexData[i], this.data.vertexData[i + 1]]
                vertexData.push(mx * tr.worldSize)
                vertexData.push(my * tr.worldSize)
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.DYNAMIC_DRAW)

            // console.log(tr.mercatorMatrix)
            // console.log(tr.projMatrix)

            const scaleMatrix = mat4.scale([] as any, mat4.create(), [tr.worldSize, tr.worldSize, tr.worldSize / tr.pixelsPerMeter])

            const mercatorMatrix = tr.mercatorMatrix
            // const VPmatrixForWorldSize = mat4.
            const VPmatrixForWorldSize = mat4.clone(tr.projMatrix)
            // mat4.multiply(VPmatrixForWorldSize, VPmatrixForWorldSize, scaleMatrix)

            gl.bindVertexArray(this.vao)

            gl.useProgram(this.program!)
            gl.uniformMatrix4fv(this.Locations['u_matrix'] as WebGLUniformLocation, false, VPmatrixForWorldSize)
            // gl.clearColor(0, 0, 0, 1)
            // gl.clear(gl.COLOR_BUFFER_BIT)
            // gl.enable(gl.BLEND);
            // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

            gl.drawElements(gl.POINTS, this.indexLength, gl.UNSIGNED_SHORT, 0)
            // gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        else {
            console.log('polygon layer not ready')
            this.map!.triggerRepaint()
        }
    }

    async parsePolygon(url: string) {
        const geojson = (await axios.get(url)).data
        let coordinate = geojson.features[0].geometry.coordinates[0];
        var data = earcut.flatten(coordinate);
        var triangle = earcut(data.vertices, data.holes, data.dimensions);
        coordinate = data.vertices.flat()


        // let vertexData = coordinate
        let vertexData = []
        for (let i = 0; i < coordinate.length; i += 2) {
            let [x, y] = lnglat2Mercator(coordinate[i], coordinate[i + 1]);
            vertexData.push(x);
            vertexData.push(y);
            // let lnglat = { lng: coordinate[i], lat: coordinate[i + 1] }
            // let worldSizePoint = tr.project(lnglat)
            // vertexData.push(worldSizePoint.x, worldSizePoint.y)
        }


        return {
            vertexData: vertexData,
            indexData: triangle,
        }

    }
}


export const initMap = () => {
    const map = new mapbox.Map({
        center: [120.980697, 31.684162], // [ 120.556596, 32.042607 ], //[ 120.53525158459905, 31.94879239156117 ], // 120.980697, 31.684162
        // @ts-ignore
        projection: 'mercator',
        container: 'map',
        antialias: true,
        // maxZoom: 18,
        zoom: 9 //10.496958973488436, // 16
    }).on('load', () => {

        console.log('map load!')

        const pointJson = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [120.556596, 32.042607]
                    }
                }
            ]
        };
        //@ts-ignore
        map.addSource('geopoint', {
            type: 'geojson',
            data: pointJson
        })
        //@ts-ignore
        map.addLayer({
            "id": 'geopointlayer',
            "source": 'geopoint',
            "type": "circle",
            "paint": {
                "circle-color": "#FF0000",
                "circle-radius": 3,
            }
        })





        // const geojson = '/flowResource/geojson/polygon.geojson'
        const geojson = '/flowResource/geojson/CHENGTONG.geojson'
        const pointLayer = new PointLayer('point', geojson)
        map.addLayer(pointLayer as mapbox.AnyLayer)

        // const flowTextureLayer = new FlowTextureLayer('flowTexture', geojson)
        // map.addLayer(flowTextureLayer as mapbox.AnyLayer)


    })
}












function lnglat2Mercator(lng: number, lat: number) {
    let x = (180 + lng) / 360;
    let y =
        (180 -
            (180 / Math.PI) *
            Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) /
        360;
    return [x, y];
}



async function getStationData(url: string) {
    let vertexData
    let indexData
    const stationData = (await axios.get(url, { responseType: 'arraybuffer' })).data
    const meshes = new Delaunay(new Float32Array(stationData))
    indexData = meshes.triangles // Uint32Array
    vertexData = meshes.points // Float32Array

    // PROCESS 

    return {
        vertexData_station: vertexData,
        indexData_station: indexData
    }
}

async function getVelocityData(url: string) {
    const velocityData = (await axios.get(url, { responseType: 'arraybuffer' })).data
    return new Float32Array(velocityData)
}

function getMapExtent(map: mapbox.Map) {
    const bounds = map.getBounds()
    const boundsArray = bounds.toArray()
    return [...boundsArray[0], ...boundsArray[1]]
}