import axios from "axios";
import * as util from '../../webglFuncs/util'
import mapbox from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Delaunay } from 'd3-delaunay'

class FlowLayer {
    id: string
    type: string = 'custom'

    ready: boolean = false
    map: mapbox.Map | null = null


    indexLength_delaunay: number = 0
    programe_delaunay: WebGLProgram | null = null
    Locations_delaunay: { [name: string]: number | WebGLUniformLocation | null } = {}
    vao_delaunay: WebGLVertexArrayObject | null = null
    stationBuffer: WebGLBuffer | null = null
    stationIndexBuffer: WebGLBuffer | null = null
    velocityBuffer_from: WebGLBuffer | null = null
    velocityBuffer_to: WebGLBuffer | null = null

    uvTexture: WebGLTexture | null = null
    fbo_delaunay: WebGLFramebuffer | null = null

    Locations_showing: { [name: string]: number | WebGLUniformLocation | null } = {}
    program_showing: WebGLProgram | null = null
    vao_showing: WebGLVertexArrayObject | null = null
    positionBuffer_showing: WebGLBuffer | null = null
    texCoordBuffer_showing: WebGLBuffer | null = null
    showingTexture: WebGLTexture | null = null


    testTexture: WebGLTexture | null = null



    /// static data
    locations_simulate: { [name: string]: number | WebGLUniformLocation | null } = {}
    flowExtent: number[] = [9999, 9999, -9999, -9999] //xmin, ymin, xmax, ymax
    flowMaxVelocity: number = 0
    particelNum: number = 65536
    dropRate: number = 0.003
    dropRateBump: number = 0.001
    velocityFactor: number = 1.0


    /// dynamic data
    randomSeed = Math.random()
    totalTime = 120 //frame
    nowFrame = 0
    progressRatio = 0
    mapExtent: number[] = [9999, 9999, -9999, -9999] //xmin, ymin, xmax, ymax

    constructor(id: string) {
        this.id = id
    }

    async onAdd(map: mapbox.Map, gl: WebGL2RenderingContext) {

        const available_extensions = gl.getSupportedExtensions();
        console.log(available_extensions);
        available_extensions?.forEach(ext => {
            gl.getExtension(ext)
        })


        this.map = map
        await this.programInit_delaunay(gl)
        console.log('delaunay program inited')

        // await this.programInit_simulate(gl)
        // console.log('simulate program inited')

        await this.programInit_showing(gl)
        console.log('showing program inited')




        this.ready = true
        // console.log(gl.getParameter(gl.MAX_ELEMENT_INDEX))
    }

    render(gl: WebGL2RenderingContext, matrix: Array<number>) {
        if (this.ready) {

            ////////// update dynamic data
            this.nowFrame = (this.nowFrame + 1) % this.totalTime
            this.progressRatio = this.nowFrame / this.totalTime
            this.mapExtent = getMapExtent(this.map!)
            this.randomSeed = Math.random()

            console.log('//////////');
            console.log(this.flowExtent)
            console.log(this.mapExtent)
            console.log(this.flowMaxVelocity)
            console.log(this.particelNum)
            console.log(this.dropRate)
            console.log(this.dropRateBump)
            console.log(this.randomSeed)

            ////////// 1st::: delaunay program to get uv texture

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_delaunay)
            // gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.useProgram(this.programe_delaunay!)
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
            gl.bindVertexArray(this.vao_delaunay)
            gl.uniformMatrix4fv(this.Locations_delaunay['u_matrix'] as WebGLUniformLocation, false, matrix)
            gl.uniform4f(this.Locations_delaunay['u_flowExtent'] as WebGLUniformLocation, this.flowExtent[0], this.flowExtent[1], this.flowExtent[2], this.flowExtent[3])
            gl.uniform1f(this.Locations_delaunay['progressRatio'] as WebGLUniformLocation, this.progressRatio)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stationIndexBuffer)
            gl.drawElements(gl.TRIANGLES, this.indexLength_delaunay, gl.UNSIGNED_INT, 0)

            ////////// 2nd::: show uvTexture program
            gl.useProgram(this.program_showing!)
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.activeTexture(gl.TEXTURE0)
            // gl.bindTexture(gl.TEXTURE_2D, this.testTexture)
            gl.bindTexture(gl.TEXTURE_2D, this.uvTexture)
            gl.bindVertexArray(this.vao_showing)

