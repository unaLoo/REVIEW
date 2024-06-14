import axios from 'axios'
import * as util from '../../webglFuncs/util'

let triVS: WebGLShader
let triFS: WebGLShader
let triProgram: WebGLProgram

async function prepare() {

    const canvas = document.querySelector('#playground') as HTMLCanvasElement
    const gl = canvas.getContext('webgl2')
    if (!gl) {
        console.warn('webgl2 not supported!')
        return
    }

    const triVSSource: string = (await axios.get('/shaders/01triangle/tri.vert.glsl')).data
    const triFSSrouce: string = (await axios.get('/shaders/01triangle/tri.frag.glsl')).data
    triVS = util.createShader(gl, gl.VERTEX_SHADER, triVSSource)!
    triFS = util.createShader(gl, gl.FRAGMENT_SHADER, triFSSrouce)!

    triProgram = util.createProgram(gl, triVS, triFS)!

    const positions = [
        0, 0,
        0, 0.5,
        0.7, 0,
    ]
    const positionAttributeLocation = gl.getAttribLocation(triProgram, "a_position")
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

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
    util.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.useProgram(triProgram)
    gl.bindVertexArray(vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)


}

export {
    prepare
}