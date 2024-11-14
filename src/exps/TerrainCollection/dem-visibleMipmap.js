import { mat4 } from "gl-matrix"
import { createShaderFromCode, createTexture2D, loadImage, createFrameBuffer, createRenderBuffer, enableAllExtensions, createVBO, createIBO, createCustomMipmapTexture2D, createFboPoolforMipmapTexture, calculateMipmapLevels } from "./glLib"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MercatorCoordinate } from 'mapbox-gl';
import earcut from 'earcut'
import axios from "axios"
import tilebelt from "tilebelt";

import maskCode from './shader/dem-visibleMipmap/mask.glsl'
import mipmap4DEMCode from './shader/dem-visibleMipmap/mipmap4DEM.glsl'
import mipmap4HSCode from './shader/dem-visibleMipmap/mipmap4HS.glsl'
import terrainHillShadeCode from './shader/dem-visibleMipmap/terrainHillShade.glsl'
import terrainMeshCode from './shader/dem-visibleMipmap/terrainMesh.glsl'
import terrainLayerCode from './shader/dem-visibleMipmap/terrainLayer.glsl'
import debugCode from './shader/dem-visibleMipmap/debug.glsl'
import heightHillshadeCode from './shader/dem-visibleMipmap/heighthillshade.glsl'

export default class TerrainByDEMmipmap {

    constructor() {

        this.id = 'test'
        this.type = 'custom'
        this.renderingMode = '3d'
        this.frame = 0.0

        this.proxyLayerID = 'pxy-layer'
        this.proxySourceID = 'pxy-source'

        this.maskURL = '/mask/CJ.geojson'

        this.vao = null
        this.isReady = false

        this.canvasWidth = 0
        this.canvasHeight = 0

        this.withContour = 1.0
        this.color = [0.0, 0.0, 0.0]
        this.elevationRange = [-66.513999999999996, 4.3745000000000003]

        this.meshes = []
        this.modelConfig = {
            lightPosition: [2, 4, 3],
            modelScale: 0.000005,
            modelPos: [120.53794466757358, 32.03551107103058],
        }
        this.modelConfig.mercatorPos = MercatorCoordinate.fromLngLat(this.modelConfig.modelPos, 0)

        // for mipmap
        this.DEMindexPool = []
        this.level = 0
    }

    /**
     * @param {WebGL2RenderingContext} gl 
     */
    async onAdd(map, gl) {

        this.initProxy(map)
        enableAllExtensions(gl)

        this.map = map
        this.gl = gl
        this.proxySouceCache = map.style.getOwnSourceCache(this.proxySourceID)

        this.canvasWidth = gl.canvas.width
        this.canvasHeight = gl.canvas.height

        // Load shaders
        this.program = await createShaderFromCode(gl, terrainMeshCode)
        this.maskProgram = await createShaderFromCode(gl, maskCode)
        this.showProgram = await createShaderFromCode(gl, terrainLayerCode)
        // this.modelProgram = await createShaderFromCode(gl, '/shaders/model.glsl')
        this.mmDEMProgram = await createShaderFromCode(gl, mipmap4DEMCode)
        this.mmHSProgram = await createShaderFromCode(gl, mipmap4HSCode)
        this.hsProgram = await createShaderFromCode(gl, terrainHillShadeCode)


        this.HHSprogram = await createShaderFromCode(gl, heightHillshadeCode)




        // Load Image
        const paletteBitmap = await loadImage('/images/contourPalette1D.png')

        // Create textures
        this.layerTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.RGBA32F, gl.RGBA, gl.FLOAT)
        // this.layerDepthTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT)
        this.paletteTexture = createTexture2D(gl, paletteBitmap.width, paletteBitmap.height, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paletteBitmap, gl.LINEAR)

