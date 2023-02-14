////---------------------------------------------////
//                G R A P H - G U I                //
////---------------------------------------------////

"use strict";

/* Global variables */
var gl;
var canvas;
var grid_shader_program;
var graph_shader_program;
var graphs = new Map();

/* update viewports */
function updateViewports() {

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let g of graphs.values()) {
        g.updateViewport();
    }
}

/* Creates a graph within a "graph div" with matching id */
function createGraph(id, data, dataPointFunction, gridSize) {

    let graphElement = document.querySelector('#' + id);
    if (graphElement == null) {
        console.log("No div with matching id found - '" + id + "'");
        return -1
    }

    if (graphs.has(id)) {
        console.log("Graph name must be unique - '" + id + "'");
        return -1;
    }

    let graphLabel = document.createElement('p');
    graphLabel.innerHTML = id;
    graphLabel.id = 'graph-label';

    let graphSettingsButton = document.createElement('button');
    graphSettingsButton.id = 'graph-settings-button';

    let graphInfo = document.createElement('div');
    graphInfo.id = 'graph-info';
    graphInfo.appendChild(graphLabel);
    graphInfo.appendChild(graphSettingsButton);
    graphElement.appendChild(graphInfo);

    let graphPaper = document.createElement('div');
    graphPaper.id = 'paper';
    graphElement.appendChild(graphPaper);

    let g = new Graph(id, data, dataPointFunction, gridSize, graphPaper);
    graphs.set(id, g);

    return g;
}   

/* Generates data for rendering a grid pattern */
function constructGrid(gridSize, width, height) {
    let cols = Math.ceil(width / gridSize);
    let rows = Math.ceil(height / gridSize);

    if (rows % 2 == 0) {
        rows--;
    }

    let s = (gridSize / height) * 2;
    let n_points = (rows * 2 + cols * 2) * 2;
    let grid_data = new Float32Array(n_points);
    let aspectRatio = width / height;

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

/* Converts data into a format which can be rendered as a graph */
// Use this function when plotting data with a chunk size of 1, e.g. engine rpm (rpm_data)
function continuous_DPF(data, n_chunks, chunk_size, aspectRatio) {

    let dataPoints = new Float32Array(2 * n_chunks);

    if (data.length > 0) {
        for (let i = 0; i < n_chunks; i++) {
            let spacing = aspectRatio * 2.0 / (n_chunks - 1.0);
            dataPoints[2 * i] = i * spacing - aspectRatio; // X
            dataPoints[2 * i + 1] = data[i] / 10000; // Y,  (divided by max rpm)
        }
    }

    return dataPoints;
}

/* Converts data into a format which can be rendered as a graph */
// Use this function when plotting data with a chunk size greater than 1, e.g. engine audio (wave_data)
function chunked_DPF(data, n_chunks, chunk_size, aspectRatio) {

    /* Current number of datapoints. Ranges from 0 to n_chunks * chunk_size depending on the current number of loaded chunks */
    let dataPoints = new Float32Array(chunk_size * 2 * n_chunks);   // doubled because we need to store both the x- and y-coordinates

    if (data.length > 0) {
        //for each chunk
        for (let i = 0; i < n_chunks; i++) {
            let chunk_spacing = aspectRatio * (i / n_chunks) * 2;
            //for each number in chunk
            for (let j = chunk_size - 1; j >= 0; j--) {
                let spacing = aspectRatio * 2.0 / (chunk_size * n_chunks - 1.0);
                dataPoints[2 * i * chunk_size + j * 2] = j * spacing + chunk_spacing - aspectRatio;   //x-coordinate
                dataPoints[2 * i * chunk_size + j * 2 + 1] = data[data.length - n_chunks + i][j] / 32767; //y-coordinate, max-size of 16bit int
                dataPoints[2 * i * chunk_size + j * 2 + 1] *= 0.1;   //Amplitude
            }
        }
    }
    return dataPoints;
}

async function fetchShaderSource(shader_type) {
    return fetch('http://127.0.0.1:8000/static/js/graph/' + shader_type, {
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

/* Fetches shader source code and creates shader programs, must be run before any graphs can be created*/
async function initialize_graphs() {

    canvas = document.querySelector('#graph-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', updateViewports, false);

    // Initialize webGL
    gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl)
        console.log('ERROR: webGL not supported');

    // Fetch shader source code from backend
    var graph_VS_source = await fetchShaderSource('graph_VS.vert');
    var graph_FS_source = await fetchShaderSource('graph_FS.frag');
    var grid_VS_source = await fetchShaderSource('grid_VS.vert');
    var grid_FS_source = await fetchShaderSource('grid_FS.frag');

    // Create shader program
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, grid_VS_source);
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, grid_FS_source);
    grid_shader_program = createProgram(gl, vertexShader, fragmentShader);

    vertexShader = createShader(gl, gl.VERTEX_SHADER, graph_VS_source);
    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, graph_FS_source);
    graph_shader_program = createProgram(gl, vertexShader, fragmentShader);

    main_loop();
}

/* The main controll loop for all graph logic */
function main_loop() {

    renderGraphs();

    requestAnimationFrame(() => {
        main_loop();
    });
}

