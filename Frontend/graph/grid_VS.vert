precision mediump int;

attribute vec4 a_position;
uniform ivec2 u_windowSize;

void main() {

    float aspectRatio = float(u_windowSize.x) / float(u_windowSize.y);

    gl_Position = vec4(a_position.x / aspectRatio, a_position.yzw);
}