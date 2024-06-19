import axios from "axios";
import * as utils from "../../webglFuncs/util";

export const main = async () => {
    await simpleTransformFeedback()
}

const simpleTransformFeedback = async () => {

    const gl = utils.initGL('playground')!
    const simuVScode = (await axios.get('/shaders/05XFB/ezSimulate.vert.glsl')).data
    const simuFScode = (await axios.get('/shaders/05XFB/ezSimulate.frag.glsl')).data
    const showVScode = (await axios.get('/shaders/05XFB/showing.vert.glsl')).data
    const showFScode = (await axios.get('/shaders/05XFB/showing.frag.glsl')).data
    const simuVS = utils.createShader(gl, gl.VERTEX_SHADER, simuVScode)!
    const simuFS = utils.createShader(gl, gl.FRAGMENT_SHADER, simuFScode)!
    const simuProgram = utils.createProgram2(gl, simuVS, simuFS, ['out_pos'])!
    const showVS = utils.createShader(gl, gl.VERTEX_SHADER, showVScode)!
    const showFS = utils.createShader(gl, gl.FRAGMENT_SHADER, showFScode)!
    const showProgram = utils.createProgram(gl, showVS, showFS)!

    // let location_simu: { [name: string], value: number | WebGLUniformLocation | null }
    let location_simu: { [name: string]: number | WebGLUniformLocation | null } = {}
    location_simu["a_pos"] = gl.getAttribLocation(simuProgram, 'a_pos')
    location_simu["a_speed"] = gl.getAttribLocation(simuProgram, 'a_speed')


    let location_show: { [name: string]: number | WebGLUniformLocation | null } = {}
    location_show["a_pos"] = gl.getAttribLocation(showProgram, 'a_pos')

    const positionBuffer4XFstart = utils.createVBO(gl, [
        0.0, 0.0,
        0.0, 0.5
    ])
    const positionBuffer4XFresult = utils.createVBO(gl, [
        0.0, 0.0,
        0.0, 0.5
    ])
    const speedBuffer = utils.createVBO(gl, [
        0.1, 0.1,
        -0.1, -0.1,
        // 0,0,
        // 0,0,
    ])

    const vao4simu = gl.createVertexArray()!
    gl.bindVertexArray(vao4simu)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer4XFstart)
    gl.enableVertexAttribArray(location_simu["a_pos"] as number)
    gl.vertexAttribPointer(location_simu["a_pos"] as number, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, speedBuffer)
    gl.enableVertexAttribArray(location_simu["a_speed"] as number)
    gl.vertexAttribPointer(location_simu["a_speed"] as number, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    const vao4show = gl.createVertexArray()!
    gl.bindVertexArray(vao4show)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer4XFresult)
    gl.enableVertexAttribArray(location_show["a_pos"] as number)
    gl.vertexAttribPointer(location_show["a_pos"] as number, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    const xfbo = gl.createTransformFeedback()!
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, xfbo)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffer4XFresult)
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)

    gl.bindBuffer(gl.ARRAY_BUFFER, null)


    const render = () => {
        gl.enable(gl.RASTERIZER_DISCARD)

        gl.useProgram(simuProgram)
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, xfbo)
        gl.bindVertexArray(vao4simu)
        gl.beginTransformFeedback(gl.POINTS)
        gl.drawArrays(gl.POINTS, 0, 2)
        gl.endTransformFeedback()
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)

        gl.disable(gl.RASTERIZER_DISCARD)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.useProgram(showProgram)
        gl.bindVertexArray(vao4show)
        gl.drawArrays(gl.LINES, 0, 2)
        gl.bindVertexArray(null)
    }

    render()


}
