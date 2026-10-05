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

    fileName.textContent = "⏳ Processing " + file.name + "...";

    const formData = new FormData();
    formData.append("file", file);

    try {

      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        fileName.textContent = "❌ Processing failed";
        return;
      }

      fileName.textContent =
        "✅ " + file.name + " processed successfully";

      showResult(result.data);

    } catch (error) {

      console.error(error);

      fileName.textContent =
        "❌ Unable to connect to Work Minut server";
    }
  });
}


function showResult(data) {

  let oldResult = document.getElementById("result");

  if (oldResult) {
    oldResult.remove();
  }

  const resultBox = document.createElement("div");

  resultBox.id = "result";

  resultBox.style.maxWidth = "900px";
  resultBox.style.margin = "30px auto";
  resultBox.style.padding = "25px";
  resultBox.style.background = "white";
  resultBox.style.borderRadius = "15px";
  resultBox.style.boxShadow = "0 4px 15px rgba(0,0,0,0.05)";

  let html = "";

  html += `<h2>📊 Extracted Data</h2>`;

  html += `<p style="margin:10px 0;color:#6b7280;">
    File Type: ${data.file_type}
  </p>`;

  if (data.columns && data.rows) {

    html += `<div style="overflow-x:auto;margin-top:20px;">`;

    html += `<table style="width:100%;border-collapse:collapse;">`;

    html += `<thead><tr>`;

    data.columns.forEach(column => {
      html += `
        <th style="padding:12px;border-bottom:2px solid #ddd;text-align:left;">
          ${column}
        </th>
      `;
    });

    html += `</tr></thead>`;

    html += `<tbody>`;

    data.rows.forEach(row => {

      html += `<tr>`;

      data.columns.forEach(column => {

        html += `
          <td style="padding:10px;border-bottom:1px solid #eee;">
            ${row[column] ?? ""}
          </td>
        `;

      });

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;

  } else if (data.text) {

    html += `
      <pre style="
        margin-top:20px;
        padding:15px;
        background:#f5f7fb;
        border-radius:10px;
        white-space:pre-wrap;
        overflow:auto;
      ">${data.text}</pre>
    `;

  } else {

    html += `
      <p style="margin-top:20px;">
        No structured data found.
      </p>
    `;
  }

  resultBox.innerHTML = html;

  document.body.appendChild(resultBox);
}
