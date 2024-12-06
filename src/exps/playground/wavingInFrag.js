import * as lib from '../../webglFuncs/glLib';

import originCode from './shader/waveOrigin.glsl'
import wavingCode from './shader/waving.glsl'
export async function main() {

    ///// functions /////

    // let iTime = 0
    // let iResolution = [canvas.width, canvas.height]
    // let iMouse = [0, 0]
    let iTime, iResolution, iMouse;
    let canvas, gl, program;


    const mouseMoveHandler = (e) => {
        // iMouse = [e.clientX, e.clientY]
        // tickRender()
    }
    const resizeHandler = (e) => {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        iResolution = [canvas.width, canvas.height];
        gl.viewport(0, 0, canvas.width, canvas.height);
        // tickRender()

    }
    const tickRender = () => {
        iTime += 0.02;
        gl.uniform1f(gl.getUniformLocation(program, 'iTime'), iTime);
        gl.uniform2fv(gl.getUniformLocation(program, 'iMouse'), iMouse);
        gl.uniform2fv(gl.getUniformLocation(program, 'iResolution'), iResolution);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(tickRender);

    }





    canvas = document.querySelector('#playground');
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    gl = canvas.getContext('webgl2');
    lib.enableAllExtensions(gl)

    program = lib.createShaderFromCode(gl, wavingCode);
    // program = lib.createShaderFromCode(gl, originCode);
    gl.useProgram(program);

    // INITALIZE VALUES
    iResolution = [canvas.width, canvas.height];
    iTime = 0;
    iMouse = [0, 0];

    canvas.addEventListener('mousemove', mouseMoveHandler)
    window.addEventListener('resize', resizeHandler)

    tickRender()
}



function createGrid(count) {
    // no skirt

    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

    const EXTENT = 8192;
    const size = count + 2;

    // Around the grid, add one more row/column padding for "skirt".
    let vertices = [];
    let indices = [];
    let linesIndices = [];

    const step = EXTENT / (count - 1);
    const gridBound = EXTENT + step / 2;
    const bound = gridBound + step;

    for (let y = -step; y < bound; y += step) {
        for (let x = -step; x < bound; x += step) {

            if (x < 0 || x > gridBound || y < 0 || y > gridBound)
                continue;

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