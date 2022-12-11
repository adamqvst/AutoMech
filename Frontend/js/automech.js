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