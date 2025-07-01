const fs = require('fs');
const path = require('path');

console.log('🏭 CSV Generator starting...');

// Sample data arrays for generating realistic content
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Ashley', 'William', 'Jessica', 'Richard', 'Amanda', 'Joseph', 'Melissa', 'Thomas', 'Deborah', 'Christopher', 'Dorothy'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington'];
const companies = [
  'TechCorp',
  'DataSoft',
  'InnovateLabs',
  'GlobalTech',
  'NextGen Solutions',
  'CyberSystems',
  'QuantumWorks',
  'DigitalEdge',
  'FutureTech',
  'SmartSolutions',
  'CloudNine',
  'ByteForce',
  'CodeCraft',
  'TechFlow',
  'DataStream',
  'InfoTech',
  'SysCorp',
  'NetWorks',
  'DevSolutions',
  'TechVision',
];
const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'IT', 'Customer Service', 'Research', 'Development', 'Quality Assurance', 'Business Development', 'Legal', 'Procurement', 'Administration'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'company.com', 'email.com', 'outlook.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${getRandomElement(domains)}`;
}

function generateRandomDate(startYear = 1980, endYear = 2005) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function generateRandomSalary() {
  return Math.floor(Math.random() * 150000) + 30000; // $30k to $180k
}

function generateRandomPhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${exchange}-${number}`;
}

function generateCSVRow() {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const email = generateRandomEmail(firstName, lastName);
  const age = Math.floor(Math.random() * 40) + 22; // 22-62 years old
  const city = getRandomElement(cities);
  const company = getRandomElement(companies);
  const department = getRandomElement(departments);
  const salary = generateRandomSalary();
  const hireDate = generateRandomDate(2015, 2024);
  const phone = generateRandomPhoneNumber();
  const employeeId = 'EMP' + String(Math.floor(Math.random() * 100000)).padStart(5, '0');

  // Generate some additional fields to make rows longer
  const address = `${Math.floor(Math.random() * 9999) + 1} ${getRandomElement(['Main', 'Oak', 'Pine', 'Elm', 'Cedar', 'Maple', 'Park', 'First', 'Second', 'Third'])} ${getRandomElement(['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Way', 'Ct', 'Pl'])}`;
  const zipCode = String(Math.floor(Math.random() * 90000) + 10000);
  const performance = Math.floor(Math.random() * 5) + 1; // 1-5 rating
  const projects = Math.floor(Math.random() * 20) + 1;

  // Return CSV row with proper escaping for commas in fields
  return `"${firstName}","${lastName}","${email}",${age},"${city}","${company}","${department}",${salary},"${hireDate}","${phone}","${employeeId}","${address}","${zipCode}",${performance},${projects}`;
}

function estimateRowSize() {
  // Generate a sample row and measure its size
  const sampleRow = generateCSVRow();
  return Buffer.byteLength(sampleRow + '\n', 'utf8');
}

async function generateLargeCSV(fileName, targetSizeGB = 1.5) {
  const targetSizeBytes = targetSizeGB * 1024 * 1024 * 1024; // Convert GB to bytes

  console.log(`🎯 Target size: ${targetSizeGB} GB (${targetSizeBytes.toLocaleString()} bytes)`);

  // Estimate how many rows we need
  const avgRowSize = estimateRowSize();
  const estimatedRows = Math.floor(targetSizeBytes / avgRowSize);

  console.log(`📏 Average row size: ${avgRowSize} bytes`);
  console.log(`📊 Estimated rows needed: ${estimatedRows.toLocaleString()}`);

  // Define output path
  const outputPath = path.resolve('..', 'csv-data', `${fileName}.csv`);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }

  console.log(`📄 Output file: ${outputPath}`);
  console.log(`🚀 Starting generation...`);

  // Create write stream
  const writeStream = fs.createWriteStream(outputPath);

  // Handle stream events properly
  return new Promise((resolve, reject) => {
    writeStream.on('error', (error) => {
      console.error('❌ Write stream error:', error.message);
      reject(error);
    });

    writeStream.on('finish', async () => {
      console.log('✅ Write stream finished');

      try {
        // Get current file size
        let stats = fs.statSync(outputPath);
        let currentSize = stats.size;

        console.log(`📏 Generated size: ${(currentSize / 1024 / 1024 / 1024).toFixed(3)} GB`);
        console.log(`🎯 Target size: ${targetSizeGB} GB`);

        if (currentSize === targetSizeBytes) {
          console.log('🎉 Perfect size match!');
        } else if (currentSize > targetSizeBytes) {
          // File is too big - truncate it
          const excessBytes = currentSize - targetSizeBytes;
          console.log(`✂️  File too large by ${excessBytes} bytes, truncating...`);

          // Truncate to exact size
          const fd = fs.openSync(outputPath, 'r+');
          fs.ftruncateSync(fd, targetSizeBytes);
          fs.closeSync(fd);

          console.log('✂️  File truncated to exact size');
        } else {
          // File is too small - pad it
          const deficitBytes = targetSizeBytes - currentSize;
          console.log(`📝 File too small by ${deficitBytes} bytes, padding...`);

          // Append spaces to reach exact size
          const padding = ' '.repeat(deficitBytes);
          fs.appendFileSync(outputPath, padding);

          console.log('📝 File padded to exact size');
        }

        // Verify final size
        stats = fs.statSync(outputPath);
        const finalSize = stats.size;
        const finalGB = finalSize / 1024 / 1024 / 1024;

        console.log(`🎯 Final verification: ${finalGB.toFixed(6)} GB`);

        if (finalSize === targetSizeBytes) {
          console.log('✅ PERFECT SIZE MATCH! 🎯');
        } else {
          console.log(`⚠️  Size difference: ${finalSize - targetSizeBytes} bytes`);
        }

        resolve({
          fileName,
          sizeBytes: finalSize,
          sizeMB: parseFloat((finalSize / 1024 / 1024).toFixed(2)),
          sizeGB: parseFloat(finalGB.toFixed(6)),
          rowCount: currentRowCount,
          filePath: outputPath,
          wasAdjusted: finalSize !== currentSize,
          adjustmentType: finalSize > currentSize ? 'padded' : finalSize < currentSize ? 'truncated' : 'none',
        });
      } catch (error) {
        reject(error);
      }
    });

    // Write CSV header
    const header = 'first_name,last_name,email,age,city,company,department,salary,hire_date,phone,employee_id,address,zip_code,performance_rating,active_projects\n';
    writeStream.write(header);

    let currentSize = Buffer.byteLength(header, 'utf8');
    let currentRowCount = 0;
    let batchSize = 1000;
    let batch = '';

    // Generate slightly more data than needed (105% of target)
    const generationTarget = Math.floor(targetSizeBytes * 1.05);

    console.log(`📊 Generating ~105% of target (will adjust to exact size after)...`);

    // Generate data in batches
    const generateBatch = () => {
      try {
        // Generate a batch of rows
        for (let i = 0; i < batchSize; i++) {
          const row = generateCSVRow() + '\n';
          const rowSize = Buffer.byteLength(row, 'utf8');

          batch += row;
          currentSize += rowSize;
          currentRowCount++;

          // Stop when we have enough data (slightly more than target)
          if (currentSize >= generationTarget) {
            break;
          }
        }

        // Write the batch
        if (batch) {
          const success = writeStream.write(batch);
          batch = ''; // Clear batch

          // Update progress
          if (currentRowCount % 50000 === 0 || currentSize >= generationTarget) {
            const progressPercent = Math.min(100, Math.floor((currentSize / generationTarget) * 100));
            const currentMB = (currentSize / 1024 / 1024).toFixed(2);
            const targetMB = (generationTarget / 1024 / 1024).toFixed(2);

            // Create progress bar
            const barLength = 30;
            const filledLength = Math.floor((progressPercent / 100) * barLength);
            const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

            process.stdout.write(`\r🔄 Generating: [${bar}] ${progressPercent}% (${currentMB}/${targetMB} MB) - ${currentRowCount.toLocaleString()} rows`);
          }

          // Check if we're done generating
          if (currentSize >= generationTarget) {
            process.stdout.write('\n🏁 Generation complete, adjusting to exact size...\n');
            writeStream.end(); // This will trigger the 'finish' event
            return;
          }

          // Continue with next batch
          if (success) {
            setImmediate(generateBatch);
          } else {
            writeStream.once('drain', generateBatch);
          }
        } else {
          process.stdout.write('\n🏁 Generation complete, adjusting to exact size...\n');
          writeStream.end();
        }
      } catch (error) {
        console.error('❌ Error during batch generation:', error.message);
        writeStream.destroy();
        reject(error);
      }
    };

    // Start generation
    generateBatch();
  });
}

async function main() {
  console.log('🎬 CSV Generator started');

  // Get filename from command line arguments
  let fileName = process.argv[2];
  let targetSize = parseFloat(process.argv[3]) || 1.5; // Default 1.5GB

  if (!fileName) {
    console.error('❌ No filename provided!');
    console.log('📖 Usage: node generate-csv.js <filename> [size_in_GB]');
    console.log('📖 Examples:');
    console.log('   node generate-csv.js test_data');
    console.log('   node generate-csv.js large_dataset 2.0');
    console.log('   node generate-csv.js employee_records 0.5');
    process.exit(1);
  }

  // Validate target size
  if (isNaN(targetSize) || targetSize <= 0) {
    console.error('❌ Invalid file size! Must be a positive number.');
    console.log('📖 Examples: 0.1 (100MB), 1.5 (1.5GB), 2.4 (2.4GB)');
    process.exit(1);
  }

  // Remove .csv extension if provided
  if (fileName.endsWith('.csv')) {
    fileName = fileName.slice(0, -4);
    console.log(`📁 Cleaned filename: ${fileName}`);
  }

  console.log(`📝 Generating CSV file: ${fileName}.csv`);
  console.log(`🎯 Target size: ${targetSize} GB`);

  try {
    const startTime = Date.now();

    const result = await generateLargeCSV(fileName, targetSize);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n📊 Final stats:`);
    console.log(`   📄 File: ${result.fileName}.csv`);
    console.log(`   📏 Size: ${result.sizeGB} GB (${result.sizeMB} MB)`);
    console.log(`   📝 Rows: ${result.rowCount.toLocaleString()} (+ 1 header)`);
    console.log(`   📍 Location: ${result.filePath}`);
    console.log(`⏱️ Generation time: ${duration.toFixed(2)} seconds`);
    console.log(`🚀 Speed: ${(result.sizeMB / duration).toFixed(2)} MB/s`);
    console.log(`\n🎉 Ready to test with: node transform.js ${fileName}`);

    // Explicit exit to prevent hanging
    process.exit(0);
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the generator
main().catch((err) => {
  console.error('❌ FATAL ERROR:', err.message);
  process.exit(1);
});
