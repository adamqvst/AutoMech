"use strict";

var cyl1 = 0;
var cyl2 = 30;
var cyl3 = 7;
var cyl4 = 0;

var cyl = "placeholder"

// time related variables
var mode = "light";

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

function menuButton() {
    var menu = document.getElementById("menu-items");
    if (menu.style.display === "block") {
      menu.style.display = "none";
    } else {
      menu.style.display = "block";
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
    }

}

function runtimeCount() {
    start = new Date();
    runtimeUpdate = setInterval(runtime, 1000);
}

function runtime() {
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