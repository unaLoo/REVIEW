import axios from 'axios'
import * as THREE from 'three'

export default class MaskLayer {

    constructor() {

        // Layer
        this.type = 'custom'
        this.map = undefined
        this.id = 'FlowLayer'
        this.renderingMode = '3d'

        // this.bbox = [ 120.4787, 120.6014, 31.9742, 32.0934 ]
        this.bbox = [ 120.4787, 120.6014, 32.0, 32.08 ]
    }

    onAdd(map, gl) {

        this.map = map

        // Initialize layer passes
        this.init(gl)
    }

    /** @param { WebGL2RenderingContext } gl */
    async init(gl) {

        this.isInitialized = false

        enableAllExtensions(gl)

        // this.offScreenShader = await createShader(gl, '/shaders/examples/webgl/triangle.glsl')
        this.shader = await createShader(gl, '/shaders/examples/webgl/quad.glsl')
        this.opacityShader = await createShader(gl, '/shaders/examples/webgl/opacity.glsl')

        const tl = fromLonLat([ this.bbox[0], this.bbox[3] ])
        const tr = fromLonLat([ this.bbox[1], this.bbox[3] ])
        const bl = fromLonLat([ this.bbox[0], this.bbox[2] ])
        const br = fromLonLat([ this.bbox[1], this.bbox[2] ])
        const boxArray1 = [
            ...encodeFloatToDouble(tl[0]),
            ...encodeFloatToDouble(tl[1]),
            ...encodeFloatToDouble(bl[0]),
            ...encodeFloatToDouble(bl[1]),
            ...encodeFloatToDouble(tr[0]),
            ...encodeFloatToDouble(tr[1]),
            ...encodeFloatToDouble(br[0]),
            ...encodeFloatToDouble(br[1]),
        ]

        this.vertexBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxArray1), gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
    
        this.VAO = gl.createVertexArray()
        gl.bindVertexArray(this.VAO)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
        gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 4 * 4, 0)
        gl.enableVertexAttribArray(0)
        gl.bindVertexArray(null)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)

        this.isInitialized = true
    }

    /**
     * @param { WebGL2RenderingContext } gl
     * @param { [number] } matrix  
     */
    render(gl, matrix) {

        // No render condition
        if (!this.isInitialized) return

        const minZoom = 0//12
        const maxZoom = 0//22
        const currentZoom = Math.min(maxZoom, Math.max(minZoom, this.map.getZoom()))
        const opacity = lerp(1, 0, (currentZoom - minZoom) / (maxZoom - minZoom))

        const relativeMatrix = new THREE.Matrix4().fromArray(matrix).multiply(new THREE.Matrix4().makeTranslation(this.map.centerHigh[0], this.map.centerHigh[1], 0.0))

        const isBlendingEnabled = gl.isEnabled(gl.BLEND)
        const blendSrcRgb = gl.getParameter(gl.BLEND_SRC_RGB)
        const blendDstRgb = gl.getParameter(gl.BLEND_DST_RGB)
        const blendSrcAlpha = gl.getParameter(gl.BLEND_SRC_ALPHA)
        const blendDstAlpha = gl.getParameter(gl.BLEND_DST_ALPHA)
        
        if (!isBlendingEnabled) gl.enable(gl.BLEND)

        gl.blendFunc(gl.ZERO, gl.SRC_COLOR)

        gl.useProgram(this.opacityShader)
        gl.bindVertexArray(this.VAO)
        gl.uniform1f(gl.getUniformLocation(this.opacityShader, 'alphaFactor'), opacity)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        // gl.useProgram(this.shader)
        // gl.bindVertexArray(this.VAO)
        // gl.uniform1f(gl.getUniformLocation(this.shader, 'alphaFactor'), opacity)
        // gl.uniform2fv(gl.getUniformLocation(this.shader, 'centerHigh'), this.map.centerHigh)
        // gl.uniform2fv(gl.getUniformLocation(this.shader, 'centerLow'), this.map.centerLow)
        // gl.uniformMatrix4fv(gl.getUniformLocation(this.shader, 'u_matrix'), false, relativeMatrix.elements)

        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        gl.bindVertexArray(null);
        gl.blendFuncSeparate(blendSrcRgb, blendDstRgb, blendSrcAlpha, blendDstAlpha)

        if (!isBlendingEnabled) gl.disable(gl.BLEND)

        this.map.triggerRepaint()
    }
}

