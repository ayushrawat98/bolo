import {instance} from "../db/db.js";

export default function allowedToReply(req, res, next){
	const threadExist = instance.getParentPost(req.params.threadId)

	if (!threadExist) {
		return res.status(404).set("Content-Type", "text/plain; charset=utf-8").send("सूत्रम् नास्ति")
	}

	//dont bump after 72 hours
	//decrease to 24 hours if we get activity
	let threadCreatedAt = new Date(threadExist.created_at).getTime()
	let currentTime = Date.now()
	if ((currentTime - threadCreatedAt) > (72 * 60 * 60 * 1000)) {
		return res.status(400).set("Content-Type", "text/plain; charset=utf-8").send("उत्तरं न शक्नोमि")
	}

	next()
}