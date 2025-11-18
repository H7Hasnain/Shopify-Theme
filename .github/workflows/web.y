name: Web Scraper
on:
workflow_dispatch:
inputs:
target_url:
description: "URL to scrape"
required: true
type: string


jobs:
scrape:
runs-on: ubuntu-latest
steps:
- name: Checkout repo
uses: actions/checkout@v3


- name: Setup Node.js
uses: actions/setup-node@v3
with:
node-version: 18


- name: Install dependencies
run: npm install


- name: Run scraper
run: node scraper.js "${{ github.event.inputs.target_url }}" > scraped.html


- name: Upload Result
uses: actions/upload-artifact@v3
with:
name: scraped-html
path: scraped.html