// Helpers //////////////////////////////////////////////////////////////////////////////////////////////////////
function encodeFloatToDouble(value) {

    const result = new Float32Array(2);
    result[0] = value;
    
    const delta = value - result[0];
    result[1] = delta;
    return result;
}

/**
 * @param {WebGL2RenderingContext} gl 
 */
function enableAllExtensions(gl) {

    const extensions = gl.getSupportedExtensions()
    extensions.forEach(ext => {
        gl.getExtension(ext)
        console.log('Enabled extensions: ', ext)
    })
}

/** 
 * @param {WebGL2RenderingContext} gl  
 * @param {string} url 
 */
async function createShader(gl, url) {

    let shaderCode = ''
    await axios.get(url)
    .then(response => shaderCode += response.data)
    const vertexShaderStage = compileShader(gl, shaderCode, gl.VERTEX_SHADER)
    const fragmentShaderStage = compileShader(gl, shaderCode, gl.FRAGMENT_SHADER)

    const shader = gl.createProgram()
    gl.attachShader(shader, vertexShaderStage)
    gl.attachShader(shader, fragmentShaderStage)
    gl.linkProgram(shader)
    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {

        console.error('An error occurred linking shader stages: ' + gl.getProgramInfoLog(shader))
    }

    return shader

    function compileShader(gl, source, type) {
    
        const versionDefinition = '#version 300 es\n'
        const module = gl.createShader(type)
        if (type === gl.VERTEX_SHADER) source = versionDefinition + '#define VERTEX_SHADER\n' + source
        else if (type === gl.FRAGMENT_SHADER) source = versionDefinition + '#define FRAGMENT_SHADER\n' + source
    
        gl.shaderSource(module, source)
        gl.compileShader(module)
        if (!gl.getShaderParameter(module, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shader module: ' + gl.getShaderInfoLog(module))
            gl.deleteShader(module)
            return null
        }
    
        return module
    }
}

/**
 * @param { WebGL2RenderingContext } gl 
 * @param { WebGLTexture[] } [ textures ] 
 * @param { WebGLRenderbuffer } [ renderBuffer ] 
 * @returns { WebGLFramebuffer }
 */
function createFrameBuffer(gl, textures, renderBuffer) {

    const frameBuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)

    textures?.forEach((texture, index) => {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0)
    })

    if (renderBuffer) {

        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderBuffer)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {

        console.error('Framebuffer is not complete')
    }

    return frameBuffer
}

/**
 * @param { WebGL2RenderingContext } gl 
 * @param { number } width 
 * @param { number } height 
 * @param { number } internalFormat 
 * @param { number } format 
 * @param { number } type 
 */
function createTexture2D(gl, width, height, internalFormat, format, type) {
    
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null)

    gl.bindTexture(gl.TEXTURE_2D, null)

    return texture
}


/**
 * @param { WebGL2RenderingContext } gl 
 * @param { number } [ width ] 
 * @param { number } [ height ] 
 * @returns { WebGLRenderbuffer }
 */
function createRenderBuffer(gl, width, height) {

    const bufferWidth = width || gl.canvas.width
    const bufferHeight = height || gl.canvas.height

    const renderBuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, bufferWidth, bufferHeight)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)

    return renderBuffer
}

function mercatorXfromLon(lon) {
    
    return (180. + lon) / 360.
}

function mercatorYfromLat(lat) {

    return (180. - (180. / Math.PI * Math.log(Math.tan(Math.PI / 4. + lat * Math.PI / 360.)))) / 360.
}

function fromLonLat(lonLat) {

    const x = mercatorXfromLon(lonLat[0])
    const y = mercatorYfromLat(lonLat[1])

    return [ x, y ]
}

        
function lerp(a, b, t) {

    return (1 - t) * a + t * b
}