            gl.uniform1i(this.Locations_showing['uv_texture'] as WebGLUniformLocation, 0)

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        }
        else {
            console.log('polygon layer not readydd')
        }
        // this.map!.triggerRepaint()


    }

    async programInit_delaunay(gl: WebGL2RenderingContext) {
        let { vertexData_station, indexData_station } = await this.getStationData('/flowResource/bin/station.bin')
        let velocityData = await this.getVelocityData('/flowResource/bin/uv_0.bin')
        let velocityData2 = await this.getVelocityData('/flowResource/bin/uv_2.bin')

        ////////// 1st::: delaunay program to get uv texture

        const vsSource_delaunay = (await axios.get('/shaders/05flow/delaunay.vert.glsl')).data
        const fsSource_delaunay = (await axios.get('/shaders/05flow/delaunay.frag.glsl')).data
        const vs_delaunay = util.createShader(gl, gl.VERTEX_SHADER, vsSource_delaunay)!
        const fs_delaunay = util.createShader(gl, gl.FRAGMENT_SHADER, fsSource_delaunay)!
        this.programe_delaunay = util.createProgram(gl, vs_delaunay, fs_delaunay)!

        this.Locations_delaunay['a_postion'] = gl.getAttribLocation(this.programe_delaunay!, 'a_position')
        this.Locations_delaunay['a_velocity_from'] = gl.getAttribLocation(this.programe_delaunay!, 'a_velocity_from')
        this.Locations_delaunay['a_velocity_to'] = gl.getAttribLocation(this.programe_delaunay, 'a_velocity_to')

        this.Locations_delaunay['progressRatio'] = gl.getUniformLocation(this.programe_delaunay!, 'progressRatio')
        this.Locations_delaunay['u_flowExtent'] = gl.getUniformLocation(this.programe_delaunay!, 'u_flowExtent')
        this.Locations_delaunay['u_matrix'] = gl.getUniformLocation(this.programe_delaunay!, 'u_matrix')

        console.log(this.Locations_delaunay)

        ///// vertex data
        this.vao_delaunay = gl.createVertexArray()!
        gl.bindVertexArray(this.vao_delaunay)

        // // console.log(vertexData_station)

        // let vertexData_station = new Float32Array([
        //     120.04486083984375, 31.953420639038086, 122.0450210571289, 32.953672409057617, 121.04508209228516, 31.95389175415039, 120.04515075683594, 31.95412826538086, 120.04521942138672, 31.954376220703125, 120.0452651977539, 31.954538345336914,
        // ])
        // let indexData_station = new Uint32Array([
        //     0, 1, 2, 3, 4, 5
        // ])
        // let velocityData = new Float32Array([
        //     0.5, 0.5,
        //     0.1, 0.1,
        //     0.3, 0.2,
        // ])


        this.indexLength_delaunay = indexData_station.length
        // console.log('!', Array.from(new Float32Array(vertexData_station)))
        this.stationBuffer = util.createVBO(gl, Array.from(new Float32Array(vertexData_station)))
        gl.enableVertexAttribArray(this.Locations_delaunay['a_position'] as number)
        gl.vertexAttribPointer(
            this.Locations_delaunay['a_position'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
        // console.log('velocity!', Array.from(new Float32Array(velocityData)))
        this.velocityBuffer_from = util.createVBO(gl, Array.from(new Float32Array(velocityData)))
        gl.enableVertexAttribArray(this.Locations_delaunay['a_velocity_from'] as number)
        gl.vertexAttribPointer(
            this.Locations_delaunay['a_velocity_from'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )

        this.velocityBuffer_to = util.createVBO(gl, Array.from(new Float32Array(velocityData2)))
        gl.enableVertexAttribArray(this.Locations_delaunay['a_velocity_to'] as number)
        gl.vertexAttribPointer(
            this.Locations_delaunay['a_velocity_to'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )

        // console.log('!', Array.from(new Uint32Array(indexData_station)))
        this.stationIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stationIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexData_station), gl.STATIC_DRAW);
        gl.bindVertexArray(null)

        ///// frame buffer
        this.uvTexture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, this.uvTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, gl.canvas.width, gl.canvas.height, 0, gl.RG, gl.FLOAT, null);

        this.fbo_delaunay = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_delaunay)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.uvTexture, 0)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        let particlePos = []
        let particleNum = 65536
        for (let i = 0; i < particleNum; i++) {
            particlePos.push(Math.random(), Math.random())
        }

    }

    async programInit_showing(gl: WebGL2RenderingContext) {

        ////////// 2nd::: show uvTexture program
        const vsSource_showing = (await axios.get('/shaders/05flow/showing.vert.glsl')).data
        const fsSource_showing = (await axios.get('/shaders/05flow/showing.frag.glsl')).data
        const vs_showing = util.createShader(gl, gl.VERTEX_SHADER, vsSource_showing)!
        const fs_showing = util.createShader(gl, gl.FRAGMENT_SHADER, fsSource_showing)!
        this.program_showing = util.createProgram(gl, vs_showing, fs_showing)!

        this.Locations_showing['a_pos'] = gl.getAttribLocation(this.program_showing, 'a_pos')
        this.Locations_showing['a_texCoord'] = gl.getAttribLocation(this.program_showing, 'a_texCoord')
        this.Locations_showing['uv_texture'] = gl.getUniformLocation(this.program_showing, 'uv_texture')
        console.log(this.Locations_showing)

        this.vao_showing = gl.createVertexArray()!
        gl.bindVertexArray(this.vao_showing)
        const positionData_showing = [
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            1.0, 1.0
        ]
        this.positionBuffer_showing = util.createVBO(gl, positionData_showing)
        gl.enableVertexAttribArray(this.Locations_showing['a_pos'] as number)
        gl.vertexAttribPointer(
            this.Locations_showing['a_pos'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
        const texCoordData_showing = [
            0, 1,
            1, 1,
            0, 0,
            1, 0,
        ]
        this.texCoordBuffer_showing = util.createVBO(gl, texCoordData_showing)
        gl.enableVertexAttribArray(this.Locations_showing['a_texCoord'] as number)
        gl.vertexAttribPointer(
            this.Locations_showing['a_texCoord'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
        // this.showingTexture = util.createEmptyTexture(gl)!
        gl.bindVertexArray(null)
        // let image = await util.loadImageBitmap('/images/02texture/leaves.jpg') as ImageBitmap
        // this.testTexture = util.createEmptyTexture(gl)
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

    }

    async programInit_simulate(gl: WebGL2RenderingContext) {
        
    }



    async getStationData(url: string) {
        let vertexData
        let indexData
        const stationData = (await axios.get(url, { responseType: 'arraybuffer' })).data
        const meshes = new Delaunay(new Float32Array(stationData))
        indexData = meshes.triangles // Uint32Array
        vertexData = meshes.points // Float32Array
        for (let i = 0; i < vertexData.length; i += 2) {
            let [lng, lat] = [vertexData[i], vertexData[i + 1]]
            if (lng < this.flowExtent[0]) this.flowExtent[0] = lng
            if (lat < this.flowExtent[1]) this.flowExtent[1] = lat
            if (lng > this.flowExtent[2]) this.flowExtent[2] = lng
            if (lat > this.flowExtent[3]) this.flowExtent[3] = lat
        }
        // PROCESS 

        return {
            vertexData_station: vertexData,
            indexData_station: indexData
        }
    }

    async getVelocityData(url: string) {
        const velocityData = new Float32Array((await axios.get(url, { responseType: 'arraybuffer' })).data)
        for (let i = 0; i < velocityData.length; i += 2) {
            let [u, v] = [velocityData[i], velocityData[i + 1]]
            let velocity = Math.sqrt(u * u + v * v)
            if (velocity > this.flowMaxVelocity) this.flowMaxVelocity = velocity
        }
        return velocityData
    }


}


export const initMap = () => {
    const map = new mapbox.Map({
        style: "mapbox://styles/nujabesloo/clxk678ma00ch01pdd2lfgps2",
        center: [120.980697, 31.684162], // [ 120.556596, 32.042607 ], //[ 120.53525158459905, 31.94879239156117 ], // 120.980697, 31.684162
        // projection: 'mercator',
        accessToken: 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA',
        container: 'map',
        antialias: true,
        maxZoom: 18,
        zoom: 9 //10.496958973488436, // 16
    }).on('load', () => {

        console.log('map load!')

        // const geojson = '/flowResource/geojson/polygon.geojson'
        // const polygonlayer = new polygonLayer('polygon', geojson)
        // map.addLayer(polygonlayer as mapbox.AnyLayer)

        const flowTextureLayer = new FlowLayer('flow')
        map.addLayer(flowTextureLayer as mapbox.AnyLayer)


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





function getMapExtent(map: mapbox.Map) {
    const bounds = map.getBounds()
    const boundsArray = bounds.toArray()
    return [boundsArray[0][0], boundsArray[0][1], boundsArray[1][0], boundsArray[1][1]]
}