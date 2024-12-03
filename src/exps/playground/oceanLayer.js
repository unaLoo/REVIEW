import axios from "axios";
import * as lib from '../../webglFuncs/glLib';
import 'mapbox-gl/dist/mapbox-gl.css'
import earcut from 'earcut'

import oceanCode from './shader/ocean.glsl'
// import oceanCode from './shader/ocean0.glsl'
import mapboxgl from "mapbox-gl";
import bbox from '@turf/bbox'
import { mat4, vec3, vec4 } from "gl-matrix";

export default class OceanLayer {

    id = 'oceanLayer'
    type = 'custom'
    prepared = false

    constructor(waterGeojson) {

        this.waterGeojson = waterGeojson;

    }
    /**
     * 
     * @param {mapboxgl.Map} map 
     * @param {WebGL2RenderingContext} gl 
     */
    async onAdd(map, gl) {

        this.map = map;
        let geoData = this.geoData = await this.parseMultipolygon(this.waterGeojson)
        let tr = this.map.transform
        this.oceanProgram = lib.createShaderFromCode(gl, oceanCode)
        this.oceanUniforms = {
            'scaleMatrix': {
                position: gl.getUniformLocation(this.oceanProgram, 'scaleMatrix'),
                value: null
            },
            'viewMatrix': {
                position: gl.getUniformLocation(this.oceanProgram, 'viewMatrix'),
                value: null
            },
            'projMatrix': {
                position: gl.getUniformLocation(this.oceanProgram, 'projMatrix'),
                value: null
            },
            'u_matrix': {
                position: gl.getUniformLocation(this.oceanProgram, 'u_matrix'),
                value: null
            },
            'cameraPosition': {
                position: gl.getUniformLocation(this.oceanProgram, 'cameraPosition'),
                value: tr._camera.position
            },


            'iResolution': {
                position: gl.getUniformLocation(this.oceanProgram, 'iResolution'),
                value: [map.getCanvas().clientWidth, map.getCanvas().clientHeight]
            },
            'iTime': {
                position: gl.getUniformLocation(this.oceanProgram, 'iTime'),
                value: 0
            },

        }
        let vertexVBO = lib.createVBO(gl, geoData.bbox)
        this.oceanVao = gl.createVertexArray()
        gl.bindVertexArray(this.oceanVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexVBO)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(null)



        // mask
        /*
        let data = await this.parseMultipolygon(this.waterGeojson)
        let vertexVBO = lib.createVBO(gl, data.vertexData)
        let indexIBO = lib.createIBO(gl, data.indexData)
        this.oceanBBox = data.bBox
        this.oceanIndexLength = data.indexData.length
        this.oceanIndexType = gl.UNSIGNED_SHORT
        this.oceanVao = gl.createVertexArray()
        gl.bindVertexArray(this.oceanVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexVBO)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexIBO)
        gl.bindVertexArray(null)
*/


        ////////// DEBUG ////////////
        map.on('click', e => {

            const tr = this.map.transform
            const zUnit = tr.projection.zAxisUnit === "meters" ? tr.pixelsPerMeter : 1.0;
            const worldToCamera = tr._camera.getWorldToCamera(tr.worldSize, zUnit);

            let cameraToClip
            const offset = tr.centerOffset
            const cameraToClipPerspective = tr._camera.getCameraToClipPerspective(tr._fov, tr.width / tr.height, tr._nearZ, tr._farZ)
            // Apply offset/padding
            cameraToClipPerspective[8] = -offset.x * 2 / tr.width
            cameraToClipPerspective[9] = offset.y * 2 / tr.height
            cameraToClip = cameraToClipPerspective

            const ViewMatrix = mat4.fromValues(...worldToCamera)
            const ProjMatrix = mat4.fromValues(...cameraToClip)
            const ScaleMatrix = mat4.scale(mat4.create(), mat4.create(), [tr.worldSize, tr.worldSize, tr.worldSize / zUnit])

            const cpos = tr._camera.position
            const cameraPos = vec4.fromValues(cpos[0], cpos[1], cpos[2], 1.0)
            const mercator = mapboxgl.MercatorCoordinate.fromLngLat([e.lngLat.lng, e.lngLat.lat])
            const testPointInWorld = vec4.fromValues(mercator.x, mercator.y, mercator.z, 1.0)
            let scaledTestPointInWorld = vec4.transformMat4(vec4.create(), testPointInWorld, ScaleMatrix)
            let testPointInView = vec4.transformMat4(vec4.create(), scaledTestPointInWorld, ViewMatrix)
            let testPointInClip = vec4.transformMat4(vec4.create(), testPointInView, ProjMatrix)
            let testPointInScreen = vec4.scale(vec4.create(), testPointInClip, 1.0 / testPointInClip[3])

            let ray = [testPointInWorld[0] - cpos[0], testPointInWorld[1] - cpos[1], testPointInWorld[2] - cpos[2]]
            let rayVec3 = vec3.fromValues(ray[0], ray[1], ray[2])
            vec3.normalize(rayVec3, rayVec3)

            console.log('camera pos in world space:', cameraPos)
            console.log('point in world space:', testPointInWorld)
            console.log('ray:', rayVec3)
            // console.log('point in view space:', testPointInView)
            // console.log('point in clip space:', testPointInClip)
            // console.log('point in screen space:', testPointInScreen)
        })

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
        /////// logic ///////
        const tr = this.map.transform
        // console.log(tr)
        const zUnit = tr.projection.zAxisUnit === "meters" ? tr.pixelsPerMeter : 1.0;
        const worldToCamera = tr._camera.getWorldToCamera(tr.worldSize, zUnit);

        let cameraToClip
        const offset = tr.centerOffset
        const cameraToClipPerspective = tr._camera.getCameraToClipPerspective(tr._fov, tr.width / tr.height, tr._nearZ, tr._farZ)
        // Apply offset/padding
        cameraToClipPerspective[8] = -offset.x * 2 / tr.width
        cameraToClipPerspective[9] = offset.y * 2 / tr.height
        cameraToClip = cameraToClipPerspective

        const ScaleMatrix = mat4.scale(mat4.create(), mat4.create(), [tr.worldSize, tr.worldSize, tr.worldSize / zUnit])
        const ViewMatrix = mat4.fromValues(...worldToCamera)
        const ProjMatrix = mat4.fromValues(...cameraToClip)

        this.oceanUniforms.scaleMatrix.value = ScaleMatrix
        this.oceanUniforms.viewMatrix.value = ViewMatrix
        this.oceanUniforms.projMatrix.value = ProjMatrix
        this.oceanUniforms.u_matrix.value = matrix
        this.oceanUniforms.cameraPosition.value = tr._camera.position
        this.oceanUniforms.iTime.value += 0.005


        /////// render ///////
        gl.useProgram(this.oceanProgram)
        gl.bindVertexArray(this.oceanVao)
        gl.uniformMatrix4fv(this.oceanUniforms.scaleMatrix.position, false, this.oceanUniforms.scaleMatrix.value)
        gl.uniformMatrix4fv(this.oceanUniforms.viewMatrix.position, false, this.oceanUniforms.viewMatrix.value)
        gl.uniformMatrix4fv(this.oceanUniforms.projMatrix.position, false, this.oceanUniforms.projMatrix.value)
        gl.uniformMatrix4fv(this.oceanUniforms.u_matrix.position, false, this.oceanUniforms.u_matrix.value)

        gl.uniform3fv(this.oceanUniforms.cameraPosition.position, this.oceanUniforms.cameraPosition.value)
        gl.uniform2fv(this.oceanUniforms.iResolution.position, this.oceanUniforms.iResolution.value)
        gl.uniform1f(this.oceanUniforms.iTime.position, this.oceanUniforms.iTime.value)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4, 0)

    }

    async parseMultipolygon(geojsonURL) {
        const geojson = (await axios.get(geojsonURL)).data
        let coordinate = geojson.features[0].geometry.coordinates[0]
        var data = earcut.flatten(coordinate)
        var triangle = earcut(data.vertices, data.holes, data.dimensions)
        coordinate = data.vertices.flat()
        let theBBOX = getGeoBBOX(geojson)
        return {
            vertexData: coordinate,
            indexData: triangle,
            bbox: theBBOX
        }
    }

}

function getGeoBBOX(geojson) {
    const _bbox = bbox(geojson)
    const lb = [_bbox[0], _bbox[1]]
    const rb = [_bbox[2], _bbox[1]]
    const lt = [_bbox[0], _bbox[3]]
    const rt = [_bbox[2], _bbox[3]]
    return [lb, rb, lt, rt].flat()
}