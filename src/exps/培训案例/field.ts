import axios from "axios";
import * as util from '../../webglFuncs/util'
import mapbox from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Delaunay } from 'd3-delaunay'
import * as dat from 'dat.gui'

class EulerFlowLayer {
    id: string = ''
    type: string = 'custom'
    ready: boolean = false
    map: mapbox.Map | null = null
    gui: dat.GUI | null = null

    programe_delaunay: WebGLProgram | null = null
    Locations_delaunay: { [name: string]: number | WebGLUniformLocation | null } = {}
    indexLength_delaunay: number = 0
    vertexData_station: Float32Array | null = null
    indexData_station: Uint32Array | null = null
    velocityData_Array: Float32Array[] = []
    velocityData_from: Float32Array | null = null
    velocityData_to: Float32Array | null = null
    totalResourceCount: number = 26
    uvResourcePointer: number = 1
    particleRandomInitData: number[] = []
    velocityEmptyInitData: number[] = []
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


    /// static data
    flowExtent: number[] = [9999, 9999, -9999, -9999] //xmin, ymin, xmax, ymax
    flowMaxVelocity: number = 0
    particelNum: number = 65536
    dropRate: number = 0.003
    dropRateBump: number = 0.001
    velocityFactor: number = 50.0
    fadeFactor: number = 0.97
    aaWidth: number = 1.0
    fillWidth: number = 3.0

    /// dynamic data
    globalFrames: number = 0
    randomSeed = Math.random()
    framePerStep = 120 //frame
    localFrames = 0
    progressRatio = 0
    mapExtent: number[] = [9999, 9999, -9999, -9999] //xmin, ymin, xmax, ymax


    constructor(id: string) {
        this.id = id
    }

