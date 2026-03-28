// --- Map Setup ---
var map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);

// --- Units / Marker ---
var units = {};
var unitMarkers = {};
var calls = [];
var callCounter = 0;

// --- Table ---
var tbody = document.getElementById('unit-list');

// --- Status Farbe/Text ---
function getStatusColor(s){ return {1:'black',2:'white',3:'gray',4:'green',5:'red'}[s] || 'gray'; }
function getStatusText(s){ return {1:'Offline',2:'Ready',3:'Busy',4:'All OK',5:'Panic'}[s] || 'Unknown'; }

// --- Chat Funktionen ---
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

// --- Units hinzufügen ---
function addUnit(id,type,officer,lat,lng){
    let u = {id:id,type:type,officer:officer,lat:lat,lng:lng,status:2,currentCall:null};
    units[id]=u;
    // Marker
    unitMarkers[id]=L.circleMarker([lat,lng], {color:getStatusColor(u.status), radius:10}).addTo(map).bindPopup(`${id} - ${type}`);
    // Tabelle
    let tr = document.createElement('tr');
    tr.dataset.unitId = id;
    tr.innerHTML = `<td>${id}</td><td>${type}</td><td>${officer}</td><td class="status-${u.status}">${getStatusText(u.status)}</td><td>None</td>`;
    tbody.appendChild(tr);
    addChat(`Dispatcher: Unit ${id} added to system.`);
}

// --- Calls dynamisch ---
function spawnCall(){
    callCounter++;
    let lat = 51.50 + Math.random()*0.02;
    let lng = -0.09 + Math.random()*0.02;
    let callId = `C${String(callCounter).padStart(3,'0')}`;
    let type = ["Robbery","Traffic","Disturbance","Emergency"][Math.floor(Math.random()*4)];
    let call = {id:callId,type:type,lat:lat,lng:lng,assigned:null,marker:null};
    calls.push(call);
    // Marker auf Map
    call.marker = L.marker([lat,lng]).addTo(map).bindPopup(`${callId} - ${type}`);
    // Liste
    let li = document.createElement('li');
    li.id = callId;
    li.innerHTML = `<strong>${callId} - ${type}</strong><br>Priority: High<br>Location: ${lat.toFixed(3)},${lng.toFixed(3)}<br>Assigned Units: None`;
    document.getElementById('calls-list').appendChild(li);
    addChat(`Dispatcher: New call ${callId} (${type}) spawned.`);
    assignNearestUnit(call);
    // Call verschwindet nach 5 Minuten
    setTimeout(()=>{ removeCall(callId); }, 5*60*1000);
}

// --- Call entfernen ---
function removeCall(callId){
    let callIndex = calls.findIndex(c=>c.id===callId);
    if(callIndex===-1) return;
    if(calls[callIndex].marker) map.removeLayer(calls[callIndex].marker);
    let li = document.getElementById(callId);
    if(li) li.remove();
    addChat(`Dispatcher: Call ${callId} removed.`);
    calls.splice(callIndex,1);
}

// --- Tabelle aktualisieren ---
function updateUnitRow(id){
    let tr = Array.from(tbody.children).find(r=>r.dataset.unitId===id);
    if(tr){
        let u = units[id];
        tr.children[3].textContent = getStatusText(u.status);
        tr.children[3].className = `status-${u.status}`;
        tr.children[4].textContent = u.currentCall || "None";
    }
    unitMarkers[id].setStyle({color:getStatusColor(units[id].status)});
}

// --- Unit Bewegungen ---
function moveUnitToCall(unit,call){
    let steps = 50;
    let step=0;
    let latStep = (call.lat - unit.lat)/steps;
    let lngStep = (call.lng - unit.lng)/steps;
    let interval = setInterval(()=>{
        if(step>=steps){ clearInterval(interval); unit.status=2; unit.currentCall=null; updateUnitRow(unit.id); addChat(`${unit.id}: Completed call ${call.id}`); return; }
        unit.lat += latStep; unit.lng += lngStep;
        unitMarkers[unit.id].setLatLng([unit.lat,unit.lng]);
        step++;
    },200);
}

