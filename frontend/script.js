const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

if (fileInput) {
  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      const file = this.files[0];

      fileName.textContent = "Selected: " + file.name;
    } else {
      fileName.textContent = "";
    }
  });
}
