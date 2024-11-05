import * as lib from '../../webglFuncs/glLib';

export function main() {
  const gl = document.querySelector('#playground').getContext('webgl2');


  const vs = `#version 300 es
    void main() {
      // center of screen
      gl_Position = vec4(0, 0, 0, 1);
      gl_PointSize = 10.0;
    }
    `;
  const fsColor = `#version 300 es
    precision mediump float;

    uniform vec4 color;
    out vec4 outColor;
    void main() {
      outColor = color;
    }
    `;
  const fsTexture = `#version 300 es
    precision mediump float;
    uniform sampler2D tex;
    out vec4 outColor;
    void main() {
      // use gl_PoitnCoord provided by rendering a point with gl.POINTS
      // bias lets select the mip level so no need for 
      // some fancier shader just to show that it's working.        
      float bias = gl_PointCoord.x * 4.0;
      outColor = texture(tex, gl_PointCoord.xy, bias);
    }
    `;

  // compile shaders, link into programs, look up attrib/uniform locations
  // const colorProgramInfo = twgl.createProgramInfo(gl, [vs, fsColor]);
  // const textureProgramInfo = twgl.createProgramInfo(gl, [vs, fsTexture]);
  const colorProgram = lib.createProgramFromSource(gl, vs, fsColor);
  const textureProgram = lib.createProgramFromSource(gl, vs, fsTexture);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const levels = 4;
  const width = 8;
  const height = 8;
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, width, height);

  // make a framebuffer for each mip level
  const fbs = [];
  for (let level = 0; level < levels; ++level) {
    const fb = gl.createFramebuffer();
    fbs.push(fb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, tex, level);
  }


  // render a different color to each level
  const colors = [
    [1, 0, 0, 1],  // red
    [0, 1, 0, 1],  // green
    [0, 0, 1, 1],  // blue
    [1, 1, 0, 1],  // yellow
  ];
  gl.useProgram(colorProgram);
  for (let level = 0; level < levels; ++level) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbs[level]);
    // same as size = width / pow(2, level)
    const size = width >> level;
    gl.viewport(0, 0, size, size);// notice !!!
    gl.uniform4fv(gl.getUniformLocation(colorProgram, 'color'), colors[level]);
    gl.drawArrays(gl.POINTS, 0, 1);  // draw 1 point
  }

  // draw the texture's mips to the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(textureProgram);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.drawArrays(gl.POINT, 0, 1);  // draw 1 point
}
