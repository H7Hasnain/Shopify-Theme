if (process.argv.length > 2) {
    const targetUrl = process.argv[2];
    console.log(JSON.stringify({ result: `hello ${targetUrl}` }));
} else {
    console.log(JSON.stringify({ result: "bye" }));
}
