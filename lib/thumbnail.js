
import path from 'path';
import { fileURLToPath } from 'url';
// import ffmpeg from "fluent-ffmpeg";
import sharp from 'sharp';

import { spawn } from 'child_process';

//on windows
const ffmpegPath = 'C:\\Users\\aayus\\Downloads\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe'
//on linux
// const ffmpegPath = 'ffmpeg'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const thumbnail = async (req, res, next) => {
	if (req.file == undefined || req.file == null) {
		return next()
	}
	let ogfilePath = path.join(__dirname, '..', 'public', 'files', req.file.filename)
	let thumbfilePath = path.join(__dirname, '..', 'public', 'thumbnails', req.file.filename)

	if (req.file.mimetype.startsWith('video')) {
		// ffmpeg(ogfilePath)
		// 	.frames(1)
		// 	.outputOptions(["-vf", "thumbnail,scale=100:100:force_original_aspect_ratio=increase,crop=100:100"])
		// 	.size("100x100")
		// 	.save(thumbfilePath + ".png");

		// '-vf', 'thumbnail,scale=100:100:force_original_aspect_ratio=increase,crop=100:100', 

		const args = [
			'-i', ogfilePath,
			'-frames:v', '1',
			'-compression_level', '3',
			'-quality', '10',     // 0–100
			thumbfilePath + '.webp'
		];

		// Create the spawn command
		const ffmpegProcess = spawn(ffmpegPath, args);

		// Handle output (FFmpeg outputs logs to stderr by default)
		// ffmpegProcess.stderr.on('data', (data) => {
		//   console.log(`FFmpeg output: ${data}`);
		// });

		// Handle process exit
		// ffmpegProcess.on('exit', (code) => {
		//   console.log(`FFmpeg process exited with code ${code}`);
		// });
	}
	else if (req.file.mimetype.includes('gif')) {

		// sharp(ogfilePath, { animated: true })
		// 	// .resize(100, 100, { fit: 'fill' })
		// 	.gif({ interFrameMaxError: 32 })
		// 	.toFile(thumbfilePath);

		sharp(ogfilePath, { animated: true })
			.webp({
				quality: 10,    // lossy compression
				effort: 1,      // higher = better compression, slower
				loop: 0,        // keep animation loop
			})
			.toFile(thumbfilePath);

	} else if (req.file.mimetype.startsWith('image')) {

		sharp(ogfilePath)
			.webp({
				quality: 10,
				effort: 1
			})
			// .resize(100, 100, { fit: 'fill' })
			.toFile(thumbfilePath);

	}

	next()
}