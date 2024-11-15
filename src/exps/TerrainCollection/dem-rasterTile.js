



export default class DEMbyRasterTile {

    id = "lv"
    type = "custom"
    renderingMode = '3d'
    proxySourceID = 'pxy-source'
    proxyLayerID = 'pxy-layer'
    exaggeration = 30
    elevationRange = [-81, 10]
    contourInterval = 6


    constructor() {

    }
    onAdd(map, gl) {

        this.map = map;
        this.initProxy(map);
        this.proxySouceCache = map.style.getOwnSourceCache(this.proxySourceID);


        this.grid = this.createGrid(8192, 128 + 1);
        this.program1 = createProgramFromSource2(gl, sourceCode1);

        this.posBuffer = createVBO(gl, this.grid.vertices);
        this.idxBuffer = createIBO(gl, this.grid.indices);

        this.vao4HeightTexture = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
        gl.bindVertexArray(null);

        this.screenHeightTexture = createCanvasSizeTexture(gl, 'R32F')
        this.screenFbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.screenFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.screenHeightTexture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);


        ////////////// 2 Contour //////////////
        this.program2 = createProgramFromSource2(gl, sourceCode2);

        // no buffer 



        // this.move = this.move.bind(this);
        // map.on('move', e => {
        //     this.move()
        // })
    }

    render(gl, matrix) {
        const projMatrix = this.updateProjectionMat.call(this.map.transform)

        /////////////// 1. render height texture //////////////

        gl.useProgram(this.program1)
        gl.bindVertexArray(this.vao4HeightTexture)
        gl.disable(gl.DEPTH_TEST)

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.screenFbo)

        const tiles = this.getTiles(this.proxySouceCache)
        tiles.forEach(tile => {

            let posMatrix = this.map.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), this.map.transform.worldSize);
            let tileMPMatrix = mat4.multiply([], projMatrix, posMatrix);

            gl.uniform1f(gl.getUniformLocation(this.program1, 'u_mapZoom'), this.map.transform.zoom)
            gl.uniform1f(gl.getUniformLocation(this.program1, 'u_exaggeration'), this.config.exaggeration)
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program1, 'u_matrix'), false, tileMPMatrix)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tile.demTexture.texture);

            gl.drawElements(gl.TRIANGLES, this.grid.indices.length, gl.UNSIGNED_SHORT, 0);

        })

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)







    }
    initProxy(map) {
        map.addSource(this.proxySourceID,
            {
                type: 'raster',
                tiles: [
                    '/TTB/v0/terrain-rgb/{z}/{x}/{y}.png'
                ],
                maxZoom: 14
            }
        )
        map.addLayer(
            {
                id: this.proxyLayerID,
                type: 'raster',
                source: this.proxySourceID,
                paint: {
                    'raster-opacity': 0.1,
                }
            }
        )
    }
    getTiles(sourceCache) {
        let tileIDs = []
        let tiles = []
        let tileCoords = []
        if (!!sourceCache) {
            let demTiles = this.map.painter.terrain.visibleDemTiles
            tiles = demTiles
        }

        return this.tileFilter(tiles)
    }
    createGrid(TILE_EXTENT, count) {

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



}