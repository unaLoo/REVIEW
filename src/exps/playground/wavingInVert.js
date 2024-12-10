import * as lib from '../../webglFuncs/glLib'
import { mat4 } from 'gl-matrix'

// import objectCode from './glsl/object.glsl?raw'
import waveInVertCode from './shader/waveInVert.glsl?raw'
export const main = async () => {

    ///////// initialize
    const canvas = document.querySelector('#playground')
    /** @type {WebGL2RenderingContext} */
    const gl = canvas.getContext('webgl2')
    lib.resizeCanvasToDisplaySize(gl.canvas)


    //////// global
    let frameCount = 0


    //////// config 
    const camera = {
        position: [0, -2, 0.9],
        target: [0, 0, 0],
        up: [0, 1, 0],
    }
    const light = {
        lightPos: [0, 10, 5],
        lightColor: [255,255,255],
    }
    const perspective = {
        fovy: 60 * Math.PI / 180,
        aspect: canvas.width / canvas.height,
        near: 0.1,
        far: 100,
    }
    // const logicInfos = {

    // }




    ///////// shader program
    const program = lib.createShaderFromCode(gl, waveInVertCode)


    ///////// vertext buffer
    const objectData = subdividePlane(6)
    console.log(objectData)
    const positionBuffer = lib.createVBO(gl, objectData.positions)
    const indexBuffer = lib.createIBO(gl, objectData.indices)
    const eleCount = objectData.indices.length

    ///////// uniforms
    const locations = {
        "u_model_mat": gl.getUniformLocation(program, "u_model_mat"),
        "u_view_mat": gl.getUniformLocation(program, "u_view_mat"),
        "u_proj_mat": gl.getUniformLocation(program, "u_proj_mat"),
        "u_light_pos": gl.getUniformLocation(program, "u_lightPos"),
        "u_light_color": gl.getUniformLocation(program, "u_light_color"),
        "u_camera_pos": gl.getUniformLocation(program, "u_camera_pos"),
        "iTime": gl.getUniformLocation(program, "iTime"),
    }
    console.log(locations)
    const modelMat = mat4.create()
    const viewMat = mat4.create()
    const projMat = mat4.create()



    /////// vao
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

    gl.bindVertexArray(null)



    const renderIt = () => {

        //////// logic
        frameCount++;
        // model mat
        // mat4.rotateX(modelMat, modelMat, Math.cos(frameCount))
        // mat4.rotateZ(modelMat, modelMat, Math.sin(frameCount))
        // mat4.rotateZ(modelMat, modelMat, Math.sin(frameCount))
        // mat4.scale(modelMat, modelMat, [0.8, 0.8, 0.8])
        // view mat 
        mat4.lookAt(viewMat, camera.position, camera.target, camera.up)
        // proj mat
        mat4.perspective(projMat, perspective.fovy, perspective.aspect, perspective.near, perspective.far)
        // mat4.ortho(projMat, -1, 1, -1, 1, -1, 100)




        //////// render
        gl.useProgram(program)

        gl.enable(gl.DEPTH_TEST)

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.bindVertexArray(vao)

        gl.uniformMatrix4fv(locations.u_model_mat, false, modelMat)
        gl.uniformMatrix4fv(locations.u_view_mat, false, viewMat)
        gl.uniformMatrix4fv(locations.u_proj_mat, false, projMat)
        gl.uniform3fv(locations.u_light_pos, light.lightPos)
        gl.uniform3fv(locations.u_camera_pos, camera.position)
        gl.uniform3fv(locations.u_light_color, light.lightColor)
        gl.uniform1f(locations.iTime, frameCount * 0.01)

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
const genOnePlane = () => {
    const positions = new Float32Array([
        -1, -1, 0,  // 左下角
        1, -1, 0,   // 右下角
        -1, 1, 0,  // 左上角
        1, 1, 0,    // 右上角
    ]);
    const normals = new Float32Array([
        0, 1, 0,  // 向上的法线
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
    const texcoords = new Float32Array([
        0, 0,   // 左下角
        1, 0,   // 右下角
        0, 1,   // 左上角
        1, 1    // 右上角
    ]);
    const indices = new Uint16Array([
        0, 1, 2, // 第一个三角形
        1, 3, 2  // 第二个三角形
    ]);

    return {
        positions, normals, texcoords, indices
    };
}

const subdividePlane = (subdivisionLevel) => {
    const size = Math.pow(2, subdivisionLevel); // 细分后将平面分成多少小块
    const positions = [];
    const indices = [];

    // 生成顶点位置
    for (let y = 0; y <= size; y++) {
        for (let x = 0; x <= size; x++) {
            positions.push(x / size * 2 - 1); // 归一化到 -1 到 1
            positions.push(y / size * 2 - 1); // 归一化到 -1 到 1
            positions.push(0); // z坐标为0
        }
    }

    // 生成索引
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const topLeft = y * (size + 1) + x;
            const topRight = topLeft + 1;
            const bottomLeft = topLeft + (size + 1);
            const bottomRight = bottomLeft + 1;

            // 第一个三角形
            indices.push(topLeft);
            indices.push(bottomLeft);
            indices.push(topRight);
            // 第二个三角形
            indices.push(topRight);
            indices.push(bottomLeft);
            indices.push(bottomRight);
        }
    }

    return {
        positions: new Float32Array(positions),
        indices: new Uint16Array(indices)
    };
}

