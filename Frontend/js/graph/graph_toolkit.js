////---------------------------------------------////
//            G R A P H - T O O L K I T            //
////---------------------------------------------////

"use strict";

/* Returns datapoint at cursor position in graph coordinate */
function viewSpaceToDataPoint(x_view, data) {

    let dataPoint = undefined;
    let index = undefined;

    if (data != undefined) {
        index = Math.max(0, Math.floor((data.length / 2) * x_view) * 2 - 1);
        dataPoint = data[index];
    }

    return [index, dataPoint];
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
            dataPoints[2 * i + 1] = data[i];
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
                dataPoints[2 * i * chunk_size + j * 2 + 1] = data[data.length - n_chunks + i][j];
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

class Matrix4x4 {

    constructor(data) {
        if (data === undefined) {
            this.data = new Float32Array([
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0
            ]);
        }
        else {
            this.data = data;
        }
    }

    translate(dx, dy, dz) {
        this.data[3] += dx;
        this.data[7] += dy;
        this.data[11] += dz;
    }

    setTranslation(tx, ty, tz) {
        this.data[3] = tx;
        this.data[7] = ty;
        this.data[11] = tz;
    }

    setScale(sx, sy, sz) {
        this.data[0] = sx;
        this.data[5] = sy;
        this.data[10] = sz;
    }

    static identity() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    // Temporary
    static createViewMatrix(sx, sy, sz, tx, ty, tz, zoom, aspectRatio) {
        return new Float32Array([
            sx * zoom / aspectRatio, 0, 0, tx,
            0, sy * zoom, 0, ty,
            0, 0, sz, tz,
            0, 0, 0, 1.0
        ]);
    }

    // Temporary
    static createTransformationMatrix(sx, sy, sz, tx, ty, tz) {
        return new Float32Array([
            sx, 0, 0, tx,
            0, sy, 0, ty,
            0, 0, sz, tz,
            0, 0, 0, 1.0
        ]);
    }
}

