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


// ==================================================
// FILE UPLOAD
// ==================================================

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


    aiStatus.innerHTML = `
      <div class="ai-status">
        🤖 AI is processing your file...
      </div>
    `;


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


      // ==========================================
      // RESPONSE CHECK
      // ==========================================

      if (!response.ok) {

        throw new Error(
          `Server returned HTTP ${response.status}`
        );

      }


      const result =
        await response.json();


      console.log(
        "Work Minut API Response:",
        result
      );


      // ==========================================
      // API FAILURE
      // ==========================================

      if (!result.success) {

        statusText.textContent =
          "Failed";


        resultContent.innerHTML = `
          <div class="error-message">

            <strong>
              File processing failed
            </strong>

            <br><br>

            ${escapeHTML(
              result.error ||
              "Unable to process file."
            )}

          </div>
        `;


        return;
      }


      // ==========================================
      // SUCCESS
      // ==========================================

      statusText.textContent =
        "Completed";


      const data =
        result.data;


      console.log(
        "Extracted Data:",
        data
      );


      // ==========================================
      // AI RESULT
      // ==========================================

      displayAI(
        data.ai_extraction
      );


      // ==========================================
      // QUALITY CHECK
      // ==========================================

      displayQuality(
        data.quality_check
      );


      // ==========================================
      // STRUCTURED DATA
      // ==========================================

      displayResult(
        data
      );


    } catch (error) {

      console.error(
        "Work Minut Error:",
        error
      );


      statusText.textContent =
        "Connection Error";


      aiStatus.innerHTML = `
        <div class="ai-status ai-disabled">

          ⚠ Work Minut server error

          <br><br>

          <strong>
            ${escapeHTML(
              error.message
            )}
          </strong>

        </div>
      `;


      resultContent.innerHTML = `
        <div class="error-message">

          Unable to complete the request.

          <br><br>

          <strong>
            ${escapeHTML(
              error.message
            )}
          </strong>

        </div>
      `;

    }

  }
);


// ==================================================
// AI DISPLAY
// ==================================================

function displayAI(ai) {

  // ----------------------------------------------
  // No AI response
  // ----------------------------------------------

  if (!ai) {

    aiStatus.innerHTML = `
      <div class="ai-status ai-disabled">

        ⚠ No AI response received.

      </div>
    `;

    return;
  }


  // ----------------------------------------------
  // AI disabled
  // ----------------------------------------------

  if (!ai.enabled) {

    aiStatus.innerHTML = `
      <div class="ai-status ai-disabled">

        ⚠ AI is not configured.

        <br><br>

        ${escapeHTML(
          ai.message || ""
        )}

      </div>
    `;

    return;
  }


  // ----------------------------------------------
  // AI ERROR
  // ----------------------------------------------

  if (ai.error) {

    aiStatus.innerHTML = `
      <div class="ai-status ai-disabled">

        ⚠ AI processing failed.

        <br><br>

        <strong>
          Actual Error:
        </strong>

        <br>

        <div style="
          margin-top:10px;
          padding:10px;
          background:#ffffff;
          border-radius:8px;
          word-break:break-word;
        ">

          ${escapeHTML(
            ai.error
          )}

        </div>

      </div>
    `;

    return;
  }


  // ----------------------------------------------
  // AI SUCCESS
  // ----------------------------------------------

  const score =
    ai.quality_score ?? 0;


  aiStatus.innerHTML = `
    <div class="ai-status">

      🤖 AI Extraction Completed

      <br><br>

      <strong>
        Quality Score:
        ${score}/100
      </strong>

    </div>
  `;
}


// ==================================================
// QUALITY CHECK
// ==================================================

function displayQuality(
  quality
) {

  if (!quality) {

    qualityBox.innerHTML =
      "";

    return;
  }


  // ----------------------------------------------
  // PASSED
  // ----------------------------------------------

  if (quality.passed) {

    qualityBox.innerHTML = `
      <div class="quality-box quality-pass">

        <strong>
          ✓ Quality Check Passed
        </strong>

        <div style="margin-top:6px;">

          No missing values detected.

        </div>

      </div>
    `;

    return;
  }


  // ----------------------------------------------
  // ISSUES
  // ----------------------------------------------

  let issuesHTML =
    "";


  const issues =
    quality.issues || [];


  issues.forEach(
    issue => {

      issuesHTML += `
        <li>
          ${escapeHTML(
            issue
          )}
        </li>
      `;

    }
  );


  qualityBox.innerHTML = `
    <div class="quality-box quality-warning">

      <strong>

        ⚠ ${quality.total_issues || issues.length}
        issue(s) detected

      </strong>

      ${
        issues.length
          ? `
            <ul>
              ${issuesHTML}
            </ul>
          `
          : ""
      }

    </div>
  `;
}


// ==================================================
// RESULT DISPLAY
// ==================================================

function displayResult(
  data
) {

  const ai =
    data.ai_extraction;


  // ----------------------------------------------
  // AI STRUCTURED DATA
  // ----------------------------------------------

  if (
    ai &&
    ai.enabled &&
    !ai.error &&
    Array.isArray(ai.columns) &&
    Array.isArray(ai.rows)
  ) {

    displayTable(
      ai.columns,
      ai.rows
    );

    return;
  }


  // ----------------------------------------------
  // ORIGINAL CSV / EXCEL DATA
  // ----------------------------------------------

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


  // ----------------------------------------------
  // PDF / WORD TEXT
  // ----------------------------------------------

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
        overflow-x:auto;
      ">

        ${escapeHTML(
          data.text || ""
        )}

      </div>

    `;

    return;
  }


  // ----------------------------------------------
  // UNKNOWN
  // ----------------------------------------------

  resultContent.innerHTML = `
    <div class="error-message">

      No structured data found.

    </div>
  `;
}


// ==================================================
// TABLE
// ==================================================

function displayTable(
  columns,
  rows
) {

  if (
    !columns ||
    !columns.length
  ) {

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


  // ----------------------------------------------
  // HEADERS
  // ----------------------------------------------

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


  // ----------------------------------------------
  // ROWS
  // ----------------------------------------------

  (rows || []).forEach(
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


// ==================================================
// HTML SECURITY
// ==================================================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )

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
