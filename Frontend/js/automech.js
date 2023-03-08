// time related variables
var start, runtime, seconds, miliseconds;

var running_diagnostics = false;
var input_device_list = [];

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

    // Refresh input devices
    refreshInputDevices();

    // Set stored user preferences
    retrieve_settings();

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
}

function retrieve_settings() {
    if (localStorage.getItem("dark_mode") == "on"){
        darkMode();
    }
    
    if (localStorage.getItem("sampling_rate") != null) {
        sampling_rate = localStorage.getItem("sampling_rate")
        document.getElementById("samplingRate").value = sampling_rate;
        updateSamplingRate(sampling_rate);
    } else {
        sampling_rate = 44100;
        document.getElementById("samplingRate").value = sampling_rate;
        updateSamplingRate(sampling_rate);
    }

    if (localStorage.getItem("chunk_size") != null) {
        chunk_size = localStorage.getItem("chunk_size")
        document.getElementById("chunkSize").value = chunk_size;
        updateChunkSize(chunk_size);
    } else {
        chunk_size = 4096;
        document.getElementById("chunkSize").value = chunk_size;
        updateChunkSize(chunk_size);
    }

    if (localStorage.getItem("engine_cfg") != null) {
        engine_cfg = localStorage.getItem("engine_cfg");
        document.getElementById("engcfg").value = engine_cfg;
        updateEngineCfg(engine_cfg);
        validateEngineConfiguration(engine_cfg);
        validateStartButton();
    } else {
        engine_cfg = 0;
        document.getElementById("engcfg").value = engine_cfg;
        updateEngineCfg(engine_cfg);
    }

    if (localStorage.getItem("firing_order") != null) {
        firing_order = localStorage.getItem("firing_order");
        document.getElementById("firingorder").value = firing_order;
        updateFiringOrder(firing_order);
        validateFiringOrder(firing_order);
        validateStartButton();
        
    } else {
        firing_order = 0;
        document.getElementById("firingorder").value = firing_order;
        updateFiringOrder(firing_order);
    }
}

function setup_input_devices(JSONinputDevices) {
    const obj = JSON.parse(JSON.parse(JSONinputDevices));
    var x = document.getElementById("inputdevice");

    setListInputDevices(obj);
    
    x.innerHTML = "";
    default_option = document.createElement("option");
    default_option.text = "INPUT DEVICE:";
    default_option.value = -1;
    x.add(default_option);
    
    for (var key in obj) {
        var option = document.createElement("option");
        option.text = obj[key];
        option.value = key;
        x.add(option);
        console.log(key + " " + obj[key]);
    }

    if (localStorage.getItem("input_device") != null) {
        if (localStorage.getItem("input_device") <= Object.keys(getListInputDevices()).length - 1) {
            input_device = localStorage.getItem("input_device");
            document.getElementById("inputdevice").value = input_device;
            updateInputDevice(input_device);
        } else {
            input_device = -1;
            document.getElementById("inputdevice").value = input_device;
            updateInputDevice(input_device);
        }
    } else {
        input_device = -1;
        document.getElementById("inputdevice").value = input_device;
        updateInputDevice(input_device);
    }
}

function darkMode() {
    if (mode == "light") {
        document.documentElement.style.setProperty('--bg-color', '#444444');
        document.documentElement.style.setProperty('--text-color', 'rgb(255, 255, 255)');
        document.documentElement.style.setProperty('--nav-color', '#303030');
        document.documentElement.style.setProperty('--lcontainer-color', 'rgb(100, 100, 100)');
        document.documentElement.style.setProperty('--startstop-color', '#1f1f1f');
        document.body.style.background = '/static/background-dark.png';
        mode = "dark";
        window.localStorage.setItem("dark_mode", "on");
    }
    else {
        document.documentElement.style.setProperty('--bg-color', 'rgb(255, 255, 255');
        document.documentElement.style.setProperty('--text-color', 'black');
        document.documentElement.style.setProperty('--nav-color', '#444444');
        document.documentElement.style.setProperty('--lcontainer-color', 'white');
        document.documentElement.style.setProperty('--startstop-color', '#5a5a5a');
        document.body.style.background = '/static/background-light.png';
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
        rpmUpdate(0);
        toggleSelectButtons();
    }

    else {
        btn.removeEventListener("click", startStopBtn);
        btn.addEventListener("click", startStopBtn);
        btn.innerHTML = "START";
        stop();
        end_diagnostics();
        setConnectionStatus("disconnected", "Diagnostics not running");
        toggleSelectButtons();
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
    var button = document.getElementById('startStopBtn');
    
    if (engCfgSelected && firingOrderSelected) {
        button.disabled = false;
        if (button.innerHTML == "START")
            button.title = "Begin diagnostics";
        else
            button.title = "Stop diagnostics";
    } else {
        button.disabled = true;
        button.title = "Select engine configuration and firing order to begin diagnostics.";
    }
}

function toggleSelectButtons() {
    var engcfg_btn = document.getElementById('engcfg');
    var firingorder_btn = document.getElementById('firingorder');
    var inputdevice_btn = document.getElementById('inputdevice');

    if (running_diagnostics) {
        engcfg_btn.disabled = true;
        firingorder_btn.disabled = true;
        inputdevice_btn.disabled = true;
    } else {
        engcfg_btn.disabled = false;
        firingorder_btn.disabled = false;
        inputdevice_btn.disabled = false;
    }
}

function refreshInputDevices() {
    rest_call("http://127.0.0.1:8000/automech/api/get_input_devices", "GET", "text/plain", setup_input_devices);
}

function setListInputDevices(list) {
    input_device_list = list;
}

function getListInputDevices() {
    return input_device_list;
}
