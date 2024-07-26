#version 300 es

uniform mat2 rotateMatrix;
uniform float arrowLength;
uniform vec2 canvasSize;

const vec2 startPos = vec2(-0.3f, 0.0f);
const vec2 endPos = vec2(0.3f, 0.0f);

const vec4 wiseClock = vec4(1.0f, 1.0f, 1.0f, 1.0f);
const vec4 Counterclockwise = vec4(1.0f, -1.0f, -1.0f, 1.0f);

mat2 trans(mat2 m, vec4 v) {
    return mat2(m[0][0] * v.x, m[0][1] * v.y, m[1][0] * v.z, m[1][1] * v.w);
}

void main() {

    if(gl_VertexID == 0) {
        gl_Position = vec4(endPos, 0.0f, 1.0f);
        return;
    }

    vec2 end2startVector = normalize(startPos - endPos);
    mat2 rotateM = trans(rotateMatrix, gl_InstanceID == 0 ? Counterclockwise : wiseClock);
    vec2 rotatedVector = normalize(rotateM * end2startVector);
    vec2 offsetedPos = endPos + rotatedVector * arrowLength / canvasSize;
    gl_Position = vec4(offsetedPos, 0.0f, 1.0f);

}