        this.hillShadeTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.R32F, gl.RED, gl.FLOAT)

        this.maskTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.R8, gl.RED, gl.UNSIGNED_BYTE)

        this.hsTexture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE)

        const mmSize = this.mmSize = 2048
        this.mmDEM_texture = createCustomMipmapTexture2D(gl, mmSize, mmSize, gl.R32F, gl.RED, gl.FLOAT, undefined)
        this.mmDEM_fbos = createFboPoolforMipmapTexture(gl, this.mmDEM_texture, mmSize, mmSize)
        // this.DEMindexPool = new Array(calculateMipmapLevels(mmSize, mmSize)).fill(-1)
        this.mipmapLevelCount = calculateMipmapLevels(mmSize, mmSize)

        this.mmHS_texture = createCustomMipmapTexture2D(gl, mmSize, mmSize, gl.R8, gl.RED, gl.UNSIGNED_BYTE, undefined)
        this.mmHS_fbos = createFboPoolforMipmapTexture(gl, this.mmHS_texture, mmSize, mmSize)

        this.HHS_texture = createTexture2D(gl, this.canvasWidth, this.canvasHeight, gl.RG32F, gl.RG, gl.FLOAT)

        // Prepare buffers
        this.grid = createGrid(8192, 128 + 1)
        this.idxBuffer = createIBO(gl, this.grid.indices)
        this.posBuffer = createVBO(gl, this.grid.vertices)

        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer)
        gl.bindVertexArray(null)


        this.HHSvao = gl.createVertexArray()
        gl.bindVertexArray(this.HHSvao)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer)
        gl.bindVertexArray(null)



        let { vertexData, indexData } = await parseMultipolygon(this.maskURL)
        let maskPosBuffer = createVBO(gl, vertexData)
        let maskIdxBuffer = createIBO(gl, indexData) //Uint16 --> gl.UNSIGNED_SHORT
        this.maskElements = indexData.length
        this.maskVao = gl.createVertexArray()
        gl.bindVertexArray(this.maskVao)
        gl.enableVertexAttribArray(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, maskPosBuffer)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, maskIdxBuffer)
        gl.bindVertexArray(null)


        let hsPosBuffer = this.hsPosBuffer = createVBO(gl, new Array(2 * 4).fill(0.0))
        let hsvao = this.hsvao = gl.createVertexArray()
        gl.bindVertexArray(hsvao)
        gl.enableVertexAttribArray(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, hsPosBuffer)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(null)



        // Prepare Passes
        this.layerRenderBuffer = createRenderBuffer(gl, this.canvasWidth, this.canvasHeight)
        // this.layerPass = createFrameBuffer(gl, [this.layerTexture], this.layerDepthTexture, this.layerRenderBuffer)
        this.layerPass = createFrameBuffer(gl, [this.layerTexture], null, this.layerRenderBuffer)

        this.hillShadePass = createFrameBuffer(gl, [this.hillShadeTexture], null, null)

        this.maskPass = createFrameBuffer(gl, [this.maskTexture], null, null)

        this.hsRenderBuffer = createRenderBuffer(gl, this.canvasWidth, this.canvasHeight)
        this.hsPass = createFrameBuffer(gl, [this.hsTexture], null, this.hsRenderBuffer)

        this.HHS_renderBuffer = createRenderBuffer(gl, this.canvasWidth, this.canvasHeight)
        this.HHSpass = createFrameBuffer(gl, [this.HHS_texture], null, this.HHS_renderBuffer)

        // model
        // const loader = new GLTFLoader();
        // let gltf = this.gltf = await loader.loadAsync('/gltf/wind_turbine/scene.gltf')
        // let supportMesh = gltf.scene.children[0].children[0].children[0].children[0].children[0]
        // let bladesMesh = gltf.scene.children[0].children[0].children[0].children[1].children[0]
        // bladesMesh.needRotate = true
        // this.meshes = [this.initMesh(supportMesh), this.initMesh(bladesMesh)]


        await this.initDebug()
        this.isReady = true

        window.addEventListener('keydown', e => {
            if (e.key === '0') {
                this.level = 0
                this.map.triggerRepaint()
            }
            if (e.key === '1') {
                this.level = 1
                this.map.triggerRepaint()
            }
            if (e.key === '2') {
                this.level = 2
                this.map.triggerRepaint()
            }
            if (e.key === '3') {
                this.level = 3
                this.map.triggerRepaint()
            }
            if (e.key === '4') {
                this.level = 4
                this.map.triggerRepaint()
            }
        })

    }

    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @returns 
     */
    render(gl, matrix) {
        // return;
        if (!this.isReady) {
            this.map.triggerRepaint()
            return
        }
        this.frame++;

        const terrain = this.map.painter.terrain
        // const renderableTiles = getTiles(this.proxySouceCache)
        // const sortedTiles = renderableTiles.sort((a, b) => b.tileID.canonical.z - a.tileID.canonical.z);
        const renderableTiles = terrain._visibleDemTiles
        const maxZoom = Math.max(...terrain._visibleDemTiles.map(tile => tile.tileID.canonical.z))
        const skirt = skirtHeight(this.map.transform.zoom, terrain.exaggeration(), terrain.sourceCache._source.tileSize)
        const projMatrix = updateProjMatrix.call(this.map.transform, this.elevationRange[0] * 100.0)


        // Tick Render



        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 0: generate mask texture
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskPass)
        gl.viewport(0.0, 0.0, this.canvasWidth, this.canvasHeight)
        gl.clearColor(0.0, 0.0, 0.0, 0.0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(this.maskProgram)
        gl.bindVertexArray(this.maskVao)
        gl.uniformMatrix4fv(gl.getUniformLocation(this.maskProgram, 'u_matrix'), false, matrix)
        gl.drawElements(gl.TRIANGLES, this.maskElements, gl.UNSIGNED_SHORT, 0)






        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 1: Genrate Mipmap DEM Texture
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        // clear fbos 
        for (let level = 0; level < this.mipmapLevelCount; level++) {
            const renderTargetSize = this.mmSize >> level
            gl.viewport(0, 0, renderTargetSize, renderTargetSize)
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.mmDEM_fbos[level])
            gl.clearColor(0.0, 0.0, 0.0, 0.0)
            gl.clear(gl.COLOR_BUFFER_BIT)
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        // generate mipmap
        const { renderableTileDict, zooms, minTileDict } = this.tilePrepare(renderableTiles, maxZoom)

        const blockSize = 512

        for (let zoom of zooms) {
            zoom = Number(zoom)
            const renderableTiles_zoom = renderableTileDict[zoom]
            const tileMipLevel = maxZoom - zoom
            const renderTargetSize = this.mmSize >> tileMipLevel
            const tileNumPerside = renderTargetSize / blockSize
            const blockNum = tileNumPerside ** 2
            const minTileXYZ = [minTileDict[zoom].tileID.canonical.x, minTileDict[zoom].tileID.canonical.y, minTileDict[zoom].tileID.canonical.z]

            for (const tile of renderableTiles_zoom) {

                const tileXYZ = [tile.tileID.canonical.x, tile.tileID.canonical.y, tile.tileID.canonical.z]
                const offsetXYZ = [tileXYZ[0] - minTileXYZ[0], -(tileXYZ[1] - minTileXYZ[1]), tileXYZ[2] - minTileXYZ[2]]
                const blockIndex = offsetXYZ[0] + offsetXYZ[1] * tileNumPerside

                // console.log(minTileXYZ, tileXYZ, offsetXYZ, blockIndex)
                const colIndex = blockIndex % tileNumPerside
                const rowIndex = Math.floor(blockIndex / tileNumPerside)
                const x = colIndex * blockSize
                const y = rowIndex * blockSize
                const blockPixelRange = [x, y, x + blockSize, y + blockSize]


                if (blockPixelRange[0] >= renderTargetSize || blockPixelRange[1] >= renderTargetSize || blockPixelRange[2] >= renderTargetSize || blockPixelRange[3] >= renderTargetSize) {
                    continue
                }

                console.log(minTileXYZ, tileXYZ, offsetXYZ)
                console.log(renderTargetSize, blockPixelRange)
                console.log('//////////////////////////')

                /////////////////////////////////////////////
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.mmDEM_fbos[tileMipLevel])
                gl.useProgram(this.mmDEMProgram)
                gl.viewport(0, 0, renderTargetSize, renderTargetSize)
                // gl.clearColor(9999.0, 0.0, 0.0, 0.0)
                // gl.clear(gl.COLOR_BUFFER_BIT)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, tile.demTexture.texture)
                gl.uniform1i(gl.getUniformLocation(this.mmDEMProgram, 'float_dem_texture'), 0)
                gl.uniform2fv(gl.getUniformLocation(this.mmDEMProgram, 'renderTargetSize'), [renderTargetSize, renderTargetSize])
                gl.uniform4fv(gl.getUniformLocation(this.mmDEMProgram, 'pixelRange'), blockPixelRange)
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

            }

            // break;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)









        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 2: Genrate Mipmap Hillshade Pass
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        const mmLevels = this.mipmapLevelCount
        for (let level = 0; level < mmLevels; level++) {
            const renderTargetSize = this.mmSize >> level


            gl.viewport(0, 0, renderTargetSize, renderTargetSize)
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.mmHS_fbos[level])

            gl.useProgram(this.mmHSProgram)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, this.mmDEM_texture)
            gl.uniform1i(gl.getUniformLocation(this.mmHSProgram, 'mipmapDEMtexture'), 0)
            gl.uniform1f(gl.getUniformLocation(this.mmHSProgram, 'mipmapLevel'), level)

            gl.clearColor(0.0, 0.0, 0.0, 0.0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

            // break;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)



        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 3: Render Terrain Height and Hillshade
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.HHSpass)
        gl.clearStencil(0)
        gl.clearColor(0.0, 0.5, 0.0, 0.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

        gl.disable(gl.BLEND)
        gl.depthFunc(gl.LESS)
        gl.enable(gl.DEPTH_TEST)

        gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height)
        for (let zoom of zooms) {
            zoom = Number(zoom)
            const renderableTiles_zoom = renderableTileDict[zoom]
            const tileMipLevel = maxZoom - zoom  //// IMPORTANT!!
            const renderTargetSize = this.mmSize >> tileMipLevel
            const tileNumPerside = renderTargetSize / blockSize
            const blockNum = tileNumPerside ** 2
            const minTileXYZ = [minTileDict[zoom].tileID.canonical.x, minTileDict[zoom].tileID.canonical.y, minTileDict[zoom].tileID.canonical.z]

            for (const tile of renderableTiles_zoom) {

                const posMatrix = this.map.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), this.map.transform.worldSize)
                const tileXYZ = [tile.tileID.canonical.x, tile.tileID.canonical.y, tile.tileID.canonical.z]
                const offsetXYZ = [tileXYZ[0] - minTileXYZ[0], -(tileXYZ[1] - minTileXYZ[1]), tileXYZ[2] - minTileXYZ[2]]
                const blockIndex = offsetXYZ[0] + offsetXYZ[1] * tileNumPerside

                // console.log(minTileXYZ, tileXYZ, offsetXYZ, blockIndex, tileMipLevel, tileNumPerside)

                const colIndex = blockIndex % tileNumPerside
                const rowIndex = Math.floor(blockIndex / tileNumPerside)
                const x = colIndex * blockSize
                const y = rowIndex * blockSize

                const blockPixelRange = [x, y, x + blockSize, y + blockSize] //// IMPORTANT!!
                /////////////////////////////////////////////

                if (blockPixelRange[0] >= renderTargetSize || blockPixelRange[1] >= renderTargetSize || blockPixelRange[2] >= renderTargetSize || blockPixelRange[3] >= renderTargetSize) {
                    continue
                }

                gl.useProgram(this.HHSprogram)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, this.mmDEM_texture)
                gl.uniform1i(gl.getUniformLocation(this.HHSprogram, 'mipmap_DEM_texture'), 0)
                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, this.mmHS_texture)
                gl.uniform1i(gl.getUniformLocation(this.HHSprogram, 'mipmap_HS_texture'), 1)

                gl.uniformMatrix4fv(gl.getUniformLocation(this.HHSprogram, 'u_projMatrix'), false, projMatrix)
                console.log(gl.getUniformLocation(this.HHSprogram, 'u_projMatrix'))
                gl.uniformMatrix4fv(gl.getUniformLocation(this.HHSprogram, 'u_modelMatrix'), false, posMatrix)
                gl.uniform4fv(gl.getUniformLocation(this.HHSprogram, 'pixelRange'), blockPixelRange)
                gl.uniform1f(gl.getUniformLocation(this.HHSprogram, 'mipmapLevel'), tileMipLevel)

                gl.bindVertexArray(this.HHSvao)

                gl.stencilFunc(gl.GEQUAL, tile.tileID.canonical.z, 0xFF)
                gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)

                gl.drawElements(gl.TRIANGLES, this.grid.indices.length, gl.UNSIGNED_SHORT, 0)

            }


        }





        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Pass 4: SHOW Terrain Layer
        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height)
        gl.disable(gl.DEPTH_TEST)

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        gl.useProgram(this.showProgram)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.HHS_texture)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture)

        gl.uniform1i(gl.getUniformLocation(this.showProgram, 'srcTexture'), 0)
        gl.uniform1i(gl.getUniformLocation(this.showProgram, 'paletteTexture'), 1)
        gl.uniform1i(gl.getUniformLocation(this.showProgram, 'maskTexture'), 2)

        gl.uniform2fv(gl.getUniformLocation(this.showProgram, 'e'), this.elevationRange)
        gl.uniform1f(gl.getUniformLocation(this.showProgram, 'interval'), 1.0)
        gl.uniform1f(gl.getUniformLocation(this.showProgram, 'withContour'), this.withContour)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)



        //////////////////// Debug pass: show texture binded in frame buffer
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        // this.doDebug(this.maskTexture)
        // this.doDebug(this.mmDEM_texture, true)
        // this.doDebug(this.mmHS_texture, true)
        // this.doDebug(this.HHS_texture)

    }

    initProxy(map) {
        const pxy = {
            'terrain-rgb': () => {
                map.addSource(this.proxySourceID, {
                    'type': 'raster-dem',
                    'tiles': [
                        '/TTB/v0/terrain-rgb/{z}/{x}/{y}.png'
                    ],
                    'tileSize': 512,
                    'maxzoom': 14
                });
                map.setTerrain({ 'source': this.proxySourceID, 'exaggeration': 0. });
            }
        }
        pxy['terrain-rgb']()
    }

    initMesh(mesh) {
        let gl = this.gl;
        const vertPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.attributes.position.array, gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.attributes.normal.array, gl.STATIC_DRAW);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.attributes.uv.array, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.geometry.index.array, gl.STATIC_DRAW);//uint32
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        let vao = mesh.vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuffer);
        gl.vertexAttribPointer(0, mesh.geometry.attributes.position.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(1, mesh.geometry.attributes.normal.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(2);
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.vertexAttribPointer(2, mesh.geometry.attributes.uv.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bindVertexArray(null);

        // addon
        const imageBitmap = mesh.material.map.source.data;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageBitmap.width, imageBitmap.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap);
        gl.bindTexture(gl.TEXTURE_2D, null);

        mesh.texture = texture;
        return mesh
    }

    calcMatrix(mesh, rotate = false) {
        let modelMatrix = mat4.create()
        mat4.translate(modelMatrix, modelMatrix, [this.modelConfig.mercatorPos.x, this.modelConfig.mercatorPos.y, 0])
        mat4.scale(modelMatrix, modelMatrix, [this.modelConfig.modelScale, this.modelConfig.modelScale, this.modelConfig.modelScale])
        mat4.rotateX(modelMatrix, modelMatrix, 0.5 * Math.PI)
        mat4.multiply(modelMatrix, modelMatrix, mesh.matrixWorld.elements)
        rotate && mat4.rotateZ(modelMatrix, modelMatrix, this.frame * 0.05)

        let normalMatrix = mat4.create()
        mat4.invert(normalMatrix, modelMatrix)
        mat4.transpose(normalMatrix, normalMatrix)
        return {
            modelMatrix,
            normalMatrix
        }
    }

    tilePrepare(renderableTiles, maxZoom) {
        const visible = (tiles) => tiles.map(tile => [tile.tileID.canonical.x, tile.tileID.canonical.y, tile.tileID.canonical.z])

        let _renderableTiles = sortArrayByZXY(renderableTiles.slice())
        // console.log(visible(renderableTiles))
        // console.log(visible(_renderableTiles))

        const result = {}
        _renderableTiles.forEach(tile => {
            result[tile.tileID.canonical.z] ? result[tile.tileID.canonical.z].push(tile) : result[tile.tileID.canonical.z] = [tile]
        })
        const zooms = Object.keys(result).sort((a, b) => b - a)

        const minTileDict = {}
        for (let z of zooms) {
            minTileDict[z] = result[z][0]
        }

        return {
            renderableTileDict: result,
            zooms,
            minTileDict
        }
    }


    async initDebug() {
        this.debugProgram = await createShaderFromCode(this.gl, debugCode)
    }

    // temp
    doDebug(texture, mipmap = false) {
        if (mipmap) {
            let gl = this.gl
            gl.viewport(0.0, 0.0, this.mmSize >> this.level, this.mmSize >> this.level)
            gl.useProgram(this.debugProgram)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.uniform1i(gl.getUniformLocation(this.debugProgram, 'debugTexture'), 0)
            gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'mipmap'), 1.0)
            gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'debugLevel'), this.level)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        } else {
            let gl = this.gl
            gl.clearColor(0.0, 0.0, 0.0, 0.0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height)
            gl.useProgram(this.debugProgram)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
            gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'mipmap'), 0.0)
            gl.uniform1i(gl.getUniformLocation(this.debugProgram, 'debugTexture'), 0)
            gl.uniform1i(gl.getUniformLocation(this.debugProgram, 'paletteTexture'), 1)
            gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'debugLevel'), 0)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
    }


}
//#region Helper

