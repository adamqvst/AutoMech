precision mediump int;

attribute vec4 a_position;
uniform mat4 u_viewMatrix;

void main() {
    gl_Position = u_viewMatrix * a_position;
}