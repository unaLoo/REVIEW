import * as util from '../../webglFuncs/util'
import axios from 'axios'


export const main = async () => {
    await purePulsing()
}



const purePulsing = async () => {

    const gl = util.initGL('playground')!
    const VSS = (await axios.get('/shaders/培训案例/pulsingDot.vert.glsl'))
    const FSS = (await axios.get('/shaders/培训案例/pulsingDot.frag.glsl'))
    const VS = util.createShader(gl, gl.VERTEX_SHADER, VSS.data)!
    const FS = util.createShader(gl, gl.FRAGMENT_SHADER, FSS.data)!
    const program = util.createProgram(gl, VS, FS)!

    const aPosLoc = gl.getAttribLocation(program, 'a_position')
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution')
    const uSizeLoc = gl.getUniformLocation(program, 'u_size')
    const uColorLoc = gl.getUniformLocation(program, 'u_color')

    const posData = [
        -0.5, 0.0,
        0.0, 0.0,
        0.5, 0.0
    ]
    const posBuffer = util.createVBO(gl, posData)

    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(aPosLoc, 1)

    const render = () => {
        // console.log('render123');

        gl.useProgram(program)
        gl.bindVertexArray(vao)
        gl.uniform2f(uResolutionLoc, gl.canvas.width, gl.canvas.height)
        gl.uniform1f(uSizeLoc, 100.0)
        gl.uniform3f(uColorLoc, 1.0, 0.0, 0.0)
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 3)
        // render()
    }
    render()

}