var ws;
var name = prompt("Name:");

var users = [];

joinGame();

function joinGame() {
    alert(name)
    console.log("click done")
    // ws = new WebSocket("ws://achex.ca:4010");
    ws = new WebSocket("wss://cloud.achex.ca");
    ws.onopen = function (e) {
        alert("conexion abierta" + e);
        console.log(e)
        ws.send(`{"setID":"quizGame", "passwd":"12345"}`);
        // ws.send('{"joinHub":"quizGame", "passwd":"12345"}');
    	// ws.send(`{"toH":"quizGame", "online": ${name}, "req":"info"}`);
    }
    ws.onmessage = function (response) {
        var responseUser = JSON.parse(response.data);
        // alert("response obtenidos: " + responseUser)
        console.log(responseUser);
        if(responseUser.auth == "ok")   users.push(name);
        console.log(users);
        // var mensaje = JSON.parse(responseUser);
        // var x = document.createElement("p");
        // x.textContent = mensaje.user +": " + mensaje.content;
        // document.body.append(x);
    }
    // ws.onclose = function () {
    //     alert("Conexion cerrada")
    // }
}

document.querySelector("#buttonId").addEventListener("click", onSendChat)


function onSendChat(){
    ws.send(`{"to":"quizGame", "user":"${name}", "content":"${document.querySelector("#Mensaje").value}"}`);
    ws.onmessage = function(message){
        var mensaje = JSON.parse(message.data);
        var x = document.createElement("p");
        x.textContent = mensaje.user +": " + mensaje.content;
        document.body.append(x);
        alert(mensaje.user + "ha enviado un mensaje")
    }
}