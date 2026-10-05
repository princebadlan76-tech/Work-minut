const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

const API_URL = "https://work-minut.onrender.com";

if (fileInput) {
  fileInput.addEventListener("change", async function () {
    if (!this.files.length) {
      fileName.textContent = "";
      return;
    }

    const file = this.files[0];

    fileName.textContent = "Uploading: " + file.name + "...";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        fileName.textContent =
          "✅ File uploaded: " + result.filename;
      } else {
        fileName.textContent =
          "❌ Upload failed";
      }

    } catch (error) {
      console.error(error);

      fileName.textContent =
        "❌ Unable to connect to Work Minut server";
    }
  });
}
