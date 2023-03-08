////---------------------------------------------////
//                G R A P H - G U I                //
////---------------------------------------------////

"use strict";

/* Global variables */
var gl;
var canvas;
var grid_shader_program;
var graph_shader_program;
var crosshair_shader_program;
var graphs = new Map();

/* Update viewports */
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

    let cursorData = document.createElement('div');
    cursorData.id = 'cursor-data';
    let dataX = document.createElement('p');
    dataX.id = 'x';
    let dataY = document.createElement('p');
    dataY.id = 'y';
    cursorData.appendChild(dataX);
    cursorData.appendChild(dataY);
    graphInfo.appendChild(cursorData);

    graphElement.appendChild(graphInfo);

    let graphPaper = document.createElement('div');
    graphPaper.id = 'paper';
    graphElement.appendChild(graphPaper);

    let g = new Graph(id, data, dataPointFunction, gridSize, graphPaper);
    graphs.set(id, g);

    return g;   
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
    var crosshair_VS_source = await fetchShaderSource('crosshair_VS.vert');
    var crosshair_FS_source = await fetchShaderSource('crosshair_FS.frag');

    // Create shader program
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, grid_VS_source);
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, grid_FS_source);
    grid_shader_program = createProgram(gl, vertexShader, fragmentShader);

    vertexShader = createShader(gl, gl.VERTEX_SHADER, graph_VS_source);
    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, graph_FS_source);
    graph_shader_program = createProgram(gl, vertexShader, fragmentShader);

    vertexShader = createShader(gl, gl.VERTEX_SHADER, crosshair_VS_source);
    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, crosshair_FS_source);
    crosshair_shader_program = createProgram(gl, vertexShader, fragmentShader);

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

    _crosshairData = new Float32Array([0.0, 10000, 0.0, -10000,   // vertical line
                                     -10000, 0.0, 10000, 0.0]);   // horizontal line
    _dataPoints;
    _max_n_storedChunks = 20;
    _crosshairColor = { r: 1.0, g: 0.0, b: 0.0, a: 1.0 };
    _graphColor = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
    _paperColor = { r: 0.267, g: 0.267, b: 0.267, a: 1.0 };
    _gridColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
    _graphScale = { h: 1.0, v: 1.0 };
    _graphTranslation = { x: 0.0, y: 0.0, z: 0.0 };
    _b_cursor_on_graph = false;
    _labelX = 'x: ';
    _labelY = 'y: ';

    constructor(id, dataSource, dataPointFunction, gridSize, graphPaper) {
        this.id = id;   
        this.dataSource = dataSource;
        this.dataPointFunction = dataPointFunction;
        this.crosshair_VAO = gl.createVertexArray();
        this.graph_VAO = gl.createVertexArray();
        this.grid_VAO = gl.createVertexArray();
        this.crosshair_VBO = gl.createBuffer();
        this.graph_VBO = gl.createBuffer();
        this.grid_VBO = gl.createBuffer();
        this.gridSize = gridSize;
        this.graphPaper = graphPaper;
        this.gridData = constructGrid(gridSize, graphPaper.clientWidth, graphPaper.clientHeight);

        this.graph_transform = new Matrix4x4(Matrix4x4.identity());
        this.crosshair_transform = new Matrix4x4(Matrix4x4.identity());

        graphPaper.parentElement.addEventListener('mousemove', (e) => {
            this.updateCrosshair(e);
        });

        graphPaper.parentElement.addEventListener('mouseleave', (e) => {
            this.updateCrosshair(e);    
        });

        gl.bindVertexArray(this.grid_VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.grid_VBO);
        gl.vertexAttribPointer(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);  // TODO: store attribute location out of function scope
        gl.enableVertexAttribArray(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, this.gridData, gl.STATIC_DRAW);
    }

    setMaxChunks(n) {
        this._max_n_storedChunks = n;
    }

    setCrosshairColor(r, g, b, a) {
        this._crosshairColor = { r: r, g: g, b: b, a: a };
    }

    setGraphColor(r, g, b, a) {
        this._graphColor = { r: r, g: g, b: b, a: a };
    }

    setPaperColor(r, g, b, a) {
        this._paperColor = { r: r, g: g, b: b, a: a };
    }

    setGridColor(r, g, b, a) {
        this._gridColor = { r: r, g: g, b: b, a: a };
    }

    setGraphScale(h, v) {
        this._graphScale = { h: h, v: v };
    }

    setGraphTranslation(x, y, z) {
        this._graphTranslation = { x: x, y: y, z: z };
    }

    setDataSource(dataSource) {
        this.dataSource = dataSource;
    }

    getAspectRatio() {
        let rect = this.graphPaper.getBoundingClientRect();
        return rect.width / rect.height;
    }

    setLabelX(label) {
        this._labelX = label;
    }

    setLabelY(label) {
        this._labelY = label;
    }

    updateViewport() {
        this.gridData = constructGrid(this.gridSize, this.graphPaper.clientWidth, this.graphPaper.clientHeight);
        gl.bindVertexArray(this.grid_VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.grid_VBO);
        gl.vertexAttribPointer(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);  // TODO: store attribute location out of function scope
        gl.enableVertexAttribArray(gl.getAttribLocation(grid_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, this.gridData, gl.STATIC_DRAW);    
    }

    updateCrosshair(e) {
        let rect = this.graphPaper.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top; 

        this._b_cursor_on_graph = false;

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {      

            this._b_cursor_on_graph = true;      
            //pixel to viewspace

            let x_view = (1 - (2 * x / rect.width)) * this.getAspectRatio();
            let y_view = (1 - (2 * y / rect.height));
            
            this.crosshair_transform.setTranslation(-x_view, y_view, 1);

            let x_normalized = x / rect.width;
            let [index, dataPoint] = viewSpaceToDataPoint(x_normalized, this._dataPoints);

            if (dataPoint != undefined) {
                this.graphPaper.parentElement.querySelector('#y').innerText = this._labelY + dataPoint.toFixed(2);
                this.graphPaper.parentElement.querySelector('#x').innerText = this._labelX + index;
            }
        }
        else {
            this.graphPaper.parentElement.querySelector('#x').innerText = '';
            this.graphPaper.parentElement.querySelector('#y').innerText = '';
        }
    }

    render() {

        let rect = this.graphPaper.getBoundingClientRect();
        // left: horizontal coordinate for the lower left corner
        // bottom: vertical coordinate for the lower left corner
        //console.log(gl.getParameter(gl.VIEWPORT));

        const left = rect.left;
        const bottom = canvas.clientHeight - rect.bottom;
     
        let view = Matrix4x4.createViewMatrix(1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, this.getAspectRatio());

        gl.viewport(left, bottom, rect.width, rect.height);     

        // Clear previous frame
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(left, bottom, rect.width, rect.height);
        gl.clearColor(this._paperColor.r, this._paperColor.g, this._paperColor.b, this._paperColor.a);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.SCISSOR_TEST);

        // Render grid
        gl.bindVertexArray(this.grid_VAO);
        gl.useProgram(grid_shader_program);
        gl.uniformMatrix4fv(gl.getUniformLocation(grid_shader_program, "u_viewMatrix"), true, view);
        gl.uniform4f(gl.getUniformLocation(grid_shader_program, "u_gridColor"), this._gridColor.r, this._gridColor.g, this._gridColor.b, this._gridColor.a);
        gl.drawArrays(gl.LINES, 0, this.gridData.length / 2);

        // Render graph
        gl.bindVertexArray(this.graph_VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.graph_VBO);
        gl.vertexAttribPointer(gl.getAttribLocation(graph_shader_program, "a_position"), 2, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(gl.getAttribLocation(graph_shader_program, "a_position"));

        let n_chunks = this.dataSource.length;
        if (this.dataSource.length > this._max_n_storedChunks) {
            n_chunks = this._max_n_storedChunks;
        }

        var chunkSize = 0;
        // If the data is not chunked, consider it to have a chunk size of 1
        if (this.dataSource.length > 0 && this.dataSource[0].length) {
            chunkSize = this.dataSource[0].length;
        } else {
            chunkSize = 1;
        }

        this._dataPoints = this.dataPointFunction(this.dataSource, n_chunks, chunkSize, rect.width / rect.height);

        if (this._dataPoints != undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.graph_VBO);
            gl.bufferData(gl.ARRAY_BUFFER, this._dataPoints, gl.STATIC_DRAW);

            this.graph_transform.setScale(this._graphScale.h, this._graphScale.v, 1.0);
            this.graph_transform.setTranslation(this._graphTranslation.x, this._graphTranslation.y, this._graphTranslation.z);

            gl.bindVertexArray(this.graph_VAO);
            gl.useProgram(graph_shader_program);
            gl.uniformMatrix4fv(gl.getUniformLocation(graph_shader_program, "u_viewMatrix"), true, view);
            gl.uniformMatrix4fv(gl.getUniformLocation(graph_shader_program, "u_transformationMatrix"), true, this.graph_transform.data);
            gl.uniform4f(gl.getUniformLocation(graph_shader_program, "u_graphColor"), this._graphColor.r, this._graphColor.g, this._graphColor.b, this._graphColor.a);
            const n_vertices = n_chunks * chunkSize;
            gl.drawArrays(gl.LINE_STRIP, 0, n_vertices);
        }

        // Render crosshair
        if (this._b_cursor_on_graph) {
            gl.bindVertexArray(this.crosshair_VAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.crosshair_VBO);
            gl.vertexAttribPointer(gl.getAttribLocation(crosshair_shader_program, "a_position"), 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(gl.getAttribLocation(crosshair_shader_program, "a_position"));
            gl.bufferData(gl.ARRAY_BUFFER, this._crosshairData, gl.STATIC_DRAW);
            gl.useProgram(crosshair_shader_program);
            gl.uniformMatrix4fv(gl.getUniformLocation(crosshair_shader_program, "u_viewMatrix"), true, view);
            gl.uniformMatrix4fv(gl.getUniformLocation(crosshair_shader_program, "u_transformationMatrix"), true, this.crosshair_transform.data);
            gl.uniform4f(gl.getUniformLocation(crosshair_shader_program, "u_crosshairColor"), this._crosshairColor.r, this._crosshairColor.g, this._crosshairColor.b, this._crosshairColor.a);
            gl.drawArrays(gl.LINES, 0, this._crosshairData.length / 2);
        }
    }   
}
