/**
 * This script runs in a Node.js environment and accesses command-line
 * arguments passed to it via the 'process.argv' array.
 *
 * In a Node.js execution:
 * process.argv[0] is the path to the 'node' executable.
 * process.argv[1] is the path to this script file (run_script.js).
 * process.argv[2] is the FIRST argument passed (e.g., the URL).
 */

// We check if the array length is 3 or more, meaning an argument (the URL) is present at index 2.
if (process.argv.length > 2) {
    // Extract the URL from the third position (index 2)
    const targetUrl = process.argv[2];

    // Use a template literal (backticks) for clean string formatting
    console.log(`hello ${targetUrl}`);
} else {
    // If no argument was passed
    console.log("bye");
}
