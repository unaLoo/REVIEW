import * as util from '../../webglFuncs/util'
import axios from 'axios'

export const main = async () => {
    const initGL = (canvasId: string) => {
        const canvas = document.querySelector(`#${canvasId}`) as HTMLCanvasElement
        const gl = canvas.getContext('webgl2') as WebGL2RenderingContext
        if (!gl) {
            console.warn('webgl2 not supported!')
            return
        }
        util.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
        return gl
    }

    const gl = initGL('playground')!

    const vertexShaderSource = (await axios.get('/shaders/02texture/tex.vert.glsl')).data
    const fragmentShaderSource = (await axios.get('/shaders/02texture/tex.frag.glsl')).data

    const vertexShader = util.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)!
    const fragmentShader = util.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)!
    const program = util.createProgram(gl, vertexShader, fragmentShader)!


    const aposLocation = gl.getAttribLocation(program, 'a_position')
    const atexLocation = gl.getAttribLocation(program, 'a_texcoord')
    const mTexLocation = gl.getUniformLocation(program, 'myTexture')
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    let positionData = [
        -0.8, -0.8,
        0.8, -0.8,
        -0.8, 0.8,
        -0.8, 0.8,
        0.8, 0.8,
        0.8, -0.8
    ]
    const posBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionData), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(aposLocation)
    gl.vertexAttribPointer(aposLocation, 2, gl.FLOAT, false, 0, 0)

    let texCoordData = [
        0, 1,
        1, 1,
        0, 0,
        0, 0,
        1, 0,
        1, 1
    ]
    const texCoordBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoordData), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(atexLocation)
    gl.vertexAttribPointer(atexLocation, 2, gl.FLOAT, false, 0, 0)

    const textureData = (await axios.get('/images/02texture/leaf.png', { responseType: 'arraybuffer' })).data
    const myTexture = gl.createTexture()!
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, myTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    console.log(textureData)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 526, 353, 0, gl.RGBA, gl.UNSIGNED_BYTE, textureData)

    const render = () => {
        // resize
        util.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        // gl.clearColor(0.1, 0.1, 0.1, 1)
        // gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(program)
        gl.bindVertexArray(vao)
        gl.uniform1i(mTexLocation, 0)

    }

}


