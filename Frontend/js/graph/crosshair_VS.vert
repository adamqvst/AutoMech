attribute vec4 a_position;
uniform mat4 u_viewMatrix;
uniform mat4 u_transformationMatrix;

void main() {
    gl_Position = u_viewMatrix * u_transformationMatrix * a_position;
}