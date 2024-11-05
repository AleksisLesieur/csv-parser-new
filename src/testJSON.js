const fs = require("fs");

async function isValidJSONStream(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: 1024 * 1024,
    });

    let buffer = "";
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let objectCount = 0;
    let currentObject = "";

    stream.on("data", (chunk) => {
      try {
        buffer += chunk;

        for (let i = 0; i < chunk.length; i++) {
          const char = chunk[i];
          currentObject += char;

          if (char === "\n") {
            if (currentObject.includes("}")) {
              try {
                // Try to parse current object to validate it
                JSON.parse(`[${currentObject.trim().replace(/,$/, "")}]`);
              } catch (err) {
                console.log("Error in line:", currentObject);
                resolve("no, there is an error: " + err.message);
                stream.destroy();
                return;
              }
            }
            currentObject = "";
          }

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === '"' && !escapeNext) {
            inString = !inString;
          } else if (char === "\\" && !escapeNext) {
            escapeNext = true;
          }

          if (!inString) {
            if (char === "{" || char === "[") {
              depth++;
            } else if (char === "}" || char === "]") {
              depth--;
            }

            if (depth < 0) {
              console.log("Error in line:", currentObject);
              resolve("no, there is an error: Unexpected closing bracket");
              stream.destroy();
              return;
            }
          }
        }
      } catch (error) {
        console.log("Error in line:", currentObject);
        resolve("no, there is an error: " + error.message);
        stream.destroy();
      }
    });

    stream.on("end", () => {
      if (depth !== 0) {
        console.log("Error in final line:", currentObject);
        resolve("no, there is an error: Unclosed brackets");
      } else {
        try {
          if (buffer.trim()) {
            JSON.parse(buffer);
          }
          resolve("it is valid");
        } catch (e) {
          console.log("Error in line:", currentObject);
          resolve("no, there is an error: " + e.message);
        }
      }
    });

    stream.on("error", (error) => {
      resolve("no, there is an error: " + error.message);
    });
  });
}

async function validateJSON(filePath) {
  try {
    const result = await isValidJSONStream(filePath);
    console.log(result);
  } catch (error) {
    console.log("no, there is an error: " + error.message);
  }
}

const fileName = process.argv[2];
validateJSON(`./../data/${fileName}.json`);
