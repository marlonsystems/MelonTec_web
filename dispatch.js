// Map initialisieren
var map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);

// Units Marker
var units = {};
document.querySelectorAll('#unit-list tr').forEach(tr => {
    let id = tr.children[0].textContent;
    let lat = parseFloat(tr.dataset.lat);
    let lng = parseFloat(tr.dataset.lng);
    let status = parseInt(tr.dataset.status);
    let color = getStatusColor(status);
    units[id] = L.circleMarker([lat,lng], {color:color,radius:10}).addTo(map).bindPopup(`Unit ${id}`);
});

function getStatusColor(status){
    switch(status){
        case 1: return 'black';
        case 2: return 'white';
        case 3: return 'gray';
        case 4: return 'green';
        case 5: return 'red';
        default: return 'gray';
    }
}

// Dispatch Funktion
function dispatchUnit(id){
    let tr = Array.from(document.querySelectorAll('#unit-list tr')).find(r=>r.children[0].textContent===id);
    if(!tr) return;
    tr.children[4].textContent = "New Call Assigned";
    tr.children[3].className = "status-5";
    units[id].setStyle({color:'red'});
    addChat(`Dispatcher: Unit ${id} dispatched!`);
    fakeUnitReply(id);
}

// Call senden
function sendToUnit(id){
    addChat(`Dispatcher: Sending call to ${id}`);
    fakeUnitReply(id);
}

// Fake Unit Chat Antworten
function fakeUnitReply(id){
    setTimeout(()=>{ addChat(`${id}: Copy, en route.`); }, 1000 + Math.random()*1000);
    setTimeout(()=>{ addChat(`${id}: Arrived at location.`); }, 3000 + Math.random()*2000);
}

// Chat Funktionen
function addChat(msg){
    let box = document.getElementById('chat-box');
    let p = document.createElement('p'); p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
}

function sendChat(){
    let input = document.getElementById('chat-input');
    if(input.value.trim()==="") return;
    addChat(`Dispatcher: ${input.value}`);
    Object.keys(units).forEach(id => {
        setTimeout(()=>{ addChat(`${id}: Received message.`); }, 1000 + Math.random()*2000);
    });
    input.value="";
}

// Neue Calls
function createNewCall(){
    addChat("Dispatcher: New Call created at random location.");
    let lat = 51.50 + Math.random()*0.02;
    let lng = -0.09 + Math.random()*0.02;
    L.marker([lat,lng]).addTo(map).bindPopup("New Call");
}
