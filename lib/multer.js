import multer from "multer";
import { sanitizeFilename } from "./sanitize.js";

const filefilter = (req, file, cb) => {
	// 'image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp','video/mp4', 
	let allowed = ['video/webm']
	if (allowed.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb({ message: 'Unsupported File Format' }, false)
	}
};

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'public/files')
	},
	filename: function (req, file, cb) {

		const uniquePrefix = Date.now()

		cb(null, uniquePrefix + "-" + sanitizeFilename(file.originalname) + ".webm")
	}
})

const upload = multer({ storage: storage, limits: { fileSize: 1 * 1024 * 1024 }, fileFilter: filefilter })
export default upload;