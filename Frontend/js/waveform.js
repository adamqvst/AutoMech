////-----------------------------------------------////
//      W A V E F O R M     V I S U A L I Z E R      //
////-----------------------------------------------////
"use strict";

function updateViewport() {
    var height = waveformcontainer.clientHeight;
    var width = waveformcontainer.clientWidth;

    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);

    aspectRatio = width / height;
}

async function fetchShaderSource(shader_type) {
    return fetch('http://127.0.0.1:8000/static/graph/' + shader_type, {
        method: 'GET',
        headers: {
            "Content-Type": "text/plain"
        },
    }).then(res => {
        return res.text();
    });
}

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

var waveformcontainer;
var canvas;
var aspectRatio;
var dataPoints;
var gl;
var graphScale = [1.0, 10.0];
//Shader programs
let graph_program = null;
let grid_program = null;
let graph_VAO = null;
let graph_VBO = null;
let grid_VAO = null;
let grid_VBO = null;

window.addEventListener('resize', updateViewport, false);

//Functoin for generating graph gird
function constructGrid() {

    var gridSize = 60; // pixels

    var cols = Math.ceil(canvas.width / gridSize);
    var rows = Math.ceil(canvas.height / gridSize);

    if (rows % 2 == 0) {
        rows--;
    }

    let s = (gridSize / canvas.height) * 2;

    //console.log(cols, rows, s);

    var numPoints = (rows * 2 + cols * 2) * 2;

    let grid_data = new Float32Array(numPoints);

    // columns
    for (let i = 0; i < cols; i++) {
        //TOP
        grid_data[i * 4] = aspectRatio - i * s - s;
        grid_data[i * 4 + 1] = 1.0;

        //BOTTOM
        grid_data[i * 4 + 2] = aspectRatio - i * s - s;
        grid_data[i * 4 + 3] = -1.0;
    }

    // rows
    for (let i = 0; i < rows; i++) {
        //LEFT
        grid_data[cols * 4 + i * 4] = -aspectRatio;
        grid_data[cols * 4 + i * 4 + 1] = -i * s + (s * rows) / 2.0 - 0.5 * s;

        //RIGHT
        grid_data[cols * 4 + i * 4 + 2] = aspectRatio;
        grid_data[cols * 4 + i * 4 + 3] = -i * s + (s * rows) / 2.0 - 0.5 * s;
    }

    return grid_data;
}

async function initializeGraph() {

    waveformcontainer = document.querySelector('.waveformcontainer');
    canvas = document.querySelector('#glCanvas');

    waveformcontainer.style.backgroundColor = "black";

    //Initialize webGL
    gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl)
        console.log('ERROR: webGL not supported');

    updateViewport();

    //Fetch shaders from backend
    var graph_VS_source = await fetchShaderSource('graph_VS.vert');
    var graph_FS_source = await fetchShaderSource('graph_FS.frag');
    var grid_VS_source = await fetchShaderSource('grid_VS.vert');
    var grid_FS_source = await fetchShaderSource('grid_FS.frag');


    //Create shader program
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, graph_VS_source);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, graph_FS_source);
    graph_program = createProgram(gl, vertexShader, fragmentShader);

    vertexShader = createShader(gl, gl.VERTEX_SHADER, grid_VS_source);
    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, grid_FS_source);
    grid_program = createProgram(gl, vertexShader, fragmentShader);

    //create VAO
    graph_VAO = gl.createVertexArray();
    grid_VAO = gl.createVertexArray();

    //create VBO
    graph_VBO = gl.createBuffer();
    grid_VBO = gl.createBuffer();

    update();
}

function update() {

    //Grid
    gl.bindVertexArray(grid_VAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, grid_VBO);
    gl.vertexAttribPointer(gl.getAttribLocation(grid_program, "a_position"), 2, gl.FLOAT, false, 0, 0);  // TODO: store attrib locatoin out of function scope
    gl.enableVertexAttribArray(gl.getAttribLocation(grid_program, "a_position"), 2, gl.FLOAT, false, 0, 0);

    let grid_data = constructGrid();

    gl.bufferData(gl.ARRAY_BUFFER, grid_data, gl.STATIC_DRAW);

    //Graph
    gl.bindVertexArray(graph_VAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, graph_VBO);
    gl.vertexAttribPointer(gl.getAttribLocation(graph_program, "a_position"), 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(graph_program, "a_position"));

    var num_chunks = 6;
    var chunk_size = 512;
    var currentBufferSize = chunk_size * num_chunks;

    dataPoints = new Float32Array(chunk_size * 2 * num_chunks);   //x- and y-coordinate

    if (wave_data.length > 0) {

        chunk_size = wave_data[0].length;

        if (wave_data.length > num_chunks) {
            wave_data.shift();
        }

        currentBufferSize = chunk_size * wave_data.length;

        //for each chunk
        for (let i = 0; i < wave_data.length; i++) {

            var chunk_spacing = aspectRatio * (i / num_chunks) * 2;

            //for each number in chunk
            for (let j = chunk_size - 1; j >= 0; j--) {
                var spacing = aspectRatio * 2.0 / (chunk_size * num_chunks - 1.0);
                dataPoints[2 * i * chunk_size + j * 2] = j * spacing + chunk_spacing - aspectRatio;   //x-coordinate
                dataPoints[2 * i * chunk_size + j * 2 + 1] = wave_data[i][j] / 32767; //y-coordinate, max-size of 16bit int
                dataPoints[2 * i * chunk_size + j * 2 + 1] *= 0.1;   //Amplitude
            }
        }

        //copy data to GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, graph_VBO);
        gl.bufferData(gl.ARRAY_BUFFER, dataPoints, gl.STATIC_DRAW);
    }

    //set viewport size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    //clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(grid_VAO);
    gl.useProgram(grid_program);
    gl.uniform2i(gl.getUniformLocation(grid_program, "u_windowSize"), waveformcontainer.clientWidth, waveformcontainer.clientHeight);
    gl.drawArrays(gl.LINES, 0, grid_data.length / 2);

    if (dataPoints != undefined) { //make sure that we've receiveded some data before rendering
        //Rendering
        gl.bindVertexArray(graph_VAO);
        gl.useProgram(graph_program);
        gl.uniform2i(gl.getUniformLocation(graph_program, "u_windowSize"), waveformcontainer.clientWidth, waveformcontainer.clientHeight);
        gl.uniform2f(gl.getUniformLocation(graph_program, "u_graphScale"), graphScale[0], graphScale[1]);
        gl.drawArrays(gl.LINE_STRIP, 0, currentBufferSize);
    }

    requestAnimationFrame(() => {
        update();
    });
}