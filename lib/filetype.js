import {fileTypeFromFile} from 'file-type';
import fs from 'fs'

export const filetype = async (req, res, next) => {
	//if no file (thread) , move forward
	if(!req.file){
		return next()
	}
	
 	const realFileType = await fileTypeFromFile(req.file.path)
	// req.realFileType = realFileType //pass forward
	// , 'image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp','video/mp4'
	const allowedFileTypeList = ['video/webm']
	let re = /(?:\.([^.]+))?$/;
	let userSetExt = re.exec(req.file.filename)[1]
	//if the mime type dont match
	//or the extension (if exist) dont match
	//delete the file
	if (!allowedFileTypeList.includes(realFileType?.mime) || (userSetExt && userSetExt != realFileType.ext)) {
		fs.unlink(req.file.path, () => {})
		return res.status(400).send("अमान्य सञ्चिकाप्रकारः")
	}
	next()
}