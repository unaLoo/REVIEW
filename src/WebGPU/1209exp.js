import * as lib from '../webglFuncs/glLib'
import { mat4 } from 'gl-matrix'

import backgroundCode from './glsl/background.glsl?raw'
import objectCode from './glsl/object.glsl?raw'
export const main = async () => {

    ///////// initialize
    const canvas = document.querySelector('#playground')
    /** @type {WebGL2RenderingContext} */
    const gl = canvas.getContext('webgl2')
    lib.resizeCanvasToDisplaySize(canvas)


    //////// global
    let frameCount = 0
    const deg2rad = Math.PI / 180

    //////// config 
    const camera = {
        position: [0, 0, 4],
        target: [0, 0, 0],
        up: [0, 1, 0],
    }
    const light = {
        lightPos: [20, 10, 15],
        lightColor: [255, 255, 255],
    }
    const perspective = {
        fovy: 45 * Math.PI / 180,
        aspect: canvas.width / canvas.height,
        near: 0.1,
        far: 100,
    }


    ///////// shader program
    const program = lib.createShaderFromCode(gl, objectCode)
    const backProgram = lib.createShaderFromCode(gl, backgroundCode)


    ///////// vertext buffer
    // const objectData = genOneCube()
    const objectData = genOneBall(100, 100, 1)
    const positionBuffer = lib.createVBO(gl, objectData.positions)
    const normalBuffer = lib.createVBO(gl, objectData.normals)
    const uvBuffer = lib.createVBO(gl, objectData.texcoords)
    const indexBuffer = lib.createIBO(gl, objectData.indices)
    const eleCount = objectData.indices.length


    /////// vao
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(gl.getAttribLocation(program, "a_position"))
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bindVertexArray(null)




    //////// texture
    const textureURL = '/images/Earth/earth.jpg'
    const imageBitmap = await lib.loadImage(textureURL)
    const texture = lib.createTexture2D(gl, imageBitmap.width, imageBitmap.height, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap)

    const backTextureUrl = '/images/nightSky.jpg'
    const backImageBitmap = await lib.loadImage(backTextureUrl)
    const backTexture = lib.createTexture2D(gl, backImageBitmap.width, backImageBitmap.height, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backImageBitmap)


    ///////// uniforms
    const locations = {
        "u_model_mat": gl.getUniformLocation(program, "u_model_mat"),
        "u_view_mat": gl.getUniformLocation(program, "u_view_mat"),
        "u_proj_mat": gl.getUniformLocation(program, "u_proj_mat"),
        "u_texture": gl.getUniformLocation(program, "u_texture"),
        "u_light_pos": gl.getUniformLocation(program, "u_lightPos"),
        "u_light_color": gl.getUniformLocation(program, "u_light_color"),
        "u_camera_pos": gl.getUniformLocation(program, "u_camera_pos"),

    }
    const modelMat = mat4.create()
    const viewMat = mat4.create()
    const projMat = mat4.create()



    const renderIt = () => {

        /////////////////////////////////////////////////////////////////////
        ////////////////////////////// logic //////////////////////////////// 
        /////////////////////////////////////////////////////////////////////
        frameCount++;
        const zRotate = Math.sin(frameCount * deg2rad) * 0.001
        // model mat
        mat4.rotateZ(modelMat, modelMat, -zRotate)
        mat4.rotateY(modelMat, modelMat, 0.01)
        // view mat 
        mat4.lookAt(viewMat, camera.position, camera.target, camera.up)
        // proj mat
        mat4.perspective(projMat, perspective.fovy, perspective.aspect, perspective.near, perspective.far)



        //////////////////////////////////////////////////////////////////////
        ////////////////////////////// render //////////////////////////////// 
        //////////////////////////////////////////////////////////////////////
        ////////
        // pass 1 -- render the background
        ////////
        gl.viewport(0, 0, canvas.width, canvas.height)

        gl.useProgram(backProgram)
        gl.clearColor(0.0, 0.0, 0.0, 0.0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, backTexture)
        gl.uniform1i(gl.getUniformLocation(backProgram, "u_texture"), 0)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)


        ////////
        // pass 2 -- render the earth
        ////////
        gl.useProgram(program)

        gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LESS)

        gl.bindVertexArray(vao)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(locations.u_texture, 0)
        gl.uniformMatrix4fv(locations.u_model_mat, false, modelMat)
        gl.uniformMatrix4fv(locations.u_view_mat, false, viewMat)
        gl.uniformMatrix4fv(locations.u_proj_mat, false, projMat)
        gl.uniform3fv(locations.u_light_pos, light.lightPos)
        gl.uniform3fv(locations.u_light_color, light.lightColor)
        gl.uniform3fv(locations.u_camera_pos, camera.position)

        gl.drawElements(gl.TRIANGLES, eleCount, gl.UNSIGNED_SHORT, 0)

        requestAnimationFrame(renderIt)
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

export const genOneBall = (numLatitudeBands, numLongitudeBands, radius) => {
    // 顶点数组
    const positions = [];
    // 法向量数组
    const normals = [];
    // 纹理坐标数组
    const texcoords = [];
    // 索引数组
    const indices = [];

    // 生成顶点、法向量和纹理坐标
    for (let latNumber = 0; latNumber <= numLatitudeBands; latNumber++) {
        const theta = latNumber * Math.PI / numLatitudeBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let longNumber = 0; longNumber <= numLongitudeBands; longNumber++) {
            const phi = longNumber * 2 * Math.PI / numLongitudeBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            const u = 1 - (longNumber / numLongitudeBands);
            const v = 1 - (latNumber / numLatitudeBands);

            positions.push(radius * x);
            positions.push(radius * y);
            positions.push(radius * z);

            normals.push(x);
            normals.push(y);
            normals.push(z);

            texcoords.push(u);
            texcoords.push(v);
        }
    }

    // 生成索引
    for (let latNumber = 0; latNumber < numLatitudeBands; latNumber++) {
        for (let longNumber = 0; longNumber < numLongitudeBands; longNumber++) {
            const first = (latNumber * (numLongitudeBands + 1)) + longNumber;
            const second = first + numLongitudeBands + 1;

            indices.push(first);
            indices.push(second);
            indices.push(first + 1);

            indices.push(second);
            indices.push(second + 1);
            indices.push(first + 1);
        }
    }
    const positionsArray = new Float32Array(positions);
    const normalsArray = new Float32Array(normals);
    const texcoordsArray = new Float32Array(texcoords);
    const indicesArray = new Uint16Array(indices);
    return {
        positions: positionsArray,
        normals: normalsArray,
        texcoords: texcoordsArray,
        indices: indicesArray
    }
}