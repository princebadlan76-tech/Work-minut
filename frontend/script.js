const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

const resultBox = document.getElementById("resultBox");
const resultStatus = document.getElementById("resultStatus");
const resultContent = document.getElementById("resultContent");

const API_URL = "https://work-minut.onrender.com";

fileInput.addEventListener("change", async function () {

  if (!this.files.length) {
    fileName.textContent = "";
    return;
  }

  const file = this.files[0];

  fileName.textContent = "⏳ Processing: " + file.name;

  resultBox.style.display = "block";
  resultStatus.textContent = "⏳ Extracting data...";
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
      throw new Error(result.error || "Processing failed");
    }

    fileName.textContent = "✅ Processed: " + file.name;

    resultStatus.textContent = "✅ Data extracted successfully";

    displayResult(result.data);

  } catch (error) {

    console.error(error);

    resultStatus.textContent =
      "❌ " + error.message;

    resultContent.innerHTML = "";
  }
});


function displayResult(data) {

  // Excel / CSV
  if (
    (data.file_type === "excel" || data.file_type === "csv") &&
    data.rows
  ) {

    if (!data.rows.length) {
      resultContent.innerHTML = "<p>No data found.</p>";
      return;
    }

    const columns = data.columns;

    let table = `
      <div class="table-wrapper">
        <table>
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

    data.rows.forEach(row => {

      table += "<tr>";

      columns.forEach(column => {

        const value = row[column] ?? "";

        table += `
          <td>${escapeHTML(String(value))}</td>
        `;
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


  // PDF / Word
  if (data.text) {

    resultContent.innerHTML = `
      <div class="text-result">
        <pre>${escapeHTML(data.text)}</pre>
      </div>
    `;

    return;
  }


  resultContent.innerHTML = `
    <p>No structured data found.</p>
  `;
}


function escapeHTML(value) {

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
