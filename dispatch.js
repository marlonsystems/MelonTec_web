// Karte initialisieren
var map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);

// Units Definition
var unitsData = [
    {id:"U1", type:"Patrol", officer:"Smith", lat:51.505, lng:-0.09, status:2},
    {id:"U2", type:"Patrol", officer:"Johnson", lat:51.506, lng:-0.091, status:2},
    {id:"U3", type:"Patrol", officer:"Lee", lat:51.504, lng:-0.092, status:2},
    {id:"U4", type:"Patrol", officer:"Brown", lat:51.507, lng:-0.093, status:2},
    {id:"U5", type:"SWAT", officer:"Davis", lat:51.508, lng:-0.095, status:2},
    {id:"U6", type:"SUV", officer:"Wilson", lat:51.502, lng:-0.09, status:2},
    {id:"U7", type:"SUV", officer:"Taylor", lat:51.503, lng:-0.091, status:2},
    {id:"U8", type:"SUV", officer:"Anderson", lat:51.504, lng:-0.093, status:2},
    {id:"U9", type:"SUV", officer:"Thomas", lat:51.506, lng:-0.094, status:2},
    {id:"U10", type:"SUV", officer:"Jackson", lat:51.507, lng:-0.096, status:2},
];

var units = {};
var unitMarkers = {};
var calls = [];
var callCounter = 0;

// Tabelle und Marker erzeugen
var tbody = document.getElementById('unit-list');
unitsData.forEach(u=>{
    let tr = document.createElement('tr');
    tr.dataset.unitId = u.id;
    tr.innerHTML = `<td>${u.id}</td><td>${u.type}</td><td>${u.officer}</td><td class="status-${u.status}">${getStatusText(u.status)}</td><td>None</td>`;
    tbody.appendChild(tr);
    units[u.id] = u;
    unitMarkers[u.id] = L.circleMarker([u.lat,u.lng], {color:getStatusColor(u.status), radius:10}).addTo(map).bindPopup(`${u.id} - ${u.type}`);
});

// Status Farbe/Text
function getStatusColor(s){ return {1:'black',2:'white',3:'gray',4:'green',5:'red'}[s] || 'gray'; }
function getStatusText(s){ return {1:'Offline',2:'Ready',3:'Busy',4:'All OK',5:'Panic'}[s] || 'Unknown'; }

// Fake-Chat
function addChat(msg){
    let box = document.getElementById('chat-box');
    let p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
}

function sendChat(){
    let input = document.getElementById('chat-input');
    if(input.value.trim()==="") return;
    addChat(`Dispatcher: ${input.value}`);
    Object.keys(units).forEach(id=>{
        setTimeout(()=>{ addChat(`${id}: Received message.`); }, 1000 + Math.random()*2000);
    });
    input.value="";
}

// Call spawnen automatisch
function spawnCall(){
    callCounter++;
    let lat = 51.50 + Math.random()*0.02;
    let lng = -0.09 + Math.random()*0.02;
    let callId = `C${String(callCounter).padStart(3,'0')}`;
    let type = ["Robbery","Traffic","Disturbance","Emergency"][Math.floor(Math.random()*4)];
    let call = {id:callId,type:type,lat:lat,lng:lng,assigned:null};
    calls.push(call);
    L.marker([lat,lng]).addTo(map).bindPopup(`${callId} - ${type}`);
    let li = document.createElement('li');
    li.id = callId;
    li.innerHTML = `<strong>${callId} - ${type}</strong><br>Priority: High<br>Location: ${lat.toFixed(3)},${lng.toFixed(3)}<br>Assigned Units: None`;
    document.getElementById('calls-list').appendChild(li);
    addChat(`Dispatcher: New call ${callId} (${type}) spawned.`);
    assignNearestUnit(call);
}

// Nearest Unit Assign
function assignNearestUnit(call){
    let nearest = null;
    let minDist = 9999;
    Object.values(units).forEach(u=>{
        if(u.status===2){ // nur Ready Units
            let d = Math.hypot(u.lat-call.lat, u.lng-call.lng);
            if(d<minDist){ minDist=d; nearest=u; }
        }
    });
    if(nearest){
        call.assigned = nearest.id;
        nearest.status=5; // Panic / Assigned
        updateUnitRow(nearest.id);
        moveUnitToCall(nearest, call);
        document.getElementById(call.id).innerHTML += `<br>Assigned Units: ${nearest.id}`;
        addChat(`Dispatcher: Unit ${nearest.id} assigned to ${call.id}`);
    }
}

// Tabelle aktualisieren
function updateUnitRow(id){
    let tr = Array.from(tbody.children).find(r=>r.dataset.unitId===id);
    if(tr){
        let u = units[id];
        tr.children[3].textContent = getStatusText(u.status);
        tr.children[3].className = `status-${u.status}`;
        tr.children[4].textContent = u.currentCall || "Assigned";
    }
    unitMarkers[id].setStyle({color:getStatusColor(units[id].status)});
}

// Unit Bewegung
function moveUnitToCall(unit, call){
    let steps = 50;
    let step=0;
    let latStep = (call.lat - unit.lat)/steps;
    let lngStep = (call.lng - unit.lng)/steps;
    let interval = setInterval(()=>{
        if(step>=steps){ clearInterval(interval); unit.status=4; updateUnitRow(unit.id); addChat(`${unit.id}: Arrived at call ${call.id}`); return; }
        unit.lat += latStep; unit.lng += lngStep;
        unitMarkers[unit.id].setLatLng([unit.lat,unit.lng]);
        step++;
    },200);
}

// Calls automatisch spawnen alle 10 Sekunden
setInterval(spawnCall, 10000);
