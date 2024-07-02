import * as util from '../../webglFuncs/util'
import axios from 'axios'


export const main = async () => {
    await purePulsing()
}



const purePulsing = async () => {

    const canvas = document.querySelector('#playground') as HTMLCanvasElement
    const gl = canvas.getContext('webgl2')
    if (!gl) {
        console.warn('webgl2 not supported!')
        return
    }
    // canvas.width = canvas.clientWidth
    // canvas.height = canvas.clientHeight
    const VSS = (await axios.get('/shaders/培训案例/pulsingDot.vert.glsl'))
    const FSS = (await axios.get('/shaders/培训案例/pulsingDot.frag.glsl'))
    const VS = util.createShader(gl, gl.VERTEX_SHADER, VSS.data)!
    const FS = util.createShader(gl, gl.FRAGMENT_SHADER, FSS.data)!
    const program = util.createProgram(gl, VS, FS)!

    const aPosLoc = gl.getAttribLocation(program, 'a_position')
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution')
    const uSizeLoc = gl.getUniformLocation(program, 'u_size')
    const uColorLoc = gl.getUniformLocation(program, 'u_color')
    const uOpaLoc = gl.getUniformLocation(program, 'u_opacity')

    const posData = [
        0.0, 0.0,
        // -0.5, 0.0,
        // 0.5, 0.5
    ]
    const posBuffer = util.createVBO(gl, posData)

    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(aPosLoc, 1)

    let insize = 20.0
    let outSize = 20.0
    let count = 0

    const render = () => {
        count < Math.PI / 2 ? count += 0.01 : count = 0.0
        outSize = 20.0 + 40.0 * Math.sin(count)

        gl.useProgram(program)
        gl.bindVertexArray(vao)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


        gl.uniform2f(uResolutionLoc, gl.canvas.width, gl.canvas.height)
        gl.uniform1f(uSizeLoc, outSize)
        gl.uniform3f(uColorLoc, 0.9, 0.9, 0.9)
        gl.uniform1f(uOpaLoc, 1.0 - Math.sin(count) + 0.2)
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1)

        gl.uniform2f(uResolutionLoc, gl.canvas.width, gl.canvas.height)
        gl.uniform1f(uSizeLoc, insize)
        gl.uniform3f(uColorLoc, 0.9, 0.0, 0.0)
        gl.uniform1f(uOpaLoc, 1.0)
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1)

        requestAnimationFrame(render)
    }
    render()

}