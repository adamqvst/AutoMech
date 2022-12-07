precision mediump int;

attribute vec4 a_position;
varying vec3 vertPos;
uniform ivec2 u_windowSize;

void main() {

    float aspectRatio = float(u_windowSize.x) / float(u_windowSize.y);

    vertPos = vec3(a_position.xyz);
    gl_Position = vec4(a_position.x / aspectRatio, a_position.yzw);
}