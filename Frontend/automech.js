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

//function below is needed since calling setInterval overwrites any previous interval ID making it inaccessible to the clearInterval function
function disableStartBtn(){
    document.getElementById("start").disabled = true;
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
    runtimeUpdate=null;
    while (runtimeUpdate!== null){
        runtimeUpdate = null;
    }
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