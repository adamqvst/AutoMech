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
var runtimeUpdate;
var mode = "light";
var csrftoken;
var data_sparseness = 5;
let engineParamSelects = null;

var rpm_data = []
var wave_data = []

function init() {
    engineCfg = document.getElementById('engcfg').children[0].value;
    firingorder = document.getElementById('firingorder').children[0].value;
    csrftoken = getCookie('csrftoken');
    engineParamSelects = document.querySelectorAll('.engine-parameters select');
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
    mode = "dark";
    }
    else {
    document.documentElement.style.setProperty('--bg-color', 'rgb(255, 255, 255');
    document.documentElement.style.setProperty('--text-color', 'black');
    document.documentElement.style.setProperty('--nav-color', '#444444');
    document.documentElement.style.setProperty('--lcontainer-color', 'white');
    document.documentElement.style.setProperty('--startstop-color', '#5a5a5a');
    mode = "light"
    }
}

function toggleBtn(){
    
    btn = document.getElementById("startStopBtn");

    if (btn.innerHTML == "START"){
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
            "firingorder" : firingorder
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
let program = null;
let VAO = null;
let VBO = null;

window.addEventListener('resize', updateViewport, false);

async function initializeGraph() {

    waveformcontainer = document.querySelector('.waveformcontainer');
    canvas = document.querySelector('#glCanvas');

    //Initialize webGL
    gl = canvas.getContext('webgl2');
    if (!gl)
        console.log('ERROR: webGL not supported');

    updateViewport();

    //Fetch shaders from backend
    var vertexShaderSource = await fetchShaderSource('graph_VS.vert');
    var fragmentShaderSource = await fetchShaderSource('graph_FS.frag');

    //Create shader program
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = createProgram(gl, vertexShader, fragmentShader);

    //create VAO
    VAO = gl.createVertexArray();
 
    //create VBO
    VBO = gl.createBuffer();

    update();
}

function update() {

    var a_position_location = gl.getAttribLocation(program, "a_position");
    var windowSize = gl.getUniformLocation(program, "u_windowSize");

    gl.bindVertexArray(VAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.vertexAttribPointer(a_position_location, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_position_location);

    if (wave_data.length > 0) {
    
        var wave_chunk = wave_data.shift();
        dataPoints = new Float32Array(wave_chunk.length * 2);   // x- and y-coordinate


        for (let i = 0; i < dataPoints.length / 2; i++) {
            var spacing = 2.0 * aspectRatio / ((dataPoints.length / 2) - 1);
            dataPoints[i * 2] = i * spacing - aspectRatio;   // x-coordinate
            dataPoints[i * 2 + 1] = wave_chunk[i] / waveformcontainer.clientHeight;   // y-coordinate
            dataPoints[i * 2 + 1] *= 0.1;   // Amplitude
        }
    }


    if (dataPoints != undefined) { // make sure that we've receiveded some data before rendering
        //copy data to GPU
        gl.bufferData(gl.ARRAY_BUFFER, dataPoints, gl.STATIC_DRAW);     //TODO: update to glBufferSubData
        //set viewport size
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        //clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        //Rendering
        gl.bindVertexArray(VAO);
        gl.useProgram(program);
        gl.uniform2i(windowSize, waveformcontainer.clientWidth, waveformcontainer.clientHeight);
        gl.drawArrays(gl.LINE_STRIP, 0, dataPoints.length / 2);
    }

    requestAnimationFrame(() => {
        update();
    });
}