const fileInput =
  document.getElementById("fileInput");

const fileName =
  document.getElementById("fileName");

const resultBox =
  document.getElementById("resultBox");

const resultContent =
  document.getElementById("resultContent");

const statusText =
  document.getElementById("statusText");

const qualityBox =
  document.getElementById("qualityBox");

const aiStatus =
  document.getElementById("aiStatus");


const API_URL =
  "https://work-minut.onrender.com";


fileInput.addEventListener(
  "change",
  async function () {

    if (!this.files.length) {
      return;
    }


    const file =
      this.files[0];


    fileName.textContent =
      "Selected: " + file.name;


    resultBox.style.display =
      "block";


    statusText.textContent =
      "Processing...";


    resultContent.innerHTML =
      "";


    qualityBox.innerHTML =
      "";


    aiStatus.innerHTML =
      "";


    const formData =
      new FormData();


    formData.append(
      "file",
      file
    );


    try {

      const response =
        await fetch(
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


      const data =
        result.data;


      displayAI(
        data.ai_extraction
      );


      displayQuality(
        data.quality_check
      );


      displayResult(
        data
      );


    } catch (error) {

      console.error(error);


      statusText.textContent =
        "Connection Error";


      resultContent.innerHTML = `
        <div class="error-message">
          Unable to connect to
          Work Minut server.
        </div>
      `;
    }

  }
);


function displayAI(ai) {

  if (!ai) {
    return;
  }


  if (!ai.enabled) {

    aiStatus.innerHTML = `
      <div class="ai-status ai-disabled">

        ⚠ AI is not configured.

      </div>
    `;

    return;
  }


  if (ai.error) {

    aiStatus.innerHTML = `
      <div class="ai-status ai-disabled">

        AI processing failed.

      </div>
    `;

    return;
  }


  const score =
    ai.quality_score ?? 0;


  aiStatus.innerHTML = `
    <div class="ai-status">

      🤖 AI Extraction Completed

      &nbsp;

      <strong>
        Quality Score: ${score}/100
      </strong>

    </div>
  `;
}


function displayQuality(
  quality
) {

  if (!quality) {
    return;
  }


  if (quality.passed) {

    qualityBox.innerHTML = `
      <div class="quality-box quality-pass">

        <strong>
          ✓ Quality Check Passed
        </strong>

        <div>
          No missing values detected.
        </div>

      </div>
    `;

    return;
  }


  let issuesHTML =
    "";


  quality.issues.forEach(
    issue => {

      issuesHTML += `
        <li>
          ${escapeHTML(issue)}
        </li>
      `;

    }
  );


  qualityBox.innerHTML = `
    <div class="quality-box quality-warning">

      <strong>
        ⚠ ${quality.total_issues}
        issue(s) detected
      </strong>

      <ul>
        ${issuesHTML}
      </ul>

    </div>
  `;
}


function displayResult(
  data
) {

  const ai =
    data.ai_extraction;


  if (
    ai &&
    ai.enabled &&
    !ai.error &&
    ai.columns &&
    ai.rows
  ) {

    displayTable(
      ai.columns,
      ai.rows
    );

    return;
  }


  if (
    data.file_type === "csv" ||
    data.file_type === "excel"
  ) {

    displayTable(
      data.columns || [],
      data.rows || []
    );

    return;
  }


  if (
    data.file_type === "pdf" ||
    data.file_type === "word"
  ) {

    resultContent.innerHTML = `

      <p>
        Text extracted successfully.
      </p>

      <div style="
        margin-top:15px;
        padding:15px;
        background:#f8fafc;
        border-radius:10px;
        white-space:pre-wrap;
      ">
        ${escapeHTML(
          data.text || ""
        )}
      </div>

    `;

    return;
  }


  resultContent.innerHTML = `
    <div class="error-message">
      No structured data found.
    </div>
  `;
}


function displayTable(
  columns,
  rows
) {

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


  columns.forEach(
    column => {

      table += `
        <th>
          ${escapeHTML(
            String(column)
          )}
        </th>
      `;

    }
  );


  table += `
          </tr>

        </thead>

        <tbody>
  `;


  rows.forEach(
    row => {

      table += "<tr>";


      columns.forEach(
        column => {

          const value =
            row[column] ?? "";


          table += `
            <td>
              ${escapeHTML(
                String(value)
              )}
            </td>
          `;

        }
      );


      table += "</tr>";

    }
  );


  table += `
        </tbody>

      </table>

    </div>
  `;


  resultContent.innerHTML =
    table;
}


function escapeHTML(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}