// --- Nearest Unit Assign (für Auto-Assign) ---
function assignNearestUnit(call){
    let nearest = null;
    let minDist = 9999;
    Object.values(units).forEach(u=>{
        if(u.status===2){ // Ready Units
            let d = Math.hypot(u.lat-call.lat, u.lng-call.lng);
            if(d<minDist){ minDist=d; nearest=u; }
        }
    });
    if(nearest){
        call.assigned = nearest.id;
        nearest.status = 5;
        nearest.currentCall = call.id;
        updateUnitRow(nearest.id);
        addChat(`Dispatcher: Unit ${nearest.id} assigned to ${call.id}`);
        moveUnitToCall(nearest,call);
    }
}

// --- Manual Dispatch ---
function manualDispatch(){
    let uId = document.getElementById('unit-select').value;
    let cId = document.getElementById('call-select').value;
    if(!uId || !cId) return;
    let unit = units[uId];
    let call = calls.find(c=>c.id===cId);
    if(!unit || !call) return;
    if(unit.status!==2){ addChat(`Dispatcher: Unit ${uId} not ready.`); return; }
    call.assigned = uId;
    unit.status = 5;
    unit.currentCall = call.id;
    updateUnitRow(uId);
    let li = document.getElementById(cId);
    if(li) li.innerHTML = `<strong>${call.id} - ${call.type}</strong><br>Priority: High<br>Location: ${call.lat.toFixed(3)},${call.lng.toFixed(3)}<br>Assigned Units: ${uId}`;
    addChat(`Dispatcher: Unit ${uId} manually assigned to ${cId}`);
    moveUnitToCall(unit,call);
}

// --- Auto Assign ---
function autoAssignCalls(){
    calls.forEach(c=>{
        if(!c.assigned){
            assignNearestUnit(c);
        }
    });
    addChat(`Dispatcher: Auto-Assign executed.`);
}