function updateBBoxFromTile(bbox, tile) {
    const [w, s, e, n] = tilebelt.tileToBBOX(tile)
    bbox[0] = Math.min(bbox[0], w)
    bbox[1] = Math.min(bbox[1], s)
    bbox[2] = Math.max(bbox[2], e)
    bbox[3] = Math.max(bbox[3], n)
    return bbox
}

function getTileVertices(tileXYZ) {
    const [w, s, e, n] = tilebelt.tileToBBOX(tileXYZ)
    const lb = MercatorCoordinate.fromLngLat([w, s])
    const rt = MercatorCoordinate.fromLngLat([e, n])

    return [
        lb.x, lb.y,
        rt.x, lb.y,
        lb.x, rt.y,
        rt.x, rt.y,
    ]
}

function getTiles(sourceCache) {

    let tiles = []
    let tileIDs = []
    let tileCoords = []
    if (!!sourceCache) {
        tileIDs = sourceCache.getVisibleCoordinates();
        tileIDs.map(tileID => {
            tiles.push(sourceCache.getTile(tileID))
            tileCoords.push(tileID.canonical)
        })
    }
    return tiles.filter(tile => tile.demTexture && tile.demTexture.texture)
}

function sortArrayByZXY(arr) {
    return arr.sort((tile1, tile2) => {
        const a = [tile1.tileID.canonical.x, tile1.tileID.canonical.y, tile1.tileID.canonical.z]
        const b = [tile2.tileID.canonical.x, tile2.tileID.canonical.y, tile2.tileID.canonical.z]
        if (a[2] < b[2]) {
            return 1;
        } else if (a[2] > b[2]) {
            return -1;
        } else {
            if (a[0] < b[0]) {
                return -1;
            } else if (a[0] > b[0]) {
                return 1;
            } else {
                if (a[1] < b[1]) {
                    return 1;
                } else if (a[1] > b[1]) {
                    return -1;
                } else {
                    return 0;
                }
            }
        }
    });
}

