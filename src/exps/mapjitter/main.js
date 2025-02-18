import mapboxgl from 'mapbox-gl'
import tilebelt from '@mapbox/tilebelt';
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg'

const highlightLayer = {
    id: 'customlayer',
    type: 'custom',

    onAdd: function (map, gl) {

        // const vertices = [
        //     // Front face
        //     -0.5, -0.5, 0.5,  // Bottom-left
        //     0.5, -0.5, 0.5,  // Bottom-right
        //     0.5, 0.5, 0.5,  // Top-right
        //     -0.5, 0.5, 0.5,  // Top-left

        //     // Back face
        //     -0.5, -0.5, -0.5,  // Bottom-left
        //     -0.5, 0.5, -0.5,  // Top-left
        //     0.5, 0.5, -0.5,  // Top-right
        //     0.5, -0.5, -0.5,  // Bottom-right

        //     // Left face
        //     -0.5, -0.5, -0.5,  // Bottom-front
        //     -0.5, -0.5, 0.5,  // Bottom-back
        //     -0.5, 0.5, 0.5,  // Top-back
        //     -0.5, 0.5, -0.5,  // Top-front

        //     // Right face
        //     0.5, -0.5, -0.5,  // Bottom-back
        //     0.5, -0.5, 0.5,  // Bottom-front
        //     0.5, 0.5, 0.5,  // Top-front
        //     0.5, 0.5, -0.5,  // Top-back

        //     // Top face
        //     -0.5, 0.5, -0.5,  // Top-left-back
        //     0.5, 0.5, -0.5,  // Top-right-back
        //     0.5, 0.5, 0.5,  // Top-right-front
        //     -0.5, 0.5, 0.5,  // Top-left-front

        //     // Bottom face
        //     -0.5, -0.5, -0.5,  // Bottom-left-back
        //     -0.5, -0.5, 0.5,  // Bottom-left-front
        //     0.5, -0.5, 0.5,  // Bottom-right-front
        //     0.5, -0.5, -0.5   // Bottom-right-back
        // ];
        // const indices = [
        //     // Front face
        //     0, 1, 2, 0, 2, 3,
        //     // Back face
        //     4, 5, 6, 4, 6, 7,
        //     // Left face
        //     8, 9, 10, 8, 10, 11,
        //     // Right face
        //     12, 13, 14, 12, 14, 15,
        //     // Top face
        //     16, 17, 18, 16, 18, 19,
        //     // Bottom face
        //     20, 21, 22, 20, 22, 23
        // ];

        const vertices = [
            0.0, 0.0, 0.0,
            0.0, 1.0, 0.6,
            1.0, 0.0, 1.0,
            1.0, 2.0, 1.0
        ]
        const indices = [
            0, 1, 2, 1, 2, 3
        ];
        this.idxNum = indices.length


        this.map = map
        const sourceCaches = map.style.getSourceCaches()
        if (sourceCaches.length > 0) {
            this.proxySourceCache = sourceCaches[0]
        } else {
            throw "no valid source cache"
        }
        const quadVertex = [0, 0, 0, 1, 1, 0, 1, 1]

        // const originPoint = this.originPoint = mapboxgl.MercatorCoordinate.fromLngLat({
        //     lng: 120.980697,
        //     lat: 31.684162
        // })
        const originPoint = this.originPoint = [120.980697, 31.684162]


        const marker = new mapboxgl.Marker({
            color: 'red',
            draggable: true
        }).setLngLat([120.980697, 31.684162]).addTo(map)

        // // this.cameraPos = map.painter.transform.getFreeCameraOptions().position;

        const vertexSource = `#version 300 es

        in vec3 a_pos;

        uniform vec2 base_tile_pos;
        uniform float tile_unit_per_meter;
        uniform float pixel_per_meter; // pixelsPerMeter for z
        uniform mat4 tile_matrix;

        out vec3 vv;


        void main() {

            // vec3 pos = vec3(base_tile_pos + a_pos.xy * 2000.0, a_pos.z);
            // gl_Position = tile_matrix * vec4(pos, 1.0);

            mat3 transYZ = mat3(
                vec3(1.0, 0.0, 0.0),
                vec3(0.0, 0.0, 1.0),
                vec3(0.0, 1.0, 0.0)
            );

            vec3 tile_pos = vec3(base_tile_pos, 0.0);
            
            // as model matrix
            vec3 local_vert_pos = 100.0 * transYZ * a_pos; // meter 

            vec3 vert_pos = tile_pos + vec3(local_vert_pos * vec3(tile_unit_per_meter, tile_unit_per_meter, 1.0));

            gl_Position = tile_matrix * vec4(vert_pos, 1.0);

            vv = transYZ * local_vert_pos;
        }`;

        const fragmentSource = `#version 300 es
        precision highp float;

        in vec3 vv;
        out vec4 outColor;

        void main() {
            outColor = vec4(vv / 100.0, 0.8);
        }
        `;


        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        this.aPos = gl.getAttribLocation(this.program, 'a_pos');

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(vertices),
            gl.STATIC_DRAW
        );
        this.idxBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices),
            gl.STATIC_DRAW
        );
    },

    render: function (gl, matrix) {
        console.log(this.proxySourceCache.getVisibleCoordinates().map(coord => coord.canonical.toString()))

        let currentTileMaxZoom = 0
        for (const coord of this.proxySourceCache.getVisibleCoordinates()) {
            if (coord.canonical.z > currentTileMaxZoom) currentTileMaxZoom = coord.canonical.z
        }

        if (this.proxySourceCache.getVisibleCoordinates().length == 0) return
        console.log('1')

        const targetTile = point2tile(this.originPoint[0], this.originPoint[1], currentTileMaxZoom, this.proxySourceCache)
        console.log('2')

        if (!targetTile) return
        console.log('3')
        const originInTileCoord = lnglat2TileCoord(this.originPoint, targetTile)

        const tileMatrix = targetTile.expandedProjMatrix

        const meterPerTileUnit = tileToMeter(targetTile.canonical, originInTileCoord[1])
        const tileUnitPerMeter = 1.0 / meterPerTileUnit

        const metersPerPixel = getMetersPerPixelAtLatitude(this.map.transform.center.lat, this.map.transform.zoom);
        const pixelsPerMeter = 1.0 / metersPerPixel;


        gl.useProgram(this.program);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'tile_matrix'), false, tileMatrix);
        gl.uniform2fv(gl.getUniformLocation(this.program, 'base_tile_pos'), originInTileCoord);
        gl.uniform1f(gl.getUniformLocation(this.program, 'tile_unit_per_meter'), tileUnitPerMeter);
        gl.uniform1f(gl.getUniformLocation(this.program, 'pixel_per_meter'), pixelsPerMeter);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.aPos);
        gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.drawElements(gl.TRIANGLES, this.idxNum, gl.UNSIGNED_SHORT, 0);
    }
};

