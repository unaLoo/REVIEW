import axios from "axios";
import * as dat from "dat.gui";
import * as util from "../../webglFuncs/util";
import { FALSE } from "sass";


export async function main() {

    const gl = util.initGL('playground')!

    const vertexShaderSource = (await axios.get('/shaders/03transform/trans1.vert.glsl')).data
    const fragmentShaderSource = (await axios.get('/shaders/03transform/trans1.frag.glsl')).data

    const vertexShader = util.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)!
    const fragmentShader = util.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)!
    const program = util.createProgram(gl, vertexShader, fragmentShader)!

    const aposLocation = gl.getAttribLocation(program, 'a_pos')
    const uResolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const uMatrixLocation = gl.getUniformLocation(program, 'u_matrix')

    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)

    const aposBuffer = util.createVBO(gl, F)
    gl.enableVertexAttribArray(aposLocation)
    gl.vertexAttribPointer(aposLocation, 2, gl.FLOAT, false, 0, 0)

    const resolutionData = [gl.canvas.width, gl.canvas.height]
    let matrixData = (new util.M3()).value


    ////////GUI
    const updateMatrix = () => {
        const mat3 = new util.M3()
        const result =
            mat3
                .transition(controller.xmove, controller.ymove)
                .rotate(controller.rotate)
                .scale(controller.xscale, controller.yscale)
        matrixData = result.value
        gl.uniformMatrix3fv(uMatrixLocation, false, matrixData)
    }
    const controller = {
        'xmove': 0,
        'ymove': 0,
        'rotate': 0,
        'xscale': 1.0,
        'yscale': 1.0
    }
    const gui = new dat.GUI()
    gui.add(controller, 'xmove', 0, 1000).step(1).onChange(updateMatrix)
    gui.add(controller, 'ymove', 0, 500).step(1).onChange(updateMatrix)
    gui.add(controller, 'rotate', -180, 180).step(1).onChange(updateMatrix)
    gui.add(controller, 'xscale', 0.1, 10).step(0.1).onChange(updateMatrix)
    gui.add(controller, 'yscale', 0.1, 10).step(0.1).onChange(updateMatrix)
    const render = () => {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(program)
        gl.bindVertexArray(vao)
        gl.uniform2f(uResolutionLocation, resolutionData[0], resolutionData[1])
        gl.uniformMatrix3fv(uMatrixLocation, false, matrixData)

        gl.drawArrays(gl.TRIANGLES, 0, 18)
        requestAnimationFrame(render)

    }
    render()
}



const F = [
    // left column
    0, 0,
    30, 0,
    0, 150,
    0, 150,
    30, 0,
    30, 150,

    // top rung
    30, 0,
    100, 0,
    30, 30,
    30, 30,
    100, 0,
    100, 30,

    // middle rung
    30, 60,
    67, 60,
    30, 90,
    30, 90,
    67, 60,
    67, 90,
]