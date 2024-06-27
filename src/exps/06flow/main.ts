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

    Locations_simulate: { [name: string]: number | WebGLUniformLocation | null } = {}
    program_simulate: WebGLProgram | null = null
    pposBuffer_simulate_1: WebGLBuffer | null = null
    pposBuffer_simulate_2: WebGLBuffer | null = null
    vao_simulate_1: WebGLVertexArrayObject | null = null
    vao_simulate_2: WebGLVertexArrayObject | null = null
    // velocityBuffer: WebGLBuffer | null = null
    velocityBuffer1: WebGLBuffer | null = null
    velocityBuffer2: WebGLBuffer | null = null

    xfo_simulate_1: WebGLTransformFeedback | null = null
    xfo_simulate_2: WebGLTransformFeedback | null = null


    program_segmentShowing: WebGLProgram | null = null
    Locations_segmentShowing: { [name: string]: number | WebGLUniformLocation | null } = {}
    vao_segmentShowing: WebGLVertexArrayObject | null = null


    program_historyShowing: WebGLProgram | null = null
    Locations_historyShowing: { [name: string]: number | WebGLUniformLocation | null } = {}
    trajectoryTexture_1: WebGLTexture | null = null
    trajectoryTexture_2: WebGLTexture | null = null
    fbo_historyShowing_1: WebGLFramebuffer | null = null
    fbo_historyShowing_2: WebGLFramebuffer | null = null

    program_finalShowing: WebGLProgram | null = null
    Locations_finalShowing: { [name: string]: number | WebGLUniformLocation | null } = {}


    /// static data
    flowExtent: number[] = [9999, 9999, -9999, -9999] //xmin, ymin, xmax, ymax
    flowMaxVelocity: number = 0
    particelNum: number = 65536
    dropRate: number = 0.003
    dropRateBump: number = 0.001
    velocityFactor: number = 1.0
    fadeFactor: number = 0.99

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

        await this.programInit_simulate(gl)
        console.log('simulate program inited')

        await this.programInit_segmentShowing(gl)
        console.log('segmentShowing program inited')

        await this.programInit_historyShowing(gl)
        console.log('historyShowing program inited')


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

            // console.log('//////////');
            // console.log(this.flowExtent)
            // console.log(this.mapExtent)
            // console.log(this.flowMaxVelocity)
            // console.log(this.particelNum)
            // console.log(this.dropRate)
            // console.log(this.dropRateBump)
            // console.log(this.randomSeed)

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

            gl.bindFramebuffer(gl.FRAMEBUFFER, null)


            ////////// 2nd::: show uvTexture program  ///// background SHOWING
            // gl.useProgram(this.program_showing!)
            // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

            // gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            // gl.activeTexture(gl.TEXTURE0)
            // // gl.bindTexture(gl.TEXTURE_2D, this.testTexture)
            // gl.bindTexture(gl.TEXTURE_2D, this.uvTexture)
            // gl.bindVertexArray(this.vao_showing)

            // gl.uniform1i(this.Locations_showing['uv_texture'] as WebGLUniformLocation, 0)

            // gl.enable(gl.BLEND);
            // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

            ////////// 3rd::: simulate program to get new position
            gl.enable(gl.RASTERIZER_DISCARD)
            gl.useProgram(this.program_simulate!)
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.xfo_simulate_1)
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.pposBuffer_simulate_2)
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.velocityBuffer2)

            gl.bindVertexArray(this.vao_simulate_1)

            gl.uniform4f(this.Locations_simulate['mapExtent'], this.mapExtent[0], this.mapExtent[1], this.mapExtent[2], this.mapExtent[3])
            gl.uniform4f(this.Locations_simulate['flowExtent'], this.flowExtent[0], this.flowExtent[1], this.flowExtent[2], this.flowExtent[3])
            gl.uniformMatrix4fv(this.Locations_simulate['u_matrix'], false, matrix)
            gl.uniform1f(this.Locations_simulate['maxSpeed'], this.flowMaxVelocity)
            gl.uniform1f(this.Locations_simulate['randomSeed'], Math.random())
            // console.log(this.particelNum)
            gl.uniform1i(this.Locations_simulate['particelNum'], this.particelNum)
            gl.uniform1f(this.Locations_simulate['dropRate'], this.dropRate)
            gl.uniform1f(this.Locations_simulate['dropRateBump'], this.dropRateBump)
            gl.uniform1f(this.Locations_simulate['speedFactor'], this.velocityFactor)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, this.uvTexture!)


            gl.beginTransformFeedback(gl.POINTS)
            gl.drawArrays(gl.POINTS, 0, this.particelNum)
            gl.endTransformFeedback()
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
            gl.disable(gl.RASTERIZER_DISCARD)

            //////////4 ::: render to frame buffer
            ////// 4.1 ::: the history trajectory showing program 
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_historyShowing_1) // render to trajectoryTexture_1

            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
            gl.useProgram(this.program_historyShowing!)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, this.trajectoryTexture_2!) // history info in trajectoryTexture_2
            gl.uniform1i(this.Locations_historyShowing['showTexture'] as WebGLUniformLocation, 0)
            gl.uniform1f(this.Locations_historyShowing['fadeFactor'] as WebGLUniformLocation, this.fadeFactor)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

            ////// 4.2 ::: the segment showing program  ///// single segment SHOWING  like particle
            gl.useProgram(this.program_segmentShowing!)
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
            gl.uniformMatrix4fv(this.Locations_segmentShowing['u_matrix'], false, matrix)
            gl.uniform1f(this.Locations_segmentShowing['maxSpeed'], this.flowMaxVelocity)
            gl.bindVertexArray(this.vao_segmentShowing)
            gl.drawArraysInstanced(gl.LINES, 0, 2, this.particelNum)

            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            ////////// 5 ::: render to canvas








            this.xfSwap()

        }
        else {
            console.log('polygon layer not readydd')
        }
        this.map!.triggerRepaint()

        // window.addEventListener('keydown', (e) => {
        //     if (e.key == 'd') {
        //         this.printBuffer(gl, this.pposBuffer_simulate_1!, this.particelNum * 4);
        //     }
        //     else if (e.key == 'f') {
        //         this.printBuffer(gl, this.pposBuffer_simulate_2!, this.particelNum * 4);

        //     }
        // })

    }

    async programInit_delaunay(gl: WebGL2RenderingContext) {
        let { vertexData_station, indexData_station } = await this.getStationData('/flowResource/bin/station.bin')
        let velocityData = await this.getVelocityData('/flowResource/bin/uv_0.bin')
        let velocityData2 = await this.getVelocityData('/flowResource/bin/uv_2.bin')
        // console.log('vertexData', vertexData_station)
        // console.log('velocityData', velocityData)
        ////////// 1st::: delaunay program to get uv texture

        const vsSource_delaunay = (await axios.get('/shaders/06flow/delaunay.vert.glsl')).data
        const fsSource_delaunay = (await axios.get('/shaders/06flow/delaunay.frag.glsl')).data
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
        this.uvTexture = util.createCanvasSizeTexture(gl)

        this.fbo_delaunay = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_delaunay)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.uvTexture, 0)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    async programInit_showing(gl: WebGL2RenderingContext) {

        ////////// 2nd::: show uvTexture program
        const vsSource_showing = (await axios.get('/shaders/06flow/showing.vert.glsl')).data
        const fsSource_showing = (await axios.get('/shaders/06flow/showing.frag.glsl')).data
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

    async programInit_simulate(gl: WebGL2RenderingContext) {
        let particleInfoData1 = new Array(this.particelNum * 4).fill(0)
        let particleInfoData2 = new Array(this.particelNum * 4).fill(0)
        let velocityColorData1 = new Array(this.particelNum).fill(0)
        let velocityColorData2 = new Array(this.particelNum).fill(0)

        for (let i = 0; i < this.particelNum; i += 1) {
            particleInfoData2[i * 3 + 0] = particleInfoData1[i * 3 + 0] += Math.random()
            particleInfoData2[i * 3 + 1] = particleInfoData1[i * 3 + 1] += Math.random()
            particleInfoData2[i * 3 + 2] = particleInfoData1[i * 3 + 2] += Math.random()
            particleInfoData2[i * 3 + 3] = particleInfoData1[i * 3 + 3] += Math.random()
        }
        const VSS = (await axios.get('/shaders/06flow/simulate.vert.glsl'))
        const FSS = (await axios.get('/shaders/06flow/simulate.frag.glsl'))
        const VS = util.createShader(gl, gl.VERTEX_SHADER, VSS.data)!
        const FS = util.createShader(gl, gl.FRAGMENT_SHADER, FSS.data)!
        const outVaryings = ['out_particleInfo', 'out_verlocity']
        this.program_simulate = util.createProgram2(gl, VS, FS, outVaryings)!

        this.Locations_simulate['a_particleInfo'] = gl.getAttribLocation(this.program_simulate, 'a_particleInfo')
        // this.Locations_simulate['a_velocity'] = gl.getAttribLocation(this.program_simulate, 'a_velocity')

        this.Locations_simulate['mapExtent'] = gl.getUniformLocation(this.program_simulate, 'mapExtent')
        this.Locations_simulate['flowExtent'] = gl.getUniformLocation(this.program_simulate, 'flowExtent')
        this.Locations_simulate['u_matrix'] = gl.getUniformLocation(this.program_simulate, 'u_matrix')
        this.Locations_simulate['maxSpeed'] = gl.getUniformLocation(this.program_simulate, 'maxSpeed')
        this.Locations_simulate['randomSeed'] = gl.getUniformLocation(this.program_simulate, 'randomSeed')
        this.Locations_simulate['dropRate'] = gl.getUniformLocation(this.program_simulate, 'dropRate')
        this.Locations_simulate['dropRateBump'] = gl.getUniformLocation(this.program_simulate, 'dropRateBump')
        this.Locations_simulate['speedFactor'] = gl.getUniformLocation(this.program_simulate, 'speedFactor')
        this.Locations_simulate['uvTexture'] = gl.getUniformLocation(this.program_simulate, 'uvTexture')

        console.log(this.Locations_simulate)

        this.velocityBuffer1 = util.createVBO(gl, velocityColorData1)
        this.velocityBuffer2 = util.createVBO(gl, velocityColorData2)

        gl.bindBuffer(gl.ARRAY_BUFFER, null)

        this.vao_simulate_1 = gl.createVertexArray()!
        gl.bindVertexArray(this.vao_simulate_1)
        this.pposBuffer_simulate_1 = util.createVBO(gl, particleInfoData1)
        console.log(particleInfoData1)
        gl.enableVertexAttribArray(this.Locations_simulate['a_particleInfo'] as number)
        gl.vertexAttribPointer(
            this.Locations_simulate['a_particleInfo'] as number,
            4,
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.bindVertexArray(null)

        this.vao_simulate_2 = gl.createVertexArray()!
        gl.bindVertexArray(this.vao_simulate_2)
        this.pposBuffer_simulate_2 = util.createVBO(gl, particleInfoData2)
        gl.enableVertexAttribArray(this.Locations_simulate['a_particleInfo'] as number)
        gl.vertexAttribPointer(
            this.Locations_simulate['a_particleInfo'] as number,
            4,
            gl.FLOAT,
            false,
            0,
            0
        )
        // this.velocityBuffer2 = util.createVBO(gl, velocityColorData2)
        // gl.enableVertexAttribArray(this.Locations_simulate['a_velocity'] as number)
        // gl.vertexAttribPointer(
        //     this.Locations_simulate['a_velocity'] as number,
        //     1,
        //     gl.FLOAT,
        //     false,
        //     0,
        //     0
        // )
        gl.bindVertexArray(null)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)

        this.xfo_simulate_1 = gl.createTransformFeedback()!
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.xfo_simulate_1)
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.pposBuffer_simulate_2)
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.velocityBuffer2)
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)

        this.xfo_simulate_2 = gl.createTransformFeedback()!
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.xfo_simulate_2)
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.pposBuffer_simulate_1)
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.velocityBuffer1)
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
    }

    async programInit_segmentShowing(gl: WebGL2RenderingContext) {
        const VSS = (await axios.get('/shaders/06flow/segment.vert.glsl')).data
        const FSS = (await axios.get('/shaders/06flow/segment.frag.glsl')).data
        const VS = util.createShader(gl, gl.VERTEX_SHADER, VSS)!
        const FS = util.createShader(gl, gl.FRAGMENT_SHADER, FSS)!
        this.program_segmentShowing = util.createProgram(gl, VS, FS)!

        this.Locations_segmentShowing['a_positionInfo'] = gl.getAttribLocation(this.program_segmentShowing, 'a_positionInfo')
        this.Locations_segmentShowing['a_velocity'] = gl.getAttribLocation(this.program_segmentShowing, 'a_velocity')
        this.Locations_segmentShowing['u_matrix'] = gl.getUniformLocation(this.program_segmentShowing, 'u_matrix')
        this.Locations_segmentShowing['maxSpeed'] = gl.getUniformLocation(this.program_segmentShowing, 'maxSpeed')
        console.log(this.Locations_segmentShowing);

        this.vao_segmentShowing = gl.createVertexArray()!
        gl.bindVertexArray(this.vao_segmentShowing)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.pposBuffer_simulate_2)
        gl.enableVertexAttribArray(this.Locations_segmentShowing['a_positionInfo'] as number)
        gl.vertexAttribPointer(
            this.Locations_segmentShowing['a_positionInfo'] as number,
            4,
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.vertexAttribDivisor(this.Locations_segmentShowing['a_positionInfo'] as number, 1)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer2)
        gl.enableVertexAttribArray(this.Locations_segmentShowing['a_velocity'] as number)
        gl.vertexAttribPointer(
            this.Locations_segmentShowing['a_velocity'] as number,
            1,
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.vertexAttribDivisor(this.Locations_segmentShowing['a_velocity'] as number, 1)


        gl.bindVertexArray(null)
    }

    async programInit_historyShowing(gl: WebGL2RenderingContext) {
        const VSS = (await axios.get('/shaders/06flow/historyTrajectory.vert.glsl')).data
        const FSS = (await axios.get('/shaders/06flow/historyTrajectory.frag.glsl')).data
        const VS = util.createShader(gl, gl.VERTEX_SHADER, VSS)!
        const FS = util.createShader(gl, gl.FRAGMENT_SHADER, FSS)!
        this.program_historyShowing = util.createProgram(gl, VS, FS)!

        this.trajectoryTexture_1 = util.createCanvasSizeTexture(gl)
        this.fbo_historyShowing_1 = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_historyShowing_1)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.trajectoryTexture_1, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.trajectoryTexture_2 = util.createCanvasSizeTexture(gl)
        this.fbo_historyShowing_2 = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo_historyShowing_2)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.trajectoryTexture_2, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.Locations_historyShowing['showTexture'] = gl.getUniformLocation(this.program_historyShowing, 'showTexture')
        this.Locations_historyShowing['fadeFactor'] = gl.getUniformLocation(this.program_historyShowing, 'fadeFactor')

    }

    async programInit_finalShowing(gl: WebGL2RenderingContext){
        const VSS = (await axios.get('/shaders/06flow/final.vert.glsl')).data
        const FSS = (await axios.get('/shaders/06flow/final.frag.glsl')).data
        const VS = util.createShader(gl, gl.VERTEX_SHADER, VSS)!
        const FS = util.createShader(gl, gl.FRAGMENT_SHADER, FSS)!
        this.program_finalShowing = util.createProgram(gl, VS, FS)!


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

    printBuffer(gl: WebGL2RenderingContext, buffer: WebGLBuffer, size: number, label: string = '') {
        ////// debug
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        const debugArr = new Float32Array(size)
        gl.getBufferSubData(gl.ARRAY_BUFFER, 0, debugArr)
        console.log(`${label}`, debugArr)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    xfSwap() {
        let tempxfo = this.xfo_simulate_1
        this.xfo_simulate_1 = this.xfo_simulate_2
        this.xfo_simulate_2 = tempxfo

        let tempVao = this.vao_simulate_1
        this.vao_simulate_1 = this.vao_simulate_2
        this.vao_simulate_2 = tempVao

        // gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.pposBuffer_simulate_2)
        // gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.velocityBuffer2)

        let tempBuffer4pos = this.pposBuffer_simulate_2
        this.pposBuffer_simulate_2 = this.pposBuffer_simulate_1
        this.pposBuffer_simulate_1 = tempBuffer4pos

        let tempBuffer4Velocity = this.velocityBuffer2
        this.velocityBuffer2 = this.velocityBuffer1
        this.velocityBuffer1 = tempBuffer4Velocity

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