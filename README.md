# SungJadi CV Generator

SungJadi (a wordplay on "Langsung Jadi", meaning instantly done) is a simple web-based CV generator that allows users to create a professional CV by filling in text fields and uploading a profile photo. The CV preview updates in real time and can be downloaded as a PDF. Fun fact: The name also reflects how the app itself was built "instantly" thanks to AI—though by "instantly," i mean the AI did the heavy lifting while the human dev spent hours panicking, brainstorming, and debugging XD.

## Features

* Live CV preview
* Profile photo upload with crop support
* Editable personal information
* Dynamic Experience / Projects section
* Dynamic Skills section
* Optional Organizations & Volunteer Experience section
* One-page PDF export
* Clean and minimal user interface
* No backend required

## Tech Stack

* HTML
* CSS
* JavaScript
* Cropper.js
* html2canvas
* jsPDF

## Project Structure

```txt
sungjadi-cv-generator/
├── index.html
├── style.css
├── app.js
└── README.md
```

## How to Run Locally

1. Clone this repository:

```bash
git clone https://github.com/your-username/sungjadi-cv-generator.git
```

2. Open the project folder:

```bash
cd sungjadi-cv-generator
```

3. Open `index.html` in your browser.

No installation is required because this project runs fully on the browser.

## PDF Export

The generated CV is exported as a one-page PDF using `html2canvas` and `jsPDF`.

The downloaded file name follows this format:

```txt
[FULL NAME] CV.pdf
```

If the name field is empty, the default output name will be:

```txt
FULL NAME CV.pdf
```

## Notes

This project is designed as a lightweight frontend-only CV generator. It does not store user data, does not require login, and does not use a database.

All input data is processed locally in the browser.

## License

This project is open for personal and educational use.
