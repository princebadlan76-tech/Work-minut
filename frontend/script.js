const fileInput = document.getElementById("fileInput");

const fileName = document.getElementById("fileName");

const resultBox = document.getElementById("resultBox");

const resultContent =
  document.getElementById("resultContent");

const statusText =
  document.getElementById("statusText");

const qualityBox =
  document.getElementById("qualityBox");


const API_URL =
  "https://work-minut.onrender.com";


fileInput.addEventListener("change", async function () {

  if (!this.files.length) {
    return;
  }


  const file = this.files[0];


  fileName.textContent =
    "Selected: " + file.name;


  resultBox.style.display = "block";

  statusText.textContent =
    "Processing...";


  resultContent.innerHTML = "";

  qualityBox.innerHTML = "";


  const formData = new FormData();

  formData.append("file", file);


  try {

    const response = await fetch(
      `${API_URL}/api/upload`,
      {
        method: "POST",
        body: formData
      }
    );


    const result =
      await response.json();


    if (!result.success) {

      statusText.textContent =
        "Failed";

      resultContent.innerHTML = `
        <div class="error-message">
          ${escapeHTML(
            result.error ||
            "Unable to process file."
          )}
        </div>
      `;

      return;
    }


    statusText.textContent =
      "Completed";


    displayQuality(
      result.data.quality_check
    );


    displayResult(
      result.data
    );


  } catch (error) {

    console.error(error);


    statusText.textContent =
      "Connection Error";


    resultContent.innerHTML = `
      <div class="error-message">
        Unable to connect to Work Minut server.
      </div>
    `;
  }

});


/* Quality Check */

function displayQuality(quality) {

  if (!quality) {
    return;
  }


  if (quality.passed) {

    qualityBox.innerHTML = `
      <div class="quality-box quality-pass">

        <strong>✓ Quality Check Passed</strong>

        <div>
          No missing values were detected.
        </div>

      </div>
    `;

    return;
  }


  let issuesHTML = "";

  quality.issues.forEach(issue => {

    issuesHTML += `
      <li>
        ${escapeHTML(issue)}
      </li>
    `;

  });


  qualityBox.innerHTML = `
    <div class="quality-box quality-warning">

      <strong>
        ⚠ Quality Check Found ${quality.total_issues} Issue(s)
      </strong>

      <ul>
        ${issuesHTML}
      </ul>

    </div>
  `;
}


/* Display Result */

function displayResult(data) {


  /* CSV / Excel */

  if (
    data.file_type === "csv" ||
    data.file_type === "excel"
  ) {

    const columns =
      data.columns || [];

    const rows =
      data.rows || [];


    if (!columns.length) {

      resultContent.innerHTML =
        "<p>No structured data found.</p>";

      return;
    }


    let table = `
      <div class="table-wrapper">

        <table class="result-table">

          <thead>

            <tr>
    `;


    columns.forEach(column => {

      table += `
        <th>
          ${escapeHTML(String(column))}
        </th>
      `;

    });


    table += `
            </tr>

          </thead>

          <tbody>
    `;


    rows.forEach(row => {

      table += "<tr>";


      columns.forEach(column => {

        const value =
          row[column] ?? "";


        table += `
          <td>
            ${escapeHTML(String(value))}
          </td>
        `;

      });


      table += "</tr>";

    });


    table += `
          </tbody>

        </table>

      </div>
    `;


    resultContent.innerHTML =
      table;


    return;
  }


  /* PDF / Word */

  if (
    data.file_type === "pdf" ||
    data.file_type === "word"
  ) {

    resultContent.innerHTML = `

      <p>
        Text extracted successfully.
      </p>

      <div class="text-result">
        ${escapeHTML(data.text || "")}
      </div>

    `;

    return;
  }


  /* Unsupported */

  resultContent.innerHTML = `

    <div class="error-message">

      ${escapeHTML(
        data.message ||
        "Unsupported file format."
      )}

    </div>

  `;
}


/* Security */

function escapeHTML(value) {

  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");
}
