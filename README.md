# CSV to JSON Parser Documentation

A powerful Node.js script that converts CSV files to JSON format with real-time progress tracking and optional database storage.

## 🚀 Features

- **Fast CSV Processing**: Handles large files (1GB+) efficiently using Node.js streams
- **Real-time Progress Bar**: Visual progress indicator showing processing percentage and MB processed
- **Universal Compatibility**: Works across Windows, Linux, and macOS with automatic line ending detection
- **Flexible Separator Detection**: Automatically detects CSV separators (comma, semicolon, pipe, tab)
- **Error Handling**: Comprehensive error reporting with detailed logs
- **Memory Efficient**: Processes files in chunks to handle large datasets without memory issues
- **JSON Validation**: Ensures proper JSON structure with field validation

## 📁 Project Structure

```
csv-parser-new/
├── src/
│   ├── transform.js      # Main parsing script
│   ├── logger.js         # Logging utility
│   └── database.js       # Database interface (optional)
├── csv-data/            # Input CSV files go here
├── dataJSON/            # Output JSON files
└── dataLog/             # Processing logs
```

## 🛠️ Installation

1. **Clone or download the project**
2. **Install Node.js** (version 14+ recommended)
3. **Install dependencies** (if any - this script uses only built-in Node.js modules)
4. **Place your CSV files** in the `csv-data/` folder

## 📖 Usage

### Basic Usage (Recommended)

```bash
# Navigate to the src directory
cd src

# Convert CSV to JSON (basic usage)
node transform.js filename

# Examples:
node transform.js large_dataset      # Processes large_dataset.csv
node transform.js sales_data         # Processes sales_data.csv
node transform.js customer_info.csv  # Processes customer_info.csv (extension optional)
```

### With Database Storage (BROKEN - Do Not Use)

```bash
# Save to database as well (BROKEN - only saves first 20MB)
node transform.js filename --saveDB
```

> 🚨 **Database Storage Is Broken**: The `--saveDB` flag exists but **DO NOT USE IT** because:
> - **Only saves the first 20MB** of your file - the rest is lost!
> - Database has size limits that truncate large files
> - No chunking mechanism implemented to handle large files properly
> - Data loss occurs silently without warning
> - JSON file output works perfectly and contains your complete data
> 
> **Always use the basic command without `--saveDB` to ensure you get your complete data.**

## 📊 File Processing

### Input Requirements
- **File Location**: Place CSV files in the `csv-data/` folder
- **Supported Formats**: `.csv` files with any of these separators:
  - Comma (`,`)
  - Semicolon (`;`)
  - Pipe (`|`)
  - Tab (`\t`)
- **File Size**: No practical limit (tested with multi-GB files)
- **Headers**: First row should contain column headers

### Output Format
- **Location**: JSON files saved in `dataJSON/` folder
- **Naming**: `filename.csv` → `filename.json`
- **Structure**: Array of JSON objects with headers as keys

### Example Conversion

**Input CSV** (`customer_data.csv`):
```csv
name,email,age,city
John Doe,john@email.com,25,New York
Jane Smith,jane@email.com,30,Los Angeles
```

**Output JSON** (`customer_data.json`):
```json
[
  {"name":"John Doe","email":"john@email.com","age":"25","city":"New York"},
  {"name":"Jane Smith","email":"jane@email.com","age":"30","city":"Los Angeles"}
]
```

## 📈 Progress Tracking

The script provides real-time feedback:

```
🚀 CSV Parser starting...
🎯 Main function started
📝 Processing file: large_dataset
📏 File size: 1536.07 MB
🔄 Starting pipeline...
📄 Processing without database save
🔄 Processing: [██████████████░░░░░░░░░░░░░░░░] 47% (722.15/1536.07 MB)
```

## 📝 Logging

### Automatic Logs
- **Location**: `dataLog/` folder
- **Filename**: `{input_filename}.log`
- **Contents**: Processing details, errors, performance metrics

