import axios from "axios";
import * as dat from "dat.gui";
import * as util from "../../webglFuncs/util";


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


export async function main3d() {

    const gl = util.initGL('playground')!

    const vertexShaderSource = (await axios.get('/shaders/03transform/trans2.vert.glsl')).data
    const fragmentShaderSource = (await axios.get('/shaders/03transform/trans2.frag.glsl')).data
    const vs = util.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)!
    const fs = util.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)!
    const program = util.createProgram(gl, vs, fs)!

    const aposLocation = gl.getAttribLocation(program, 'a_pos')
    const colorLocation = gl.getAttribLocation(program, 'a_color')
    const uResolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const uMatrixLocation = gl.getUniformLocation(program, 'u_matrix')

    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)

    const aposBuffer = util.createVBO(gl, Freal3D)
    gl.enableVertexAttribArray(aposLocation)
    gl.vertexAttribPointer(aposLocation, 3, gl.FLOAT, false, 0, 0)

    const colorBuffer = util.createVBO(gl, Freal3Dcolor)
    gl.enableVertexAttribArray(colorLocation)
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0)

    const resolutionData = [gl.canvas.width, gl.canvas.height]

    let matrixData = (new util.M4()).value


    ////////GUI
    const updateMatrix = () => {
        const mat4 = new util.M4().projection(gl.canvas.width, gl.canvas.height, 400)
        const result =
            mat4
                .projection(gl.canvas.width, gl.canvas.height, 400)
                .transition(controller.xmove, controller.ymove, controller.zmove)
                .rotateX(controller.xrotate)
                .rotateY(controller.yrotate)
                .rotateZ(controller.zrotate)
                .scale(controller.xscale, controller.yscale, controller.zscale)
        matrixData = result.value
        gl.uniformMatrix4fv(uMatrixLocation, false, matrixData)
    }
    const controller = {
        'xmove': 200,
        'ymove': 100,
        'zmove': 0,
        'xrotate': 0,
        'yrotate': 120,
        'zrotate': 0,
        'xscale': 1.0,
        'yscale': 1.0,
        'zscale': 1.0
    }
    const gui = new dat.GUI()
    gui.add(controller, 'xmove', 0, 500).step(1).onChange(updateMatrix)
    gui.add(controller, 'ymove', 0, 500).step(1).onChange(updateMatrix)
    gui.add(controller, 'zmove', -10, 10).step(1).onChange(updateMatrix)
    gui.add(controller, 'xrotate', -180, 180).step(1).onChange(updateMatrix)
    gui.add(controller, 'yrotate', -180, 180).step(1).onChange(updateMatrix)
    gui.add(controller, 'zrotate', -180, 180).step(1).onChange(updateMatrix)
    gui.add(controller, 'xscale', -5, 5).step(0.1).onChange(updateMatrix)
    gui.add(controller, 'yscale', -5, 5).step(0.1).onChange(updateMatrix)
    gui.add(controller, 'zscale',  -5, 5).step(0.1).onChange(updateMatrix)


    const render = () => {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.enable(gl.CULL_FACE)
        gl.enable(gl.DEPTH_TEST)

        gl.useProgram(program)
        gl.bindVertexArray(vao)
        gl.uniform2f(uResolutionLocation, resolutionData[0], resolutionData[1])
        // gl.uniformMatrix4fv(uMatrixLocation, false, matrixData)
        updateMatrix()

        gl.drawArrays(gl.TRIANGLES, 0, 16 * 6)
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

const F3d = [
    // 左竖
    0, 0, 0,
    30, 0, 0,
    0, 150, 0,
    0, 150, 0,
    30, 0, 0,
    30, 150, 0,

    // 上横
    30, 0, 0,
    100, 0, 0,
    30, 30, 0,
    30, 30, 0,
    100, 0, 0,
    100, 30, 0,

    // 下横
    30, 60, 0,
    67, 60, 0,
    30, 90, 0,
    30, 90, 0,
    67, 60, 0,
    67, 90, 0
]

const Freal3D = [
    // left column front
    0, 0, 0,
    30, 0, 0,
    0, 150, 0,
    0, 150, 0,
    30, 0, 0,
    30, 150, 0,

    // top rung front
    30, 0, 0,
    100, 0, 0,
    30, 30, 0,
    30, 30, 0,
    100, 0, 0,
    100, 30, 0,

    // middle rung front
    30, 60, 0,
    67, 60, 0,
    30, 90, 0,
    30, 90, 0,
    67, 60, 0,
    67, 90, 0,

    // left column back
    0, 0, 30,
    30, 0, 30,
    0, 150, 30,
    0, 150, 30,
    30, 0, 30,
    30, 150, 30,

    // top rung back
    30, 0, 30,
    100, 0, 30,
    30, 30, 30,
    30, 30, 30,
    100, 0, 30,
    100, 30, 30,

    // middle rung back
    30, 60, 30,
    67, 60, 30,
    30, 90, 30,
    30, 90, 30,
    67, 60, 30,
    67, 90, 30,

    // top
    0, 0, 0,
    100, 0, 0,
    100, 0, 30,
    0, 0, 0,
    100, 0, 30,
    0, 0, 30,

    // top rung right
    100, 0, 0,
    100, 30, 0,
    100, 30, 30,
    100, 0, 0,
    100, 30, 30,
    100, 0, 30,

    // under top rung
    30, 30, 0,
    30, 30, 30,
    100, 30, 30,
    30, 30, 0,
    100, 30, 30,
    100, 30, 0,

    // between top rung and middle
    30, 30, 0,
    30, 30, 30,
    30, 60, 30,
    30, 30, 0,
    30, 60, 30,
    30, 60, 0,

    // top of middle rung
    30, 60, 0,
    30, 60, 30,
    67, 60, 30,
    30, 60, 0,
    67, 60, 30,
    67, 60, 0,

    // right of middle rung
    67, 60, 0,
    67, 60, 30,
    67, 90, 30,
    67, 60, 0,
    67, 90, 30,
    67, 90, 0,

    // bottom of middle rung.
    30, 90, 0,
    30, 90, 30,
    67, 90, 30,
    30, 90, 0,
    67, 90, 30,
    67, 90, 0,

    // right of bottom
    30, 90, 0,
    30, 90, 30,
    30, 150, 30,
    30, 90, 0,
    30, 150, 30,
    30, 150, 0,

    // bottom
    0, 150, 0,
    0, 150, 30,
    30, 150, 30,
    0, 150, 0,
    30, 150, 30,
    30, 150, 0,

    // left side
    0, 0, 0,
    0, 0, 30,
    0, 150, 30,
    0, 0, 0,
    0, 150, 30,
    0, 150, 0,
]

const Freal3Dcolor = [
    // left column front
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,

    // top rung front
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,

    // middle rung front
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,
    200, 70, 120,

    // left column back
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,

    // top rung back
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,

    // middle rung back
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,
    80, 70, 200,

    // top
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,
    70, 200, 210,

    // top rung right
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,
    200, 200, 70,

    // under top rung
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,
    210, 100, 70,

    // between top rung and middle
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,
    210, 160, 70,

    // top of middle rung
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,
    70, 180, 210,

    // right of middle rung
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,
    100, 70, 210,

    // bottom of middle rung.
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,
    76, 210, 100,

    // right of bottom
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,
    140, 210, 80,

    // bottom
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,
    90, 130, 110,

    // left side
    160, 160, 220,
    160, 160, 220,
    160, 160, 220,
    160, 160, 220,
    160, 160, 220,
    160, 160, 220,
]