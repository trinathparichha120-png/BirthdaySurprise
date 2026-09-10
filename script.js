// 0. Auto-fill template
function fillTemplate() {
    const template = document.getElementById("messageTemplate").value;
    const textBox = document.getElementById("bdayMessage");
    if (template !== "") textBox.value = template;
}
// 1. Generate the shareable link (With Image Upload!)
async function createBirthdayLink() {
    const bdayName = document.getElementById("bdayName").value.trim();
    const sender = document.getElementById("senderName").value.trim();
    const message = document.getElementById("bdayMessage").value.trim();
    const birthDate = document.getElementById("bdayDate").value; // optional, format YYYY-MM-DD
    const photoFile = document.getElementById("bdayPhoto").files[0];
    const btn = document.getElementById("generateBtn");

    if (!bdayName || !sender || !message) {
        alert("Please fill in all the text fields to create the gift!");
        return;
    }

    // Show loading state
    btn.innerText = "⏳ Wrapping Gift...";
    btn.disabled = true;

    let finalPhotoUrl = "";

    // Upload to ImgBB
    if (photoFile) {
        const formData = new FormData();
        formData.append("image", photoFile);
        // Using your specific ImgBB API Key
        const apiKey = 'd6572cc7df8598ddec0815512f6991a7';// here i not aplode the APi for sequrity
        
        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            finalPhotoUrl = data.data.url; 
        } catch (error) {
            alert("Photo upload failed, but we will create the card without it.");
        }
    }

    // Package the URL parameters safely
    const paramsObj = { n: bdayName, s: sender, m: message };
    if (finalPhotoUrl !== "") paramsObj.p = finalPhotoUrl;
    if (birthDate !== "") paramsObj.b = birthDate;

    const params = new URLSearchParams(paramsObj);
    const baseUrl = window.location.origin + window.location.pathname;
    const shareableLink = baseUrl + "?" + params.toString();

    // Show link and buttons
    document.getElementById("link-box").style.display = "flex";
    document.getElementById("finalLink").value = shareableLink;
    
    // Reset button
    btn.innerText = "✨ Generate Gift Link";
    btn.disabled = false;
}

// 2. The Unboxing Trigger (Confetti & Music!)
function openGift() {
    document.getElementById("tap-to-open").style.display = "none";
    document.getElementById("opened-card").style.display = "block";

    // Play the background music
    const audio = document.getElementById("bdayAudio");
    audio.play().catch(error => console.log("Audio play blocked by browser"));

    confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF6B6B', '#845EC2', '#FFC75F', '#F9F871']
    });

    // Fill the card with drifting sparkle particles for a premium glass feel
    createSparkles();
}

// 2b. Generate a handful of randomized floating sparkle particles
function createSparkles() {
    const container = document.getElementById("sparkles");
    if (!container) return;

    const sparkleCount = 22;
    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement("span");
        sparkle.className = "sparkle";

        const size = (Math.random() * 4 + 3).toFixed(1); // 3px - 7px
        const left = (Math.random() * 100).toFixed(1);   // 0% - 100%
        const duration = (Math.random() * 2 + 2.5).toFixed(2); // 2.5s - 4.5s
        const delay = (Math.random() * 4).toFixed(2);     // staggered starts

        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.left = `${left}%`;
        sparkle.style.animationDuration = `${duration}s`;
        sparkle.style.animationDelay = `${delay}s`;

        container.appendChild(sparkle);
    }
}

// 2c. Live "time alive" counter — updates every real second
function parseDateLocal(dateStr) {
    // Parses 'YYYY-MM-DD' as a LOCAL midnight date (avoids UTC off-by-one-day issues)
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0);
}

function updateAgeCounter(birthDate) {
    const now = new Date();

    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();
    let hours = now.getHours() - birthDate.getHours();
    let minutes = now.getMinutes() - birthDate.getMinutes();
    let seconds = now.getSeconds() - birthDate.getSeconds();

    if (seconds < 0) { seconds += 60; minutes--; }
    if (minutes < 0) { minutes += 60; hours--; }
    if (hours < 0) { hours += 24; days--; }
    if (days < 0) {
        // Borrow days from the previous calendar month
        const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        days += prevMonthLastDay;
        months--;
    }
    if (months < 0) { months += 12; years--; }

    document.getElementById("ageYears").innerText = years;
    document.getElementById("ageMonths").innerText = months;
    document.getElementById("ageDays").innerText = days;
    document.getElementById("ageHours").innerText = String(hours).padStart(2, "0");
    document.getElementById("ageMinutes").innerText = String(minutes).padStart(2, "0");
    document.getElementById("ageSeconds").innerText = String(seconds).padStart(2, "0");
}

function startAgeCounter(dateStr) {
    const birthDate = parseDateLocal(dateStr);
    if (isNaN(birthDate.getTime()) || birthDate > new Date()) return; // invalid or future date, skip silently

    document.getElementById("ageCounter").style.display = "block";
    updateAgeCounter(birthDate); // run immediately, don't wait 1s for first paint
    setInterval(() => updateAgeCounter(birthDate), 1000);
}

// 3. Copy Button Logic
function copyLink() {
    const linkInput = document.getElementById("finalLink");
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value).then(() => {
        alert("Gift link copied! Ready to share.");
    });
}

// 4. Native Share Button Logic
async function shareLink() {
    const linkInput = document.getElementById("finalLink").value;
    if (navigator.share) {
        try {
            await navigator.share({
                title: "You have a Birthday Gift! 🎁",
                text: "I made a special digital birthday unboxing for you. Tap to open it:",
                url: linkInput
            });
        } catch (error) {
            console.log("Share canceled.");
        }
    } else {
        alert("Direct sharing isn't supported here. Please use the Copy button!");
    }
}

// 5. Check URL on page load (Hide UI if receiving a gift)
window.onload = function() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has("n") && params.has("s") && params.has("m")) {
        // Hide creator form, show the floating gift box receiver UI
        document.getElementById("creator-ui").style.display = "none";
        document.getElementById("receiver-ui").style.display = "block";
        
        // Inject data into the hidden opened card
        document.getElementById("displayName").innerText = "Happy Birthday, " + params.get("n") + "!";
        document.getElementById("displayMessage").innerText = `"${params.get("m")}"`;
        document.getElementById("displaySender").innerText = "From: " + params.get("s");

        // Set photo if uploaded
        if (params.has("p")) {
            document.getElementById("displayPhoto").src = params.get("p");
        } else {
            // Hide the image circle if they didn't upload a photo
            document.getElementById("displayPhoto").style.display = "none";
        }

        // Start the live age counter if a birth date was provided
        if (params.has("b")) {
            startAgeCounter(params.get("b"));
        }
    }
}
