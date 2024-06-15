import axios from 'axios'
import * as util from '../../webglFuncs/util'

let triVS: WebGLShader
let triFS: WebGLShader
let triProgram: WebGLProgram

async function prepare() {

    /////// prepare
    const canvas = document.querySelector('#playground') as HTMLCanvasElement
    const gl = canvas.getContext('webgl2')
    if (!gl) {
        console.warn('webgl2 not supported!')
        return
    }
    util.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)


    /////// shader and program
    const triVSSource: string = (await axios.get('/shaders/01triangle/tri.vert.glsl')).data
    const triFSSrouce: string = (await axios.get('/shaders/01triangle/tri.frag.glsl')).data
    triVS = util.createShader(gl, gl.VERTEX_SHADER, triVSSource)!
    triFS = util.createShader(gl, gl.FRAGMENT_SHADER, triFSSrouce)!

    triProgram = util.createProgram(gl, triVS, triFS)!

    /////// a buffer for data
    let positions = [
        200, 200,
        500, 200,
        500, 500,
    ]
    const positionAttributeLocation = gl.getAttribLocation(triProgram, "a_position")
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)


    /////// vao ------> how to get data from buffer to vertex
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.enableVertexAttribArray(positionAttributeLocation)
    gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
    )


    /////// canvas set
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)


    // gl.clearColor(0.1, 0.1, 0.1, 1)
    // gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(triProgram)

    /////// a uniform for resolution
    const resolution = [gl.canvas.width, gl.canvas.height]
    // getUniformLocation must after useProgram
    const resolutionLocation = gl.getUniformLocation(triProgram, "u_resolution")
    gl.uniform2f(resolutionLocation, resolution[0], resolution[1])
    let size = 0.5
    const sizeLocation = gl.getUniformLocation(triProgram, "u_size")
    gl.uniform1f(sizeLocation, size)

    gl.bindVertexArray(vao)


    const render = () => {
        // dynamic data
        size = (size + 0.005) % 1
        gl.uniform1f(sizeLocation, size)
        positions = [
            200, 200,
            500, 200,
            500, 500,
        ]
        positions[0] = 200 + 200 * Math.cos(size * 2 * Math.PI)
        positions[1] = 200 + 200 * Math.sin(size * 2 * Math.PI)
        positions[2] = 500 + 200 * Math.cos(size * 2 * Math.PI)
        positions[3] = 200 + 200 * Math.sin(size * 2 * Math.PI)
        positions[4] = 500 + 200 * Math.cos(size * 2 * Math.PI)
        positions[5] = 500 + 200 * Math.sin(size * 2 * Math.PI)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

        // gl.bindVertexArray(vao)
        // gl.uniform1f(sizeLocation, size)

        //////////////RENDER

        gl.drawArrays(gl.TRIANGLES, 0, 3)
        requestAnimationFrame(render)
    }
    render()







    // same programe, different data  -------> mutiple draw call
    // for (let i = 0; i < 50; i++) {

    //     size = (size + 0.001 * i) % 1
    //     gl.uniform1f(sizeLocation, size)
    //     positions = [
    //         200, 200,
    //         500, 200,
    //         500, 500,
    //     ]
    //     positions[0] = 200 + 200 * Math.cos(size * 2 * Math.PI)
    //     positions[1] = 200 + 200 * Math.sin(size * 2 * Math.PI)
    //     positions[2] = 500 + 200 * Math.cos(size * 2 * Math.PI)
    //     positions[3] = 200 + 200 * Math.sin(size * 2 * Math.PI)
    //     positions[4] = 500 + 200 * Math.cos(size * 2 * Math.PI)
    //     positions[5] = 500 + 200 * Math.sin(size * 2 * Math.PI)
    //     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    //     //////////////RENDER
    //     gl.drawArrays(gl.TRIANGLES, 0, 3)
    // }



}

export {
    prepare
}