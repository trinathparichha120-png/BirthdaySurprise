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
// here i not aplode the APi for sequrity
        
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

// NEW: Moves from the mystery intro to the gift box screen
function startUnboxing() {
    document.getElementById("mystery-intro").style.display = "none";
    document.getElementById("tap-to-open").style.display = "block";
}

// NEW: Highlights the current step in the story progress indicator (1-4)
function setStoryStep(n) {
    document.querySelectorAll(".story-progress .step").forEach(step => {
        const stepNum = parseInt(step.dataset.step, 10);
        step.classList.remove("active", "done");
        if (stepNum < n) step.classList.add("done");
        if (stepNum === n) step.classList.add("active");
    });
}

// 2. Tapping the gift box moves to the candle-blowing stage
function openGift() {
    const box = document.getElementById("tap-to-open");
    box.classList.add("box-tapped"); // brief shake + glow burst before transitioning
    setStoryStep(2);

    setTimeout(() => {
        box.style.display = "none";
        document.getElementById("cake-stage").style.display = "block";
        initCandleBlow();
    }, 350);
}

// --- Mic-reactive candle blowing ---
let audioCtx, analyser, micStream, blowRAF;
let blowMeter = 0;
let idlePhase = 0;
let smoothedVolume = 0;
const BLOW_THRESHOLD = 0.14;   // volume level counted as "blowing" — tweak if too sensitive/insensitive
const BLOW_METER_MAX = 100;    // how much sustained blowing is needed to fully extinguish

async function initCandleBlow() {
    const micStatus = document.getElementById("micStatus");
    const fallbackBtn = document.getElementById("fallbackBlowBtn");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        micStatus.innerText = "🎤 Mic not supported on this browser — use the button below.";
        fallbackBtn.style.display = "block";
        setStoryStep(3);
        startIdleFlicker();
        return;
    }

    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        micStatus.innerText = "🎤 Blow into your mic now!";
        setStoryStep(3);
        blowLoop();
    } catch (err) {
        micStatus.innerText = "🎤 Mic access denied — use the button below instead.";
        fallbackBtn.style.display = "block";
        setStoryStep(3);
        startIdleFlicker();
    }
}

// Drives the 5-bar waveform display from live mic volume, each bar varying slightly for a natural look
function updateWaveform(volume) {
    const bars = document.querySelectorAll(".wave-bar");
    bars.forEach((bar, i) => {
        const variation = 0.7 + Math.sin(idlePhase * 2 + i * 1.7) * 0.3; // each bar bounces slightly out of sync
        const height = Math.max(6, Math.min(volume * 260 * variation, 32));
        bar.style.height = `${height}px`;
    });
}

// Runs every animation frame while the mic is active
function blowLoop() {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    // RMS (root-mean-square) volume: 0 = silence, higher = louder
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
        const centered = (data[i] - 128) / 128;
        sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / data.length);

    // Smooth so the flame doesn't jitter frame-to-frame
    smoothedVolume += (rms - smoothedVolume) * 0.3;

    animateFlame(smoothedVolume);
    updateWaveform(smoothedVolume);

    // More/longer blowing fills the meter faster; it also drains slowly when you stop
    if (smoothedVolume > BLOW_THRESHOLD) {
        blowMeter += smoothedVolume * 8;
    } else {
        blowMeter -= 1.5;
    }
    blowMeter = Math.max(0, Math.min(BLOW_METER_MAX, blowMeter));

    if (blowMeter >= BLOW_METER_MAX) {
        extinguishCandle();
        return;
    }

    blowRAF = requestAnimationFrame(blowLoop);
}

// Maps live mic volume to how the flames look: tilt, shrink, and dim as "air" hits them
function animateFlame(volume) {
    idlePhase += 0.15;

    const flames = document.querySelectorAll(".flame");
    const smokes = document.querySelectorAll(".smoke");

    flames.forEach((flame, i) => {
        const idleWobble = Math.sin(idlePhase + i * 1.4) * 2; // each candle wobbles slightly out of sync, like real flames
        const skew = Math.min(volume * 180, 55) + idleWobble;
        const shrink = Math.max(1 - volume * 1.4, 0.15);
        const offsetX = Math.min(volume * 60, 18);
        const opacity = Math.max(1 - volume * 1.2, 0.25);

        flame.style.transform = `translateX(calc(-50% + ${offsetX}px)) skewX(${skew}deg) scaleY(${shrink})`;
        flame.style.opacity = opacity;
    });

    smokes.forEach(smoke => {
        smoke.style.opacity = Math.min(volume * 1.5, 0.6);
    });
}

// Used when mic isn't available at all — just a gentle idle flicker, no reactivity
function startIdleFlicker() {
    function tick() {
        idlePhase += 0.1;
        document.querySelectorAll(".flame").forEach((flame, i) => {
            const idleWobble = Math.sin(idlePhase + i * 1.4) * 3;
            flame.style.transform = `translateX(-50%) skewX(${idleWobble}deg)`;
        });
        blowRAF = requestAnimationFrame(tick);
    }
    tick();
}

// Candle goes out — smoothly fade all flames, puff some smoke, then reveal the card
function extinguishCandle() {
    if (blowRAF) cancelAnimationFrame(blowRAF);
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    if (audioCtx) audioCtx.close();

    document.querySelectorAll(".flame").forEach(flame => {
        flame.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        flame.style.opacity = "0";
        flame.style.transform = "translateX(-50%) scaleY(0.1)";
    });

    document.querySelectorAll(".smoke").forEach(smoke => {
        smoke.style.transition = "opacity 1.2s ease, transform 1.2s ease";
        smoke.style.opacity = "0.7";
        smoke.style.transform = "translateX(-50%) translateY(-60px)";
    });

    document.getElementById("micStatus").innerText = "🎉 Wish made!";

    playPuffSound();

    setTimeout(revealCard, 1200);
}

// Generates a short "puff of air" whoosh sound live — no audio file required
function playPuffSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 0.4;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Decaying white noise = the "puff" texture
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Sweep the tone downward so it sounds like air trailing off, not static
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1500, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + duration);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + duration);
    } catch (e) {
        console.log("Puff sound unavailable:", e);
    }
}

// 2b. Reveal the birthday card — this is the old openGift logic, now triggered after the candle
function revealCard() {
    document.getElementById("cake-stage").style.display = "none";
    document.getElementById("opened-card").style.display = "block";
    setStoryStep(4);

    const audio = document.getElementById("bdayAudio");
    audio.play().catch(error => console.log("Audio play blocked by browser"));

    // NEW: fade in the fireworks GIF background and play the firework burst sound
    document.getElementById("fireworks-bg").classList.add("active");
    const fireworkAudio = document.getElementById("fireworkAudio");
    fireworkAudio.play().catch(error => console.log("Firework audio blocked by browser"));

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

    // Respect reduced-motion preference entirely — skip the decorative particles
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Lighter devices (few CPU cores reported) get fewer particles to stay smooth
    const isLikelyLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const sparkleCount = isLikelyLowEnd ? 12 : 22;
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