    async onAdd(map: mapbox.Map, gl: WebGL2RenderingContext) {

        this.initGUI()
        const available_extensions = gl.getSupportedExtensions();
        available_extensions?.forEach(ext => {
            gl.getExtension(ext)
        })


        this.map = map
        await this.programInit_delaunay(gl)

        await this.programInit_showing(gl)


        // setInterval(() => {
        //     gl.bindBuffer(gl.ARRAY_BUFFER, this.pposBuffer_simulate_1)
        //     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.particleRandomInitData), gl.STATIC_DRAW)
        //     gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer1)
        //     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.velocityEmptyInitData), gl.STATIC_DRAW)

        //     gl.bindBuffer(gl.ARRAY_BUFFER, this.pposBuffer_simulate_2)
        //     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.particleRandomInitData), gl.STATIC_DRAW)
        //     gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer2)
        //     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.velocityEmptyInitData), gl.STATIC_DRAW)
        //     gl.bindBuffer(gl.ARRAY_BUFFER, null)
        // }, 3000)

        this.ready = true

    }
    render(gl: WebGL2RenderingContext, matrix: Array<number>) {
        if (this.ready) {

            let mapCenterInMercator = mapbox.MercatorCoordinate.fromLngLat(this.map!.getCenter())

            ////////// update dynamic data
            this.globalFrames += 1
            this.localFrames = (this.localFrames + 1) % this.framePerStep
            this.progressRatio = this.localFrames / this.framePerStep
            this.mapExtent = getMapExtent(this.map!)
            this.randomSeed = Math.random()

            /// ensure particle num not descrease
            // this.validExtentCheck(gl)

            if (this.localFrames === 0) {
                this.nextStep(gl)
            }

            ////////// 1st::: delaunay program to get uv texture
            // this.xfSwap(this.globalFrames)


            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_delaunay)

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

            gl.bindFramebuffer(gl.FRAMEBUFFER, null)


            ////////// 2nd::: show uvTexture program  ///// background SHOWING

            gl.useProgram(this.program_showing!)
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, this.uvTexture)
            gl.bindVertexArray(this.vao_showing)
            gl.uniform1i(this.Locations_showing['uv_texture'] as WebGLUniformLocation, 0)
            // gl.enable(gl.BLEND);
            // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)




        }
        else {
            console.log('polygon layer not readydd')
        }
        this.map!.triggerRepaint()
    }

    async programInit_delaunay(gl: WebGL2RenderingContext) {
        let { vertexData_station, indexData_station } = await this.getStationData('/flowResource/bin/station.bin')
        this.vertexData_station = vertexData_station as Float32Array
        this.indexData_station = indexData_station
        // console.log('vertexData', vertexData_station)
        // {this.vertexData_station, this.indexData_station} = await this.getStationData('/flowResource/bin/station.bin')
        let velocityData = await this.getVelocityData('/flowResource/bin/uv_0.bin')
        let velocityData2 = await this.getVelocityData('/flowResource/bin/uv_2.bin')

        this.velocityData_Array.push(await this.getVelocityData('/flowResource/bin/uv_0.bin'))
        this.velocityData_Array.push(await this.getVelocityData('/flowResource/bin/uv_1.bin'))
        this.velocityData_Array.push(await this.getVelocityData('/flowResource/bin/uv_2.bin'))

        this.uvResourcePointer = 1
        let toIndex = this.uvResourcePointer
        let fromIndex = (this.uvResourcePointer + 2) % 3
        this.velocityData_from = this.velocityData_Array[fromIndex]
        this.velocityData_to = this.velocityData_Array[toIndex]

        // console.log('vertexData', vertexData_station)
        // console.log('velocityData', velocityData)
        ////////// 1st::: delaunay program to get uv texture

        const vsSource_delaunay = (await axios.get('/shaders/培训案例/delaunay.vert.glsl')).data
        const fsSource_delaunay = (await axios.get('/shaders/培训案例/delaunay.frag.glsl')).data
        // console.log(vsSource_delaunay, fsSource_delaunay)
        const vs_delaunay = util.createShader(gl, gl.VERTEX_SHADER, vsSource_delaunay)!
        const fs_delaunay = util.createShader(gl, gl.FRAGMENT_SHADER, fsSource_delaunay)!
        this.programe_delaunay = util.createProgram(gl, vs_delaunay, fs_delaunay)!

        this.Locations_delaunay['a_postion'] = gl.getAttribLocation(this.programe_delaunay!, 'a_position')
        this.Locations_delaunay['a_velocity_from'] = gl.getAttribLocation(this.programe_delaunay!, 'a_velocity_from')
        this.Locations_delaunay['a_velocity_to'] = gl.getAttribLocation(this.programe_delaunay, 'a_velocity_to')

        this.Locations_delaunay['progressRatio'] = gl.getUniformLocation(this.programe_delaunay!, 'progressRatio')
        this.Locations_delaunay['u_flowExtent'] = gl.getUniformLocation(this.programe_delaunay!, 'u_flowExtent')
        this.Locations_delaunay['u_matrix'] = gl.getUniformLocation(this.programe_delaunay!, 'u_matrix')

        // console.log(this.Locations_delaunay)

        ///// vertex data
        this.vao_delaunay = gl.createVertexArray()!
        gl.bindVertexArray(this.vao_delaunay)
        this.indexLength_delaunay = indexData_station.length
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
        this.velocityBuffer_from = util.createVBO(gl, Array.from(new Float32Array(this.velocityData_from)))
        gl.enableVertexAttribArray(this.Locations_delaunay['a_velocity_from'] as number)
        gl.vertexAttribPointer(
            this.Locations_delaunay['a_velocity_from'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
        this.velocityBuffer_to = util.createVBO(gl, Array.from(new Float32Array(this.velocityData_to)))
        gl.enableVertexAttribArray(this.Locations_delaunay['a_velocity_to'] as number)
        gl.vertexAttribPointer(
            this.Locations_delaunay['a_velocity_to'] as number,
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
        this.stationIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stationIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexData_station), gl.STATIC_DRAW);
        gl.bindVertexArray(null)

        ///// frame buffer
        this.uvTexture = util.createCanvasSizeTexture(gl)

        this.fbo_delaunay = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_delaunay)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.uvTexture, 0)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    async programInit_showing(gl: WebGL2RenderingContext) {

        ////////// 2nd::: show uvTexture program
        const vsSource_showing = (await axios.get('/shaders/培训案例/showing.vert.glsl')).data
        const fsSource_showing = (await axios.get('/shaders/培训案例/showing.frag.glsl')).data
        const vs_showing = util.createShader(gl, gl.VERTEX_SHADER, vsSource_showing)!
        const fs_showing = util.createShader(gl, gl.FRAGMENT_SHADER, fsSource_showing)!
        this.program_showing = util.createProgram(gl, vs_showing, fs_showing)!

        this.Locations_showing['a_pos'] = gl.getAttribLocation(this.program_showing, 'a_pos')
        this.Locations_showing['a_texCoord'] = gl.getAttribLocation(this.program_showing, 'a_texCoord')
        this.Locations_showing['uv_texture'] = gl.getUniformLocation(this.program_showing, 'uv_texture')
        // console.log(this.Locations_showing)

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

    nextStep(gl: WebGL2RenderingContext) {
        this.uvResourcePointer = (this.uvResourcePointer + 1) % this.totalResourceCount
        let fromIndex = (this.uvResourcePointer - 1 + 3) % 3
        let toIndex = (this.uvResourcePointer) % 3
        let updateIndex = (this.uvResourcePointer + 1) % 3
        this.velocityData_from = this.velocityData_Array[fromIndex]
        this.velocityData_to = this.velocityData_Array[toIndex]

        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer_from)
        gl.bufferData(gl.ARRAY_BUFFER, this.velocityData_from, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer_to)
        gl.bufferData(gl.ARRAY_BUFFER, this.velocityData_to, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)

        console.log('///////// TIME STEP UPDATE //////////')
        console.log('this.uvResourcePointer', this.uvResourcePointer)
        console.log('globalFrames', this.globalFrames)

        this.getVelocityData(`/flowResource/bin/uv_${this.uvResourcePointer}.bin`).then(data => {
            this.velocityData_Array[updateIndex] = data
        })
    }

    initGUI() {
        this.gui = new dat.GUI()
        // let parameters = {
        //     particleNum: this.particelNum,
        //     velocityFactor: this.velocityFactor,
        //     fadeFactor: this.fadeFactor,
        //     aaWidth: this.aaWidth,
        //     fillWidth: this.fillWidth,
        //     framePerStep: this.framePerStep,
        // }
        // this.gui.domElement.style.position = 'absolute'
        // this.gui.domElement.style.top = '2vh'
        // this.gui.domElement.style.right = '10vw'
        // this.gui.add(parameters, 'particleNum', 0, 65536).onChange(value => this.particelNum = value)
        // this.gui.add(parameters, 'velocityFactor', 1, 50, 1).onChange(value => this.velocityFactor = value)
        // this.gui.add(parameters, 'fadeFactor', 0.8, 1.0, 0.01).onChange(value => this.fadeFactor = value)
        // this.gui.add(parameters, 'aaWidth', 0, 5, 0.1).onChange(value => this.aaWidth = value)
        // this.gui.add(parameters, 'fillWidth', 0, 5, 0.1).onChange(value => this.fillWidth = value)
        // this.gui.add(parameters, 'framePerStep', 30, 240, 10).onChange(value => this.framePerStep = value)
        // this.gui.open()
    }
}
function getMapExtent(map: mapbox.Map) {
    const bounds = map.getBounds()
    const boundsArray = bounds.toArray()
    return [boundsArray[0][0], boundsArray[0][1], boundsArray[1][0], boundsArray[1][1]]
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
        const flowTextureLayer = new EulerFlowLayer('flow')
        map.addLayer(flowTextureLayer as mapbox.AnyLayer)


    })
}