export const initMap = () => {
    const map = new mapboxgl.Map({
        center: [120.980697, 31.684162], // [ 120.556596, 32.042607 ], //[ 120.53525158459905, 31.94879239156117 ], // 120.980697, 31.684162
        projection: 'mercator',
        container: 'map',
        antialias: true,
        zoom: 16, //10.496958973488436, // 16
        style: "mapbox://styles/mapbox/light-v11"

    }).on('load', () => {
        map.showTileBoundaries = true
        // console.log(map.style.getSourceCaches())
        map.addLayer(highlightLayer)


        map.on('click', e => {
            console.log(e.lngLat.toArray())
        })

    })
}

// // Helpers //////////////////////////////////////////////////////////////////////////////////////////////////////

function point2tile(lng, lat, zoom, sourceCache) {

    const tiles = sourceCache.getVisibleCoordinates()
    const targetTileXYZ = tilebelt.pointToTile(lng, lat, Math.floor(zoom))
    const targetTile = tiles.find(tile => {
        return tile.canonical.x == targetTileXYZ[0] && tile.canonical.y == targetTileXYZ[1] && tile.canonical.z == targetTileXYZ[2]
    })
    return targetTile
}

function lnglat2TileCoord([lng, lat], tile) {
    const EXTENT = 8192;
    const tileXYZ = [tile.canonical.x, tile.canonical.y, tile.canonical.z]
    const tileBBox = tilebelt.tileToBBOX(tileXYZ)

    const XY = [
        Math.floor((lng - tileBBox[0]) / (tileBBox[2] - tileBBox[0]) * EXTENT),
        Math.floor((1.0 - (lat - tileBBox[1]) / (tileBBox[3] - tileBBox[1])) * EXTENT)
    ]

    return XY
}


