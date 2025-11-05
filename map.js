// GEOG 464 – A3
// Abandoned Mines & Tailings in Québec
// This version does NOT import an external water dataset.
// "water_tailings" is detected by attribute keywords only.

const map = L.map("map").setView([53, -72], 4.3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// ===== Reference arrays ===== //
const POP_CENTERS = [
  { name: "Montréal", lat: 45.5017, lng: -73.5673 },
  { name: "Québec", lat: 46.8139, lng: -71.2080 },
  { name: "Gatineau", lat: 45.4765, lng: -75.7013 },
  { name: "Saguenay", lat: 48.4167, lng: -71.0667 },
  { name: "Sherbrooke", lat: 45.4042, lng: -71.8929 },
  { name: "Trois-Rivières", lat: 46.3430, lng: -72.5421 },
  { name: "Rouyn-Noranda", lat: 48.2366, lng: -79.0230 },
  { name: "Val-d'Or", lat: 48.0975, lng: -77.7974 },
  { name: "Sept-Îles", lat: 50.2169, lng: -66.3810 }
];

const INDIGENOUS_HUBS = [
  { name: "Mistissini", lat: 50.43, lng: -73.87 },
  { name: "Chibougamau", lat: 49.913, lng: -74.379 },
  { name: "Wendake", lat: 46.87, lng: -71.33 },
  { name: "Manawan", lat: 46.92, lng: -73.78 },
  { name: "Uashat", lat: 50.25, lng: -66.40 },
  { name: "Kahnawake", lat: 45.40, lng: -73.69 },
  { name: "Kanesatake", lat: 45.50, lng: -74.08 },
  { name: "Waskaganish", lat: 51.47, lng: -78.75 }
];

// little distance helper
function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

const markerLayer = L.layerGroup().addTo(map);
const ALL_MARKERS = [];

// ===== Load mines data ===== //
// NOTE: replace 'data/mines.geojson' with your real file from A2/MVP
fetch('data/mines.geojson')
  .then(r => r.json())
  .then(geo => {
    L.geoJSON(geo, {
      pointToLayer: (feat, latlng) => {
        const props = feat.properties || {};
        const impactClass = classifyImpact(latlng.lat, latlng.lng, props);

        const marker = L.circleMarker(latlng, styleForImpact(impactClass))
          .bindPopup(`<strong>${props.name || "Mine / site"}</strong><br>${impactClass.replace("_"," ")}`);

        marker.featureData = {
          name: props.name || "Mine / site",
          impact: impactClass,
          raw: props
        };

        marker.on("click", () => updateInfoPanel(marker.featureData));

        marker.addTo(markerLayer);
        ALL_MARKERS.push(marker);
        return marker;
      }
    });
    updateStatsBox("all");
  })
  .catch(err => {
    console.error("Could not load data/mines.geojson. Replace with your real mines file.", err);
  });

// ===== Classification (no imported water) ===== //
function classifyImpact(lat, lng, props){
  // 1) Indigenous / northern (55 km)
  for (const hub of INDIGENOUS_HUBS){
    if (haversineKm(lat, lng, hub.lat, hub.lng) <= 55){
      return "near_indigenous";
    }
  }
  if (lat >= 51.5) {
    return "near_indigenous";
  }

  // 2) Population (30 km)
  for (const c of POP_CENTERS){
    if (haversineKm(lat, lng, c.lat, c.lng) <= 30){
      return "near_population";
    }
  }

  // 3) Tailings / water from attributes
  const cat = (props.category || "").toLowerCase();
  const nm  = (props.name || "").toLowerCase();
  if (
    cat.includes("tailings") || cat.includes("résidu") || cat.includes("residu") ||
    nm.includes("lac") || nm.includes("lake") ||
    nm.includes("river") || nm.includes("rivière") || nm.includes("riviere")
  ) {
    return "water_tailings";
  }

  // 4) Otherwise
  return "remote";
}

function styleForImpact(impact){
  const base = {
    radius: 5,
    weight: 1,
    opacity: 1,
    fillOpacity: 0.65
  };
  switch(impact){
    case "near_indigenous":
      return { ...base, color: "#ff6b6b", fillColor: "#ff6b6b" };
    case "near_population":
      return { ...base, color: "#4dabf7", fillColor: "#4dabf7" };
    case "water_tailings":
      return { ...base, color: "#ffd166", fillColor: "#ffd166" };
    default:
      return { ...base, color: "#ced4da", fillColor: "#ced4da" };
  }
}

// ===== Filter UI ===== //
const filterEl = document.getElementById("impactFilter");
if (filterEl){
  filterEl.addEventListener("change", (e) => {
    const want = e.target.value;
    markerLayer.clearLayers();
    ALL_MARKERS.forEach(m => {
      if (want === "all" || m.featureData.impact === want){
        m.addTo(markerLayer);
      }
    });
    updateStatsBox(want);
  });
}

// ===== Info panel ===== //
function updateInfoPanel(data){
  const panel = document.getElementById("infoPanel");
  panel.innerHTML = `
    <h3 style="margin-top:0">${data.name}</h3>
    <p><strong>Impact class:</strong> ${data.impact}</p>
    <p style="font-size:0.7rem;color:#a4acc2;">(A3 test) Ask: “Was it obvious that info would appear here?”</p>
  `;
}

function updateStatsBox(filterValue){
  const box = document.getElementById("map-stats");
  if (!box) return;
  const visible = ALL_MARKERS.filter(m => markerLayer.hasLayer(m)).length;
  const label = filterValue === "all" ? "All sites" : filterValue;
  box.textContent = `${visible} site(s) shown for filter: ${label}`;
}

// ===== Sidebar toggle (mobile) ===== //
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");
if (toggleBtn){
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}
