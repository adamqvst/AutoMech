"use strict"

var cyl1 = 0;
var cyl2 = 30;
var cyl3 = 7;
var cyl4 = 0;

var cyl = "placeholder"

var start;
var runtime;
var seconds;
var miliseconds;
var running_diagnostics = false;
var engineCfg;
var firingorder;
var inputDevice;
var runtimeUpdate;
var mode = "light";
var csrftoken;
var data_sparseness = 4;
let engineParamSelects = null;

var rpm_data = [];
var wave_data = [];

function init() {
    engineCfg = document.getElementById('engcfg').children[0].value;
    firingorder = document.getElementById('firingorder').children[0].value;
	inputDevice = document.getElementById('inputdevice').value;
    csrftoken = getCookie('csrftoken');
    engineParamSelects = document.querySelectorAll('.engine-parameters select');
	
	fetch("http://127.0.0.1:8000/automech/api/get_input_devices").then(function(response) {
	  return response.json();
	}).then(function(data) {
	  const obj = JSON.parse(data);
	  console.log(obj);
	  var x = document.getElementById("inputdevice");
		for(var key in obj) {
			 var option = document.createElement("option");
			 option.text = obj[key];
			 option.value = key;
			 x.add(option);
		     console.log(key+" "+obj[key]);
		   
		}

	}).catch(function(err) {
	  console.log('Fetch Error :-S', err);
	});
}

// Django throws an error if no CSRF token is sent with PUT/POST requests
// https://docs.djangoproject.com/en/3.2/ref/csrf/#ajax
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function darkMode() {
    if (mode == "light"){
    document.documentElement.style.setProperty('--bg-color', '#444444');
    document.documentElement.style.setProperty('--text-color', 'rgb(255, 255, 255)');
    document.documentElement.style.setProperty('--nav-color', '#1a1a1a');
    document.documentElement.style.setProperty('--lcontainer-color', 'rgb(100, 100, 100)');
    document.documentElement.style.setProperty('--startstop-color', '#1f1f1f');
	canvas.style.backgroundColor = "black";
	mode = "dark";
    }
    else {
    document.documentElement.style.setProperty('--bg-color', 'rgb(255, 255, 255');
    document.documentElement.style.setProperty('--text-color', 'black');
    document.documentElement.style.setProperty('--nav-color', '#444444');
    document.documentElement.style.setProperty('--lcontainer-color', 'white');
    document.documentElement.style.setProperty('--startstop-color', '#5a5a5a');
	canvas.style.backgroundColor = "white";
    mode = "light"
    }
}

function toggleBtn(){
    let btn = document.getElementById("startStopBtn");

    if (btn.innerHTML == "START") {
        btn.removeEventListener("click", startStopBtn);
        btn.addEventListener("click", startStopBtn);
        btn.innerHTML = "STOP";
        runtimeCount(); 
        begin_diagnostics();
        rpmUpdate(750) ;
        getMisfireTot();
        getMisfire('misfires1', cyl1); 
        getMisfire('misfires2', cyl2); 
        getMisfire('misfires3', cyl3); 
        getMisfire('misfires4', cyl4);
    }
 
    else {
        btn.removeEventListener("click", startStopBtn);
        btn.addEventListener("click", startStopBtn);
        btn.innerHTML = "START";    
        stop();
        end_diagnostics();
    }

}

function handle_diagnostics_data(data) {

    if (data !== undefined) {

        if (data.rpm == -1) {
            rpmUpdate(0);
        } else {
            rpmUpdate(data.rpm);
        }
        rpm_data.push(data.rpm);
        wave_data.push(JSON.parse(data.wave));
    }  

    if (running_diagnostics) {
        get_diagnostics_data(data_sparseness);
    }
}

function begin_diagnostics() {
    engineParamSelects.forEach((select) => {
        select.disabled = true;
    });

    running_diagnostics = true;

    fetch('http://127.0.0.1:8000/automech/api/begin-diagnostics', {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify({
            "engineCfg" : engineCfg,
            "firingorder" : firingorder,
			"inputdevice" : inputDevice
        })
    }).then(res => {
        return res.text();
    }).then(data => {
            get_diagnostics_data(data_sparseness);
    }).catch(err => {
        console.log("error", err);
    });
}

