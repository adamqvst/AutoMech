//temporary filename

cyl1 = 0;
cyl2 = 30;
cyl3 = 7;
cyl4 = 0;

cyl = "placeholder"

function runtimeUpdate(){
    document.getElementById('runtime').innerHTML = "3600(placeholder)";
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