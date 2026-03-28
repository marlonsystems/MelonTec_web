// Dispatch Coordinator - FULL SYSTEM (Advanced Single File)
// Designed for Game Prototype (Roblox/Web Adaptable)

// =========================
// ENUMS / CONSTANTS
// =========================

const STATUS = {
    AVAILABLE: "AVAILABLE",
    ENROUTE: "ENROUTE",
    ON_SCENE: "ON_SCENE",
    BUSY: "BUSY",
    OFFLINE: "OFFLINE"
};

const PRIORITY = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
    MINOR: 5
};

// =========================
// UNIT CLASS
// =========================

class Unit {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.status = STATUS.AVAILABLE;
        this.health = 100;
        this.fuel = 100;
        this.location = { x: Math.random() * 100, y: Math.random() * 100 };
        this.currentIncident = null;
    }

    dispatch(incident) {
        this.status = STATUS.ENROUTE;
        this.currentIncident = incident;
    }

    update() {
        if (this.status === STATUS.ENROUTE && this.currentIncident) {
            this.moveTowards(this.currentIncident.location);
        }

        if (this.status === STATUS.ON_SCENE) {
            if (Math.random() < 0.1) this.resolveIncident();
        }

        this.fuel -= 0.05;
        if (this.fuel <= 0) this.status = STATUS.OFFLINE;
    }

    moveTowards(target) {
        const dx = target.x - this.location.x;
        const dy = target.y - this.location.y;

        this.location.x += dx * 0.05;
        this.location.y += dy * 0.05;

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            this.status = STATUS.ON_SCENE;
        }
    }

    resolveIncident() {
        if (this.currentIncident) {
            this.currentIncident.resolve();
            this.clear();
        }
    }

    clear() {
        this.status = STATUS.AVAILABLE;
        this.currentIncident = null;
        this.fuel = 100;
    }
}

// =========================
// INCIDENT CLASS
// =========================

class Incident {
    constructor(id, type, priority) {
        this.id = id;
        this.type = type;
        this.priority = priority;
        this.status = "ACTIVE";
        this.location = { x: Math.random() * 100, y: Math.random() * 100 };
        this.assignedUnits = [];
        this.timer = 0;
    }

    assignUnit(unit) {
        this.assignedUnits.push(unit);
        unit.dispatch(this);
    }

    update() {
        this.timer++;

        if (this.timer > 200 && this.status === "ACTIVE") {
            console.log(`Incident ${this.id} ESCALATED!`);
        }
    }

    resolve() {
        this.status = "RESOLVED";
        this.assignedUnits.forEach(u => u.clear());
    }
}

// =========================
// DATABASE
// =========================

const units = [];
const incidents = [];

let incidentId = 1;

// Spawn Units
for (let i = 0; i < 5; i++) units.push(new Unit(`P-${i}`, "POLICE"));
for (let i = 0; i < 3; i++) units.push(new Unit(`E-${i}`, "EMS"));
for (let i = 0; i < 2; i++) units.push(new Unit(`F-${i}`, "FIRE"));

// =========================
// INCIDENT TYPES
// =========================

const INCIDENT_TYPES = [
    { name: "Robbery", priority: PRIORITY.CRITICAL, units: ["POLICE"] },
    { name: "Shooting", priority: PRIORITY.CRITICAL, units: ["POLICE", "EMS"] },
    { name: "Fire", priority: PRIORITY.CRITICAL, units: ["FIRE", "EMS"] },
    { name: "Accident", priority: PRIORITY.HIGH, units: ["POLICE", "EMS"] },
    { name: "Traffic Stop", priority: PRIORITY.LOW, units: ["POLICE"] }
];

// =========================
// DISPATCH SYSTEM
// =========================

function createIncident() {
    const data = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
    const incident = new Incident(incidentId++, data.name, data.priority);

    incidents.push(incident);

    dispatchUnits(incident, data.units);
}

function dispatchUnits(incident, types) {
    types.forEach(type => {
        const unit = units.find(u => u.type === type && u.status === STATUS.AVAILABLE);
        if (unit) incident.assignUnit(unit);
    });
}

// =========================
// PLAYER CONTROL
// =========================

function manualDispatch(unitId, incidentId) {
    const unit = units.find(u => u.id === unitId);
    const incident = incidents.find(i => i.id === incidentId);

    if (unit && incident && unit.status === STATUS.AVAILABLE) {
        incident.assignUnit(unit);
    }
}

// =========================
// AI / GAME LOGIC
// =========================

function updateUnits() {
    units.forEach(u => u.update());
}

function updateIncidents() {
    incidents.forEach(i => i.update());
}

// =========================
// UI (CONSOLE DEBUG)
// =========================

function render() {
    console.clear();

    console.log("=== UNITS ===");
    units.forEach(u => {
        console.log(`${u.id} | ${u.type} | ${u.status} | Fuel: ${u.fuel.toFixed(0)}`);
    });

    console.log("\n=== INCIDENTS ===");
    incidents.forEach(i => {
        console.log(`ID ${i.id} | ${i.type} | ${i.status} | Units: ${i.assignedUnits.map(u => u.id).join(", ")}`);
    });
}

// =========================
// GAME LOOP
// =========================

function loop() {
    setInterval(() => {
        if (Math.random() < 0.7) createIncident();

        updateUnits();
        updateIncidents();
        render();
    }, 1000);
}

// =========================
// START
// =========================

console.log("=== DISPATCH COORDINATOR SYSTEM BOOT ===");
loop();
