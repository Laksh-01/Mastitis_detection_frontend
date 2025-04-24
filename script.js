// Log function for debugging
function logMessage(message) {
  const logArea = document.getElementById("logArea");
  if (logArea) {
    if (logArea.children.length === 1 && logArea.children[0].textContent === "Logs will appear here...") {
      logArea.innerHTML = ""; // Clear placeholder
    }
    const p = document.createElement("p");
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logArea.appendChild(p);
    logArea.scrollTop = logArea.scrollHeight;
  } else {
    console.error("logArea element not found");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // MQTT Configuration
  const mqttHost = "be55c7a555ca4dd1bd6e5ed37a3e1cfe.s1.eu.hivemq.cloud";
  const mqttPort = 8884; // WebSocket secure port for HiveMQ Cloud
  const mqttUser = "hello";
  const mqttPass = "Laksh@4888";
  const clientId = "web-client-" + Math.random().toString(16).slice(3); // Unique client ID

  // Initialize Paho MQTT Client
  const client = new Paho.MQTT.Client(mqttHost, Number(mqttPort), "/mqtt", clientId);

  // Chart.js Setup for IUFL Trend
  const IUFLCtx = document.getElementById("IUFLChart").getContext("2d");
  const IUFLChart = new Chart(IUFLCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "IUFL",
        data: [],
        borderColor: "#e74c3c",
        backgroundColor: "rgba(231, 76, 60, 0.1)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Time" } },
        y: { title: { display: true, text: "IUFL" }, beginAtZero: true }
      },
      plugins: { legend: { display: true } }
    }
  });

  // Chart.js Setup for EUFL Trend
  const EUFLCtx = document.getElementById("EUFLChart").getContext("2d");
  const EUFLChart = new Chart(EUFLCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "EUFL",
        data: [],
        borderColor: "#3498db",
        backgroundColor: "rgba(52, 152, 219, 0.1)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Time" } },
        y: { title: { display: true, text: "EUFL" }, beginAtZero: true }
      },
      plugins: { legend: { display: true } }
    }
  });

  // Chart.js Setup for Temperature Trend
  const tempCtx = document.getElementById("temperatureChart").getContext("2d");
  const temperatureChart = new Chart(tempCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Temperature (°C)",
        data: [],
        borderColor: "#f1c40f",
        backgroundColor: "rgba(241, 196, 15, 0.1)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Time" } },
        y: { title: { display: true, text: "Temperature (°C)" }, beginAtZero: false, suggestedMin: 35, suggestedMax: 42 }
      },
      plugins: { legend: { display: true } }
    }
  });

  // Chart.js Setup for Months After Giving Birth Gauge
  const monthsAfterBirthCtx = document.getElementById("monthsAfterBirthGauge").getContext("2d");
  const monthsAfterBirthChart = new Chart(monthsAfterBirthCtx, {
    type: "doughnut",
    data: {
      labels: ["Months", "Remaining"],
      datasets: [{
        data: [0, 12],
        backgroundColor: ["#2ecc71", "#ecf0f1"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      cutout: "80%",
      rotation: -90,
      circumference: 180,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        title: {
          display: true,
          text: "Months After Birth",
          position: "bottom",
          font: { size: 16 }
        }
      }
    }
  });

  // Update status indicator based on thresholds
  function updateStatusIndicator(id, value, thresholds) {
    const statusElement = document.getElementById(id);
    if (!statusElement) return;

    let statusClass = "status-normal";
    if (thresholds.reverse) {
      if (thresholds.critical && value <= thresholds.critical) {
        statusClass = "status-critical";
      } else if (thresholds.warning && value <= thresholds.warning) {
        statusClass = "status-warning";
      }
    } else {
      if (thresholds.critical && value >= thresholds.critical) {
        statusClass = "status-critical";
      } else if (thresholds.warning && value >= thresholds.warning) {
        statusClass = "status-warning";
      }
    }
    statusElement.className = `status-indicator ${statusClass}`;
  }

  // MQTT Event Handlers
  client.onConnectionLost = (response) => {
    console.error("MQTT Connection lost:", response.errorMessage);
    logMessage(`Connection lost: ${response.errorMessage}`);
    setTimeout(() => {
      logMessage("Attempting to reconnect...");
      client.connect(connectOptions);
    }, 5000);
  };

  client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    let value;
    try {
      value = message.payloadString;
    } catch (e) {
      value = message.payloadBytes.toString();
      console.warn("Payload is not a string, converted to string:", value);
    }
    console.log(`Received - Topic: ${topic}, Value: ${value}`);
    logMessage(`Received - Topic: ${topic}, Value: ${value}`);

    try {
      const timestamp = new Date().toLocaleTimeString();
      // Handle topics with leading slash and case sensitivity
      const normalizedTopic = topic.replace(/^\//, "").toLowerCase(); // Remove leading slash and normalize

      if (normalizedTopic === "healthcheck/udder/iufl") {
        const element = document.getElementById("IUFL");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue)) {
            IUFLChart.data.labels.push(timestamp);
            IUFLChart.data.datasets[0].data.push(parsedValue);
            if (IUFLChart.data.labels.length > 20) {
              IUFLChart.data.labels.shift();
              IUFLChart.data.datasets[0].data.shift();
            }
            IUFLChart.update();
            updateStatusIndicator("IUFLStatus", parsedValue, { warning: 360, critical: 380 });
          }
        }
      } else if (normalizedTopic === "healthcheck/udder/eufl") {
        const element = document.getElementById("EUFL");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue)) {
            EUFLChart.data.labels.push(timestamp);
            EUFLChart.data.datasets[0].data.push(parsedValue);
            if (EUFLChart.data.labels.length > 20) {
              EUFLChart.data.labels.shift();
              EUFLChart.data.datasets[0].data.shift();
            }
            EUFLChart.update();
            updateStatusIndicator("EUFLStatus", parsedValue, { warning: 360, critical: 380 });
          }
        }
      } else if (normalizedTopic === "healthcheck/udder/iufr") {
        const element = document.getElementById("IUFR");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          updateStatusIndicator("IUFRStatus", parseFloat(value), { warning: 360, critical: 380 });
        }
      } else if (normalizedTopic === "healthcheck/udder/eufr") {
        const element = document.getElementById("EUFR");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          updateStatusIndicator("EUFRStatus", parseFloat(value), { warning: 360, critical: 380 });
        }
      } else if (normalizedTopic === "healthcheck/udder/iurl") {
        const element = document.getElementById("IURL");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          updateStatusIndicator("IURLStatus", parseFloat(value), { warning: 360, critical: 380 });
        }
      } else if (normalizedTopic === "healthcheck/udder/eurl") {
        const element = document.getElementById("EURL");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          updateStatusIndicator("EURLStatus", parseFloat(value), { warning: 360, critical: 380 });
        }
      } else if (normalizedTopic === "healthcheck/udder/iurr") {
        const element = document.getElementById("IURR");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          updateStatusIndicator("IURRStatus", parseFloat(value), { warning: 360, critical: 380 });
        }
      } else if (normalizedTopic === "healthcheck/udder/eurr") {
        const element = document.getElementById("EURR");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          updateStatusIndicator("EURRStatus", parseFloat(value), { warning: 360, critical: 380 });
        }
      } else if (normalizedTopic === "healthcheck/udder/temp") {
        const element = document.getElementById("temperature");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue)) {
            temperatureChart.data.labels.push(timestamp);
            temperatureChart.data.datasets[0].data.push(parsedValue);
            if (temperatureChart.data.labels.length > 20) {
              temperatureChart.data.labels.shift();
              temperatureChart.data.datasets[0].data.shift();
            }
            temperatureChart.update();
            updateStatusIndicator("temperatureStatus", parsedValue, { warning: 39, critical: 40 });
          }
        }
      } else if (normalizedTopic === "healthcheck/udder/monthsAfterBirth") {
        const element = document.getElementById("monthsAfterBirth");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue)) {
            monthsAfterBirthChart.data.datasets[0].data = [parsedValue, 12 - parsedValue];
            monthsAfterBirthChart.update();
            updateStatusIndicator("monthsAfterBirthStatus", parsedValue, { warning: 6, critical: 9 });
          }
        }
      } else if (normalizedTopic === "healthcheck/classification") {
        const element = document.getElementById("classification");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
          const suggestions = document.getElementById("suggestions");
          if (suggestions) {
            suggestions.style.display = value.toLowerCase().includes("mastitis") ? "block" : "none";
          }
          updateStatusIndicator("classificationStatus", value.toLowerCase().includes("mastitis") ? 1 : 0, { critical: 1 });
        }
      } else if (normalizedTopic === "healthcheck/confidence") {
        const element = document.getElementById("confidence");
        if (element) {
          element.innerText = value;
          element.parentElement.classList.add("updated");
          setTimeout(() => element.parentElement.classList.remove("updated"), 500);
        }
      } else {
        console.warn(`Unhandled topic: ${topic}`);
        logMessage(`Unhandled topic: ${topic}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      logMessage(`Error processing message: ${error.message}`);
    }
  };

  // Connect to MQTT Broker
  function onConnect() {
    console.log("Connected to MQTT broker");
    logMessage("Connected to MQTT broker");
    try {
      // Subscribe to all HealthCheck topics (with leading slash)
      client.subscribe("/HealthCheck/#", { qos: 0 }, (err) => {
        if (!err) {
          console.log("Successfully subscribed to /HealthCheck/#");
          logしっかりMessage("Successfully subscribed to /HealthCheck/#");
        } else {
          console.error("Subscription to /HealthCheck/# failed:", err);
          logMessage(`Subscription to /HealthCheck/# failed: ${err}`);
        }
      });
    } catch (error) {
      console.error("Error during subscription:", error);
      logMessage(`Error during subscription: ${error.message}`);
    }
  }

  // MQTT Connection Options
  const connectOptions = {
    onSuccess: onConnect,
    useSSL: true,
    userName: mqttUser,
    password: mqttPass,
    mqttVersion: 4, // MQTT 3.1.1
    keepAliveInterval: 60,
    timeout: 10,
    onFailure: (err) => {
      console.error("MQTT Connection failed:", err);
      logMessage(`MQTT Connection failed: ${err.errorMessage} (Code: ${err.errorCode})`);
      setTimeout(() => {
        logMessage("Attempting to reconnect...");
        client.connect(connectOptions);
      }, 5000);
    }
  };

  // Initial MQTT Connection
  logMessage("Page loaded, initializing MQTT...");
  console.log("Attempting MQTT connection to", mqttHost, "on port", mqttPort);
  client.connect(connectOptions);
});