function createGrid(TILE_EXTENT, count) {

    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

    const EXTENT = TILE_EXTENT;
    const size = count + 2;

    // Around the grid, add one more row/column padding for "skirt".
    let vertices = [];
    let indices = [];
    let linesIndices = [];

    const step = EXTENT / (count - 1);
    const gridBound = EXTENT + step / 2;
    const bound = gridBound + step;

    // Skirt offset of 0x5FFF is chosen randomly to encode boolean value (skirt
    // on/off) with x position (max value EXTENT = 4096) to 16-bit signed integer.
    const skirtOffset = 24575; // 0x5FFF

    for (let y = -step; y < bound; y += step) {
        for (let x = -step; x < bound; x += step) {
            const offset = (x < 0 || x > gridBound || y < 0 || y > gridBound) ? skirtOffset : 0;
            const xi = clamp(Math.round(x), 0, EXTENT);
            const yi = clamp(Math.round(y), 0, EXTENT);
            vertices.push(xi + offset, yi);
        }
    }

    const skirtIndicesOffset = (size - 3) * (size - 3) * 2;
    const quad = (i, j) => {
        const index = j * size + i;
        indices.push(index + 1, index, index + size);
        indices.push(index + size, index + size + 1, index + 1);
    };
    for (let j = 1; j < size - 2; j++) {
        for (let i = 1; i < size - 2; i++) {
            quad(i, j);
        }
    }
    // Padding (skirt) indices:
    [0, size - 2].forEach(j => {
        for (let i = 0; i < size - 1; i++) {
            quad(i, j);
            quad(j, i);
        }
    });
    return {
        vertices,
        indices,
        skirtIndicesOffset,
        linesIndices
    }
}