function tileToMeter(canonical, tileYCoordinate = 0) {
    let ycoord
    if (canonical.z > 10) {
        ycoord = 0
    } else {
        ycoord = tileYCoordinate
    }

    const EXTENT = 8192;
    const circumferenceAtEquator = 40075017;
    const mercatorY = (canonical.y + ycoord / EXTENT) / (1 << canonical.z);
    const exp = Math.exp(Math.PI * (1 - 2 * mercatorY));
    // simplify cos(2 * atan(e) - PI/2) from mercator_coordinate.js, remove trigonometrics.
    return circumferenceAtEquator * 2 * exp / (exp * exp + 1) / EXTENT / (1 << canonical.z);
}

function getMetersPerPixelAtLatitude(lat, zoom) {
    const DEFAULT_MIN_ZOOM = 0;
    const DEFAULT_MAX_ZOOM = 25.5;
    const earthRadius = 6371008.8;
    const earthCircumference = 2 * Math.PI * earthRadius;
    const constrainedZoom = clamp(zoom, DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM);
    const constrainedScale = Math.pow(2.0, constrainedZoom);
    return getLatitudeScale(lat) * earthCircumference / (constrainedScale * 512.0);
}

function getLatitudeScale(lat) {
    function degToRad(a) {
        return a * Math.PI / 180;
    }

    const MAX_MERCATOR_LATITUDE = 85.051129;
    return Math.cos(degToRad(clamp(lat, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE)));
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}
// function encodeFloatToDouble(value) {

//     const result = new Float32Array(2);
//     result[0] = value;

//     const delta = value - result[0];
//     result[1] = delta;
//     return result;
// }

// function drawVectorLayerModels(painter, source, layer, coords, scope) {
//     console.log("draw vectror layer models");
//     const tr = painter.transform;

//     const mercCameraPos = tr.getFreeCameraOptions().position;
//     if (!painter.modelManager) return;
//     const modelManager = painter.modelManager;
//     layer.modelManager = modelManager;
//     const shadowRenderer = painter.shadowRenderer;

//     if (!layer._unevaluatedLayout._values.hasOwnProperty('model-id')) { return; }

//     const modelIdUnevaluatedProperty = layer._unevaluatedLayout._values['model-id'];

//     const evaluationParameters = Object.assign({}, layer.layout.get("model-id").parameters);

//     const layerIndex = painter.style.order.indexOf(layer.fqid);

//     for (const coord of coords) {
//         const tile = source.getTile(coord);
//         const bucket = tile.getBucket(layer) as ModelBucket | null | undefined;
//         if (!bucket || bucket.projection.name !== tr.projection.name) continue;
//         const modelUris = bucket.getModelUris();
//         if (modelUris && !bucket.modelsRequested) {
//             // geojson models are always set in the root scope to avoid model duplication
//             modelManager.addModelsFromBucket(modelUris, scope);
//             bucket.modelsRequested = true;
//         }

//         const tileZoom = calculateTileZoom(coord, tr);
//         evaluationParameters.zoom = tileZoom;
//         const modelIdProperty = modelIdUnevaluatedProperty.possiblyEvaluate(evaluationParameters);
//         updateModelBucketData(painter, bucket, coord);

//         renderData.shadowUniformsInitialized = false;
//         renderData.useSingleShadowCascade = !!shadowRenderer && shadowRenderer.getMaxCascadeForTile(coord.toUnwrapped()) === 0;
//         if (painter.renderPass === 'shadow' && shadowRenderer) {
//             if (painter.currentShadowCascade === 1 && bucket.isInsideFirstShadowMapFrustum) continue;

