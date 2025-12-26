// import {instance} from "../db/db.js";
let map = {}
export const ratelimit = (increasetime = 5000) => (req, res, next) => {
	const address =  req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
	const currenttime = Date.now()
	// let map = instance.getRatelimitNew(address)
	let newTime = currenttime + increasetime
	if(!map[address]){
		// instance.setRatelimitNew(address, newTime)
		map[address] = newTime
		return next()
	}else if(Number(map[address]) <= currenttime){
		// instance.updateRatelimitNew(address, newTime)
		map[address] = newTime
		return next()
	}
	else {
		return res.status(429).send(`${Math.trunc((Number(map[address]) - currenttime)/1000)} क्षणान् प्रतीक्षस्व।`)
	}
}