
(() => {
  if (document.getElementById("sos-launcher")) return;

  let mediaRecorder = null;
  let audioChunks = [];
  let audioUrl = null;
  let audioStream = null;

  // Emergency contact
  const EMERGENCY_PHONE = "7892863110";
  const EMERGENCY_WHATSAPP = "917892863110";

  const VIDEO_PATH =
    "./assets/videos/Girls%20SOSBUTTON%20safety%20tutorial%20(2).mp4";

  const SOS_MESSAGE =
    "🚨 GIRLS' SAFETY SOS ALERT 🚨\n\n" +
    "I need immediate assistance. I may be in an unsafe situation.\n" +
    "Please contact me and arrange help as soon as possible.\n\n" +
    "Institution Girls' Safety Alert.";

  const launcher = document.createElement("button");
  launcher.id = "sos-launcher";
  launcher.type = "button";
  launcher.textContent = "🆘 Girls’ Safety SOS";
  launcher.setAttribute("aria-label", "Open Girls' Safety SOS options");

  const overlay = document.createElement("div");
  overlay.id = "sos-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "sos-heading");

  overlay.innerHTML = `
    <section id="sos-panel">
      <button id="sos-close" type="button"
        aria-label="Close SOS">×</button>

      <h2 id="sos-heading">Girls’ Safety SOS</h2>
      <p>Choose the option that best fits your situation.</p>

      <div class="sos-demo-notice">
        IMPORTANT: Calls and messages require confirmation in your
        phone or messaging app. This website does not silently send alerts.
      </div>

      <div class="sos-actions">
        <button class="sos-action" data-sos="call" type="button">
          📞 Call Emergency Contact
          <small>Call ${EMERGENCY_PHONE}</small>
        </button>

        <button class="sos-action" data-sos="sms" type="button">
          💬 Emergency SMS
          <small>Prepare an emergency text message</small>
        </button>

        <button class="sos-action" data-sos="whatsapp" type="button">
          🟢 WhatsApp SOS
          <small>Open WhatsApp with a prepared message</small>
        </button>

        <button class="sos-action" data-sos="quick" type="button">
          🆘 Quick SOS
          <small>Copy an emergency message</small>
        </button>

        <button class="sos-action" data-sos="details" type="button">
          📝 Emergency Details
        </button>

        <button class="sos-action" data-sos="voice" type="button">
          🎙️ Voice SOS
        </button>

        <button class="sos-action" data-sos="tutorial" type="button">
          ▶ Watch Safety Tutorial
        </button>
      </div>

      <div id="sos-extra"></div>
      <div id="sos-message" role="status" aria-live="polite">
        Select an option to begin.
      </div>
    </section>
  `;

  document.body.append(launcher, overlay);

  const extra = overlay.querySelector("#sos-extra");
  const message = overlay.querySelector("#sos-message");

  function showMessage(text) {
    message.textContent = text;
  }

  function openSOS() {
    overlay.classList.add("sos-open");
    overlay.querySelector("#sos-close").focus();
  }

  function closeSOS() {
    overlay.classList.remove("sos-open");
    launcher.focus();
  }

  function sendWhatsApp(text = SOS_MESSAGE) {
    const url =
      "https://wa.me/" +
      EMERGENCY_WHATSAPP +
      "?text=" +
      encodeURIComponent(text);

    window.open(url, "_blank", "noopener,noreferrer");
    showMessage("WhatsApp opened if available. Please review and press Send.");
  }

  function sendSMS(text = SOS_MESSAGE) {
    window.location.href =
      "sms:" + EMERGENCY_PHONE +
      "?body=" + encodeURIComponent(text);
  }

  function stopAudioStream() {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }
  }

  function clearAudioUrl() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = null;
    }
  }

  launcher.addEventListener("click", openSOS);

  overlay.querySelector("#sos-close")
    .addEventListener("click", closeSOS);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeSOS();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" &&
        overlay.classList.contains("sos-open")) {
      closeSOS();
    }
  });

  overlay.querySelectorAll("[data-sos]").forEach(button => {
    button.addEventListener("click", async () => {
      const option = button.dataset.sos;
      extra.replaceChildren();

      // CALL
      if (option === "call") {
        window.location.href = "tel:" + EMERGENCY_PHONE;
        return;
      }

      // SMS
      if (option === "sms") {
        sendSMS();
        return;
      }

      // WHATSAPP
      if (option === "whatsapp") {
        sendWhatsApp();
        return;
      }

      // QUICK SOS: copy message
      if (option === "quick") {
        const heading = document.createElement("h3");
        heading.textContent = "Quick SOS Message";

        const textarea = document.createElement("textarea");
        textarea.readOnly = true;
        textarea.value = SOS_MESSAGE;
        textarea.setAttribute("aria-label", "Emergency message");

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "sos-action";
        copyButton.textContent = "Copy message";

        copyButton.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(SOS_MESSAGE);
            showMessage("Message copied. Choose a contact to send it to.");
          } catch {
            textarea.select();
            showMessage("Select the text and copy it manually.");
          }
        });

        const whatsappButton = document.createElement("button");
        whatsappButton.type = "button";
        whatsappButton.className = "sos-action";
        whatsappButton.textContent = "Open WhatsApp";
        whatsappButton.addEventListener("click", () => sendWhatsApp());

        extra.append(heading, textarea, copyButton, whatsappButton);
        showMessage("Review the message before sending.");
      }

      // EMERGENCY DETAILS
      if (option === "details") {
        extra.innerHTML = `
          <h3>Emergency Details</h3>

          <form id="sos-details-form">
            <label for="sos-type">Incident type</label>
            <select id="sos-type" required>
              <option value="">Choose an incident</option>
              <option>Feeling unsafe</option>
              <option>Harassment</option>
              <option>Medical emergency</option>
              <option>Being followed</option>
              <option>Other emergency</option>
            </select>

            <label for="sos-description">What happened?</label>
            <textarea id="sos-description" maxlength="1000"
              placeholder="Describe what happened" required></textarea>

            <label for="sos-location">Location (optional)</label>
            <input id="sos-location" maxlength="200"
              placeholder="Enter only if safe">

            <div class="sos-form-actions">
              <button type="submit">Continue to WhatsApp</button>
            </div>
          </form>
        `;

        extra.querySelector("#sos-details-form").addEventListener(
          "submit", event => {
            event.preventDefault();

            const incident = extra.querySelector("#sos-type").value;
            const description =
              extra.querySelector("#sos-description").value.trim();
            const location =
              extra.querySelector("#sos-location").value.trim();

            const detailsMessage =
              SOS_MESSAGE + "\n\n" +
              "Incident: " + incident + "\n" +
              "Details: " + description + "\n" +
              "Location: " + (location || "Not provided");

            sendWhatsApp(detailsMessage);
          }
        );

        showMessage("Share only information you feel safe providing.");
      }

      // VOICE SOS: local recording only
      if (option === "voice") {
        extra.innerHTML = `
          <h3>Voice SOS</h3>
          <p>Record a short audio message on this device.</p>
          <p>The recording is not automatically sent to anyone.</p>

          <div class="sos-form-actions">
            <button id="sos-record" type="button">Start recording</button>
            <button id="sos-stop" type="button" disabled>
              Stop recording
            </button>
          </div>

          <div id="sos-audio-result"></div>
        `;

        const recordButton = extra.querySelector("#sos-record");
        const stopButton = extra.querySelector("#sos-stop");
        const result = extra.querySelector("#sos-audio-result");

        recordButton.addEventListener("click", async () => {
          if (!navigator.mediaDevices?.getUserMedia ||
              !window.MediaRecorder) {
            showMessage("Audio recording is not supported in this browser.");
            return;
          }

          try {
            clearAudioUrl();
            audioChunks = [];

            audioStream =
              await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorder = new MediaRecorder(audioStream);

            mediaRecorder.addEventListener("dataavailable", event => {
              if (event.data.size > 0) audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", () => {
              const blob = new Blob(audioChunks, {
                type: mediaRecorder.mimeType || "audio/webm"
              });

              audioUrl = URL.createObjectURL(blob);

              result.replaceChildren();

              const player = document.createElement("audio");
              player.controls = true;
              player.style.width = "100%";
              player.src = audioUrl;

              const download = document.createElement("a");
              download.href = audioUrl;
              download.download = "sos-recording.webm";
              download.textContent = "Download recording";

              result.append(player, download);

              stopAudioStream();
              recordButton.disabled = false;
              stopButton.disabled = true;
              showMessage("Recording ready on this device. It was not sent.");
            });

            mediaRecorder.start();
            recordButton.disabled = true;
            stopButton.disabled = false;
            showMessage("Recording. Press Stop when finished.");
          } catch {
            stopAudioStream();
            showMessage("Microphone unavailable. Check browser permissions.");
          }
        });

        stopButton.addEventListener("click", () => {
          if (mediaRecorder?.state === "recording") {
            mediaRecorder.stop();
          }
        });
      }

      // SAFETY TUTORIAL
      if (option === "tutorial") {
        const heading = document.createElement("h3");
        heading.textContent = "Girls' Safety SOS Tutorial";

        const description = document.createElement("p");
        description.textContent =
          "Watch this video to learn how to use the SOS options.";

        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.style.cssText =
          "display:block;width:100%;max-height:320px;" +
          "background:#000;border-radius:10px;";

        const source = document.createElement("source");
        source.src = VIDEO_PATH;
        source.type = "video/mp4";
        video.appendChild(source);

        video.addEventListener("error", () => {
          showMessage(
            "Video could not load. Check the file path and MP4 format."
          );
        });

        extra.append(heading, description, video);
        video.load();
        showMessage("Tutorial ready. Press Play to watch.");
      }
    });
  });

  window.addEventListener("pagehide", () => {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
    }

    stopAudioStream();
    clearAudioUrl();
  });
})();