//             const tileMatrix = tr.calculatePosMatrix(coord.toUnwrapped(), tr.worldSize);
//             renderData.tileMatrix.set(tileMatrix);
//             renderData.shadowTileMatrix = Float32Array.from(shadowRenderer.calculateShadowPassMatrixFromMatrix(tileMatrix));
//             renderData.aabb.min.fill(0);
//             renderData.aabb.max[0] = renderData.aabb.max[1] = EXTENT;
//             renderData.aabb.max[2] = 0;
//             if (calculateTileShadowPassCulling(bucket, renderData, painter, layer.scope)) continue;
//         }

//         // camera position in the tile coordinates
//         const tiles = 1 << coord.canonical.z;
//         const cameraPos: [number, number, number] = [
//             ((mercCameraPos.x - coord.wrap) * tiles - coord.canonical.x) * EXTENT,
//             (mercCameraPos.y * tiles - coord.canonical.y) * EXTENT,
//             mercCameraPos.z * tiles * EXTENT
//         ];

//         const clippable = painter.conflationActive && Object.keys(bucket.instancesPerModel).length > 0 && painter.style.isLayerClipped(layer, source.getSource());
//         if (clippable) {
//             if (bucket.updateReplacement(coord, painter.replacementSource, layerIndex, scope)) {
//                 bucket.uploaded = false;
//                 bucket.upload(painter.context);
//             }
//         }

//         for (let modelId in bucket.instancesPerModel) {
//             // From effective tile zoom (distance to camera) and calculate model to use.
//             const modelInstances = bucket.instancesPerModel[modelId];
//             if (modelInstances.features.length > 0) {
//                 // @ts-expect-error - TS2339 - Property 'evaluate' does not exist on type 'unknown'.
//                 modelId = modelIdProperty.evaluate(modelInstances.features[0].feature, {});
//             }

//             const model = modelManager.getModel(modelId, scope);
//             if (!model || !model.uploaded) continue;

//             for (const node of model.nodes) {
//                 drawInstancedNode(painter, layer, node, modelInstances, cameraPos, coord, renderData);
//             }
//         }
//     }
// }

// function calculateTileZoom(id, tr) {
//     const tiles = 1 << id.canonical.z;
//     const cameraPos = tr.getFreeCameraOptions().position;
//     const elevation = tr.elevation;

//     // Compute tile zoom from the distance between the camera and
//     // the closest point on either tile's bottom plane or on a plane
//     // elevated to center altitude, whichever is higher. Using center altitude
//     // allows us to compensate tall tiles that have high variance in
//     // instance placement on z-axis.
//     const minx = id.canonical.x / tiles;
//     const maxx = (id.canonical.x + 1) / tiles;
//     const miny = id.canonical.y / tiles;
//     const maxy = (id.canonical.y + 1) / tiles;
//     let height = tr._centerAltitude;

//     if (elevation) {
//         const minmax = elevation.getMinMaxForTile(id);

//         if (minmax && minmax.max > height) {
//             height = minmax.max;
//         }
//     }

//     const distx = clamp(cameraPos.x, minx, maxx) - cameraPos.x;
//     const disty = clamp(cameraPos.y, miny, maxy) - cameraPos.y;
//     const distz = mercatorZfromAltitude(height, tr.center.lat) - cameraPos.z;

//     return tr._zoomFromMercatorZ(Math.sqrt(distx * distx + disty * disty + distz * distz));
// }



// const reproject = (p) => {
//     const lng = lngFromMercatorX((canonical.x + p.x / extent) / z2);
//     const lat = latFromMercatorY((canonical.y + p.y / extent) / z2);
//     const p2 = projection.project(lng, lat);
//     p.x = (p2.x * scale - x) * extent;
//     p.y = (p2.y * scale - y) * extent;
// };


// // Element 3: tileUnitsToMeter conversion.
// va[offset + 3] = 1.0 / (canonical.z > constantTileToMeterAcrossTile ? this.tileToMeter : tileToMeter(canonical, pointY));