// --- Dropdowns aktualisieren ---
function updateDispatchDropdowns(){
    let unitSel = document.getElementById('unit-select');
    let callSel = document.getElementById('call-select');
    unitSel.innerHTML = '';
    callSel.innerHTML = '';
    Object.values(units).forEach(u=>{
        let option = document.createElement('option');
        option.value = u.id;
        option.textContent = `${u.id} (${u.type}) [${getStatusText(u.status)}]`;
        unitSel.appendChild(option);
    });
    calls.forEach(c=>{
        let option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.id} (${c.type}) [${c.assigned?c.assigned:'Unassigned'}]`;
        callSel.appendChild(option);
    });
}
setInterval(updateDispatchDropdowns,3000);

// --- Call Spawn alle 1 Minute ---
setInterval(spawnCall, 60*1000);

// --- Demo: 10 initial Units ---
addUnit("U1","Patrol","Smith",51.505,-0.09);
addUnit("U2","Patrol","Johnson",51.506,-0.091);
addUnit("U3","Patrol","Lee",51.504,-0.092);
addUnit("U4","Patrol","Brown",51.507,-0.093);
addUnit("U5","SWAT","Davis",51.508,-0.095);
addUnit("U6","SUV","Wilson",51.502,-0.09);
addUnit("U7","SUV","Taylor",51.503,-0.091);
addUnit("U8","SUV","Anderson",51.504,-0.093);
addUnit("U9","SUV","Thomas",51.506,-0.094);
addUnit("U10","SUV","Jackson",51.507,-0.096);// --- Map Setup ---
var map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);

// --- Units / Marker ---
var units = {};
var unitMarkers = {};
var calls = [];
var callCounter = 0;

// --- Table ---
var tbody = document.getElementById('unit-list');

// --- Status Farbe/Text ---
function getStatusColor(s){ return {1:'black',2:'white',3:'gray',4:'green',5:'red'}[s] || 'gray'; }
function getStatusText(s){ return {1:'Offline',2:'Ready',3:'Busy',4:'All OK',5:'Panic'}[s] || 'Unknown'; }

// --- Chat Funktionen ---
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

// --- Units hinzufügen ---
function addUnit(id,type,officer,lat,lng){
    let u = {id:id,type:type,officer:officer,lat:lat,lng:lng,status:2,currentCall:null};
    units[id]=u;
    // Marker
    unitMarkers[id]=L.circleMarker([lat,lng], {color:getStatusColor(u.status), radius:10}).addTo(map).bindPopup(`${id} - ${type}`);
    // Tabelle
    let tr = document.createElement('tr');
    tr.dataset.unitId = id;
    tr.innerHTML = `<td>${id}</td><td>${type}</td><td>${officer}</td><td class="status-${u.status}">${getStatusText(u.status)}</td><td>None</td>`;
    tbody.appendChild(tr);
    addChat(`Dispatcher: Unit ${id} added to system.`);
}

// --- Calls dynamisch ---
function spawnCall(){
    callCounter++;
    let lat = 51.50 + Math.random()*0.02;
    let lng = -0.09 + Math.random()*0.02;
    let callId = `C${String(callCounter).padStart(3,'0')}`;
    let type = ["Robbery","Traffic","Disturbance","Emergency"][Math.floor(Math.random()*4)];
    let call = {id:callId,type:type,lat:lat,lng:lng,assigned:null,marker:null};
    calls.push(call);
    // Marker auf Map
    call.marker = L.marker([lat,lng]).addTo(map).bindPopup(`${callId} - ${type}`);
    // Liste
    let li = document.createElement('li');
    li.id = callId;
    li.innerHTML = `<strong>${callId} - ${type}</strong><br>Priority: High<br>Location: ${lat.toFixed(3)},${lng.toFixed(3)}<br>Assigned Units: None`;
    document.getElementById('calls-list').appendChild(li);
    addChat(`Dispatcher: New call ${callId} (${type}) spawned.`);
    assignNearestUnit(call);
    // Call verschwindet nach 5 Minuten
    setTimeout(()=>{ removeCall(callId); }, 5*60*1000);
}

// --- Call entfernen ---
function removeCall(callId){
    let callIndex = calls.findIndex(c=>c.id===callId);
    if(callIndex===-1) return;
    if(calls[callIndex].marker) map.removeLayer(calls[callIndex].marker);
    let li = document.getElementById(callId);
    if(li) li.remove();
    addChat(`Dispatcher: Call ${callId} removed.`);
    calls.splice(callIndex,1);
}

// --- Tabelle aktualisieren ---
function updateUnitRow(id){
    let tr = Array.from(tbody.children).find(r=>r.dataset.unitId===id);
    if(tr){
        let u = units[id];
        tr.children[3].textContent = getStatusText(u.status);
        tr.children[3].className = `status-${u.status}`;
        tr.children[4].textContent = u.currentCall || "None";
    }
    unitMarkers[id].setStyle({color:getStatusColor(units[id].status)});
}

// --- Unit Bewegungen ---
function moveUnitToCall(unit,call){
    let steps = 50;
    let step=0;
    let latStep = (call.lat - unit.lat)/steps;
    let lngStep = (call.lng - unit.lng)/steps;
    let interval = setInterval(()=>{
        if(step>=steps){ clearInterval(interval); unit.status=2; unit.currentCall=null; updateUnitRow(unit.id); addChat(`${unit.id}: Completed call ${call.id}`); return; }
        unit.lat += latStep; unit.lng += lngStep;
        unitMarkers[unit.id].setLatLng([unit.lat,unit.lng]);
        step++;
    },200);
}

// --- Nearest Unit Assign (für Auto-Assign) ---
function assignNearestUnit(call){
    let nearest = null;
    let minDist = 9999;
    Object.values(units).forEach(u=>{
        if(u.status===2){ // Ready Units
            let d = Math.hypot(u.lat-call.lat, u.lng-call.lng);
            if(d<minDist){ minDist=d; nearest=u; }
        }
    });
    if(nearest){
        call.assigned = nearest.id;
        nearest.status = 5;
        nearest.currentCall = call.id;
        updateUnitRow(nearest.id);
        addChat(`Dispatcher: Unit ${nearest.id} assigned to ${call.id}`);
        moveUnitToCall(nearest,call);
    }
}

// --- Manual Dispatch ---
function manualDispatch(){
    let uId = document.getElementById('unit-select').value;
    let cId = document.getElementById('call-select').value;
    if(!uId || !cId) return;
    let unit = units[uId];
    let call = calls.find(c=>c.id===cId);
    if(!unit || !call) return;
    if(unit.status!==2){ addChat(`Dispatcher: Unit ${uId} not ready.`); return; }
    call.assigned = uId;
    unit.status = 5;
    unit.currentCall = call.id;
    updateUnitRow(uId);
    let li = document.getElementById(cId);
    if(li) li.innerHTML = `<strong>${call.id} - ${call.type}</strong><br>Priority: High<br>Location: ${call.lat.toFixed(3)},${call.lng.toFixed(3)}<br>Assigned Units: ${uId}`;
    addChat(`Dispatcher: Unit ${uId} manually assigned to ${cId}`);
    moveUnitToCall(unit,call);
}

// --- Auto Assign ---
function autoAssignCalls(){
    calls.forEach(c=>{
        if(!c.assigned){
            assignNearestUnit(c);
        }
    });
    addChat(`Dispatcher: Auto-Assign executed.`);
}

// --- Dropdowns aktualisieren ---
function updateDispatchDropdowns(){
    let unitSel = document.getElementById('unit-select');
    let callSel = document.getElementById('call-select');
    unitSel.innerHTML = '';
    callSel.innerHTML = '';
    Object.values(units).forEach(u=>{
        let option = document.createElement('option');
        option.value = u.id;
        option.textContent = `${u.id} (${u.type}) [${getStatusText(u.status)}]`;
        unitSel.appendChild(option);
    });
    calls.forEach(c=>{
        let option = document.createElement('option');
     // --- Map Setup ---
var map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);

// --- Units / Marker ---
var units = {};
var unitMarkers = {};
var calls = [];
var callCounter = 0;
var autoDispatchEnabled = false;

// --- Table ---
var tbody = document.getElementById('unit-list');

// --- Status Farbe/Text ---
function getStatusColor(s){ return {1:'black',2:'white',3:'gray',4:'green',5:'red'}[s] || 'gray'; }
function getStatusText(s){ return {1:'Offline',2:'Ready',3:'Busy',4:'All OK',5:'Panic'}[s] || 'Unknown'; }

// --- Chat Funktionen ---
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

// --- Units hinzufügen ---
function addUnit(id,type,officer,lat,lng){
    let u = {id:id,type:type,officer:officer,lat:lat,lng:lng,status:2,currentCall:null};
    units[id]=u;
    // Marker
    unitMarkers[id]=L.circleMarker([lat,lng], {color:getStatusColor(u.status), radius:10}).addTo(map).bindPopup(`${id} - ${type}`);
    // Tabelle
    let tr = document.createElement('tr');
    tr.dataset.unitId = id;
    tr.innerHTML = `<td>${id}</td><td>${type}</td><td>${officer}</td><td class="status-${u.status}">${getStatusText(u.status)}</td><td>None</td>`;
    tbody.appendChild(tr);
    addChat(`Dispatcher: Unit ${id} added to system.`);
}

// --- Calls dynamisch ---
function spawnCall(){
    callCounter++;
    let lat = 51.50 + Math.random()*0.02;
    let lng = -0.09 + Math.random()*0.02;
    let callId = `C${String(callCounter).padStart(3,'0')}`;
    let type = ["Robbery","Traffic","Disturbance","Emergency"][Math.floor(Math.random()*4)];
    let call = {id:callId,type:type,lat:lat,lng:lng,assigned:null,marker:null};
    calls.push(call);
    // Marker auf Map
    call.marker = L.marker([lat,lng]).addTo(map).bindPopup(`${callId} - ${type}`);
    // Liste
    let li = document.createElement('li');
    li.id = callId;
    li.innerHTML = `<strong>${callId} - ${type}</strong><br>Priority: High<br>Location: ${lat.toFixed(3)},${lng.toFixed(3)}<br>Assigned Units: None`;
    document.getElementById('calls-list').appendChild(li);
    addChat(`Dispatcher: New call ${callId} (${type}) spawned.`);

    if(autoDispatchEnabled) assignNearestUnit(call);
    // Call verschwindet nach 5 Minuten
    setTimeout(()=>{ removeCall(callId); }, 5*60*1000);
}

// --- Call entfernen ---
function removeCall(callId){
    let callIndex = calls.findIndex(c=>c.id===callId);
    if(callIndex===-1) return;
    if(calls[callIndex].marker) map.removeLayer(calls[callIndex].marker);
    let li = document.getElementById(callId);
    if(li) li.remove();
    addChat(`Dispatcher: Call ${callId} removed.`);
    calls.splice(callIndex,1);
}

// --- Tabelle aktualisieren ---
function updateUnitRow(id){
    let tr = Array.from(tbody.children).find(r=>r.dataset.unitId===id);
    if(tr){
        let u = units[id];
        tr.children[3].textContent = getStatusText(u.status);
        tr.children[3].className = `status-${u.status}`;
        tr.children[4].textContent = u.currentCall || "None";
    }
    unitMarkers[id].setStyle({color:getStatusColor(units[id].status)});
}

// --- Unit Bewegungen ---
function moveUnitToCall(unit,call){
    let steps = 50;
    let step=0;
    let latStep = (call.lat - unit.lat)/steps;
    let lngStep = (call.lng - unit.lng)/steps;
    let interval = setInterval(()=>{
        if(step>=steps){ 
            clearInterval(interval); 
            unit.status=2; 
            unit.currentCall=null; 
            updateUnitRow(unit.id); 
            addChat(`${unit.id}: Completed call ${call.id}`); 
            return; 
        }
        unit.lat += latStep; 
        unit.lng += lngStep; 
        unitMarkers[unit.id].setLatLng([unit.lat,unit.lng]);
        step++;
    },200);
}

// --- Nearest Unit Assign (für Auto-Assign) ---
function assignNearestUnit(call){
    let nearest = null;
    let minDist = 9999;
    Object.values(units).forEach(u=>{
        if(u.status===2){ // Ready Units
            let d = Math.hypot(u.lat-call.lat, u.lng-call.lng);
            if(d<minDist){ minDist=d; nearest=u; }
        }
    });
    if(nearest){
        call.assigned = nearest.id;
        nearest.status = 5;
        nearest.currentCall = call.id;
        updateUnitRow(nearest.id);
        addChat(`Dispatcher: Unit ${nearest.id} assigned to ${call.id}`);
        moveUnitToCall(nearest,call);
    }
}

// --- Manual Dispatch ---
function manualDispatch(){
    let uId = document.getElementById('unit-select').value;
    let cId = document.getElementById('call-select').value;
    if(!uId || !cId) return;
    let unit = units[uId];
    let call = calls.find(c=>c.id===cId);
    if(!unit || !call) return;
    if(unit.status!==2){ addChat(`Dispatcher: Unit ${uId} not ready.`); return; }
    call.assigned = uId;
    unit.status = 5;
    unit.currentCall = call.id;
    updateUnitRow(uId);
    let li = document.getElementById(cId);
    if(li) li.innerHTML = `<strong>${call.id} - ${call.type}</strong><br>Priority: High<br>Location: ${call.lat.toFixed(3)},${call.lng.toFixed(3)}<br>Assigned Units: ${uId}`;
    addChat(`Dispatcher: Unit ${uId} manually assigned to ${cId}`);
    moveUnitToCall(unit,call);
}

// --- Auto Dispatch Toggle ---
function toggleAutoDispatch(){
    autoDispatchEnabled = !autoDispatchEnabled;
    document.getElementById('auto-btn').textContent = `Auto-Assign Calls: ${autoDispatchEnabled ? 'ON' : 'OFF'}`;
}

// --- Dropdowns aktualisieren ---
function updateDispatchDropdowns(){
    let unitSel = document.getElementById('unit-select');
    let callSel = document.getElementById('call-select');
    unitSel.innerHTML = '';
    callSel.innerHTML = '';
    Object.values(units).forEach(u=>{
        let option = document.createElement('option');
        option.value = u.id;
        option.textContent = `${u.id} (${u.type}) [${getStatusText(u.status)}]`;
        unitSel.appendChild(option);
    });
    calls.forEach(c=>{
        let option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.id} (${c.type}) [${c.assigned?c.assigned:'Unassigned'}]`;
        callSel.appendChild(option);
    });
}
setInterval(updateDispatchDropdowns,3000);

// --- Call Spawn alle 1 Minute ---
setInterval(spawnCall, 60*1000);

// --- Demo: 10 initial Units ---
addUnit("U1","Patrol","Smith",51.505,-0.09);
addUnit("U2","Patrol","Johnson",51.506,-0.091);
addUnit("U3","Patrol","Lee",51.504,-0.092);
addUnit("U4","Patrol","Brown",51.507,-0.093);
addUnit("U5","SWAT","Davis",51.508,-0.095);
addUnit("U6","SUV","Wilson",51.502,-0.09);
addUnit("U7","SUV","Taylor",51.503,-0.091);
addUnit("U8","SUV","Anderson",51.504,-0.093);
addUnit("U9","SUV","Thomas",51.506,-0.094);
addUnit("U10","SUV","Jackson",51.507,-0.096);
