const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

const resultBox = document.getElementById("resultBox");
const resultContent = document.getElementById("resultContent");
const statusText = document.getElementById("statusText");

const API_URL = "https://work-minut.onrender.com";

fileInput.addEventListener("change", async function () {

  if (!this.files.length) {
    return;
  }

  const file = this.files[0];

  fileName.textContent = "Selected: " + file.name;

  resultBox.style.display = "block";
  statusText.textContent = "Processing...";
  resultContent.innerHTML = "";

  const formData = new FormData();
  formData.append("file", file);

  try {

    const response = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!result.success) {

      statusText.textContent = "Failed";

      resultContent.innerHTML = `
        <div class="error-message">
          ${result.error || "Unable to process file."}
        </div>
      `;

      return;
    }

    statusText.textContent = "Completed";

    displayResult(result.data);

  } catch (error) {

    console.error(error);

    statusText.textContent = "Connection Error";

    resultContent.innerHTML = `
      <div class="error-message">
        Unable to connect to Work Minut server.
      </div>
    `;
  }
});


function displayResult(data) {

  if (data.file_type === "csv" || data.file_type === "excel") {

    const columns = data.columns || [];
    const rows = data.rows || [];

    if (!columns.length) {
      resultContent.innerHTML = "<p>No structured data found.</p>";
      return;
    }

    let table = `
      <div class="table-wrapper">
        <table class="result-table">
          <thead>
            <tr>
    `;

    columns.forEach(column => {
      table += `<th>${escapeHTML(column)}</th>`;
    });

    table += `
            </tr>
          </thead>
          <tbody>
    `;

    rows.forEach(row => {

      table += "<tr>";

      columns.forEach(column => {

        const value = row[column] ?? "";

        table += `<td>${escapeHTML(String(value))}</td>`;

      });

      table += "</tr>";

    });

    table += `
          </tbody>
        </table>
      </div>
    `;

    resultContent.innerHTML = table;

    return;
  }


  if (data.file_type === "pdf" || data.file_type === "word") {

    resultContent.innerHTML = `
      <div class="table-wrapper">
        <p>
          Text extracted successfully.
        </p>

        <pre style="
          white-space: pre-wrap;
          margin-top: 15px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 10px;
        ">${escapeHTML(data.text || "")}</pre>
      </div>
    `;

    return;
  }


  resultContent.innerHTML = `
    <div class="error-message">
      ${escapeHTML(data.message || "Unsupported file format.")}
    </div>
  `;
}


function escapeHTML(value) {

  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
