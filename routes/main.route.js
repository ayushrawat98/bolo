import express from 'express';
import instance from '../db/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import nodeIpgeoblock from 'node-ipgeoblock';
import { rateLimitPosts } from '../lib/botBasher.js';
import upload from '../lib/multer.js';
import { filetype } from '../lib/filetype.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const blocker = nodeIpgeoblock({ geolite2: "./public/GeoLite2-Country.mmdb", allowedCountries: ["IN", "NP", "BT", "LK"] });

const route = express.Router()

route.get('/posts', async (req, res, next) => {
	let data = instance.getParentPosts()
	return res.status(200).send(data)
})

route.post('/posts', blockerWrapper, rateLimitPosts, upload.single('file'), filetype, async (req, res, next) => {
	if(req.body.content.trim().length == 0) throw new Error("Empty")
	let data = { username: req.body.username ?? 'Anonymouse', content: req.body.content.trim(), ip: req.socket.remoteAddress, path: '', depth: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), thread_id: null, parent_id: null, file: req?.file?.filename }
	let status = instance.createParentPost(data)
	return res.status(201).send(status)
})

route.get('/posts/:id', async (req, res, next) => {
	let parentdata = instance.getParentsAndSelf(req.params.id)
	let replies = instance.getReplies(parentdata[parentdata.length-1]?.id)
	return res.status(200).send({p : parentdata, c : replies})
})

route.post('/posts/:id',blockerWrapper, rateLimitPosts, upload.single('file'), filetype, async (req, res, next) => {
	if(req.body.content.trim().length == 0) throw new Error("Empty")
	let data = { username: req.body.username ?? 'Anonymouse', content: req.body.content.trim(), ip: req.socket.remoteAddress, path: "", depth: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), thread_id: null, parent_id: req.params.id, file: req?.file?.filename }
	let status = instance.createChildPost(data)
	return res.status(201).send(status)
})

route.post('/posts/:id/likes',blockerWrapper, async (req, res, next) => {
	let status = instance.createLike(req.params.id, req.socket.remoteAddress)
	return res.status(201).send(status)
})

route.get('/users/:name/notifications', async (req, res, next) => {
	let n = instance.getNotifications(req.params.name)
	return res.status(200).send(n)
})


function blockerWrapper(req,res,next){
	if (process.env.NODE_ENV === 'production') {
		blocker(req, res, next)
	}else{
		next()
	}
}


// // Configure express.raw to handle binary streams
// // 'type' must match the Content-Type sent by Angular
// app.use(express.raw({ 
//   type: (req) => true, // Match any type, or use 'application/octet-stream'
//   limit: '10mb' 
// }));

// app.post('/upload-raw', (req, res) => {
//   // The binary data is available in req.body as a Buffer
//   const binaryData = req.body;
//   const fileName = req.headers['x-file-name'] || 'uploaded_file.bin';

//   if (!binaryData || binaryData.length === 0) {
//     return res.status(400).send('No binary data received.');
//   }

//   // Save the buffer directly to disk
//   fs.writeFile(`./uploads/${fileName}`, binaryData, (err) => {
//     if (err) return res.status(500).send('Save failed');
//     res.json({ message: 'File saved successfully via raw transfer' });
//   });
// });



export { route as mainRoute }