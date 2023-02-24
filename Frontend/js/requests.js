"use strict";

var running_diagnostics = false;

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

function handle_diagnostics_data(data) {

    if (data !== undefined) {
        const jsonOBJ = JSON.parse(data);
        if (jsonOBJ.rpm == -1) {
            rpmUpdate(0);
        } else {
            rpmUpdate(jsonOBJ.rpm);
        }
        rpm_data.push(jsonOBJ.rpm);
        wave_data.push(JSON.parse(jsonOBJ.wave));

        if (rpm_data.length > rpm_data_maxs_n_storedValues) {
            rpm_data.shift(); // removes first element from array
        }

        if (wave_data.length > wave_data_max_n_storedChunks) {
            wave_data.shift(); // removes first element from array
        }
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
            "engineCfg": engineCfg,
            "firingorder": firingorder,
            "inputdevice": inputDevice,
            "samplingRate": samplingRate,
            "chunkSize": chunkSize
        })
    }).then(res => {
        return res.text();
    }).then(data => {
        get_diagnostics_data(data_sparseness);
    }).catch(err => {
        console.log("error", err);
    });
}    //rest_call("http://127.0.0.1:8000/automech/api/begin-diagnostics","PUT","application/json",get_diagnostics_data,jsonBody,data_sparseness);

function get_diagnostics_data(sparseness) {
    var address = 'http://127.0.0.1:8000/automech/api/get-diagnostics-data?data_sparseness=' + sparseness;
    rest_call(address, "GET", "application/json", handle_diagnostics_data);
}

function end_diagnostics() {
    engineParamSelects.forEach((select) => {
        select.disabled = false;
    });
    running_diagnostics = false;
    rest_call("http://127.0.0.1:8000/automech/api/end-diagnostics", "PUT", "text/plain", console.log);
}

function rest_call(address, method, contentType, dataFunction) {
    fetch(address, {
        method: method,
        headers: {
            "Content-Type": contentType,
            "X-CSRFToken": csrftoken
        },
    }).then(res => {
        if (address.includes("get-diagnostics-data") && running_diagnostics == true) {
            console.log("ADDRESS ", address);
            if (res.status == 200) {setConnectionStatus("connected");}
            else {console.log("here");setConnectionStatus("disconnected");}
        } 
        return res.text();
    }).then(function (data) {
        dataFunction(data);
    }).catch(err => {
        console.log("error REST_CALL " + method, err);
    });
}

function updateEngineCfg(value) {
    console.log(value);
    engineCfg = value;
}

function updateFiringOrder(value) {
    console.log(value);
    firingorder = value;
}

function updateInputDevice(value) {
    console.log(value);
    inputDevice = value;
}

function updateSamplingRate(value) {
    console.log(value);
    samplingRate = value;
}

function updateChunkSize(value) {
    console.log(value);
    chunkSize = value;
}

function rpmUpdate(new_rpm) {
    document.getElementById('rpm').innerHTML = new_rpm;
}

function getMisfireTot() {
    document.getElementById('totmisfires').innerHTML = cyl1 + cyl2 + cyl3 + cyl4;
}

function getMisfire(misfire, cyl) {
    document.getElementById(misfire).innerHTML = cyl
}

function setConnectionStatus(value) {
    if (value == "connected") {
        document.getElementById('connection-status').innerText="Connected";
        document.getElementById('connection-icon').src="/static/connected.png";
    } else if (value == "disconnected") {
        document.getElementById('connection-status').innerText="Not connected";
        document.getElementById('connection-icon').src="/static/disconnected.png";
    }
}