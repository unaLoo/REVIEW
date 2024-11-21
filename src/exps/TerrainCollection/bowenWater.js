import axios from "axios"
import mapboxgl from "mapbox-gl"
import { createShader, createTexture2D, loadImage, createFrameBuffer, createRenderBuffer, enableAllExtensions, createVBO, createIBO, createCustomMipmapTexture2D, createFboPoolforMipmapTexture, calculateMipmapLevels, createShaderFromCode } from "../../webglFuncs/glLib"
import * as DAT from "dat.gui"



import testCode from './shader/test.glsl'

export class WaterLayer {

    id = 'bowen-water'
    type = 'custom'
    renderingMode = '3d'
    prepared = false

    // unifroms 
    shallowColor = [84, 157, 255]
    _shallowColor = `rgb(${this.shallowColor[0]}, ${this.shallowColor[1]}, ${this.shallowColor[2]})`
    deepColor = [40, 116, 255]
    _deepColor = `rgb(${this.deepColor[0]}, ${this.deepColor[1]}, ${this.deepColor[2]})`

    SamplerParams = [16.3, 20.0, 48.0, -15.0]
    SamplerParams0 = 16.3
    SamplerParams1 = 20.0
    SamplerParams2 = 48.0
    SamplerParams3 = -15.0

    LightPos = [0.8, 0.5, 1.0]
    LightPosX = 0.8
    LightPosY = 0.5
    LightPosZ = 1.0

    specularPower = 100

    constructor() {

    }
    /**
     * 
     * @param {*} map 
     * @param {WebGL2RenderingContext} gl 
     */
    async onAdd(map, gl) {
        this.map = map
        this.gl = gl
        enableAllExtensions(gl)
        this.initGUI()
        const heightBitmap = await loadImage('/images/examples/terrain/dem.png')
        this.heightTexture = createTexture2D(gl, heightBitmap.width, heightBitmap.height,
            gl.R32F, gl.RED, gl.FLOAT, heightBitmap, gl.LINEAR)

        const normalBitmap1 = await loadImage('/images/examples/terrain/WaterNormal1.png')
        const normalBitmap2 = await loadImage('/images/examples/terrain/WaterNormal2.png')
        this.normalTexture1 = createTexture2D(gl, normalBitmap1.width, normalBitmap1.height,
            gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, normalBitmap1, gl.LINEAR, false, true)
        this.normalTexture2 = createTexture2D(gl, normalBitmap2.width, normalBitmap2.height,
            gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, normalBitmap2, gl.LINEAR, false, true)


        this.testProgram = createShaderFromCode(gl, testCode)
        this.testVAO = gl.createVertexArray()
        gl.bindVertexArray(this.testVAO)
        this.testVBO = createVBO(gl, new Float32Array([
            120.3133719689749483, 31.7559901478936517,
            121.0006965752893962, 31.7559901478936517,
            120.3133719689749483, 32.0824775554828747,
            121.0006965752893962, 32.0824775554828747,
        ]))

        gl.enableVertexAttribArray(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.testVBO)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(null)

        this.prepared = true

    }
    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {*} matrix 
     * @returns 
     */
    render(gl, matrix) {
        if (!this.prepared) {
            return
        }
        const nowTime = performance.now()
        const cameraPos = this.map.transform._camera.position

        // gl.enable(gl.BLEND_COLOR)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.useProgram(this.testProgram)
        gl.bindVertexArray(this.testVAO)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.heightTexture)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture1)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture2)

        gl.uniform1i(gl.getUniformLocation(this.testProgram, 'u_heightTexture'), 0)
        gl.uniform1i(gl.getUniformLocation(this.testProgram, 'u_normalTexture1'), 1)
        gl.uniform1i(gl.getUniformLocation(this.testProgram, 'u_normalTexture2'), 2)
        gl.uniformMatrix4fv(gl.getUniformLocation(this.testProgram, 'u_matrix'), false, matrix)
        gl.uniform3fv(gl.getUniformLocation(this.testProgram, 'u_cameraPos'), cameraPos)
        gl.uniform1f(gl.getUniformLocation(this.testProgram, 'u_time'), nowTime)

        gl.uniform3fv(gl.getUniformLocation(this.testProgram, 'shallowColor'), this.shallowColor)
        gl.uniform3fv(gl.getUniformLocation(this.testProgram, 'deepColor'), this.deepColor)
        gl.uniform4fv(gl.getUniformLocation(this.testProgram, 'SamplerParams'), this.SamplerParams)
        gl.uniform3fv(gl.getUniformLocation(this.testProgram, 'LightPos'), this.LightPos)
        gl.uniform1f(gl.getUniformLocation(this.testProgram, 'specularPower'), this.specularPower)


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)


        this.map.triggerRepaint()

    }



    initGUI() {
        this.gui = new DAT.GUI()

        // this.gui.domElement.style.position = 'absolute'
        // this.gui.domElement.style.top = '2vh'
        // this.gui.domElement.style.right = '1vw'
        this.gui.addColor(this, '_shallowColor').name('潜水').onChange(value => { this.shallowColor = parseRGB(value) });
        this.gui.addColor(this, '_deepColor').name('深水').onChange(value => { this.deepColor = parseRGB(value) });

        this.gui.add(this, 'SamplerParams0', 0, 100, 0.1).onChange(value => { this.SamplerParams[0] = value })
        this.gui.add(this, 'SamplerParams1', 0, 100, 0.1).onChange(value => { this.SamplerParams[1] = value })
        this.gui.add(this, 'SamplerParams2', 0, 100, 0.1).onChange(value => { this.SamplerParams[2] = value })
        this.gui.add(this, 'SamplerParams3', -100, 0, 0.1).onChange(value => { this.SamplerParams[3] = value })

        this.gui.add(this, 'LightPosX', -1, 1, 0.1).onChange(value => { this.LightPos[0] = value })
        this.gui.add(this, 'LightPosY', -1, 1, 0.1).onChange(value => { this.LightPos[1] = value })
        this.gui.add(this, 'LightPosZ', 0, 1, 0.1).onChange(value => { this.LightPos[2] = value })

        this.gui.add(this, 'specularPower', 0, 1000, 1).onChange(value => { this.specularPower = value })
        this.gui.open();
    }







}






















export const initMap = () => {

    const tk = 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA'
    const EmptyStyle = {
        "version": 8,
        "name": "Empty",
        "sources": {
        },
        "layers": [
        ]
    }
    const MZSVIEWCONFIG = {
        center: [120.53794466757358, 32.03061107103058],
        zoom: 12,
        pitch: 0,
        // pitch: 0,
    }

    // const map = new ScratchMap({
    const map = new mapboxgl.Map({
        accessToken: tk,
        // style: EmptyStyle,
        // style: 'mapbox://styles/mapbox/light-v11',
        style: 'mapbox://styles/mapbox/dark-v11',
        container: 'map',
        projection: 'mercator',
        antialias: true,
        maxZoom: 18,
        // minPitch: 0,
        center: MZSVIEWCONFIG.center,
        zoom: MZSVIEWCONFIG.zoom,
        pitch: MZSVIEWCONFIG.pitch,
    })

        .on('load', () => {

            // map.showTileBoundaries = true;
            // map.addLayer(new TerrainByProxyTile())
            map.addLayer(new WaterLayer())

        })
}






const parseRGB = (rgbString) => {
    const regex = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/;
    const match = rgbString.match(regex);
    if (match) {
        const [_, r, g, b] = match;
        return [parseInt(r), parseInt(g), parseInt(b)];
    } else {
        throw new Error('Invalid RGB string');
    }
}