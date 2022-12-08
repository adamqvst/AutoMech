precision mediump int;

attribute vec4 a_position;
uniform ivec2 u_windowSize;
uniform vec2 u_graphScale;

void main() {

    float aspectRatio = float(u_windowSize.x) / float(u_windowSize.y);
    vec4 pos = vec4(a_position.x / aspectRatio, a_position.yzw);

    pos.x *= u_graphScale.x;
    pos.y *= u_graphScale.y;

    gl_Position = pos; 
}