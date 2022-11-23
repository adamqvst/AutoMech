//temporary filename

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

//function below is needed since calling setInterval overwrites any previous interval ID making it inaccessible to the clearInterval function
function disableStartBtn(){
    document.getElementById("start").disabled = true;
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
            console.log(data);
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
            console.log(data);
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
    document.getElementById("start").disabled = false;
}

function rpmUpdate(){
    document.getElementById('rpm').innerHTML = "1800(placeholder)";
}

function getMisfireTot() {
    document.getElementById('totmisfires').innerHTML = cyl1 + cyl2 + cyl3 + cyl4;
}

function getMisfire(misfire, cyl) {
    document.getElementById(misfire).innerHTML = cyl + " (placeholder)"
}
