
window.onload = function () {
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  document.getElementById("date").value = formattedDate;

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  document.getElementById("outTime").value = getCurrentTime();

  const messageBox = document.getElementById("message");
  const loader = document.getElementById("loader");
  const loaderText = loader.querySelector("p"); // 👈 get <p> inside loader
  const attendanceForm = document.getElementById("attendanceForm");
  const submitButton = attendanceForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  const savedUser = JSON.parse(localStorage.getItem("userData"));
  const lastSubmission = JSON.parse(localStorage.getItem("lastSubmission"));

  if (savedUser) {
    document.getElementById("name").value = savedUser.name;
    document.getElementById("mobile").value = savedUser.mobile;
    document.getElementById("email").value = savedUser.email;
    document.getElementById("name").disabled = true;
    document.getElementById("mobile").disabled = true;
    document.getElementById("email").disabled = true;
  }

  if (lastSubmission && lastSubmission.date === formattedDate) {
    messageBox.innerText = "You have already submitted today's attendance!";
    messageBox.style.display = "block";
    attendanceForm.style.display = "none";
    return;
  }

  
  //Testing location
  // 21.132891629861884,79.11671430170571
 

 const ALLOWED_LOCATIONS = [
  { lat: 21.13092947063975, lng:79.11654813692904, radius: 100 }, // Tiranga Branch
  { lat: 21.115247212063938, lng: 79.01166670397053, radius: 100 },  // Bansi Branch 
    
];

// Distance formula (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ====== ASK LOCATION ON PAGE LOAD ======
if (navigator.geolocation) {
  loader.style.display = "flex";
  loaderText.innerText = "Checking your location...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      loader.style.display = "none";
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      let inAllowedArea = false;

      // ✅ Check if user is inside any allowed location
      for (const loc of ALLOWED_LOCATIONS) {
        const distance = getDistance(userLat, userLng, loc.lat, loc.lng);
        if (distance <= loc.radius) {
          inAllowedArea = true;
          break;
        }
      }

      if (inAllowedArea) {
        messageBox.innerText = "✅ You are in the allowed area. You can now submit the form.";
        messageBox.style.display = "block";
        submitButton.disabled = false;
      } else {
        messageBox.innerText = "❌ You are not in any allowed area. Submission disabled.";
        messageBox.style.display = "block";
        submitButton.disabled = true;
      }
    },
    (err) => {
      loader.style.display = "none";
      messageBox.innerText =
        "⚠️ Location access denied. Please enable GPS to continue.";
      messageBox.style.display = "block";
    }
  );
} else {
  messageBox.innerText =
    "⚠️ Geolocation is not supported by this browser.";
  messageBox.style.display = "block";
}


  // ====== MANUAL SUBMIT AFTER LOCATION ALLOWED ======
  attendanceForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (submitButton.disabled) {
      alert("❌ You cannot submit from this location.");
      return;
    }

    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const email = document.getElementById("email").value.trim();
    const date = document.getElementById("date").value;
    const inTime = document.getElementById("inTime").value.trim();
    const outTime = getCurrentTime();
    const topic = document.getElementById("topic").value.trim();
    const status = "Out";

    if (!name || !mobile || !email || !inTime || !topic) {
      messageBox.innerText = "⚠️ Please fill all fields before submitting!";
      messageBox.style.display = "block";
      return;
    }

    submitAttendance({ name, mobile, email, date, inTime, outTime, topic, status });
  });

  function submitAttendance(data) {
    localStorage.setItem(
      "userData",
      JSON.stringify({
        name: data.name,
        mobile: data.mobile,
        email: data.email,
      })
    );

    loader.style.display = "flex";
    loaderText.innerText = "Submitting..."; 
    messageBox.style.display = "none";
    submitButton.disabled = true;
    submitButton.innerText = "Submitting...";

    const formData = new FormData();
    
    // 1. Tell the backend WHICH action to run!
    formData.append("action", "markAttendance"); 
    
    Object.entries(data).forEach(([key, value]) =>
      formData.append(key, value)
    );

    // 2. REPLACE THIS URL with your Main Portal's Google Apps Script Web App URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjKBNIJIcGIgjT92A7BJLqKIDpbQBXTdFBLnZ7CPS7qBg_-4kttP5g0HRGne4e-EBc/exec"; 

    fetch(SCRIPT_URL, {
        method: "POST",
        body: formData,
      }
    )
      .then((res) => res.json())
      .then((result) => {
        loader.style.display = "none";
        submitButton.disabled = false;
        submitButton.innerText = "Submit";

        if (result.success) {
          localStorage.setItem(
            "lastSubmission",
            JSON.stringify({ date: data.date })
          );
          messageBox.innerText = "✅ Submitted Successfully!";
          messageBox.style.display = "block";
          attendanceForm.style.display = "none";
        } else {
          messageBox.innerText = "❌ Error: " + (result.message || result.error);
          messageBox.style.display = "block";
        }
      })
      .catch((err) => {
        loader.style.display = "none";
        submitButton.disabled = false;
        submitButton.innerText = "Submit";
        console.error("Error:", err);
        messageBox.innerText =
          "❌ Error submitting form. Please try again later.";
        messageBox.style.display = "block";
      });
  }
};