function isEdgeTile(cid, renderWorldCopies) {
    const numTiles = 1 << cid.z;
    return (!renderWorldCopies && (cid.x === 0 || cid.x === numTiles - 1)) || cid.y === 0 || cid.y === numTiles - 1;
}

function skirtHeight(zoom, terrainExaggeration, tileSize) {
    // Skirt height calculation is heuristic: provided value hides
    // seams between tiles and it is not too large: 9 at zoom 22, ~20000m at zoom 0.
    if (terrainExaggeration === 0) return 0;
    const exaggerationFactor = (terrainExaggeration < 1.0 && tileSize === 514) ? 0.25 / terrainExaggeration : 1.0;
    return 6 * Math.pow(1.5, 22 - zoom) * Math.max(terrainExaggeration, 1.0) * exaggerationFactor;
}

function farthestPixelDistanceOnPlane(tr, minElevation, pixelsPerMeter) {
    // Find the distance from the center point [width/2 + offset.x, height/2 + offset.y] to the
    // center top point [width/2 + offset.x, 0] in Z units, using the law of sines.
    // 1 Z unit is equivalent to 1 horizontal px at the center of the map
    // (the distance between[width/2, height/2] and [width/2 + 1, height/2])
    const fovAboveCenter = tr.fovAboveCenter;

    // Adjust distance to MSL by the minimum possible elevation visible on screen,
    // this way the far plane is pushed further in the case of negative elevation.
    const minElevationInPixels = minElevation * pixelsPerMeter;
    const cameraToSeaLevelDistance = ((tr._camera.position[2] * tr.worldSize) - minElevationInPixels) / Math.cos(tr._pitch);
    const topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(Math.max(Math.PI / 2.0 - tr._pitch - fovAboveCenter, 0.01));

    // Calculate z distance of the farthest fragment that should be rendered.
    const furthestDistance = Math.sin(tr._pitch) * topHalfSurfaceDistance + cameraToSeaLevelDistance;
    const horizonDistance = cameraToSeaLevelDistance * (1 / tr._horizonShift);

    // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
    return Math.min(furthestDistance * 1.01, horizonDistance);
}

