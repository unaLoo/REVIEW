import * as lib from '../webglFuncs/glLib'
import { mat4 } from 'gl-matrix'

import objectCode from './glsl/object.glsl?raw'
export const main = async () => {

    ///////// initialize
    const canvas = document.querySelector('#playground')
    /** @type {WebGL2RenderingContext} */
    const gl = canvas.getContext('webgl2')
    lib.resizeCanvasToDisplaySize(gl)


    //////// global
    let frameCount = 0


    //////// config 
    const camera = {
        position: [0, 0, 20],
        target: [0, 0, 0],
        up: [0, 1, 0],
    }
    const light = {
        lightPos: [0, 10, 5],
        lightColor: [0, 255, 0],
    }
    const perspective = {
        fovy: 45 * Math.PI / 180,
        aspect: canvas.width / canvas.height,
        near: 0.1,
        far: 100,
    }




    ///////// shader program
    const program = lib.createShaderFromCode(gl, objectCode)


    ///////// vertext buffer
    const objectData = genOneCube()
    const positionBuffer = lib.createVBO(gl, objectData.positions)
    const normalBuffer = lib.createVBO(gl, objectData.normals)
    const uvBuffer = lib.createVBO(gl, objectData.texcoords)
    const indexBuffer = lib.createIBO(gl, objectData.indices)
    const eleCount = objectData.indices.length

    ///////// uniforms
    const locations = {
        "u_model_mat": gl.getUniformLocation(program, "u_model_mat"),
        "u_view_mat": gl.getUniformLocation(program, "u_view_mat"),
        "u_proj_mat": gl.getUniformLocation(program, "u_proj_mat"),
        "u_texture": gl.getUniformLocation(program, "u_texture"),
        "u_light_pos": gl.getUniformLocation(program, "u_lightPos"),
        "u_light_color": gl.getUniformLocation(program, "u_light_color"),
        "u_camera_pos": gl.getUniformLocation(program, "u_camera_pos")
    }
    console.log(locations)
    const modelMat = mat4.create()
    const viewMat = mat4.create()
    const projMat = mat4.create()



    //////// texture
    const textureURL = '/images/Earth/earth.jpg'
    const imageBitmap = await lib.loadImage(textureURL)
    const texture = lib.createTexture2D(gl, imageBitmap.width, imageBitmap.height, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap)


    /////// vao
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

    gl.bindVertexArray(null)



    const renderIt = () => {

        //////// logic
        frameCount++;
        // model mat
        mat4.rotateX(modelMat, modelMat, Math.cos(frameCount))
        mat4.rotateZ(modelMat, modelMat, Math.sin(frameCount))
        // view mat 
        mat4.lookAt(viewMat, camera.position, camera.target, camera.up)
        // proj mat
        mat4.perspective(projMat, perspective.fovy, perspective.aspect, perspective.near, perspective.far)




        //////// render
        gl.useProgram(program)

        gl.bindVertexArray(vao)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE0, texture)
        gl.uniform1i(locations.u_texture, 0)
        gl.uniformMatrix4fv(locations.u_model_mat, false, modelMat)
        gl.uniformMatrix4fv(locations.u_view_mat, false, viewMat)
        gl.uniformMatrix4fv(locations.u_proj_mat, false, projMat)
        gl.uniform3fv(locations.u_light_pos, light.position)
        gl.uniform3fv(locations.u_light_color, light.color)
        gl.uniform3fv(locations.u_camera_pos, camera.position)

        gl.drawElements(gl.TRIANGLES, eleCount, gl.UNSIGNED_SHORT, 0)






        // requestAnimationFrame(renderIt)
    }

    renderIt()




}





const genOneCube = () => {
    const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
    const normals = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
    const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);
    return {
        positions, normals, texcoords, indices
    }
}

