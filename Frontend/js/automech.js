var cyl1 = 0;
var cyl2 = 30;
var cyl3 = 7;
var cyl4 = 0;

var cyl = "placeholder"

// time related variables
var start, runtime, seconds, miliseconds;

var running_diagnostics = false;

// variables from nav bar on HTML
var engine_cfg, firing_order, input_device, chunk_size, sampling_rate;

var engCfgSelected = false;
var firingOrderSelected = false;

var runtime_update;
var csrftoken;
var data_sparseness = 2;
let engine_param_selects = null;

var rpm_data = [];
var wave_data = [];
const rpm_data_maxs_n_storedValues = 100;
const wave_data_max_n_storedChunks = 20;

// time related variables
var mode = "light";

function init() {
    engine_cfg = document.getElementById('engcfg').children[0].value;
    firing_order = document.getElementById('firingorder').children[0].value;
    sampling_rate = document.getElementById('samplingRate').children[0].value;
    chunk_size = document.getElementById('chunkSize').children[0].value;
    input_device = document.getElementById('inputdevice').value;
    csrftoken = getCookie('csrftoken');
    engine_param_selects = document.querySelectorAll('.engine-parameters select');

    rest_call("http://127.0.0.1:8000/automech/api/get_input_devices", "GET", "text/plain", setup_input_devices);

    // Ensure that graphs are created AFTER initialization is completed
    initialize_graphs().then(() => {
        let graph_rpm = createGraph('graph-rpm', rpm_data, continuous_DPF, 15);
        graph_rpm.setMaxChunks(100);
        graph_rpm.setGraphColor(0.0, 1.0, 0.25, 1.0);

        let graph_a1 = createGraph('graph-audio-1', wave_data, chunked_DPF, 60);
        graph_a1.setMaxChunks(5);
        graph_a1.setGridColor(1.0, 1.0, 1.0, 1.0);
        graph_a1.setGraphColor(1.0, 1.0, 0.0, 1.0);
        graph_a1.setPaperColor(0.1, 0.1, 0.2, 1.0);
        graph_a1.setGraphScale(2.0, 10.0);

        let graph_a2 = createGraph('graph-audio-2', wave_data, chunked_DPF, 15);
        graph_a2.setGridColor(0.5, 0.5, 0.5, 1.0);
        graph_a2.setGraphColor(1.0, 1.0, 0.0, 1.0);
        graph_a2.setPaperColor(0.1, 0.1, 0.2, 1.0);
        graph_a2.setGraphScale(1.0, 10.0);
    });

    if (localStorage.getItem("dark_mode") == "on"){
        darkMode();
    }
    
    if (localStorage.getItem("sampling_rate") != null) {
        sampling_rate = localStorage.getItem("sampling_rate")
        document.getElementById("samplingRate").value = sampling_rate;
        updateSamplingRate(sampling_rate);
    } else {
        sampling_rate = 44100
        document.getElementById("samplingRate").value = sampling_rate;
        updateSamplingRate(sampling_rate);
    }

    if (localStorage.getItem("chunk_size") != null) {
        chunk_size = localStorage.getItem("chunk_size")
        document.getElementById("chunkSize").value = chunk_size;
        updateChunkSize(chunk_size);
    } else {
        chunk_size = 4096
        document.getElementById("chunkSize").value = chunk_size;
        updateChunkSize(chunk_size);
    }
}

function setup_input_devices(JSONinputDevices) {
    const obj = JSON.parse(JSON.parse(JSONinputDevices));
    console.log(obj);
    var x = document.getElementById("inputdevice");
    for (var key in obj) {
        var option = document.createElement("option");
        option.text = obj[key];
        option.value = key;
        x.add(option);
        console.log(key + " " + obj[key]);
    }
}

function darkMode() {
    if (mode == "light") {
        document.documentElement.style.setProperty('--bg-color', '#444444');
        document.documentElement.style.setProperty('--text-color', 'rgb(255, 255, 255)');
        document.documentElement.style.setProperty('--nav-color', '#1a1a1a');
        document.documentElement.style.setProperty('--lcontainer-color', 'rgb(100, 100, 100)');
        document.documentElement.style.setProperty('--startstop-color', '#1f1f1f');
        canvas.style.backgroundColor = "black";
        mode = "dark";
        window.localStorage.setItem("dark_mode", "on");
    }
    else {
        document.documentElement.style.setProperty('--bg-color', 'rgb(255, 255, 255');
        document.documentElement.style.setProperty('--text-color', 'black');
        document.documentElement.style.setProperty('--nav-color', '#444444');
        document.documentElement.style.setProperty('--lcontainer-color', 'white');
        document.documentElement.style.setProperty('--startstop-color', '#5a5a5a');
        canvas.style.backgroundColor = "white";
        mode = "light"
        window.localStorage.setItem("dark_mode", "off");
    }
}

function menuButton() {
    var menu = document.getElementById("menu-items");
    var button = document.getElementById("menu-button");
    var logo = document.getElementById("logo");
    var version = document.getElementById("version");
    if (menu.style.display === "block") {
      menu.style.display = "none";
      button.innerText = "Settings";
      logo.className = "logo-centered";
      version.className = "version-centered";
    } else {
      menu.style.display = "block";
      button.innerText = "Close settings";
      logo.className = "logo-left";
      version.className = "version-left";
    }
  }

function toggleBtn() {
    let btn = document.getElementById("startStopBtn");

    if (btn.innerHTML == "START") {
        btn.removeEventListener("click", startStopBtn);
        btn.addEventListener("click", startStopBtn);
        btn.innerHTML = "STOP";
        runtimeCount();
        begin_diagnostics();
        rpmUpdate(750);
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
        setConnectionStatus("disconnected", "Diagnostics not running");
    }

}

function runtimeCount() {
    start = new Date();
    runtime_update = setInterval(runtime, 1000);
}

function runtime() {
    miliseconds = new Date() - start;
    seconds = Math.trunc(miliseconds / 1000);
    document.getElementById('runtime').innerHTML = seconds;
}

function stop() {
    clearInterval(runtime_update);
    document.getElementById('runtime').innerHTML = 0;
    document.getElementById('rpm').innerHTML = 0;
    document.getElementById('totmisfires').innerHTML = 0;
    document.getElementById('misfires1').innerHTML = 0;
    document.getElementById('misfires2').innerHTML = 0;
    document.getElementById('misfires3').innerHTML = 0;
    document.getElementById('misfires4').innerHTML = 0;
}

function validateEngineConfiguration(value) {
    if (value != 0) {engCfgSelected = true;}
    else {engCfgSelected = false;}
}

function validateFiringOrder(value) {
    if (value != 0) {firingOrderSelected = true;}
    else {firingOrderSelected = false;}
}

function validateStartButton() {
    if (engCfgSelected && firingOrderSelected) {
        document.getElementById('startStopBtn').disabled = false;
        document.getElementById('startStopBtn').title = "Begin diagnostics";
    } else {
        document.getElementById('startStopBtn').disabled = true; 
        document.getElementById('startStopBtn').title = "Select engine configuration and firing order to begin diagnostics.";
    }
}
