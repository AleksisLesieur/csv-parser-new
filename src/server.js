// bandymas issisaugoti i postman'a deja nepavyko

// const express = require("express");
// const path = require("path");
// const fs = require("fs");
// const { parseCSVtoJSON } = require("./transform");
// const { Logger } = require("./logger");
// const Database = require("./database");

// const app = express();
// const port = process.env.PORT || 3000;
// const logMessage = new Logger();
// const db = new Database();

// app.post("/upload", async (req, res) => {
//   try {
//     const fileName = `upload_${Date.now()}`;
//     const tempInputPath = path.join(__dirname, "../csv-data", `${fileName}.csv`);
//     const tempOutputPath = path.join(__dirname, "../dataJSON", `${fileName}.json`);

//     // Create write stream for incoming file
//     const writeStream = fs.createWriteStream(tempInputPath);

//     // Handle potential errors on the request
//     req.on("error", (error) => {
//       logMessage.error(`Error receiving file: ${error.message}`);
//       res.status(500).json({ error: "Upload failed" });
//     });

//     // Handle the incoming file stream
//     req.pipe(writeStream);

//     writeStream.on("finish", async () => {
//       try {
//         // Initialize database
//         await db.initializeDatabase();

//         // Process the CSV file
//         await parseCSVtoJSON(tempInputPath, tempOutputPath, fileName, true);

//         // Respond to client
//         res.json({
//           message: "File processed successfully",
//           fileName: fileName,
//         });

//         // Clean up temporary CSV file
//         fs.unlink(tempInputPath, (err) => {
//           if (err) logMessage.error(`Error deleting temporary CSV file: ${err.message}`);
//         });

//         // Write log file
//         await saveLogFile(logMessage.savingFileName(fileName), logMessage.getData());
//       } catch (error) {
//         logMessage.error(`Error processing file: ${error.message}`);
//         res.status(500).json({
//           error: "Processing failed",
//           details: error.message,
//         });
//       }
//     });

//     writeStream.on("error", (error) => {
//       logMessage.error(`Error writing file: ${error.message}`);
//       res.status(500).json({ error: "Upload failed" });
//     });
//   } catch (error) {
//     logMessage.error(`Server error: ${error.message}`);
//     res.status(500).json({
//       error: "Server error",
//       details: error.message,
//     });
//   }
// });

// // Start the server
// app.listen(port, () => {
//   logMessage.info(`Server running on port ${port}`);
//   console.log(`Server is running on port ${port}`);
// });

// module.exports = app;