/* All WebGL rendering calls should be applied within this function */
function renderGraphs() {

    for (let g of graphs.values()) {
        g.render();
    }
}

/* The Graph class contains all functionality needed to render an individual graph */
// --param info-- 
// data: a reference to the data we want to plot 
// dataPointFunction: the function which transforms raw data into 2d coordinate space
// gridSize: the width in pixels of the grid squares
class Graph {

    dataPoints;
    max_n_storedChunks = 20;
    graphColor = { r: 1.0, g: 1.0, b: 1.0, a: 1.0}
    paperColor = { r: 0.267, g: 0.267, b: 0.267, a: 1.0 };
    gridColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
    graphScale = { h: 1.0, v: 1.0 };

    constructor(id, dataSource, dataPointFunction, gridSize, graphPaper) {
        this.id = id;   
        this.dataSource = dataSource;
        this.dataPointFunction = dataPointFunction;
        this.graph_VAO = gl.createVertexArray();
        this.grid_VAO = gl.createVertexArray();
        this.graph_VBO = gl.createBuffer();
        this.grid_VBO = gl.createBuffer();
        this.gridSize = gridSize;
        this.graphPaper = graphPaper;
        this.gridData = constructGrid(gridSize, graphPaper.clientWidth, graphPaper.clientHeight);
        gl.bindVertexArray(this.grid_VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.grid_VBO);
        gl.vertexAttribPointer(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);  // TODO: store attribute location out of function scope
        gl.enableVertexAttribArray(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, this.gridData, gl.STATIC_DRAW);
    }

    setMaxChunks(n) {
        this.max_n_storedChunks = n;
    }

    setGraphColor(r, g, b, a) {
        this.graphColor = { r: r, g: g, b: b, a: a };
    }

    setPaperColor(r, g, b, a) {
        this.paperColor = { r: r, g: g, b: b, a: a };
    }

    setGridColor(r, g, b, a) {
        this.gridColor = { r: r, g: g, b: b, a: a };
    }

    setGraphScale(h, v) {
        this.graphScale = { h: h, v: v };
    }

    updateViewport() {
        this.gridData = constructGrid(this.gridSize, this.graphPaper.clientWidth, this.graphPaper.clientHeight);
        gl.bindVertexArray(this.grid_VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.grid_VBO);
        gl.vertexAttribPointer(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);  // TODO: store attribute location out of function scope
        gl.enableVertexAttribArray(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, this.gridData, gl.STATIC_DRAW);    
    }

    render() {

        let rect = this.graphPaper.getBoundingClientRect();
        // left: horizontal coordinate for the lower left corner
        // bottom: vertical coordinate for the lower left corner
        //console.log(gl.getParameter(gl.VIEWPORT));

        const left = rect.left;
        const bottom = canvas.clientHeight - rect.bottom;
     
        gl.viewport(left, bottom, rect.width, rect.height);     

        // Clear previous frame
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(left, bottom, rect.width, rect.height);
        gl.clearColor(this.paperColor.r, this.paperColor.g, this.paperColor.b, this.paperColor.a);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.SCISSOR_TEST);

        // Render grid
        gl.bindVertexArray(this.grid_VAO);
        gl.useProgram(grid_shader_program);
        gl.uniform2i(gl.getUniformLocation(grid_shader_program, "u_windowSize"), this.graphPaper.clientWidth, this.graphPaper.clientHeight);
        gl.uniform4f(gl.getUniformLocation(grid_shader_program, "u_gridColor"), this.gridColor.r, this.gridColor.g, this.gridColor.b, this.gridColor.a);
        gl.drawArrays(gl.LINES, 0, this.gridData.length / 2);

        // Render graph
        gl.bindVertexArray(this.graph_VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.graph_VBO);
        gl.vertexAttribPointer(gl.getAttribLocation(graph_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(gl.getAttribLocation(graph_shader_program, "a_position"));

        let n_chunks = this.dataSource.length;
        if (this.dataSource.length > this.max_n_storedChunks) {
            n_chunks = this.max_n_storedChunks;
        }

        var chunkSize = 0;
        // If the data is not chunked, consider it to have a chunk size of 1
        if (this.dataSource.length > 0 && this.dataSource[0].length) {
            chunkSize = this.dataSource[0].length;
        } else {
            chunkSize = 1;
        }

        this.dataPoints = this.dataPointFunction(this.dataSource, n_chunks, chunkSize, rect.width / rect.height);

        if (this.dataPoints != undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.graph_VBO);
            gl.bufferData(gl.ARRAY_BUFFER, this.dataPoints, gl.STATIC_DRAW);

            gl.bindVertexArray(this.graph_VAO);
            gl.useProgram(graph_shader_program);
            gl.uniform4f(gl.getUniformLocation(graph_shader_program, "u_graphColor"), this.graphColor.r, this.graphColor.g, this.graphColor.b, this.graphColor.a);
            gl.uniform2i(gl.getUniformLocation(graph_shader_program, "u_windowSize"), rect.width, rect.height);
            gl.uniform2f(gl.getUniformLocation(graph_shader_program, "u_graphScale"), this.graphScale.h, this.graphScale.v);
            const n_vertices = n_chunks * chunkSize;
            gl.drawArrays(gl.LINE_STRIP, 0, n_vertices);
        }
    }   
}
