const bucketName = 'dynamic-messenger-images';

// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

// Creates a client
const gcs = new Storage();
const bucket = gcs.bucket(bucketName);
	
async function uploadFile(filename, data, callback) {
    console.log("uploadingFile...")
  // Uploads a local file to the bucket
    const gcsname = filename;
	const file = bucket.file(gcsname);
	var buff = data;
    //console.log(buff)
	const stream = file.createWriteStream({
		metadata: {
			contentType: 'image/png'
		}
	});
	stream.on('error', (err) => {
		console.log(err);
	});
	stream.on('finish', () => {
        const mediaLink = file.metadata.mediaLink
        callback(mediaLink);
	});
    await stream.end(buff);
}

async function deleteFile(filename) {
    const file = bucket.file(filename);
    file.delete(function(err, apiResponse) {
		if (err) {
			console.log(err)
		}
    });
}

module.exports = {uploadFile, deleteFile}