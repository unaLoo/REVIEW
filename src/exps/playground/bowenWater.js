import axios from "axios"
import mapboxgl from "mapbox-gl"
import { createShader, createTexture2D, loadImage, createFrameBuffer, createRenderBuffer, enableAllExtensions, createVBO, createIBO, createCustomMipmapTexture2D, createFboPoolforMipmapTexture, calculateMipmapLevels, createShaderFromCode } from "../../webglFuncs/glLib"

import testCode from './shader/test.glsl'

export class WaterLayer {

    id = 'bowen-water'
    type = 'custom'
    renderingMode = '3d'
    prepared = false

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


        this.testProgram = createShaderFromCode(gl, testCode)
        this.testVAO = gl.createVertexArray()
        gl.bindVertexArray(this.testVAO)
        this.testVBO = createVBO(gl, new Float32Array([
            [118.40770531586725, 31.015473926104463],
            [118.40770531586725, 32.73217294711945],
            [122.06874017956159, 31.015473926104463]
            [122.06874017956159, 32.73217294711945],
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
            this.map.triggerRepaint()
            return
        }
        gl.useProgram(this.testProgram)
        gl.bindVertexArray(this.testVAO)
        gl.uniformMatrix4fv(gl.getUniformLocation(this.testProgram, 'u_matrix'), false, matrix)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

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