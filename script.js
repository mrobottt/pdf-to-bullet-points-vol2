async function showBullets() {
  const fileInput = document.getElementById("pdfUpload");
  const bullets = document.getElementById("bullet-points");
  const loading = document.getElementById("loading");

  if (fileInput.files.length === 0) return;

  const file = fileInput.files[0];

  const formData = new FormData();
  formData.append("pdf", file);

  loading.style.display = "block";
  bullets.style.display = "none";

  try {
    const res = await fetch("https://pdf-to-bullet-points-vol2.onrender.com//upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    loading.style.display = "none";

    if (!res.ok) {
      alert("Error: " + data.error);
      return;
    }

    bullets.style.display = "block";

    bullets.innerHTML = `
      <h3>Extracted Points:</h3>
      <ul>
        ${data.bullets.map(point => `<li>${point}</li>`).join("")}
      </ul>
    `;

  } catch (err) {
    loading.style.display = "none";
    alert("Server not responding");
    console.error(err);
  }
}