function updateProjMatrix(minElevation) {

    if (!this.height) return;

    const offset = this.centerOffset;
    const isGlobe = this.projection.name === 'globe';

    // Z-axis uses pixel coordinates when globe mode is enabled
    const pixelsPerMeter = this.pixelsPerMeter;

    if (this.projection.name === 'globe') {
        this._mercatorScaleRatio = mercatorZfromAltitude(1, this.center.lat) / mercatorZfromAltitude(1, GLOBE_SCALE_MATCH_LATITUDE);
    }

    const projectionT = getProjectionInterpolationT(this.projection, this.zoom, this.width, this.height, 1024);

    // 'this._pixelsPerMercatorPixel' is the ratio between pixelsPerMeter in the current projection relative to Mercator.
    // This is useful for converting e.g. camera position between pixel spaces as some logic
    // such as raycasting expects the scale to be in mercator pixels
    this._pixelsPerMercatorPixel = this.projection.pixelSpaceConversion(this.center.lat, this.worldSize, projectionT);

    this.cameraToCenterDistance = 0.5 / Math.tan(this._fov * 0.5) * this.height * this._pixelsPerMercatorPixel;

    this._updateCameraState();

    this._farZ = farthestPixelDistanceOnPlane(this, minElevation, pixelsPerMeter);

    // The larger the value of nearZ is
    // - the more depth precision is available for features (good)
    // - clipping starts appearing sooner when the camera is close to 3d features (bad)
    //
    // Smaller values worked well for mapbox-gl-js but deckgl was encountering precision issues
    // when rendering it's layers using custom layers. This value was experimentally chosen and
    // seems to solve z-fighting issues in deckgl while not clipping buildings too close to the camera.
    this._nearZ = this.height / 50;

    const zUnit = this.projection.zAxisUnit === "meters" ? pixelsPerMeter : 1.0;
    const worldToCamera = this._camera.getWorldToCamera(this.worldSize, zUnit);

    let cameraToClip;

    const cameraToClipPerspective = this._camera.getCameraToClipPerspective(this._fov, this.width / this.height, this._nearZ, this._farZ);
    // Apply offset/padding
    cameraToClipPerspective[8] = -offset.x * 2 / this.width;
    cameraToClipPerspective[9] = offset.y * 2 / this.height;

    if (this.isOrthographic) {
        const cameraToCenterDistance = 0.5 * this.height / Math.tan(this._fov / 2.0) * 1.0;

        // Calculate bounds for orthographic view
        let top = cameraToCenterDistance * Math.tan(this._fov * 0.5);
        let right = top * this.aspect;
        let left = -right;
        let bottom = -top;
        // Apply offset/padding
        right -= offset.x;
        left -= offset.x;
        top += offset.y;
        bottom += offset.y;

        cameraToClip = this._camera.getCameraToClipOrthographic(left, right, bottom, top, this._nearZ, this._farZ);

        const mixValue =
            this.pitch >= OrthographicPitchTranstionValue ? 1.0 : this.pitch / OrthographicPitchTranstionValue;
        lerpMatrix(cameraToClip, cameraToClip, cameraToClipPerspective, easeIn(mixValue));
    } else {
        cameraToClip = cameraToClipPerspective;
    }

    // @ts-expect-error - TS2345 - Argument of type 'Float64Array' is not assignable to parameter of type 'ReadonlyMat4'.
    const worldToClipPerspective = mat4.mul([], cameraToClipPerspective, worldToCamera);
    // @ts-expect-error - TS2345 - Argument of type 'Float64Array' is not assignable to parameter of type 'ReadonlyMat4'.
    let m = mat4.mul([], cameraToClip, worldToCamera);

    if (this.projection.isReprojectedInTileSpace) {
        // Projections undistort as you zoom in (shear, scale, rotate).
        // Apply the undistortion around the center of the map.
        const mc = this.locationCoordinate(this.center);
        const adjustments = mat4.identity([]);
        mat4.translate(adjustments, adjustments, [mc.x * this.worldSize, mc.y * this.worldSize, 0]);
        mat4.multiply(adjustments, adjustments, getProjectionAdjustments(this));
        mat4.translate(adjustments, adjustments, [-mc.x * this.worldSize, -mc.y * this.worldSize, 0]);
        mat4.multiply(m, m, adjustments);
        // @ts-expect-error - TS2345 - Argument of type 'number[] | Float32Array' is not assignable to parameter of type 'mat4'.
        mat4.multiply(worldToClipPerspective, worldToClipPerspective, adjustments);
        this.inverseAdjustmentMatrix = getProjectionAdjustmentInverted(this);
    } else {
        this.inverseAdjustmentMatrix = [1, 0, 0, 1];
    }

    // The mercatorMatrix can be used to transform points from mercator coordinates
    // ([0, 0] nw, [1, 1] se) to GL coordinates. / zUnit compensates for scaling done in worldToCamera.
    // @ts-expect-error - TS2322 - Type 'mat4' is not assignable to type 'number[]'. | TS2345 - Argument of type 'number[] | Float32Array' is not assignable to parameter of type 'ReadonlyMat4'.
    this.mercatorMatrix = mat4.scale([], m, [this.worldSize, this.worldSize, this.worldSize / zUnit, 1.0]);

    // this.projMatrix = m;
    return m
}

function getProjectionInterpolationT(projection, zoom, width, height, maxSize = Infinity) {
    const range = projection.range;
    if (!range) return 0;

    const size = Math.min(maxSize, Math.max(width, height));
    // The interpolation ranges are manually defined based on what makes
    // sense in a 1024px wide map. Adjust the ranges to the current size
    // of the map. The smaller the map, the earlier you can start unskewing.
    const rangeAdjustment = Math.log(size / 1024) / Math.LN2;
    const zoomA = range[0] + rangeAdjustment;
    const zoomB = range[1] + rangeAdjustment;
    const t = smoothstep(zoomA, zoomB, zoom);
    return t;
}

function smoothstep(e0, e1, x) {
    x = clamp((x - e0) / (e1 - e0), 0, 1);
    return x * x * (3 - 2 * x);
}

async function parseMultipolygon(geojsonURL) {

    const geojson = (await axios.get(geojsonURL)).data
    let coordinate = geojson.features[0].geometry.coordinates[0]
    var data = earcut.flatten(coordinate)
    var triangle = earcut(data.vertices, data.holes, data.dimensions)
    coordinate = data.vertices.flat()


    return {
        vertexData: coordinate,
        indexData: triangle,
    }
}



//#endregion