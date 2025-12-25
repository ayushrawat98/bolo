import express from 'express';
import instance from '../db/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import nodeIpgeoblock from 'node-ipgeoblock';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const blocker = nodeIpgeoblock({ geolite2: "./public/GeoLite2-Country.mmdb", allowedCountries: ["IN", "NP", "BT", "LK"] });

const route = express.Router()

route.get('/posts', async (req, res, next) => {
	let data = instance.getParentPosts()
	return res.status(200).send(data)
})

route.post('/posts', async (req, res, next) => {
	if(req.body.content.trim().length == 0) throw new Error("Empty")
	let data = { username: req.body.username ?? 'Anonymouse', content: req.body.content, ip: req.socket.remoteAddress, path: '', depth: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), thread_id: null, parent_id: null, file_id: null }
	let status = instance.insertParentPost(data)
	return res.status(201).send(status)
})

route.get('/posts/:id', async (req, res, next) => {
	let parentdata = instance.getParentsAndSelf(req.params.id)
	let replies = instance.getReplies(parentdata[parentdata.length-1]?.id)
	return res.status(200).send({p : parentdata, c : replies})
})

route.post('/posts/:id', async (req, res, next) => {
	if(req.body.content.trim().length == 0) throw new Error("Empty")
	let data = { username: req.body.username ?? 'Anonymouse', content: req.body.content, ip: req.socket.remoteAddress, path: "", depth: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), thread_id: null, parent_id: req.params.id, file_id: null }
	let status = instance.insertChildPost(data)
	return res.status(201).send(status)
})

function blockerWrapper(req,res,next){
	if (process.env.NODE_ENV === 'production') {
		blocker(req, res, next)
	}else{
		next()
	}
}

export { route as mainRoute }