### Log Information Includes:
- Processing start/end times
- File size and processing duration
- Header detection results
- Error messages (if any)
- Performance statistics

## ⚡ Performance

### Benchmarks
- **Large Files**: 1.5GB file processed in ~43 seconds
- **Memory Usage**: Consistent low memory usage due to streaming
- **Progress Updates**: Real-time without performance impact

### Optimization Features
- **Stream Processing**: Files processed in chunks, not loaded entirely into memory
- **Efficient JSON Generation**: Direct string building for optimal performance
- **Progress Throttling**: Updates every 1% to avoid terminal spam

## 🐛 Error Handling

### Common Issues and Solutions

**File Not Found**
```
❌ File not found: C:\path\to\csv-data\filename.csv
```
- Ensure the CSV file exists in the `csv-data/` folder
- Check filename spelling (case-sensitive on Linux/Mac)

**Invalid Headers**
```
⚠️ No valid separator found in headers
```
- Verify the first row contains proper headers
- Ensure file uses supported separators (`,` `;` `|` `\t`)

### Database Storage Issues
```
💾 Using DatabaseStream to save to database
⚠️ Warning: Only first 20MB saved to database, rest of data lost!
```
- **Current Issue**: Database storage truncates files at 20MB
- **Data Loss**: Anything beyond 20MB is silently discarded
- **No Fix Available**: Chunking mechanism not implemented
- **Solution**: Use JSON file output only (contains complete data)

## 🔧 Technical Details

### Dependencies
- **Built-in Node.js modules only**:
  - `fs` - File system operations
  - `stream` - Stream processing
  - `path` - Path utilities
  - `perf_hooks` - Performance timing

### Architecture
- **Transform Streams**: Uses Node.js Transform streams for memory-efficient processing
- **Chunked Processing**: Reads files in 1MB chunks
- **Universal Line Endings**: Handles `\n`, `\r\n`, and `\r` line endings
- **Field Cleaning**: Removes quotes and trims whitespace automatically

### Memory Management
- **Low Memory Footprint**: Processes files larger than available RAM
- **Garbage Collection Friendly**: Streams prevent memory accumulation
- **Buffer Management**: Efficient string concatenation for JSON building

## 📋 Best Practices

### File Preparation
1. **Clean Headers**: Ensure first row has clear, unique column names
2. **Consistent Data**: All rows should have the same number of columns
3. **Encoding**: Use UTF-8 encoding for special characters
4. **File Size**: No size limit, but larger files take longer to process

### Performance Tips
1. **Close Other Applications**: For very large files, free up system resources
2. **SSD Storage**: Faster disk I/O improves processing speed
3. **File Location**: Keep input/output folders on the same drive when possible

## 🆘 Troubleshooting

### Script Doesn't Start
- Check Node.js installation: `node --version`
- Verify you're in the `src/` directory
- Ensure `logger.js` and `database.js` exist in the same folder

### Progress Bar Issues
- Terminal compatibility: Use modern terminal (Windows Terminal, iTerm2, etc.)
- If progress bar appears garbled, the script still works - check output file

### Large File Processing
- **Be Patient**: Large files (1GB+) can take several minutes
- **Don't Interrupt**: Let the process complete - interruption may corrupt output
- **Check Disk Space**: Ensure sufficient space for output JSON file

## 📞 Support

For issues or questions:
1. Check the generated log files in `dataLog/` folder
2. Verify input file format and location
3. Ensure sufficient disk space and memory
4. Review error messages for specific guidance

## 🔄 Version History

- **Current**: Production-ready version with progress tracking
- **Features**: Real-time progress, universal compatibility, comprehensive error handling
- **Performance**: Optimized for large file processing

---

*This documentation covers the complete functionality of the CSV to JSON parser. For most users, the basic usage (without database storage) provides the best experience and simplest workflow.*
