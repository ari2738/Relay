const fs = require('fs');
const { UTApi, UTFile } = require('uploadthing/server');

// Parse .env manually
const envPath = '../.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const token = env.UPLOADTHING_TOKEN;
console.log('UploadThing Token:', token ? 'exists' : 'missing');

if (!token) {
  console.error('No UploadThing Token configured in .env');
  process.exit(1);
}

const utapi = new UTApi({ token });

async function runTest() {
  const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const file = new UTFile([buffer], "test.png", { type: "image/png" });

  try {
    console.log("Uploading file to UploadThing...");
    const response = await utapi.uploadFiles(file);
    console.log("Upload response:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("Upload failed:", err);
  }
}

runTest();
