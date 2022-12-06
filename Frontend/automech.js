cyl1 = 0;
cyl2 = 30;
cyl3 = 7;
cyl4 = 0;

cyl = "placeholder"

var start;
var runtime;
var seconds;
var miliseconds;
var running_diagnostics = false
var engineCfg
var firingorder
var runtimeUpdate
var mode = "light";
const csrftoken = getCookie('csrftoken');

function init() {
    engineCfg = document.getElementById('engcfg').children[0].value;
    firingorder = document.getElementById('firingorder').children[0].value;
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
    }

}


function handle_diagnostics_data(data) {

    console.log("rpm: " + data.rpm + " | num ints: " + data.wave.length);

    if (data !== undefined) {
        rpmUpdate(data.rpm);
    }

    if (running_diagnostics) {
        get_diagnostics_data();
    }
    
}

function begin_diagnostics() {

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
            get_diagnostics_data();
    }).catch(err => {
        console.log("error", err);
    });
}

function get_diagnostics_data() {
    fetch('http://127.0.0.1:8000/automech/api/get-diagnostics-data', {
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

function stop(){
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