function get_diagnostics_data(sparseness) {
    fetch('http://127.0.0.1:8000/automech/api/get-diagnostics-data?data_sparseness=' + sparseness, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
    }).then(res => {
        return res.json();
    }).then(data => {
        handle_diagnostics_data(data);
    }).catch(err => {
        console.log("error", err);
    });
}

function end_diagnostics() {

    engineParamSelects.forEach((select) => {
        select.disabled = false;
    });

    running_diagnostics = false

    fetch('http://127.0.0.1:8000/automech/api/end-diagnostics', {
            method: 'PUT',
            headers: {
                "Content-Type": "text/plain",
                "X-CSRFToken": csrftoken
            },
        }).then(res => {
            return res.text();
        }).then(data => {

        }).catch(err => {
            console.log("error", err);
        });
}

function updateEngineCfg(value) {
    console.log(value);
    engineCfg = value;
}

function updateFiringOrder(value) {
    console.log(value);
    firingOrder = value;
}

function updateInputDevice(value) {
    console.log(value);
    inputDevice = value;
}

function runtimeCount(){
        start = new Date();
        runtimeUpdate = setInterval(runtime, 1000);
}

function runtime(){
    miliseconds = new Date() - start;
    seconds = Math.trunc(miliseconds / 1000);
    document.getElementById('runtime').innerHTML = seconds;
}

function stop() {
    clearInterval(runtimeUpdate);
    document.getElementById('runtime').innerHTML = 0;
    document.getElementById('rpm').innerHTML = 0;
    document.getElementById('totmisfires').innerHTML = 0;
    document.getElementById('misfires1').innerHTML = 0;
    document.getElementById('misfires2').innerHTML = 0;
    document.getElementById('misfires3').innerHTML = 0;
    document.getElementById('misfires4').innerHTML = 0;
}

function rpmUpdate(new_rpm){
    document.getElementById('rpm').innerHTML = new_rpm;
}

function getMisfireTot() {
    document.getElementById('totmisfires').innerHTML = cyl1 + cyl2 + cyl3 + cyl4;
}

function getMisfire(misfire, cyl) {
    document.getElementById(misfire).innerHTML = cyl
}

////-----------------------------------------------////
//      W A V E F O R M     V I S U A L I Z E R      //
////-----------------------------------------------////

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
    gl = canvas.getContext('webgl2');
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

    var num_chunks = 8;
    var chunk_size = 512;
    var currentBufferSize = chunk_size * wave_data.length;

    if (wave_data.length > 0) {    
        chunk_size = wave_data[0].length;

        if (wave_data.length > num_chunks) {
            wave_data.shift();
        }

        dataPoints = new Float32Array(chunk_size * 2 * num_chunks);   //x- and y-coordinate

        //for each chunk
        for (let i = 0; i < wave_data.length; i++) {

            var chunk_spacing = aspectRatio * (i / num_chunks) * 2;
            
            //for each number in chunk
            for (let j = chunk_size - 1; j >= 0; j--) {
                var spacing = aspectRatio * 2.0 / (chunk_size * num_chunks - 1.0);
                dataPoints[2 * i * chunk_size + j * 2] = j * spacing + chunk_spacing - aspectRatio;   //x-coordinate
                dataPoints[2 * i * chunk_size + j * 2 + 1] = wave_data[i][j] / waveformcontainer.clientHeight;   //y-coordinate
                dataPoints[2 * i * chunk_size + j * 2 + 1] *= 0.1;   //Amplitude
            }
        }

        //copy data to GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, graph_VBO);
        gl.bufferData(gl.ARRAY_BUFFER, dataPoints, gl.DYNAMIC_DRAW);
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
        gl.drawArrays(gl.LINE_STRIP, 0, currentBufferSize);
    }

    requestAnimationFrame(() => {
        update();
    });
}
